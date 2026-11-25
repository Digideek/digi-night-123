/* Night Siege (17z33; data.js SIEGE). Grow by day, hold out by night, again and again. One life.
 *
 * The nights are the day clock's (seasons.js: 243 s a day). From dusk (SIEGE.startAt of the day)
 * to dawn (SIEGE.endAt), every waveEvery seconds a ring of attackers comes in from off screen for
 * every tamer still standing: more each night (perNight, perPlayer for each extra tamer), from
 * stronger stages each night, a boss with them every bossEvery nights. They don't wander: they come
 * straight for you. At dawn the ones left run off, and everyone still standing is paid for the
 * night. One life (modes-sim.js _oneLife): when every partner is down, the run is over, and the
 * nights you held out are its score.
 *
 * Every screen hears siege.state (once a second), siege.warn (dusk is coming), siege.night (it has
 * begun), siege.dawn (survived, and what everyone got); js/modes-ui.js draws them.
 *
 * Primary Village (17z33, SIEGE.nest): a nest of Digi-eggs a little below the start. The attackers come
 * in round the nest, not round you, and go for the eggs; a tamer or partner within nest.aggro turns them
 * (_siegeAct), and they stay on you until everyone is past nest.release. They never try to get round you.
 * siege.egg (an egg hurt), siege.eggLost (smashed), siege.nestLost (the last one: the run is over). The
 * nest and its eggs are in the snapshot (nest).
 * Then (17z33): eggs that see SIEGE.nest.hatchAfter dawns unbroken hatch into Babies that fight at your
 * side (_siegeHatch, siege.hatch); a smashed egg can be rebuilt by day for DigiCoins at the nest
 * (_siegeRepair, the "siege.repair" intent); and from raidFrom night some attackers are raiders that never
 * turn on you (e.raider).
 */
