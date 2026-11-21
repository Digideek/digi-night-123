/* Online co-op (Nov 14). Host-authoritative over a small relay server
 * (host-game.js): the host's browser runs the one real simulation, friends
 * send their stick and choices and get the world back ~12 times a second.
 *
 *   host  : wires joined friends into the existing Authority / MissionSim,
 *           steps it on a background-safe clock, and broadcasts snapshots.
 *   guest : swaps the game's authority for a proxy that predicts the local
 *           tamer, interpolates everything else, and forwards choices.
 *
 * Farm visits are a shared intermission: the world stops, every player
 * tends their own farm on their own device, and the fight resumes when
 * everyone is back. Brawls are switched off online for now.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var CFG = D.ONLINE = {
    tickMs: 40,           /* authority tick (25 Hz) */
    sendEvery: 2,         /* world update every N ticks (12.5 Hz) */
    orbEvery: 2,          /* pickups ride every Nth world update */
    interpMs: 110,        /* how far behind friends draw the world */
    reviveHold: 3,        /* seconds holding Interact next to a downed partner */
    reviveRadius: 84,
    reviveHp: 0.5,
    farmWaitMax: 80,      /* longest the fight waits for friends at the farm */
    awayKeep: 75,         /* seconds a dropped friend's partner is kept */
    spawnPerPlayer: 0.45, /* +45% enemies per extra tamer */
    busyMax: 15,          /* seconds of safety while picking an upgrade */
    brawl: true,          /* survivor brawl between the tamers' partners */
    sharedXp: true
  };
  var COLORS = ["#f0c020", "#6ad0ff", "#e060b0", "#7cf0c0", "#ff8a40", "#c0a0ff"];

  var role = null, ws = null, code = "", myId = "", info = null;
  var players = {}, order = [];
  var setup = false, starting = false, netRun = false, wantLobby = false;
  var myPick = null, myName = "";
  var listeners = {};
  var token = "";
  var closing = false, reconnectT = 0, reconnectLeft = 0;

  function now() { return (global.performance && performance.now) ? performance.now() : Date.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : (d || 0); }
  function r1(v) { return Math.round(num(v) * 10) / 10; }
  function r2(v) { return Math.round(num(v) * 100) / 100; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function wid(id) { return id === "local" ? "h" : id; }

  function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); }
  function emit(name, a, b) {
    var l = listeners[name] || [], i;
    for (i = 0; i < l.length; i++) { try { l[i](a, b); } catch (e) { if (global.console) console.error(e); } }
  }
  function say(text, bad, secs) { emit("status", { text: text, bad: !!bad, secs: secs == null ? 4 : secs }); }

  try {
    token = sessionStorage.getItem("dbh_net_token") || "";
    if (!token) { token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); sessionStorage.setItem("dbh_net_token", token); }
  } catch (e) { token = Math.random().toString(36).slice(2); }

  /* ------------------------------------------------------------------ */
  /* Connection                                                          */
  /* ------------------------------------------------------------------ */
  function canConnect() { return /^https?:$/.test(location.protocol); }
  function wsUrl() { return (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws"; }
  function send(obj) {
    if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); return true; } catch (e) {} }
    return false;
  }
  function toHost(d) { return send({ t: "h", d: d }); }
  function toAll(d, drop) { return send(drop ? { t: "b", d: d, drop: 1 } : { t: "b", d: d }); }
  function toOne(id, d, drop) { return send(drop ? { t: "to", id: id, d: d, drop: 1 } : { t: "to", id: id, d: d }); }

  function connect(first, cb) {
    if (!canConnect()) { cb && cb("Online play needs the game server. On the host computer run the start-online file (see HOSTING.md), then open the address it shows."); return; }
    var sock, done = false;
    try { sock = new WebSocket(wsUrl()); } catch (e) { cb && cb("Could not reach the game server."); return; }
    ws = sock; closing = false;
    sock.onopen = function () { sock.send(JSON.stringify(first)); };
    sock.onmessage = function (e) {
      var m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      if (!done && (m.t === "hosted" || m.t === "joined" || m.t === "error")) { done = true; cb && cb(m.t === "error" ? (m.why || "Could not join.") : null, m); if (m.t === "error") { closing = true; sock.close(); } return; }
      route(m);
    };
    sock.onerror = function () { if (!done) { done = true; cb && cb("Could not reach the game server. This page has to be opened from the host's address, not as a file."); } };
    sock.onclose = function () {
      if (ws !== sock) return;
      ws = null;
      if (!done) { done = true; cb && cb("Could not reach the game server."); return; }
      if (closing) return;
      lostConnection();
    };
  }

  function lostConnection() {
    if (role === "guest" && code) {
      reconnectLeft = 16;
      say("Connection lost. Reconnecting…", true, 60);
      emit("change");
      tryReconnect();
    } else if (role === "host") {
      say("The game server stopped, so friends were disconnected. Your run carries on.", true, 12);
      for (var id in players) if (id !== myId) players[id].here = false;
      emit("change");
    }
  }
  function tryReconnect() {
    clearTimeout(reconnectT);
    if (role !== "guest" || ws) return;
    if (reconnectLeft-- <= 0) { hostGone("Could not reconnect to the game."); return; }
    connect({ t: "join", code: code, name: myName, token: token }, function (err, m) {
      if (err) {
        if (/No game with that code/.test(err)) { hostGone("The host closed the game."); return; }
        reconnectT = setTimeout(tryReconnect, 2500);
        return;
      }
      myId = m.you;
      say("Reconnected.", false, 2);
      if (netRun) toHost({ t: "resume" });
      else if (myPick) toHost({ t: "ready", line: myPick.line, tamerId: myPick.tamerId, name: myName });
      emit("change");
    });
  }

  function route(m) {
    if (m.t === "g") { if (role === "host") fromGuest(m.from, m.d || {}); }
    else if (m.t === "m") { if (role === "guest") fromHost(m.d || {}); }
    else if (m.t === "peer") { if (role === "host") peerJoined(m); }
    else if (m.t === "left") { if (role === "host") peerLeft(m.id, false); }
    else if (m.t === "gone") { if (role === "host") peerLeft(m.id, true); }
    else if (m.t === "closed") { if (role === "guest") hostGone(m.why === "removed" ? "You were removed from the game." : "The host closed the game."); }
  }

  function resetAll() {
    stopClock();
    role = null; code = ""; myId = ""; players = {}; order = [];
    setup = false; starting = false; netRun = false; wantLobby = false; myPick = null;
    H.auth = null; H.sim = null;
    G.proxy = null; G.local = null; G.inFarm = false;
    clearTimeout(reconnectT);
    emit("change");
  }

  /* ------------------------------------------------------------------ */
  /* Lobby                                                               */
  /* ------------------------------------------------------------------ */
  function addPlayer(id, name, isHost) {
    if (!players[id]) { players[id] = { id: id, name: name, host: !!isHost, state: "picking", here: true, tamerId: null, line: null, color: COLORS[order.length % COLORS.length] }; order.push(id); }
    else { players[id].name = name || players[id].name; players[id].here = true; }
    return players[id];
  }
  function rosterList() { return order.filter(function (id) { return players[id]; }).map(function (id) { return players[id]; }); }
  function pushRoster() {
    if (role !== "host") return;
    /* names follow into the running game (a nemesis is named after the tamer it beat) */
    if (H.sim) rosterList().forEach(function (pl) { var sp = H.sim.player(pl.id); if (sp && pl.name) sp.name = pl.name; });
    if (H.sim && H.sim.localId && players[myId]) { var hp = H.sim.player(H.sim.localId); if (hp && players[myId].name) hp.name = players[myId].name; }
    toAll({ t: "roster", players: rosterList(), running: !!H.auth, code: code, mode: (D.menu && D.menu.mode && D.menu.mode()) || "open" });
    emit("change");
  }

  function host(name, cb) {
    if (role) leave("restart");
    myName = name || "Host";
    connect({ t: "host", name: myName, token: token }, function (err, m) {
      if (err) { cb && cb(err); return; }
      role = "host"; code = m.code; myId = m.you; info = m.info || null;
      players = {}; order = [];
      addPlayer(myId, myName, true);
      setup = true;
      cb && cb(null);
      emit("change");
    });
  }

  function join(c, name, cb) {
    if (role) leave("restart");
    myName = name || "Tamer";
    c = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length < 4) { cb && cb("Enter the 4-letter room code."); return; }
    connect({ t: "join", code: c, name: myName, token: token }, function (err, m) {
      if (err) { cb && cb(err); return; }
      role = "guest"; code = m.code; myId = m.you;
      players = {}; order = [];
      (m.players || []).forEach(function (p) { addPlayer(p.id, p.name, p.host); });
      setup = true;
      cb && cb(null);
      emit("change");
    });
  }

  function leave(why) {
    if (!role) return;
    if (role === "guest") toHost({ t: "bye" });
    else send({ t: "end" });
    closing = true;
    try { if (ws) ws.close(); } catch (e) {}
    ws = null;
    resetAll();
  }

  /* Called by the game when the egg is confirmed. true = we took over. */
  function interceptStart(line, tamerId) {
    if (!role || !setup) return false;
    myPick = { line: line, tamerId: tamerId };
    var me = players[myId] || addPlayer(myId, myName, role === "host");
    me.line = line; me.tamerId = tamerId; me.state = "ready";
    if (role === "host") { pushRoster(); D.setState("lobby"); }
    else { D.setState("lobby"); toHost({ t: "ready", line: line, tamerId: tamerId, name: myName }); }
    emit("change");
    return true;
  }

  /* The lobby (online-ui.js): what you are looking at before you are ready. It shows on everyone's
   * slot as you flip through; being ready (interceptStart) locks it in. Changing it un-readies you. */
  var hostMode = "open";
  function setPick(line, tamerId) {
    if (!role) return;
    var me = players[myId] || addPlayer(myId, myName, role === "host");
    me.tamerId = String(tamerId || "").slice(0, 24); me.peek = String(line || "").slice(0, 24);
    if (eggFormFor(line)) me.line = String(line);
    if (me.state !== "playing") me.state = "choosing";
    myPick = null;
    if (role === "host") pushRoster();
    else toHost({ t: "pick", line: me.peek, tamerId: me.tamerId });
    emit("change");
  }
  function setName(name) {
    myName = String(name || "").replace(/[<>]/g, "").trim().slice(0, 14) || myName;
    if (players[myId]) players[myId].name = myName;
    if (role === "host") { send({ t: "name", name: myName }); pushRoster(); }
    else if (role === "guest") { send({ t: "name", name: myName }); toHost({ t: "name", name: myName }); }
    emit("change");
  }

  /* The profile card (js/profile.js) that rides along in the roster. Only
   * plain data, and never big: whatever arrives is copied through JSON and
   * dropped if it is oversized. The lobby escapes everything it prints. */
  function cleanProf(p) {
    try { var str = JSON.stringify(p); if (!str || str.length > 4000) return null; return JSON.parse(str); } catch (e) { return null; }
  }
  var myProf = null;
  function setProfile(p) {
    myProf = cleanProf(p);
    if (!role || !myProf) return;
    if (role === "host") { if (players[myId]) players[myId].prof = myProf; pushRoster(); }
    else toHost({ t: "prof", p: myProf });
  }

  function startGame() {
    if (role !== "host" || !myPick) return false;
    starting = true;
    D.startRun(myPick.line, myPick.tamerId);
    return true;
  }

  /* After a run ends: everyone meets back in the lobby. */
  function afterRun() {
    if (!role) return false;
    if (role === "host") {
      stopClock();
      H.auth = null; H.sim = null; netRun = false;
      rosterList().forEach(function (p) { if (p.state === "playing") p.state = "ready"; });
      toAll({ t: "lobby" });
      pushRoster();
    } else {
      netRun = false; G.proxy = null;
    }
    D.setState("lobby");
    emit("change");
    return true;
  }

  function hostGone(text) {
    var run = D.getRun && D.getRun();
    closing = true;
    try { if (ws) ws.close(); } catch (e) {}
    ws = null;
    var wasPlaying = netRun && run && !run.ended;
    if (G.inFarm) abortLocalFarm();
    resetAll();
    say(text, true, 8);
    if (wasPlaying) D.bridge.endRun();
    else {
      var st = D.getState();
      if (st === "lobby" || st === "tamer" || st === "egg" || st === "join") D.setState("title");
    }
  }

  /* ------------------------------------------------------------------ */
  /* HOST                                                                */
  /* ------------------------------------------------------------------ */
  var H = { auth: null, sim: null, run: null, tickN: 0, snapN: 0, events: [], net: {}, slowSent: {}, ack: {},
    farm: { id: 0, open: false, t0: 0, pending: {} }, holds: {}, worker: null, timer: 0, last: 0, acc: 0 };

  function eggFormFor(line) {
    var list = D.EGGS || [], i;
    for (i = 0; i < list.length; i++) if (list[i].id === line) return list[i].egg;
    return null;
  }

  function attachHost(auth, run) {
    var sim = auth.sim;
    H.auth = auth; H.sim = sim; H.run = run;
    H.sentOver = false;
    H.tickN = 0; H.snapN = 0; H.events = []; H.net = {}; H.slowSent = {}; H.ack = {}; H.holds = {};
    H.farm = { id: 0, open: false, t0: 0, pending: {} };
    sim.coop = true;
    sim.noBrawl = !CFG.brawl;
    var hp0 = sim.player(sim.localId) || sim.players[0];
    if (hp0) { hp0.name = myName || "Host"; hp0.color = players[myId] ? players[myId].color : COLORS[0]; }
    H.brawlOn = false; H.brawlRevive = null;
    sim.sharedXp = CFG.sharedXp;
    /* every event the authority emits also goes on the wire */
    var snap0 = auth.snapshot;
    auth.snapshot = function (full) {
      var s = snap0.call(auth, full);
      if (s && s.events && s.events.length) Array.prototype.push.apply(H.events, s.events);
      return s;
    };
    /* remember who is holding Interact (for revives) */
    var msg0 = auth.onMessage;
    auth.onMessage = function (msg) {
      if (msg && msg.type === "input" && msg.id && msg.inputs && msg.inputs.length) {
        var n = H.net[msg.id] || (H.net[msg.id] = {});
        n.interact = !!msg.inputs[msg.inputs.length - 1].interact;
      }
      return msg0.call(auth, msg);
    };
    if (players[myId]) players[myId].state = "playing";
    rosterList().forEach(function (p) { if (p.id !== myId && p.state === "ready" && p.here) addGuest(p); });
    netRun = true;
    refreshParty();
    pushRoster();
    startClock();
  }

  function refreshParty() {
    var sim = H.sim;
    if (!sim) return;
    var humans = 0, i;
    for (i = 0; i < sim.players.length; i++) if (sim.players[i].hasTamer !== false) humans += 1;
    sim.freezeParty(Math.max(2, humans + (sim.cpus ? sim.cpus.length : 0)));
    sim.coopScale = 1 + CFG.spawnPerPlayer * Math.max(0, humans - 1);
  }

  function addGuest(pl) {
    var sim = H.sim, auth = H.auth;
    if (!sim || !auth) return false;
    var existing = sim.player(pl.id);
    if (!existing) {
      var form = eggFormFor(pl.line) || eggFormFor("agumon");
      var sp = D.SPECIES[form];
      if (!sp) return false;
      var hostP = sim.player(sim.localId) || sim.players[0];
      var slot = sim.players.length;
      var ang = slot * 1.1;
      var pos = { x: hostP.x + Math.cos(ang) * 64, y: hostP.y + Math.sin(ang) * 48 };
      if (D.world && D.world.nearestWalkable) pos = D.world.nearestWalkable(pos.x, pos.y, 320, (D.TAMER && D.TAMER.radius) || 10);
      var rec = {
        id: pl.id, kind: "client", hasTamer: true, form: form,
        x: pos.x, y: pos.y, mx: pos.x - 30, my: pos.y + 8,
        hp: sp.base.maxHp, maxHp: sp.base.maxHp,
        tamerHp: D.TAMER.maxHp, tamerMaxHp: D.TAMER.maxHp,
        fullness: D.CARE.startFullness, happiness: D.CARE.startHappiness,
        bits: 0, xp: 0, xpNext: sim._xpNeeded(1), level: 1,
        weapons: sp.startWeapon ? [{ id: sp.startWeapon, level: 1, cd: 0.2 }] : [],
        hatchLeft: (D.HATCH && D.HATCH.time) || 20,
        lab: (pl.prof && pl.prof.lb) || null,
        gear: (pl.prof && pl.prof.gr) || null,
        memory: (pl.prof && pl.prof.mm && pl.line && pl.prof.mm[pl.line]) || 0,
        lastFarmAt: hostP.lastFarmAt || 0, farmVisitIndex: hostP.farmVisitIndex || 0,
        worldSeed: sim.seed
      };
      if (!auth.join(rec)) return false;
      existing = sim.player(pl.id);
      if (!existing) return false;
      existing.formSince = sim.time;
      existing.tamerInvuln = 2;
    }
    existing.away = false;
    existing.name = pl.name; existing.color = pl.color;
    pl.state = "playing";
    H.slowSent[pl.id] = "";
    refreshParty();
    toOne(pl.id, { t: "start", seed: sim.seed, time: sim.time, you: pl.id });
    return true;
  }

  function peerJoined(m) {
    var pl = addPlayer(m.id, m.name, false);
    pl.here = true;
    var sp = H.sim && H.sim.player(m.id);
    if (sp) sp.away = false;
    pushRoster();
    if (!m.back) say(pl.name + " joined", false, 3);
  }

  function peerLeft(id, forgotten) {
    var pl = players[id];
    if (!pl) return;
    pl.here = false;
    var sp = H.sim && H.sim.player(id);
    if (sp) { sp.away = true; sp.awayAt = now(); }
    if (forgotten || !sp) {
      if (!sp || forgotten) dropPlayer(id);
    }
    if (H.farm.open) delete H.farm.pending[id];
    say(pl.name + " disconnected", true, 3);
    pushRoster();
  }

  function dropPlayer(id) {
    if (H.auth && H.sim && H.sim.player(id)) { H.auth.leave(id); refreshParty(); }
    if (players[id] && !players[id].here) {
      delete players[id];
      order = order.filter(function (x) { return x !== id; });
    } else if (players[id]) players[id].state = "picking";
    delete H.net[id]; delete H.holds[id];
  }

  var ACTS = { "pvp.flag": 1, levelup: 1, "shop.buy": 1, capture: 1, "brawl.bet": 1, "field.feed": 1, evolve: 1, "evolve.hold": 1, "stat.add": 1, "skill.add": 1, "dna.ask": 1, "dna.answer": 1, burst: 1, "breather.end": 1, "prop.use": 1 };
  /* What a friend's own farm visit is allowed to change on their record. */
  var FARM_KEYS = ["fullness", "happiness", "bag", "items", "shopBought", "bits", "trainStats", "trainVisits", "bondTrain",
    "careMistakes", "foodEaten", "foodCounts", "garden", "bond", "mood", "ignoredSeconds", "starveCycles",
    "refusedFoodCycles", "refusedThisCycle", "windows", "omenSeen", "lastFarmAt", "farmVisitIndex", "farmDueAt",
    "pendingAtkBoost", "atkBoost", "farmWarns"];

  function fromGuest(id, d) {
    var pl = players[id], sim = H.sim, auth = H.auth, p;
    if (!pl) return;
    if (d.t === "i") {
      if (!auth || !sim || !sim.player(id)) return;
      var inp = { seq: num(d.n) | 0, x: clamp(num(d.x), -1, 1), y: clamp(num(d.y), -1, 1), atk: !!d.a, dash: !!d.d, aim: num(d.m), interact: !!d.e };
      if (d.f !== undefined && d.f !== null) inp.focus = num(d.f) | 0;
      if (d.g && d.g.length === 2) inp.go = [num(d.g[0]), num(d.g[1])];
      auth.onMessage({ type: "input", id: id, inputs: [inp] });
      var n = H.net[id] || (H.net[id] = {});
      if (d.b) { if (!n.busy) n.busySince = now(); n.busy = true; } else n.busy = false;
    } else if (d.t === "ready") {
      if (!eggFormFor(d.line)) return;
      pl.line = String(d.line); pl.tamerId = String(d.tamerId || "junior").slice(0, 24);
      if (d.name) pl.name = String(d.name).replace(/[<>]/g, "").slice(0, 14);
      pl.state = "ready";
      if (auth && sim) addGuest(pl);
      pushRoster();
    } else if (d.t === "pick") {
      pl.tamerId = String(d.tamerId || "").slice(0, 24); pl.peek = String(d.line || "").slice(0, 24);
      if (eggFormFor(d.line)) pl.line = String(d.line);
      if (pl.state !== "playing") pl.state = "choosing";
      pushRoster();
    } else if (d.t === "resume") {
      p = sim && sim.player(id);
      if (p) { p.away = false; pl.state = "playing"; H.slowSent[id] = ""; }
      else if (pl.line && auth) addGuest(pl);
      pushRoster();
    } else if (d.t === "act") {
      if (!auth || !sim || !sim.player(id) || !d.i || !ACTS[d.i.type]) return;
      var intent = { type: d.i.type, id: id };
      if (d.i.type === "levelup") { intent.kind = d.i.kind; intent.choice = d.i.choice; intent.token = d.i.token; }
      else if (d.i.type === "shop.buy") intent.item = d.i.item;
      else if (d.i.type === "capture") intent.enemyId = d.i.enemyId;
      else if (d.i.type === "field.feed") intent.food = String(d.i.food || "").slice(0, 24);
      else if (d.i.type === "dna.ask") intent.to = String(d.i.to || "").slice(0, 40);
      else if (d.i.type === "dna.answer") { intent.ok = !!d.i.ok; intent.to = String(d.i.to || "").slice(0, 40); }
      else if (d.i.type === "prop.use") { intent.tx = num(d.i.tx) | 0; intent.ty = num(d.i.ty) | 0; }
      else if (d.i.type === "pvp.flag") intent.on = !!d.i.on;
      else if (d.i.type === "skill.add") intent.skill = String(d.i.skill || "").slice(0, 32);
      else if (d.i.type === "stat.add") { intent.stat = String(d.i.stat || "").slice(0, 8); intent.n = num(d.i.n) | 0; }
      else if (d.i.type === "brawl.bet") intent.targetId = d.i.targetId === "h" ? "local" : String(d.i.targetId || "");
      var res = auth.act(intent) || { ok: false };
      H.ack[id] = Math.max(H.ack[id] || 0, num(d.n) | 0);
      if (d.i.type === "capture") toOne(id, { t: "res", k: "capture", res: { ok: !!res.ok, reason: res.reason || null, chance: res.chance == null ? null : res.chance, form: res.form || null } });
    } else if (d.t === "farmGo") {
      p = sim && sim.player(id);
      if (p) p.atFarm = true;
    } else if (d.t === "farmDone") {
      p = sim && sim.player(id);
      if (p && p.atFarm) {
        var sh = Math.max((D.FARM_CFG && D.FARM_CFG.returnShield) || 2, p.pvpShield || 0);
        p.atFarm = false; p.pvpShield = 0;
        p.monInvuln = Math.max(p.monInvuln || 0, sh);
        p.tamerInvuln = Math.max(p.tamerInvuln || 0, sh);
      }
      if (p && d.s && typeof d.s === "object") {
        FARM_KEYS.forEach(function (k) { if (d.s[k] !== undefined) p[k] = d.s[k]; });
        if (typeof d.s.hp === "number") p.hp = clamp(d.s.hp, 0, p.maxHp || d.s.hp);
        if (typeof d.s.tamerHp === "number") p.tamerHp = clamp(d.s.tamerHp, p.downed ? 0 : 1, p.tamerMaxHp || d.s.tamerHp);
        p.pendingFarm = false;
      }
      H.ack[id] = Math.max(H.ack[id] || 0, num(d.n) | 0);
      delete H.farm.pending[id];
    } else if (d.t === "name") {
      if (d.name) pl.name = String(d.name).replace(/[<>]/g, "").slice(0, 14);
      pushRoster();
    } else if (d.t === "prof") {
      pl.prof = cleanProf(d.p);
      pushRoster();
    } else if (d.t === "bye") {
      pl.here = false;
      dropPlayer(id);
      pushRoster();
    }
  }

  /* --- background-safe clock: a worker timer keeps ticking in a hidden tab --- */
  function startClock() {
    stopClock();
    H.last = now(); H.acc = 0;
    try {
      var blob = new Blob(["setInterval(function(){postMessage(0)},20)"], { type: "application/javascript" });
      H.worker = new Worker(URL.createObjectURL(blob));
      H.worker.onmessage = pump;
    } catch (e) { H.worker = null; H.timer = setInterval(pump, 20); }
  }
  function stopClock() {
    if (H.worker) { try { H.worker.terminate(); } catch (e) {} H.worker = null; }
    if (H.timer) { clearInterval(H.timer); H.timer = 0; }
  }
  function pump() {
    var t = now(), n = 0;
    H.acc += t - H.last; H.last = t;
    if (H.acc > 400) H.acc = 400;
    while (H.acc >= CFG.tickMs && n < 6) { H.acc -= CFG.tickMs; n += 1; hostTick(); }
  }

  function hostTick() {
    var auth = H.auth, sim = H.sim, run = D.getRun && D.getRun();
    if (!auth || !sim || !run || run.ended || D.bridge.getAuth() !== auth) {
      if (!run || run.ended) {
        /* the run just ended on the host: friends still need to hear it */
        if (sim && sim.runOver && !H.sentOver) { H.sentOver = true; sendWorld(sim, true); }
        stopClock();
      }
      return;
    }
    var dt = CFG.tickMs / 1000, i, p, n, t = now();
    farmStep(sim, t);
    /* safety while choosing an upgrade; shelter for dropped friends */
    var st = D.getState();
    var hn = H.net.local || (H.net.local = {});
    var hostBusy = st === "levelup" || st === "evolution";
    if (hostBusy && !hn.busy) hn.busySince = t;
    hn.busy = hostBusy;
    for (i = sim.players.length - 1; i >= 0; i--) {
      p = sim.players[i];
      n = H.net[p.id];
      if (p.away) {
        p.tamerInvuln = Math.max(p.tamerInvuln || 0, 0.3); p.monInvuln = Math.max(p.monInvuln || 0, 0.3);
        if (t - (p.awayAt || t) > CFG.awayKeep * 1000) { dropPlayer(p.id); pushRoster(); }
      } else if (n && n.busy && t - (n.busySince || t) < CFG.busyMax * 1000) {
        p.tamerInvuln = Math.max(p.tamerInvuln || 0, 0.25); p.monInvuln = Math.max(p.monInvuln || 0, 0.25);
      }
    }
    if (sim.phase === "playing") reviveStep(sim, dt);
    auth.step();
    H.tickN += 1;
    brawlStep(sim);
    if (sim.phase === "brawl") { if (H.tickN % 12 === 0) sendWorld(sim); }
    else if (H.tickN % CFG.sendEvery === 0) sendWorld(sim);
  }

  /* Survivor brawl: the arena is tiny, so it goes out every tick. */
  function brawlWire(sim) {
    var b = sim.brawlSim && sim.brawlSim.snapshot();
    if (!b) return null;
    b = clone(b);
    var i, f;
    for (i = 0; i < (b.fighters || []).length; i++) {
      f = b.fighters[i];
      f.id = wid(f.id);
      if (f.betOn) f.betOn = wid(f.betOn);
      f.x = r1(f.x); f.y = r1(f.y); f.vx = r1(f.vx); f.vy = r1(f.vy); f.hp = r1(f.hp);
    }
    if (b.winnerId) b.winnerId = wid(b.winnerId);
    if (b.revivedId) b.revivedId = wid(b.revivedId);
    if (b.payout && b.payout.awards) for (i = 0; i < b.payout.awards.length; i++) b.payout.awards[i].id = wid(b.payout.awards[i].id);
    return b;
  }
  function brawlStep(sim) {
    var m = sim.brawlSim && sim.brawlSim.match, p;
    if (sim.phase === "brawl" && m) {
      if (!H.brawlOn) { H.brawlOn = true; sendWorld(sim, true); }
      H.brawlRevive = m.revivedId || null;
      toAll({ t: "br", s: brawlWire(sim) }, !m.settled);
      return;
    }
    if (H.brawlOn) {
      H.brawlOn = false;
      /* the brawl's lucky revive also stands that tamer back up in the field */
      p = H.brawlRevive && sim.player(H.brawlRevive);
      if (p && p.downed) { standUp(p); sim.emit({ type: "coop.revive", id: p.id, by: null }); }
      H.brawlRevive = null;
      sendWorld(sim, true);
    }
  }

  /* Farm intermission: hold the fight until every tamer is back. */
  function farmStep(sim, t) {
    var f = H.farm, id, any = false, i, p;
    if (!f.open && sim.phase === "farm") {
      f.id += 1; f.open = true; f.t0 = t; f.pending = {};
      for (i = 0; i < sim.players.length; i++) {
        p = sim.players[i];
        if (p.id !== sim.localId && !p.away) f.pending[p.id] = true;
      }
      return;
    }
    if (!f.open) return;
    for (id in f.pending) { if (sim.player(id) && !sim.player(id).away) any = true; else delete f.pending[id]; }
    var late = t - f.t0 > CFG.farmWaitMax * 1000;
    if (sim.phase === "playing" || sim.phase === "farmwait") {
      if (any && !late) { sim.phase = "farmwait"; return; }
      f.open = false;
      sim.phase = "playing";
      if (D.weather && D.weather.resumePlaying) D.weather.resumePlaying(sim, { data: D });
      for (id in f.pending) {
        p = sim.player(id);
        if (p) { p.pendingFarm = false; p.lastFarmAt = sim.time; p.farmVisitIndex = (p.farmVisitIndex || 0) + 1; }
      }
      f.pending = {};
      /* everyone regroups: downed tamers get back up after the farm */
      var up = 0;
      for (i = 0; i < sim.players.length; i++) {
        p = sim.players[i];
        if (p.downed) { standUp(p); up += 1; }
      }
      sim.emit({ type: "coop.regroup", revived: up });
    }
  }

  function standUp(p) {
    /* the partner gets back up (the tamer itself cannot be hurt) */
    p.downed = false;
    p.faint = 0;
    p.hp = Math.max(1, Math.round((p.maxHp || 60) * CFG.reviveHp));
    p.monInvuln = 2;
  }

  function reviveStep(sim, dt) {
    var i, j, d, r, n, best, r2x = CFG.reviveRadius * CFG.reviveRadius, dx, dy;
    for (i = 0; i < sim.players.length; i++) {
      d = sim.players[i];
      if (!d.downed || d.away) { if (H.holds[d.id]) delete H.holds[d.id]; continue; }
      best = null;
      for (j = 0; j < sim.players.length; j++) {
        r = sim.players[j];
        if (r === d || r.downed || r.away || r.hasTamer === false) continue;
        n = H.net[r.id];
        if (!n || !n.interact) continue;
        dx = r.x - d.mx; dy = r.y - d.my;
        if (dx * dx + dy * dy <= r2x) { best = r; break; }
      }
      if (best) {
        H.holds[d.id] = (H.holds[d.id] || 0) + dt;
        if (H.holds[d.id] >= CFG.reviveHold) {
          delete H.holds[d.id];
          standUp(d);
          sim.emit({ type: "coop.revive", id: d.id, by: best.id });
        }
      } else if (H.holds[d.id]) {
        H.holds[d.id] = Math.max(0, H.holds[d.id] - dt * 2);
        if (!H.holds[d.id]) delete H.holds[d.id];
      }
    }
  }

  var FAST = { id: 1, slot: 1, kind: 1, hasTamer: 1, x: 1, y: 1, vx: 1, vy: 1, facing: 1, tdir: 1, moving: 1, tamerHp: 1, tamerMaxHp: 1, tamerInvuln: 1,
    mx: 1, my: 1, mfacing: 1, monMoving: 1, hp: 1, maxHp: 1, monInvuln: 1, faint: 1, fullness: 1, happiness: 1, bits: 1, xp: 1, xpNext: 1,
    level: 1, kills: 1, aim: 1, ack: 1, desperation: 1, atkBoost: 1, focusId: 1, form: 1, hatchLeft: 1, downed: 1, pendingLevels: 1 };
  var QUIET = { ignoredSeconds: 1, clock: 1, evoLock: 1, peakHappiness: 1, miracleShimmer: 1, proximityClose: 1, mood: 1, bond: 1, windows: 1, ignoredDuringEvent: 1, undamagedKills: 1 };
  var DROP_EVENTS = { rejected: 1, bits: 1, focus: 1, "lifecycle.resume": 1, join: 1, leave: 1, "level.offers": 1, levelup: 1, shop: 1 };

  function sendWorld(sim, mustArrive) {
    var s = sim.snapshot(true), i, p, o, e, b, c, P = [], E = [], B = [], C = [], O, ev = [], slow, key, str, k, sp;
    H.snapN += 1;
    for (i = 0; i < s.players.length; i++) {
      p = s.players[i]; sp = sim.player(p.id);
      P.push({ id: wid(p.id), x: r1(p.x), y: r1(p.y), mx: r1(p.mx), my: r1(p.my), facing: p.facing, tdir: p.tdir, moving: p.moving ? 1 : 0,
        mfacing: p.mfacing, monMoving: p.monMoving ? 1 : 0, tamerHp: r1(p.tamerHp), tamerMaxHp: p.tamerMaxHp, tamerInvuln: r2(p.tamerInvuln),
        hp: r1(p.hp), maxHp: p.maxHp, monInvuln: r2(p.monInvuln), faint: r2(p.faint), downed: p.downed ? 1 : 0, ack: p.ack, form: p.form, burst: p.burst || 0, burstLeft: p.burstLeft || 0, burstForm: p.burstForm || null, burstStyle: p.burstStyle || null, shiny: p.shiny ? 1 : 0,
        level: p.level, xp: r1(p.xp), xpNext: p.xpNext, bits: p.bits, fullness: r1(p.fullness), happiness: r1(p.happiness), kills: p.kills, trust: p.trust || null, allied: p.allied || null, atFarm: p.atFarm ? 1 : 0, pvpFlag: p.pvpFlag ? 1 : 0, pvpOffAt: p.pvpOffAt || 0, md: p.md || null,
        hatchLeft: p.hatchLeft == null ? null : r1(p.hatchLeft), desperation: p.desperation ? 1 : 0, atkBoost: r1(p.atkBoost), focusId: p.focusId,
        aim: r2(p.aim), pendingLevels: p.pendingLevels || 0, away: sp && sp.away ? 1 : 0 });
      /* the rest of a player's record only goes to that player, when it changes */
      if (p.id !== sim.localId && players[p.id] && players[p.id].here) {
        slow = {}; key = {};
        for (k in p) {
          if (FAST[k] || !Object.prototype.hasOwnProperty.call(p, k)) continue;
          slow[k] = k === "weapons" ? (p.weapons || []).map(function (w) { return { id: w.id, level: w.level }; }) : p[k];
          if (!QUIET[k]) key[k] = slow[k];
        }
        key.ia = H.ack[p.id] || 0;
        str = JSON.stringify(key);
        if (str !== H.slowSent[p.id] || H.snapN % 25 === 0) {
          H.slowSent[p.id] = str;
          toOne(p.id, { t: "me", s: slow, ia: H.ack[p.id] || 0 });
        }
      }
    }
    for (i = 0; i < s.enemies.length; i++) {
      e = s.enemies[i];
      E.push([e._id, e.type, Math.round(e.x), Math.round(e.y), Math.round(e.hp), Math.round(e.maxHp), e.facing, e.radius, (e.flash > 0 ? 1 : 0) | (e.boss ? 2 : 0) | (e.mega ? 4 : 0) | (e.lord ? 8 : 0) | (e.rival ? 16 : 0) | (e.virus ? 32 : 0) | (e.zz ? 64 : 0), e.dmgMul || 1, e.st || 0, e.war || 0, e.fac || 0, e.rally != null ? wid(e.rally) : 0, e.alv || 0, e.lv || 1, e.nem || 0, e.nem ? (e.nemTitle || "") : 0, e.nem ? (e.nemScale || 1) : 0]);
    }
    for (i = 0; i < s.bullets.length; i++) {
      b = s.bullets[i];
      B.push([Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy), b.radius, b.color, r2(b.life), b.wid || 0, b.kind === "nova" ? 1 : 0]);
    }
    for (i = 0; i < s.cpus.length; i++) {
      c = s.cpus[i];
      C.push({ id: c.id, form: c.form, name: c.name, hasTamer: false, x: r1(c.x), y: r1(c.y), facing: c.facing, hp: r1(c.hp), maxHp: c.maxHp, moving: c.moving, invuln: r2(c.invuln) });
    }
    if (H.snapN % CFG.orbEvery === 0) {
      O = [];
      for (i = 0; i < s.orbs.length; i++) { o = s.orbs[i]; O.push([o.id, o.kind, Math.round(o.x), Math.round(o.y), o.value, o.magnet ? 1 : 0]); }
    }
    var hitsSent = 0;
    for (i = 0; i < H.events.length; i++) {
      e = H.events[i];
      if (DROP_EVENTS[e.type]) continue;
      /* hits feed the damage numbers on a guest's screen: a few a snapshot, trimmed to what that needs */
      if (e.type === "hit") {
        if (hitsSent++ >= 10) continue;
        e = { type: "hit", enemyId: e.enemyId, damage: Math.round(e.damage), x: e.x, y: e.y, r: e.r, f: e.f, c: e.c, m: e.m, k: e.k, bolt: e.bolt, dot: e.dot, by: e.by };
      }
      if (e.type === "spawn" && !(e.boss || e.mega)) continue;
      if (e.type === "hurt" && e.who !== "tamer" && e.who !== "mon") continue;
      c = {};
      for (k in e) if (Object.prototype.hasOwnProperty.call(e, k) && k !== "tick" && k !== "time") c[k] = e[k];
      if (c.id != null) c.id = wid(c.id);
      if (c.by != null) c.by = wid(c.by);
      if (c.killer != null) c.killer = wid(c.killer);
      if (typeof c.x === "number") { c.x = Math.round(c.x); c.y = Math.round(c.y); }
      ev.push(c);
    }
    H.events = [];
    var rev = {}, any = false, waiting = [];
    for (k in H.holds) { rev[wid(k)] = r2(H.holds[k] / CFG.reviveHold); any = true; }
    for (k in H.farm.pending) waiting.push(k);
    var a = s.ally, ar = [];
    for (i = 0; i < (s.arcs || []).length; i++) { b = s.arcs[i]; ar.push({ angle: r2(b.angle), range: b.range, arc: b.arc, color: b.color, life: r2(b.life), max: b.max || b.life, wid: b.wid, ownerId: wid(b.ownerId) }); }
    var w = { t: "s", n: H.snapN, ht: Math.round(now()), tm: r2(s.time), ph: sim.phase === "playing" ? 0 : (sim.phase === "brawl" ? 2 : 1), ro: s.runOver ? 1 : 0,
      P: P, E: E, B: B, C: C, ar: ar, ev: ev, kl: s.kills, mr: s.merchant || null, wx: s.weather || null, rv: s.rival || null, ck: s.clock || null,
      ps: s.startingPartySize, pc: s.partyReviveCharge,
      al: a && a.form ? { form: a.form, x: r1(a.x), y: r1(a.y), hp: r1(a.hp), maxHp: a.maxHp, facing: a.facing, invuln: r2(a.invuln), level: a.level || 1, passive: a.passive || null } : null,
      pt: (s.patches || []).map(function (q) { return [q.id, q.kind, Math.round(q.x), Math.round(q.y), Math.round(q.r), r2(q.t), r2(q.max)]; }),
      fm: H.farm.open ? H.farm.id : 0,
      /* the living world: puddle depth, who holds the land, the fronts, the nests near anyone */
      sk: s.soak || 0, tr: s.terr || "", fr: s.fronts || null, ns: s.nests || null, nm: s.nems || null };
    if (O) w.O = O;
    if (any) w.rv = rev;
    if (waiting.length) w.fw = waiting;
    toAll(w, !mustArrive);
    H.view = { rv: rev, fm: w.fm, fw: waiting, ph: w.ph };
  }

  /* ------------------------------------------------------------------ */
  /* GUEST                                                               */
  /* ------------------------------------------------------------------ */
  var G = { proxy: null, local: null, snaps: [], offset: null, offs: [], orbs: [], slow: {}, ia: 0, intentN: 0, overrides: [], events: [],
    input: { x: 0, y: 0, atk: false, aim: 0, interact: false, focus: null }, pred: null, lastFrame: 0, sendAt: 0,
    inFarm: false, farmDone: 0, farmVisit: 0, latest: null, lastSeenInput: 0, time: 0 };

  function makeProxy() {
    var sim = { players: [], enemies: [], cpus: [], time: 0, farm: null, rejected: 0,
      player: function () { return null; } };
    /* the brawl is the host's: show its latest state as if it were local */
    var bsim = { snapshot: guestBrawl, match: null };
    Object.defineProperty(sim, "phase", { get: guestPhase, set: function () {} });
    Object.defineProperty(sim, "brawlSim", { get: function () { return guestPhase() === "brawl" ? bsim : null; }, set: function () {} });
    Object.defineProperty(sim, "brawl", { get: function () { return guestPhase() === "brawl" ? guestBrawl() : null; }, set: function () {} });
    return {
      isProxy: true, dt: CFG.tickMs / 1000, allowDebugIntents: false, progression: null, sim: sim,
      setLocalPause: function () { return false; },
      onMessage: function (msg) {
        var inp = msg && msg.inputs && msg.inputs[msg.inputs.length - 1];
        if (inp) {
          G.input.x = num(inp.x); G.input.y = num(inp.y); G.input.atk = !!inp.atk; G.input.aim = num(inp.aim); G.input.interact = !!inp.interact;
          if (inp.focus !== undefined) G.input.focus = inp.focus;
          if (inp.go) G.input.go = inp.go;
          if (inp.atk) G.input.atkTap = true;
          if (inp.dash) G.input.dashTap = true;
        }
        return { ok: true };
      },
      step: function () {},
      syncHost: function () { return { ok: false }; },
      act: guestAct,
      snapshot: function () { return buildView(); }
    };
  }

  function attachGuest(localAuth, run) {
    G.local = localAuth;
    G.proxy = makeProxy();
    G.snaps = []; G.offs = []; G.offset = null; G.orbs = []; G.slow = {}; G.ia = 0; G.overrides = []; G.events = [];
    G.pred = { x: run.x, y: run.y, px: run.x, py: run.y, ex: 0, ey: 0, acc: 0, seq: 0, pending: [] };
    G.lastFrame = now(); G.inFarm = false; G.farmDone = 0; G.latest = null; G.time = 0;
    G.brawl = null; G.brawlDone = null; G.paidMatch = null; G.myBits = null;
    netRun = true;
    if (players[myId]) players[myId].state = "playing";
    return G.proxy;
  }

  function guestPhase() {
    var L = G.latest;
    return (L && L.ph === 2 && G.brawl && G.brawl.matchId !== G.brawlDone) ? "brawl" : "playing";
  }
  function guestBrawl() {
    var b = G.brawl, out, i, f, k, a;
    if (!b) return null;
    out = {};
    for (k in b) out[k] = b[k];
    out.fighters = [];
    for (i = 0; i < (b.fighters || []).length; i++) {
      f = {};
      for (k in b.fighters[i]) f[k] = b.fighters[i][k];
      f.kind = f.id === myId ? "local" : (f.kind === "bot" ? "bot" : "client");
      out.fighters.push(f);
    }
    if (b.payout) {
      out.payout = {};
      for (k in b.payout) out.payout[k] = b.payout[k];
      out.payout.awards = (b.payout.awards || []).map(function (aw) { a = {}; for (k in aw) a[k] = aw[k]; a.local = aw.id === myId; return a; });
      out.payout.legendaryDrop = []; out.payout.mysterious = false;
      if (G.myBits != null) out.payout.localBits = G.myBits;
    }
    return out;
  }
  /* A friend's brawl winnings go into their own save, once per match. */
  function creditBrawl() {
    var b = G.brawl, i, sum = 0, acc;
    if (!b || !b.payout || G.paidMatch === b.matchId) return;
    G.paidMatch = b.matchId;
    for (i = 0; i < (b.payout.awards || []).length; i++) if (b.payout.awards[i].id === myId) sum += b.payout.awards[i].amount || 0;
    try {
      acc = D.bridge.account();
      if (sum > 0) { acc.digiBits = Math.max(0, (acc.digiBits || 0) + sum); D.bridge.persist(acc); }
      G.myBits = acc.digiBits || 0;
    } catch (e) {}
  }

  function me() {
    var s = G.latest, i;
    if (!s) return null;
    for (i = 0; i < s.P.length; i++) if (s.P[i].id === myId) return s.P[i];
    return null;
  }

  function fromHost(d) {
    var run, i;
    if (d.t === "s") {
      if (!G.proxy) return;
      var t = now();
      d.recv = t;
      d.Emap = {};
      for (i = 0; i < d.E.length; i++) d.Emap[d.E[i][0]] = d.E[i];
      G.offs.push(t - d.ht);
      if (G.offs.length > 40) G.offs.shift();
      G.offset = Math.min.apply(null, G.offs);
      G.snaps.push(d);
      if (G.snaps.length > 10) G.snaps.shift();
      G.latest = d;
      if (d.O) G.orbs = d.O;
      if (d.ev && d.ev.length) Array.prototype.push.apply(G.events, d.ev);
      reconcile(d);
    } else if (d.t === "br") {
      if (G.proxy && d.s) { G.brawl = d.s; creditBrawl(); }
    } else if (d.t === "me") {
      G.slow = d.s || {};
      G.ia = d.ia || 0;
      G.overrides = G.overrides.filter(function (o) { return o.n > G.ia; });
    } else if (d.t === "roster") {
      var mine = players[myId];
      players = {}; order = [];
      (d.players || []).forEach(function (p) { players[p.id] = p; order.push(p.id); });
      if (d.mode) hostMode = String(d.mode).slice(0, 12);
      if (mine && players[myId] && myPick) { players[myId].line = players[myId].line || mine.line; players[myId].tamerId = players[myId].tamerId || mine.tamerId; }
      emit("change");
    } else if (d.t === "start") {
      run = D.getRun && D.getRun();
      if (!myPick || (netRun && G.proxy && run && !run.ended)) return;
      starting = true;
      var old = D._shotSeed;
      D._shotSeed = d.seed;
      try { D.startRun(myPick.line, myPick.tamerId); } finally { D._shotSeed = old; }
      emit("change");
    } else if (d.t === "lobby") {
      run = D.getRun && D.getRun();
      netRun = false;
      if (G.inFarm) abortLocalFarm();
      G.proxy = null;
      if (run && !run.ended) { D.bridge.endRun(); }
      if (D.getState() !== "gameover") D.setState("lobby");
      emit("change");
    } else if (d.t === "res") {
      run = D.getRun && D.getRun();
      if (!run || d.k !== "capture" || !d.res) return;
      if (d.res.ok) { D.bridge.float(run.x, run.y - 36, "Captured!", "#6ad0ff"); if (D.uiSfx) D.uiSfx("level"); if (run.captureFx) run.captureFx.ok = true; }
      else if (d.res.reason && d.res.reason !== "rejected") D.bridge.float(run.x, run.y - 28, d.res.reason, "#ff8080");
      else if (d.res.chance != null) { D.bridge.float(run.x, run.y - 36, "Broke free!", "#ff8080"); if (D.uiSfx) D.uiSfx("hurt"); }
    }
  }

  function tamerSpeed() {
    var lv = (G.slow.statLevels && G.slow.statLevels.speed) || 0;
    return ((D.TAMER && D.TAMER.speed) || 160) * Math.pow(1.12, lv);
  }
  function moveOnce(x, y, ix, iy) {
    var l = Math.sqrt(ix * ix + iy * iy);
    if (l > 1) { ix /= l; iy /= l; }
    var sp = tamerSpeed() * (CFG.tickMs / 1000);
    if (D.world && D.world.moveSlide) return D.world.moveSlide(x, y, ix * sp, iy * sp, (D.TAMER && D.TAMER.radius) || 10);
    return { x: x + ix * sp, y: y + iy * sp };
  }

  /* The host says where we were as of input `ack`; replay what it has not
   * seen yet and ease out any difference instead of snapping. */
  function reconcile(snap) {
    var p = G.pred, m = null, i, pos;
    if (!p) return;
    for (i = 0; i < snap.P.length; i++) if (snap.P[i].id === myId) m = snap.P[i];
    if (!m) return;
    while (p.pending.length && p.pending[0].seq <= m.ack) p.pending.shift();
    pos = { x: m.x, y: m.y };
    if (!snap.ph) {
      for (i = 0; i < p.pending.length; i++) pos = moveOnce(pos.x, pos.y, p.pending[i].x, p.pending[i].y);
    } else p.pending.length = 0;
    var dx = pos.x - p.x, dy = pos.y - p.y, d2 = dx * dx + dy * dy;
    if (d2 > 90 * 90) { p.ex = 0; p.ey = 0; p.px = pos.x; p.py = pos.y; }
    else { p.ex -= dx; p.ey -= dy; p.px += dx; p.py += dy; }
    p.x = pos.x; p.y = pos.y;
  }

  function predict(t) {
    var p = G.pred, dt = Math.min(250, t - G.lastFrame), st = D.getState(), m = me(), inp = G.input, pos, msg;
    G.lastFrame = t;
    if (!p) return;
    var frozen = !m || (G.latest && G.latest.ph) || G.inFarm;
    var active = st === "playing";
    p.acc += dt;
    if (p.acc > 200) p.acc = 200;
    while (p.acc >= CFG.tickMs) {
      p.acc -= CFG.tickMs;
      p.seq += 1;
      var inBrawl = st === "brawl";
      var ix = (active && !frozen) || inBrawl ? inp.x : 0, iy = (active && !frozen) || inBrawl ? inp.y : 0;
      p.px = p.x; p.py = p.y;
      if (!frozen) {
        pos = moveOnce(p.x, p.y, ix, iy);
        p.x = pos.x; p.y = pos.y;
        p.pending.push({ seq: p.seq, x: ix, y: iy });
        if (p.pending.length > 60) p.pending.shift();
      }
      msg = { t: "i", n: p.seq, x: r2(ix), y: r2(iy), a: (active && inp.atk) || (inBrawl && (inp.atk || inp.atkTap)) ? 1 : 0, m: r2(inp.aim), e: active && inp.interact ? 1 : 0 };
      if (inBrawl && (inp.dash || inp.dashTap)) msg.d = 1;
      inp.atkTap = false; inp.dashTap = false;
      if (inp.focus != null) { msg.f = inp.focus; inp.focus = null; }
      if (inp.go) { msg.g = [Math.round(inp.go[0]), Math.round(inp.go[1])]; inp.go = null; }
      if (st === "levelup" || st === "evolution") msg.b = 1;
      /* idle and frozen: a trickle is enough to keep the host informed */
      if (!frozen || inBrawl || p.seq % 5 === 0 || msg.f != null) toHost(msg);
    }
    p.ex *= 0.86; p.ey *= 0.86;
    if (Math.abs(p.ex) < 0.05) p.ex = 0;
    if (Math.abs(p.ey) < 0.05) p.ey = 0;
  }

  var EMPTY = { kind: "snapshot", players: [], enemies: [], orbs: [], bullets: [], arcs: [], cpus: [], events: [] };

  function buildView() {
    var t = now(), S = G.snaps, i, k, a, b, rt, out, m, mine, pa, pb, o, e, ea, list, age;
    predict(t);
    if (!S.length) { EMPTY.events = []; return EMPTY; }
    b = S[S.length - 1]; a = b;
    rt = (t - G.offset) - CFG.interpMs;
    if (rt < b.ht) {
      for (i = S.length - 1; i > 0; i--) { if (S[i - 1].ht <= rt) { a = S[i - 1]; b = S[i]; break; } }
      if (i === 0) { a = b = S[0]; }
    }
    k = a === b ? 0 : clamp((rt - a.ht) / Math.max(1, b.ht - a.ht), 0, 1);
    var L = G.latest;
    G.time = a.tm + (b.tm - a.tm) * k;

    /* players */
    list = [];
    var pmapA = {};
    for (i = 0; i < a.P.length; i++) pmapA[a.P[i].id] = a.P[i];
    for (i = 0; i < b.P.length; i++) {
      pb = b.P[i]; pa = pmapA[pb.id] || pb;
      if (pb.id === myId) continue;
      o = {};
      for (m in pb) o[m] = pb[m];
      o.x = pa.x + (pb.x - pa.x) * k; o.y = pa.y + (pb.y - pa.y) * k;
      o.mx = pa.mx + (pb.mx - pa.mx) * k; o.my = pa.my + (pb.my - pa.my) * k;
      o.hasTamer = true; o.moving = !!pb.moving; o.monMoving = !!pb.monMoving; o.downed = !!pb.downed;
      list.push(o);
    }
    mine = null;
    for (i = 0; i < L.P.length; i++) if (L.P[i].id === myId) mine = L.P[i];
    if (mine) {
      o = {};
      for (m in G.slow) o[m] = G.slow[m];
      for (m in mine) o[m] = mine[m];
      for (i = 0; i < G.overrides.length; i++) for (m in G.overrides[i].f) o[m] = G.overrides[i].f[m];
      var p = G.pred, f = clamp(p.acc / CFG.tickMs, 0, 1);
      o.x = p.px + (p.x - p.px) * f + p.ex; o.y = p.py + (p.y - p.py) * f + p.ey;
      /* partner: drawn slightly in the past like everyone else's */
      pa = pmapA[myId]; pb = null;
      for (i = 0; i < b.P.length; i++) if (b.P[i].id === myId) pb = b.P[i];
      if (pa && pb) { o.mx = pa.mx + (pb.mx - pa.mx) * k; o.my = pa.my + (pb.my - pa.my) * k; }
      o.hasTamer = true; o.downed = !!mine.downed; o.monMoving = !!mine.monMoving;
      o.moving = !!(G.input.x || G.input.y) && !L.ph;
      if (o.moving) {
        if (G.input.x > 0.15) o.facing = 1; else if (G.input.x < -0.15) o.facing = -1;
        o.tdir = Math.abs(G.input.y) > Math.abs(G.input.x) + 0.05 ? (G.input.y > 0 ? "down" : "up") : "side";
      }
      o.pendingFarm = false; o.pendingBrawl = false;
      if (o.weapons) for (i = 0; i < o.weapons.length; i++) o.weapons[i].spin = G.time * 2.4;
      list.unshift(o);
      mine = o;
    }

    /* enemies */
    var en = [];
    for (i = 0; i < b.E.length; i++) {
      e = b.E[i]; ea = a.Emap[e[0]] || e;
      en.push({ _id: e[0], type: e[1], x: ea[2] + (e[2] - ea[2]) * k, y: ea[3] + (e[3] - ea[3]) * k, hp: e[4], maxHp: e[5], facing: e[6],
        radius: e[7], flash: (e[8] & 1) ? 0.1 : 0, boss: !!(e[8] & 2), mega: !!(e[8] & 4), lord: !!(e[8] & 8), rival: !!(e[8] & 16), virus: !!(e[8] & 32), zz: (e[8] & 64) ? 1 : 0, dmgMul: e[9], st: e[10] || 0, war: e[11] || null, fac: e[12] || null, rally: e[13] || null, alv: e[14] || 0, lv: e[15] || 1, nem: e[16] || 0, nemTitle: e[17] || null, nemScale: e[18] || 1, dead: false });
    }
    /* bullets carry a velocity, so move them along from the newer frame */
    var bl = [];
    age = (rt - b.ht) / 1000;
    for (i = 0; i < b.B.length; i++) {
      e = b.B[i];
      if (e[6] - age <= 0) continue;
      bl.push({ x: e[0] + e[2] * age, y: e[1] + e[3] * age, vx: e[2], vy: e[3], radius: e[4], color: e[5], life: e[6] - age, wid: e[7] || null, kind: e[8] ? "nova" : "projectile" });
    }
    var orbs = [];
    for (i = 0; i < G.orbs.length; i++) { e = G.orbs[i]; orbs.push({ id: e[0], kind: e[1], x: e[2], y: e[3], value: e[4], magnet: !!e[5] }); }
    var cp = [], cmap = {};
    for (i = 0; i < a.C.length; i++) cmap[a.C[i].id] = a.C[i];
    for (i = 0; i < b.C.length; i++) {
      pb = b.C[i]; pa = cmap[pb.id] || pb;
      o = {}; for (m in pb) o[m] = pb[m];
      o.x = pa.x + (pb.x - pa.x) * k; o.y = pa.y + (pb.y - pa.y) * k;
      cp.push(o);
    }
    var ev = G.events; G.events = [];
    G.proxy.sim.time = G.time;
    out = {
      kind: "snapshot", tick: L.n, time: G.time, full: true, players: list, enemies: en, orbs: orbs, bullets: bl, arcs: b.ar || [],
      cpus: cp, ally: b.al || null, events: ev, kills: L.kl,
      patches: (L.pt || []).map(function (q) { return { id: q[0], kind: q[1], x: q[2], y: q[3], r: q[4], t: q[5], max: q[6] }; }),
      pendingLevels: mine ? (mine.pendingLevels || 0) : 0, levelOffers: mine ? (mine.levelOffers || []) : [],
      merchant: L.mr || null, runOver: !!L.ro, phase: "playing", clock: L.ck || null, lifecycle: null,
      startingPartySize: L.ps, partyReviveCharge: L.pc, reviveHold: null, weather: L.wx || null, rival: L.rv || null,
      soak: L.sk || 0, terr: L.tr || "", fronts: L.fr || null, nests: L.ns || null, nems: L.nm || null
    };
    return out;
  }

  function guestAct(intent) {
    var m, cur, f, price, bought, item;
    if (!intent || !intent.type) return { ok: false, reason: "empty" };
    if (intent.type === "brawl.begin") {
      m = guestBrawl();
      if (!m) return { ok: true, skipped: true, fighters: [] };
      return { ok: true, matchId: m.matchId, fighters: m.fighters, phase: m.phase, revivedId: m.revivedId, snap: m };
    }
    if (intent.type === "brawl.ready" || intent.type === "brawl.dismiss") return { ok: true, already: true };
    if (intent.type === "brawl.conclude") { m = guestBrawl() || {}; return { ok: true, already: true, payout: m.payout, winnerId: m.winnerId }; }
    if (intent.type === "brawl.bet") { toHost({ t: "act", n: ++G.intentN, i: { type: "brawl.bet", targetId: intent.targetId } }); return { ok: true }; }
    if (!ACTS[intent.type]) return { ok: false, reason: "online" };
    G.intentN += 1;
    toHost({ t: "act", n: G.intentN, i: intent });
    m = me() || {};
    if (intent.type === "levelup") {
      cur = Math.max(0, (m.pendingLevels || 1) - 1);
      G.overrides.push({ n: G.intentN, f: { pendingLevels: cur, levelOffers: [] } });
      return { ok: true, pending: cur };
    }
    if (intent.type === "shop.buy") {
      item = D.shopItem && D.shopItem(intent.item);
      bought = (G.slow.shopBought && G.slow.shopBought[intent.item]) || 0;
      price = item ? (D.shopPrice ? D.shopPrice(intent.item, bought) : (item.price || 0)) : 0;
      f = { bits: Math.max(0, (m.bits || 0) - price), shopBought: Object.assign({}, G.slow.shopBought || {}) };
      f.shopBought[intent.item] = bought + 1;
      G.overrides.push({ n: G.intentN, f: f });
      return { ok: true, item: intent.item, price: price, bits: f.bits };
    }
    if (intent.type === "skill.add") {
      /* shown at once here; the host applies the same tree rules */
      var sk2 = Object.assign({}, m.skills || {});
      if (!D.SKILLS || !((m.skillPoints || 0) > 0) || D.SKILLS.blocked(D, m.form, sk2, intent.skill)) return { ok: false, reason: "Can't learn that yet" };
      if (D.SKILL_CARDS && !(sk2[intent.skill] > 0) && m.skillOffer && m.skillOffer.indexOf(intent.skill) < 0) return { ok: false, reason: "New skills come from level-up cards" };
      sk2[intent.skill] = (sk2[intent.skill] || 0) + 1;
      G.overrides.push({ n: G.intentN, f: { skills: sk2, skillPoints: (m.skillPoints || 0) - 1, skillOffer: null } });
      return { ok: true, skill: intent.skill, level: sk2[intent.skill] };
    }
    if (intent.type === "stat.add") {
      /* shown at once here with the same cost rule the host applies */
      var RO2 = D.RO, at2 = Object.assign(RO2 ? RO2.fresh() : {}, m.attrs || {}), left2 = m.statPoints || 0, want2 = Math.max(1, intent.n | 0 || 1), did2 = 0;
      if (!RO2 || at2[intent.stat] == null) return { ok: false, reason: "Not enough points" };
      while (did2 < want2 && at2[intent.stat] < RO2.CFG.cap && left2 >= RO2.cost(at2[intent.stat])) { left2 -= RO2.cost(at2[intent.stat]); at2[intent.stat] += 1; did2 += 1; }
      if (!did2) return { ok: false, reason: "Not enough points" };
      G.overrides.push({ n: G.intentN, f: { attrs: at2, statPoints: left2 } });
      return { ok: true, stat: intent.stat, value: at2[intent.stat], left: left2 };
    }
    if (intent.type === "breather.end" || intent.type === "prop.use" || intent.type === "pvp.flag") return { ok: true, pending: true };
    if (intent.type === "burst") return (m.burst || 0) >= 100 ? { ok: true, pending: true } : { ok: false, reason: "charging" };
    if (intent.type === "dna.ask" || intent.type === "dna.answer") return { ok: true, pending: true };   /* the host decides; events follow */
    if (intent.type === "evolve" || intent.type === "evolve.hold") {
      /* the prompt closes at once; the host's answer (a digivolution, or a perk) follows */
      G.overrides.push({ n: G.intentN, f: { evoOffer: null } });
      return { ok: true };
    }
    if (intent.type === "field.feed") {
      /* shown at once on this screen; the host's answer settles it a moment later */
      item = D.FOOD && D.FOOD[intent.food];
      if (!item || !(m.bag && m.bag[intent.food] > 0)) return { ok: false, reason: "None left" };
      f = { bag: Object.assign({}, m.bag), fullness: Math.min((D.CARE && D.CARE.fullnessMax) || 100, (m.fullness || 0) + (item.fullness || 20)),
        happiness: Math.min((D.CARE && D.CARE.happinessMax) || 100, (m.happiness || 0) + (item.happiness || 4)) };
      f.bag[intent.food] -= 1;
      G.overrides.push({ n: G.intentN, f: f });
      return { ok: true, food: intent.food, fullness: f.fullness };
    }
    /* capture: the host rolls it; the answer arrives a moment later */
    return { ok: false, reason: "rejected", pending: true };
  }

  /* --- a friend's farm visit runs on their own device --- */
  /* a friend chose to go to the farm (Nov 20, the Farm button): the host takes their pair out of the
   * world (p.atFarm) and the visit runs here as before; farmDone brings them back where they stood */
  function guestGoFarm() {
    if (role !== "guest" || !netRun || G.inFarm) return false;
    toHost({ t: "farmGo" });
    return beginLocalFarm(-1);
  }
  function beginLocalFarm(visitId) {
    var local = G.local, L = G.latest, mine, lp, k, v;
    if (!local || !local.sim || !L) return false;
    lp = local.sim.player("local") || local.sim.players[0];
    if (!lp) return false;
    mine = {};
    for (k in G.slow) mine[k] = G.slow[k];
    v = me() || {};
    for (k in v) mine[k] = v[k];
    for (k in mine) {
      if (k === "id" || k === "slot" || k === "kind" || k === "ack" || k === "away" || k === "levelOffers" || k === "pendingLevels") continue;
      lp[k] = clone(mine[k]);
    }
    lp.hasTamer = true; lp.pendingFarm = true; lp.pendingBrawl = false; lp.downed = false;
    local.sim.time = L.tm; local.sim.phase = "playing"; local.sim.farm = null; local.sim.runOver = false;
    if (local.sim.lifecycle) local.sim.lifecycle.resume = null;
    G.inFarm = true; G.farmVisit = visitId != null ? visitId : L.fm;
    D.bridge.setAuth(local, "local");
    if (!D.bridge.startFarm() || D.getState() !== "farm") { abortLocalFarm(); return false; }
    return true;
  }
  function abortLocalFarm() {
    G.inFarm = false;
    if (G.proxy) D.bridge.setAuth(G.proxy, myId);
  }
  function finishLocalFarm() {
    var local = G.local, lp = local && local.sim && (local.sim.player("local") || local.sim.players[0]), s = {}, f = {};
    if (lp) {
      FARM_KEYS.forEach(function (k) { if (lp[k] !== undefined) { s[k] = clone(lp[k]); f[k] = s[k]; } });
      s.hp = lp.hp; s.tamerHp = lp.tamerHp;
      f.hp = lp.hp;
    }
    G.intentN += 1;
    G.overrides.push({ n: G.intentN, f: f });
    toHost({ t: "farmDone", n: G.intentN, visit: G.farmVisit, s: s });
    G.farmDone = G.farmVisit;
    G.inFarm = false;
    D.bridge.setAuth(G.proxy, myId);
  }

  function guestFrame() {
    var L = G.latest, st, run;
    if (role !== "guest" || !netRun || !G.proxy || !L) return;
    run = D.getRun && D.getRun();
    if (!run || run.ended) return;
    st = D.getState();
    if (L.fm && L.fm !== G.farmDone && !G.inFarm && st === "playing") beginLocalFarm();
    /* the brawl screen does not poll the proxy, so keep the input flowing here */
    if (st === "brawl") predict(now());
  }

  D.onStateChange = function (s, prev) {
    if (role === "guest" && G.inFarm && prev === "farm" && s === "playing") finishLocalFarm();
    if (role === "guest" && prev === "brawl" && s !== "brawl" && G.brawl) G.brawlDone = G.brawl.matchId;
    var rp = document.getElementById("revive-prompt");
    if (rp && s !== "playing" && role) rp.hidden = true;
    emit("state", s, prev);
  };

  function loop() {
    requestAnimationFrame(loop);
    try { guestFrame(); } catch (e) { if (global.console) console.error(e); }
    emit("frame");
  }
  requestAnimationFrame(loop);

  /* ------------------------------------------------------------------ */
  /* Shared helpers for the game and the UI                              */
  /* ------------------------------------------------------------------ */
  function view() { return role === "host" ? (H.view || {}) : (G.latest ? { rv: G.latest.rv || {}, fm: G.latest.fm, fw: G.latest.fw || [], ph: G.latest.ph } : {}); }

  function playerInfo(id) { return players[wid(id)] || null; }

  /* Hold-to-revive prompt for the HUD: am I next to a downed friend? */
  function reviveUi() {
    var run = D.getRun && D.getRun(), v = view(), i, o, best = null, r2x = CFG.reviveRadius * CFG.reviveRadius, dx, dy, pl;
    if (!netRun || !run || run.downed || G.inFarm) return null;
    for (i = 0; i < (run.others || []).length; i++) {
      o = run.others[i];
      if (!o.downed) continue;
      dx = o.mx - run.x; dy = o.my - run.y;
      if (dx * dx + dy * dy <= r2x) { best = o; break; }
    }
    if (!best) return null;
    pl = playerInfo(best.id);
    return { text: "Hold to revive " + ((pl && pl.name) || "your friend"), progress: clamp((v.rv && v.rv[wid(best.id)]) || 0, 0, 1) };
  }

  /* Small callouts for things that happen to somebody else. */
  function otherEvent(e, fx) {
    var pl = playerInfo(e.id), name = (pl && pl.name) || "A friend", run = fx.run, o = null, i;
    for (i = 0; i < ((run && run.others) || []).length; i++) if (wid(run.others[i].id) === wid(e.id)) o = run.others[i];
    if (!o) return;
    if (e.type === "hatch") { fx.float(o.mx, o.my - 30, name + "'s egg hatched!", pl ? pl.color : "#ffe080"); fx.burst(o.mx, o.my, "#ffd200", 18, 200); }
    else if (e.type === "evolve") {
      fx.float(o.mx, o.my - 34, name + "'s partner digivolved!", pl ? pl.color : "#ffe080");
      fx.burst(o.mx, o.my, "#ffd200", 30, 280); fx.burst(o.mx, o.my, "#fff8f0", 14, 200);
      if (e.to && D.sprites && D.sprites.preloadSpecies) D.sprites.preloadSpecies(e.to, true);
    }
    else if (e.type === "faint") fx.float(o.mx, o.my - 28, "Fainted!", "#ffb080");
    else if (e.type === "downed") fx.float(o.mx, o.my - 40, name + "'s partner is down!", "#ff8a7a");
    else if (e.type === "level") fx.float(o.x, o.y - 70, "Lv " + e.level, pl ? pl.color : "#7cf0c0");
  }

  D.online = {
    cfg: CFG, on: on,
    role: function () { return role; },
    code: function () { return code; },
    myId: function () { return role === "host" ? "local" : myId; },
    netId: function () { return myId; },
    name: function () { return myName; },
    setProfile: setProfile,
    playerName: function (id) { var pl = playerInfo(id); return (pl && pl.name) || null; },
    info: function () { return info; },
    players: rosterList,
    playerInfo: playerInfo,
    connected: function () { return !!ws && ws.readyState === 1; },
    canConnect: canConnect,
    active: function () { return !!role && netRun; },
    running: function () { return role === "host" ? !!H.auth : netRun; },
    isGuest: function () { return role === "guest" && (starting || netRun); },
    drivesClock: function () { return !!role && netRun; },
    wantsBrawl: function () {
      if (!netRun || D.getState() === "brawl") return false;
      return role === "guest" ? guestPhase() === "brawl" : !!(H.sim && H.sim.phase === "brawl");
    },
    wantsFarm: function () { var L = G.latest; return role === "guest" && netRun && !!L && !!L.fm && L.fm !== G.farmDone && !G.inFarm; },
    goFarm: guestGoFarm,
    inSetup: function () { return !!role && setup; },
    view: view,
    host: host, join: join, leave: leave, setName: setName, startGame: startGame, afterRun: afterRun,
    interceptStart: interceptStart,
    setPick: setPick,
    refresh: function () { if (role === "host") pushRoster(); },
    hostMode: function () { return role === "host" ? ((D.menu && D.menu.mode && D.menu.mode()) || "open") : hostMode; },
    myState: function () { var me = players[myId]; return me ? me.state : null; },
    cancelSetup: function () { if (role && !netRun && !(role === "host" && H.auth)) leave("cancel"); },
    reviveUi: reviveUi,
    otherEvent: otherEvent,
    onAuthBoot: function (auth, run) {
      if (!role || !starting) return auth;
      starting = false;
      if (role === "host") { attachHost(auth, run); return auth; }
      return attachGuest(auth, run);
    },
    _debug: function () { return { H: H, G: G, players: players }; }
  };
})(window);