(function (root) {
  "use strict";
  function install(MissionSim, U) {
    var dist2 = U.dist2;
    function cfg(sim) { return sim.data.SIEGE; }
    function dayOf(sim) {
      var S = sim.data.seasons, len = (S && S.DAY && S.DAY.lengthSec) || 243, c = ((sim.time || 0) / len) % 1;
      return { c: c, day: Math.floor((sim.time || 0) / len) + 1, len: len };
    }
    MissionSim.prototype._siegeUp = function () {
      var out = [], i, p;
      for (i = 0; i < this.players.length; i++) { p = this.players[i]; if (p.hasTamer !== false && !p.downed && !p.away && !p.atFarm && !(this._isEgg && this._isEgg(p.form) && p.hatchLeft > 0)) out.push(p); }
      return out;
    };
    /* what kind of night this is (data.js SIEGE.nights): "normal", "swarm", "flyer", "giant" or "raider",
       and how many times round the order it is (lap 0, 1, 2...) */
    function nightKind(C, night) {
      var NG = C.nights, k;
      if (!NG || night < NG.from) return { kind: "normal", lap: 0 };
      k = night - NG.from;
      if (k % NG.every) return { kind: "normal", lap: 0 };
      k = k / NG.every;
      return { kind: NG.order[k % NG.order.length], lap: Math.floor(k / NG.order.length) };
    }
    MissionSim.prototype._siegeKind = function (night) { return nightKind(cfg(this), night); };
    /* flyers: crossOf 2 (biomes.js: they go over water and cliffs) */
    MissionSim.prototype._siegeType = function (night, flyers) {
      var C = cfg(this), st = C.stages[Math.max(0, Math.min(C.stages.length - 1, night - 1))], defs = this._enemies(), pool = [], k, B = this.data.biomes;
      for (k in defs) if (defs[k] && !defs[k].boss && st.indexOf((this.data.SPECIES && this.data.SPECIES[k] && this.data.SPECIES[k].stage) || stageName(defs[k])) >= 0) pool.push(k);
      if (flyers && B && B.crossOf) { var fl = pool.filter(function (id) { return B.crossOf(id) === 2; }); if (fl.length) pool = fl; }
      if (!pool.length) for (k in defs) if (defs[k] && !defs[k].boss) pool.push(k);
      pool.sort();
      return pool[(this.rng() * pool.length) | 0];
    };
    function stageName(def) {
      var s = def.stageDisplay || "";
      return /Baby I\b|Baby$/.test(s) && !/II/.test(s) ? "Baby" : (/In-Training|Baby II/.test(s) ? "In-Training" : (/Rookie/.test(s) ? "Rookie" : (/Champion/.test(s) ? "Champion" : (/Ultimate \(Mega|Mega/.test(s) ? "Mega" : (/Ultimate|Perfect/.test(s) ? "Ultimate" : "")))));
    }
    /* the nest, made the first time it is needed, a little below where the first tamer starts */
    MissionSim.prototype._siegeNest = function () {
      var C = cfg(this), N = C && C.nest, sg = this.siege, p0, c, i, a, eggs;
      if (!N || !sg) return null;
      if (sg.nest) return sg.nest;
      p0 = this.players[0]; if (!p0) return null;
      c = this._snap(p0.x, p0.y + N.offset, 30, 300);
      eggs = [];
      for (i = 0; i < N.eggs; i++) {
        a = -Math.PI / 2 + i / N.eggs * Math.PI * 2;
        eggs.push({ x: Math.round(c.x + Math.cos(a) * N.ring), y: Math.round(c.y + Math.sin(a) * N.ring * 0.7), hp: N.hp, max: N.hp, age: 0, k: i % N.kinds.length });
      }
      sg.nest = { x: Math.round(c.x), y: Math.round(c.y), eggs: eggs, next: N.eggs % N.kinds.length, fences: [], wood: {} };
      var F = C.fence, fa;
      if (F) for (i = 0; i < F.spots; i++) {
        fa = (i + 0.5) / F.spots * Math.PI * 2;
        sg.nest.fences.push({ x: Math.round(c.x + Math.cos(fa) * F.rx), y: Math.round(c.y + Math.sin(fa) * F.ry), hp: 0, max: F.hp, built: 0 });
      }
      return sg.nest;
    };
    /* at dawn: the oldest egg that has seen enough dawns unbroken hatches into its Baby, who fights at
       your side; a fresh egg takes its place. One a dawn, while fewer than nest.helpers are up. */
    MissionSim.prototype._siegeHatch = function (night) {
      var C = cfg(this), N = C.nest, nest = this.siege.nest, i, g, best = -1, up = 0, form, sp, hp, c, a;
      this.cpus = this.cpus.filter(function (q) { return !(q.siegeKid && q.hp <= 0); });   /* the fallen are gone by morning */
      for (i = 0; i < this.cpus.length; i++) if (this.cpus[i].siegeKid && this.cpus[i].hp > 0) up++;
      if (up >= N.helpers) return null;
      for (i = 0; i < nest.eggs.length; i++) { g = nest.eggs[i]; if (g.hp > 0 && (g.age || 0) >= N.hatchAfter && (best < 0 || g.age > nest.eggs[best].age)) best = i; }
      if (best < 0) return null;
      g = nest.eggs[best]; form = N.kinds[g.k % N.kinds.length];
      sp = this.data.SPECIES && this.data.SPECIES[form];
      hp = Math.round(((sp && sp.base && sp.base.maxHp) || 60) * (1 + N.helperHpPerNight * Math.max(0, night - 1)));
      a = this.rng() * Math.PI * 2;
      c = this.addCpu({ id: "kid-" + (this._kidN = (this._kidN || 0) + 1), form: form, x: g.x + Math.cos(a) * 30, y: g.y + Math.sin(a) * 20, hp: hp, maxHp: hp,
        weapon: { id: (sp && sp.startWeapon) || "bubbleBlow", level: Math.min(5, 1 + Math.floor(night / 2)), cd: 0 } });
      c.siegeKid = 1;
      tally(this, "hatched");
      this.emit({ type: "siege.hatch", form: form, name: c.name, x: Math.round(g.x), y: Math.round(g.y), night: night });
      /* a fresh egg in its place */
      g.max = eggMax(this); g.hp = g.max; g.age = 0; g.k = nest.next || 0; nest.next = ((nest.next || 0) + 1) % N.kinds.length;
      return c;
    };
    /* by day, at the nest: rebuild a smashed egg for DigiCoins */
    MissionSim.prototype._siegeRepairCost = function () { var N = cfg(this).nest; return N.repairCost + N.repairPerNight * ((this.siege && this.siege.nights) || 0); };
    MissionSim.prototype._siegeRepair = function (p) {
      var C = cfg(this), N = C && C.nest, sg = this.siege, nest = sg && sg.nest, i, g = null, cost;
      if (!nest) return { ok: false, reason: "No nest" };
      if (sg.inNight) return { ok: false, reason: "Not at night: they're attacking!" };
      if (dist2(p.x, p.y, nest.x, nest.y) > N.repairReach * N.repairReach) return { ok: false, reason: "Go to the nest" };
      for (i = 0; i < nest.eggs.length; i++) if (nest.eggs[i].hp <= 0) { g = nest.eggs[i]; break; }
      if (!g) return { ok: false, reason: "No smashed eggs" };
      cost = this._siegeRepairCost();
      if ((p.bits || 0) < cost) return { ok: false, reason: "You need " + cost + " DigiCoins" };
      p.bits -= cost;
      g.max = eggMax(this); g.hp = g.max; g.age = 0; g.k = nest.next || 0; nest.next = ((nest.next || 0) + 1) % N.kinds.length;
      tally(this, "rebuilt");
      this.emit({ type: "siege.repair", id: p.id, cost: cost, left: eggsLeft(nest), of: nest.eggs.length, x: g.x, y: g.y });
      return { ok: true, cost: cost };
    };
    /* how tough an egg is now: tougher for every night held, as the attackers are */
    function eggMax(sim) { var N = cfg(sim).nest; return Math.round(N.hp * (1 + (N.hpPerNight || 0) * ((sim.siege && sim.siege.nights) || 0))); }
    function eggsLeft(nest) { var n = 0, i; for (i = 0; i < nest.eggs.length; i++) if (nest.eggs[i].hp > 0) n++; return n; }
    /* ---------- fences (17z33) ---------- where something is against the ring: dn < 1 inside it, and the spot
       whose stretch of the ring it's at */
    function ringAt(sim, nest, x, y) {
      var F = cfg(sim).fence, nx = (x - nest.x) / F.rx, ny = (y - nest.y) / F.ry, a = Math.atan2(ny, nx);
      if (a < 0) a += Math.PI * 2;
      return { dn: Math.sqrt(nx * nx + ny * ny), i: Math.floor(a / (Math.PI * 2) * F.spots) % F.spots, a: a };
    }
    function fenceMax(sim) { var F = cfg(sim).fence; return Math.round(F.hp * (1 + (F.hpPerNight || 0) * ((sim.siege && sim.siege.nights) || 0))); }
    /* the piece of fence between an attacker outside the ring and a target inside it, if one is standing */
    MissionSim.prototype._siegeFenceFor = function (e, tx, ty) {
      var nest = this.siege && this.siege.nest, me, it, f;
      if (!nest || !nest.fences || !nest.fences.length || e.over) return null;     /* a flyer goes over */
      me = ringAt(this, nest, e.x, e.y); it = ringAt(this, nest, tx, ty);
      if (me.dn < 0.97 || it.dn >= 1) return null;
      f = nest.fences[me.i];
      return f && f.hp > 0 ? { f: f, i: me.i, at: me } : null;
    };
    /* go for that piece: stand at the ring where you are and bite it */
    MissionSim.prototype._siegeAtFence = function (e, hit, dt) {
      var F = cfg(this).fence, nest = this.siege.nest, px = nest.x + Math.cos(hit.at.a) * F.rx * 1.04, py = nest.y + Math.sin(hit.at.a) * F.ry * 1.04, r = (e.radius || 10) + 14;
      e.egCd = Math.max(0, (e.egCd || 0) - dt);
      var near = dist2(e.x, e.y, px, py) < r * r;
      return { x: px, y: py, idle: near, fence: near ? hit.i : -1 };
    };
    MissionSim.prototype._siegeFenceBite = function (e, idx, dmg, def) {
      var nest = this.siege && this.siege.nest, f = nest && nest.fences[idx];
      if (!f || f.hp <= 0 || (e.egCd || 0) > 0) return;
      e.egCd = def.contactCd || 0.7;
      f.hp = Math.max(0, f.hp - dmg);
      if (f.hp <= 0) { tally(this, "broken"); this.emit({ type: "siege.fenceDown", i: idx, x: f.x, y: f.y }); }
    };
    /* an attacker can't step through a standing piece: back where it was */
    MissionSim.prototype._siegeBlock = function (e, ox, oy) {
      var nest = this.siege && this.siege.nest, was, now, f;
      if (!nest || !nest.fences || !nest.fences.length || e.over) return;
      was = ringAt(this, nest, ox, oy); if (was.dn < 1) return;
      now = ringAt(this, nest, e.x, e.y); if (now.dn >= 1) return;
      f = nest.fences[now.i];
      if (f && f.hp > 0) { e.x = ox; e.y = oy; }
    };
    /* by day, at a spot: put up a piece of fence for wood and coins */
    MissionSim.prototype._siegeBuild = function (p, idx) {
      var C = cfg(this), F = C && C.fence, sg = this.siege, nest = sg && sg.nest, f, w;
      if (!nest || !F) return { ok: false, reason: "No nest" };
      f = nest.fences[idx | 0];
      if (!f) return { ok: false, reason: "No spot there" };
      if (sg.inNight) return { ok: false, reason: "Not at night: they're attacking!" };
      if (f.hp > 0) return { ok: false, reason: "There's a fence there" };
      if (dist2(p.x, p.y, f.x, f.y) > F.reach * F.reach * 2.5) return { ok: false, reason: "Go to the spot" };
      w = nest.wood[p.id] || 0;
      if (w < F.wood) return { ok: false, reason: "You need " + F.wood + " wood" };
      if ((p.bits || 0) < F.coins) return { ok: false, reason: "You need " + F.coins + " DigiCoins" };
      nest.wood[p.id] = w - F.wood; p.bits -= F.coins;
      f.max = fenceMax(this); f.hp = f.max; f.built = 1;
      tally(this, "built");
      this.emit({ type: "siege.build", id: p.id, i: idx | 0, x: f.x, y: f.y, wood: F.wood, coins: F.coins, woodLeft: nest.wood[p.id] });
      return { ok: true, wood: F.wood, coins: F.coins };
    };
    /* wood: only ever in Night Siege, no limit (picked up in mission-sim _updateOrbs) */
    /* the run's tally for the end screen (17z33): hatched, rebuilt, lost eggs; fences built and broken; wood
       gathered; bosses and giants beaten. Carried in siege.state; modes-ui.js puts it on the game over screen. */
    function tally(sim, k, n) { var sg = sim.siege; if (!sg) return; sg.tally = sg.tally || {}; sg.tally[k] = (sg.tally[k] || 0) + (n == null ? 1 : n); }
    MissionSim.prototype._siegeWoodDrop = function (e) {
      var F = cfg(this) && cfg(this).fence;
      if (!F || !this.siege || !this.siege.nest || !e || e.rival) return;
      if (e.siege && e.giant) tally(this, "giants"); else if (e.siege && e.boss) tally(this, "bosses");
      var ch = e.boss ? 1 : (e.raider ? F.woodRaider : F.woodChance);
      if (this.rng() < ch) this._spawnOrb("wood", e.x + (this.rng() - 0.5) * 24, e.y + (this.rng() - 0.5) * 18, e.boss ? F.woodBoss : 1);
    };
    MissionSim.prototype._siegeGetWood = function (p, n) {
      var nest = this.siege && this.siege.nest;
      if (!nest) return;
      nest.wood[p.id] = (nest.wood[p.id] || 0) + (n || 1);
      tally(this, "wood", n || 1);
    };

    /* An attacker's mind: you, if you are near enough (closest: the squared distance to the nearest tamer,
     * partner or ally, worked out by _updateEnemies); else the nearest egg. null: chase as usual. */
    MissionSim.prototype._siegeAct = function (e, closest, dt, ax, ay) {
      var C = cfg(this), N = C && C.nest, nest = this.siege && this.siege.nest, i, g, best = -1, bd = 1e18, d, r;
      if (!N || !nest) return null;
      r = e.sgOn ? N.release : N.aggro;
      if (!e.raider && closest < r * r) {
        e.sgOn = true;                                                        /* a raider never turns on you */
        /* after you: but if you're inside the fence and it's outside, the fence is in the way */
        var fh = ax != null ? this._siegeFenceFor(e, ax, ay) : null;
        return fh ? this._siegeAtFence(e, fh, dt) : null;
      }
      e.sgOn = false;
      for (i = 0; i < nest.eggs.length; i++) { g = nest.eggs[i]; if (g.hp <= 0) continue; d = dist2(e.x, e.y, g.x, g.y); if (d < bd) { bd = d; best = i; } }
      if (best < 0) return null;
      g = nest.eggs[best];
      var fh2 = this._siegeFenceFor(e, g.x, g.y);
      if (fh2) return this._siegeAtFence(e, fh2, dt);
      this._separateFrom(e, g.x, g.y, N.eggR);
      e.egCd = Math.max(0, (e.egCd || 0) - dt);
      r = (e.radius || 10) + N.eggR + 6;
      return { x: g.x, y: g.y, idle: bd < r * r, egg: bd < r * r ? best : -1 };
    };
    /* an attacker at an egg bites it */
    MissionSim.prototype._siegeBite = function (e, idx, dmg, def) {
      var C = cfg(this), N = C.nest, nest = this.siege && this.siege.nest, g = nest && nest.eggs[idx], left;
      if (!g || g.hp <= 0 || (e.egCd || 0) > 0) return;
      e.egCd = def.contactCd || 0.7;
      g.hp = Math.max(0, g.hp - dmg * (N.biteMul || 1));
      this.emit({ type: "siege.egg", i: idx, hp: Math.round(g.hp), max: g.max, x: g.x, y: g.y });
      if (g.hp > 0) return;
      left = eggsLeft(nest);
      tally(this, "lost");
      this.emit({ type: "siege.eggLost", i: idx, left: left, of: nest.eggs.length, x: g.x, y: g.y });
      if (!left && !this.runOver) {
        this.runOver = true;
        this.emit({ type: "siege.nestLost", night: this.siege.started || 1, tally: this.siege.tally || {} });
        this.emit({ type: "runOver", reason: "nest" });
      }
    };
    MissionSim.prototype._siegeWave = function (night) {
      var C = cfg(this), up = this._siegeUp(), live = 0, i, j, p, n, a, d, type, e, s;
      for (i = 0; i < this.enemies.length; i++) if (this.enemies[i].siege && !this.enemies[i].dead) live++;
      var PP = C.perPlayer || {}, extra = Math.max(0, up.length - 1), many = 1 + (PP.more || 0) * extra;
      if (live >= Math.round(C.cap * many) || !up.length) return 0;
      var NK = nightKind(C, night), NG = C.nights || {}, EN = C.endless, past = Math.max(0, night - C.stages.length), mx = C.max, sw;
      if (EN && past) mx = Math.min(EN.max, C.max + Math.floor(EN.more * past));          /* endless: a few more each night */
      n = Math.min(Math.round(mx * many), Math.round((C.base + C.perNight * (night - 1)) * many));   /* more tamers, more of them */
      if (NK.kind === "swarm") { sw = NG.swarm; n = Math.round(n * (sw.count + sw.countPerLap * NK.lap)); }
      else if (NK.kind === "giant") n = Math.max(1, Math.round(n * NG.giant.guards));
      var nest = this._siegeNest(), made = 0, rings = nest ? [nest] : up;
      n = Math.max(1, Math.ceil(n / rings.length));    /* with a nest, the whole wave comes in round it */
      for (i = 0; i < rings.length; i++) {
        p = rings[i];
        for (j = 0; j < n && live + made < Math.round(C.cap * many); j++) {
          a = this.rng() * Math.PI * 2; d = C.ring[0] + this.rng() * (C.ring[1] - C.ring[0]);
          s = this._snap(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 12, 200);
          type = this._siegeType(NK.kind === "swarm" ? night - sw.back : night, NK.kind === "flyer");
          e = type ? this.spawnEnemy(type, { keepType: true, quiet: true, x: s.x, y: s.y }) : null;
          if (e) {
            e.siege = night; made++;
            this._siegeToughen(e, night);
            if (extra && PP.hp) e.hp = e.maxHp = Math.round(e.maxHp * (1 + PP.hp * extra));   /* and tougher */
            if (NK.kind === "swarm") { e.hp = e.maxHp = Math.max(1, Math.round(e.maxHp * sw.hp)); e.spdMul = (e.spdMul || 1) * sw.spd; e.swarm = 1; }
            if (NK.kind === "flyer" && this.data.biomes && this.data.biomes.crossOf && this.data.biomes.crossOf(type) === 2) e.over = 1;   /* over the fence */
            var rc = NK.kind === "raider" ? NG.raider.chance : (night >= C.nest.raidFrom ? C.nest.raidChance : 0);
            if (nest && rc && this.rng() < rc) e.raider = 1;   /* straight for the eggs */
          }
        }
      }
      return made;
    };
    /* endless: past the last stage, every night is tougher still */
    MissionSim.prototype._siegeToughen = function (e, night) {
      var C = cfg(this), EN = C.endless, past = Math.max(0, night - C.stages.length);
      if (!EN || !past) return;
      e.hp = e.maxHp = Math.round(e.maxHp * (1 + EN.hp * past));
      e.dmgMul = (e.dmgMul || 1) * (1 + EN.dmg * past);
    };
    /* a boss's health on a night (data.js SIEGE.boss): set outright, not the open world's */
    MissionSim.prototype._siegeBossHp = function (night, mul) {
      var B = cfg(this).boss, n = Math.max(1, this._siegeUp ? this._siegeUp().length : 1);
      return Math.round(B.hp * Math.pow(B.perNight, Math.max(0, night - B.from)) * (1 + B.perPlayer * (n - 1)) * (mul || 1));
    };
    /* giant night: one huge boss, a stage up, with the night's guards */
    MissionSim.prototype._siegeGiant = function (night, lap) {
      var C = cfg(this), G = C.nights.giant, p = this._siegeNest() || this._siegeUp()[0], bt, a, s, e;
      if (!p) return null;
      bt = this._siegeType(Math.min(C.stages.length, night + 1)); a = this.rng() * Math.PI * 2;
      s = this._snap(p.x + Math.cos(a) * C.ring[1], p.y + Math.sin(a) * C.ring[1], 24, 240);
      e = bt ? this.spawnEnemy(bt, { keepType: true, boss: true, x: s.x, y: s.y }) : null;
      if (!e) return null;
      e.siege = night; e.giant = G.scale;
      this._siegeToughen(e, night);                    /* its bite climbs with the nights (its health is set below) */
      e.hp = e.maxHp = this._siegeBossHp(night, G.hp + G.hpPerLap * lap);
      e.radius = e.radius * G.scale;
      this.emit({ type: "siege.giant", night: night, enemyType: bt, x: Math.round(s.x), y: Math.round(s.y) });
      return e;
    };
    MissionSim.prototype._updateSiege = function (dt) {
      var C = cfg(this), sg = this.siege, d, night, up, i, p, e, xp, bits, pay;
      if (!C) return;
      if (!sg) sg = this.siege = { nights: 0, inNight: false, warned: 0, waveT: 0, stateT: 0, bossNight: 0, kills: 0 };
      /* Night Siege is the nest and the nights, nothing else (Isaac): no rival tamer, no virus, no world events
         (the outbreak, the Dark Area surge that turns land to Glitch, the rampaging Mega), and the biomes hold
         still (no biome wars moving the borders, war-sim.js) */
      this.noRival = true; this.noVirus = true; this.noEvents = true; this.noWar = true;
      if (!sg.nest) this._siegeNest();
      d = dayOf(this); night = d.day;
      up = this._siegeUp();
      /* dusk is coming */
      if (!sg.inNight && d.c >= C.warnAt && d.c < C.startAt && sg.warned !== night) {
        sg.warned = night;
        this.emit({ type: "siege.warn", night: night, kind: nightKind(C, night).kind, inSec: Math.round((C.startAt - d.c) * d.len) });
      }
      /* the night begins */
      if (!sg.inNight && d.c >= C.startAt && d.c < C.endAt && sg.started !== night) {
        sg.inNight = true; sg.started = night; sg.waveT = 0; sg.killsAt = this.kills;
        var nk0 = nightKind(C, night);
        sg.kind = nk0.kind; sg.giantNight = 0;
        this.emit({ type: "siege.night", night: night, boss: night % C.bossEvery === 0 && nk0.kind !== "giant", kind: nk0.kind, lap: nk0.lap });
      }
      if (sg.inNight) {
        sg.waveT -= dt;
        if (sg.waveT <= 0) { sg.waveT = C.waveEvery; this._siegeWave(night); }
        /* giant night: the giant comes in early */
        var nk1 = nightKind(C, night);
        if (nk1.kind === "giant" && sg.giantNight !== night && d.c >= C.startAt + (C.endAt - C.startAt) * C.nights.giant.at && up.length) {
          sg.giantNight = night; this._siegeGiant(night, nk1.lap);
        }
        /* every bossEvery nights, a boss comes with them, halfway through (not on a giant's night) */
        if (night % C.bossEvery === 0 && nk1.kind !== "giant" && sg.bossNight !== night && d.c >= (C.startAt + C.endAt) / 2 && up.length) {
          sg.bossNight = night;
          p = this._siegeNest() || up[(this.rng() * up.length) | 0];
          var bt = this._siegeType(Math.min(C.stages.length, night + 1)), a = this.rng() * Math.PI * 2, s = this._snap(p.x + Math.cos(a) * C.ring[1], p.y + Math.sin(a) * C.ring[1], 16, 200);
          e = bt ? this.spawnEnemy(bt, { keepType: true, boss: true, x: s.x, y: s.y }) : null;
          if (e) { e.siege = night; this._siegeToughen(e, night); e.hp = e.maxHp = this._siegeBossHp(night); this.emit({ type: "siege.boss", night: night, enemyType: bt, x: Math.round(s.x), y: Math.round(s.y) }); }
        }
        /* dawn: the ones left run off; everyone standing is paid */
        if (d.c >= C.endAt || d.c < C.startAt) {
          sg.inNight = false; sg.nights = Math.max(sg.nights, night);
          var fled = 0, stay = [];
          /* the rank and file run off; a boss or giant stays till it's beaten (Isaac), eating into your day */
          for (i = 0; i < this.enemies.length; i++) { e = this.enemies[i]; if (e.siege && !e.dead) { if (e.boss) stay.push(e.type); else { e.dead = true; fled++; } } }
          pay = {};
          for (i = 0; i < up.length; i++) {
            p = up[i];
            xp = Math.round(this._xpNeeded(p.level || 1) * C.dawnXp); bits = Math.round(C.dawnBits * night);
            p.xp = (p.xp || 0) + xp; if (this._tryLevel) this._tryLevel(p);
            p.bits = (p.bits || 0) + bits; p.siegeNights = night;
            pay[p.id] = { xp: xp, bits: bits };
          }
          /* the cracked eggs mend (and are a night older); the smashed ones stay smashed */
          if (sg.nest) for (i = 0; i < sg.nest.eggs.length; i++) if (sg.nest.eggs[i].hp > 0) { sg.nest.eggs[i].max = eggMax(this); sg.nest.eggs[i].hp = sg.nest.eggs[i].max; sg.nest.eggs[i].age = (sg.nest.eggs[i].age || 0) + 1; }
          if (sg.nest) this._siegeHatch(night);
          if (sg.nest && sg.nest.fences) for (i = 0; i < sg.nest.fences.length; i++) if (sg.nest.fences[i].hp > 0) { sg.nest.fences[i].max = fenceMax(this); sg.nest.fences[i].hp = sg.nest.fences[i].max; }
          this.emit({ type: "siege.dawn", night: night, fled: fled, stay: stay, pay: pay, kills: this.kills - (sg.killsAt || 0), eggs: sg.nest ? eggsLeft(sg.nest) : null });
        }
      }
      sg.stateT -= dt;
      if (sg.stateT <= 0) {
        sg.stateT = 1;
        var live = 0; for (i = 0; i < this.enemies.length; i++) if (this.enemies[i].siege && !this.enemies[i].dead) live++;
        var toNight = sg.inNight ? 0 : Math.round(((d.c < C.startAt ? C.startAt : 1 + C.startAt) - d.c) * d.len);
        var toDawn = sg.inNight ? Math.round((C.endAt - d.c) * d.len) : 0;
        var dayN = !sg.inNight && d.c >= C.endAt ? night + 1 : night;
        this.emit({ type: "siege.state", tally: sg.tally || {}, kind: nightKind(C, dayN).kind, day: dayN, night: sg.inNight, toNight: toNight, toDawn: toDawn, attackers: live, survived: sg.nights, standing: up.length, eggs: sg.nest ? eggsLeft(sg.nest) : null, eggsOf: sg.nest ? sg.nest.eggs.length : null, wood: sg.nest ? sg.nest.wood : null, fences: sg.nest && sg.nest.fences ? sg.nest.fences.filter(function (f) { return f.hp > 0; }).length : 0, of: this.players.filter(function (q) { return q.hasTamer !== false && !q.away; }).length });
      }
    };
    /* the run's record: the nights held out (modes-sim.js _runRecord adds it) */
    MissionSim.prototype._siegeNights = function () { return this.siege ? this.siege.nights : 0; };
  }
  var isNode = typeof module !== "undefined" && module.exports;
  if (isNode) module.exports = install;
  else { root.DBH = root.DBH || {}; root.DBH.installSiege = install; }
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
