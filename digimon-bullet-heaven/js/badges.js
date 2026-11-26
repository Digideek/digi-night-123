/* Digi Night — badges (achievements).
 *
 * The whole list lives here, with the rules that hand them out. profile.js
 * keeps what has been earned (on the profile, in this browser) and shows it.
 *
 *   tier    1 bronze  2 silver  3 gold  4 prismatic (the hard ones)
 *   secret  shown as "???" until earned
 *   stat    a lifetime total on the profile; `need` of it earns the badge
 *           (those show their progress on the Badges page)
 *
 * Ids are short on purpose: the earned list travels on the profile card.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});
  function seasonLen() { return (D.SEASONS_CFG && D.SEASONS_CFG.lengthSec) || 486; }
  var LIST = [], BY = {}, CATS = ["Growth", "Combat", "Turf War", "Rival", "Survival", "World", "Farm", "Collection", "Together", "Mastery"];
  function add(cat, id, name, text, tier, extra) {
    var b = { id: id, cat: cat, name: name, text: text, tier: tier || 1 }, k;
    if (extra) for (k in extra) b[k] = extra[k];
    LIST.push(b); BY[id] = b;
  }
  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  /* a ladder on one lifetime total: rows of [need, id, name, tier] */
  function ladder(cat, stat, textFn, rows) {
    rows.forEach(function (r) { add(cat, r[1], r[2], textFn(num(r[0])), r[3], { stat: stat, need: r[0] }); });
  }
  var S = { secret: true };

  /* ---------------- Growth ---------------- */
  add("Growth", "evo", "First Steps", "Digivolve for the first time", 1);
  add("Growth", "champion", "Champion", "Raise a Champion", 1);
  add("Growth", "ultimate", "Ultimate", "Raise an Ultimate", 2);
  add("Growth", "mega", "Mega", "Raise a Mega", 3);
  ladder("Growth", "evos", function (n) { return n + " digivolutions in total"; }, [[25, "ev25", "Shape Shifter", 1], [100, "ev100", "Metamorph", 2], [500, "ev500", "Ever-Changing", 3]]);
  ladder("Growth", "ulr", function (n) { return "Raise " + n + " Ultimates"; }, [[10, "ul10", "Perfect Ten", 2]]);
  ladder("Growth", "mgr", function (n) { return "Raise " + n + " Megas"; }, [[5, "mg5", "Mega Maker", 3], [25, "mg25", "Mega Factory", 4]]);
  add("Growth", "fastc", "Early Bloomer", "Reach Champion before the first summer (about 8 minutes)", 2);
  add("Growth", "fastu", "Prodigy", "Reach Ultimate before the first fall (about 16 minutes)", 3);
  add("Growth", "fastm", "Warp Digivolve", "Reach Mega before the first winter (about 24 minutes)", 4);
  add("Growth", "hold", "Not Yet", "Tell a partner to wait when it is ready to digivolve", 1);
  ladder("Growth", "holds", function (n) { return "Hold a partner back " + n + " times"; }, [[10, "hd10", "Patience", 2], [50, "hd50", "Iron Will", 3]]);
  add("Growth", "lucky", "Against the Odds", "Have luck bend a digivolution into something it should not have been", 3, S);
  add("Growth", "shiny", "One in a Thousand", "Have a partner turn shiny", 3);
  ladder("Growth", "shinies", function (n) { return "Have " + n + " partners turn shiny"; }, [[3, "sh3", "Glitter", 4], [10, "sh10", "Prism", 4]]);
  add("Growth", "jl10", "Apprentice", "Reach job level 10 in a run", 1);
  add("Growth", "jl25", "Adept", "Reach job level 25 in a run", 2);
  add("Growth", "jl50", "Master", "Reach job level 50 in a run", 3);
  add("Growth", "jl75", "Grandmaster", "Reach job level 75 in a run", 4);
  add("Growth", "bl10", "Level Head", "Reach base level 10 in a run", 1);
  add("Growth", "bl25", "Seasoned", "Reach base level 25 in a run", 2);
  add("Growth", "bl50", "Sage", "Reach base level 50 in a run", 3);
  add("Growth", "sk10", "Signature Move", "Take one skill all the way to level 10", 2);
  add("Growth", "st50", "Specialist", "Raise a single stat to 50", 3);
  add("Growth", "burst", "Warp Speed", "Set off a warp burst", 1);
  ladder("Growth", "bursts", function (n) { return n + " warp bursts"; }, [[25, "bu25", "Overdrive", 2], [250, "bu250", "Limit Breaker", 3]]);

  /* ---------------- Combat ---------------- */
  ladder("Combat", "kos", function (n) { return n + " KOs in total"; }, [[100, "ko100", "Brawler", 1], [1000, "ko1000", "Veteran", 2], [10000, "ko10000", "Legend", 3], [50000, "k50k", "Mythic", 4], [100000, "k100k", "Annihilator", 4], [250000, "k250k", "Data Storm", 4]]);
  add("Combat", "rk250", "On a Roll", "250 KOs in one run", 1);
  add("Combat", "rk500", "Rampage", "500 KOs in one run", 2);
  add("Combat", "rk1k", "Massacre", "1,000 KOs in one run", 3);
  add("Combat", "rk2k", "Extinction Event", "2,500 KOs in one run", 4);
  add("Combat", "boss", "Boss Down", "Defeat a boss", 1);
  ladder("Combat", "bosses", function (n) { return "Defeat " + n + " bosses"; }, [[10, "bs10", "Boss Hunter", 2], [50, "bs50", "Boss Breaker", 3], [200, "bs200", "End Boss", 4]]);
  add("Combat", "megaslayer", "Mega Slayer", "Defeat a Mega in the wild", 2);
  ladder("Combat", "megas", function (n) { return "Defeat " + n + " wild Megas"; }, [[10, "ms10", "Mega Hunter", 3], [100, "ms100", "Mega Bane", 4]]);
  add("Combat", "rms5", "Titan Feller", "Defeat 5 wild Megas in one run", 4);
  add("Combat", "lord", "Land Lord", "Defeat the lord of a biome", 2);
  ladder("Combat", "lords", function (n) { return "Defeat " + n + " biome lords"; }, [[5, "ld5", "Conqueror", 3], [25, "ld25", "Sovereign", 4]]);
  add("Combat", "giant", "Giant Killer", "Defeat a wild Mega while your partner is a Rookie or smaller", 4);
  add("Combat", "bossb", "Baby Steps", "Defeat a boss with a Baby or In-Training partner", 3, S);

  /* ---------------- Turf War (17z33, turf.js) ---------------- */
  add("Turf War", "side", "Pledged", "Pick a side in the biome war", 1);
  add("Turf War", "warwin", "Kingmaker", "Win a turf war: your side holds half the land round the start", 3);
  ladder("Turf War", "warwins", function (n) { return "Win " + n + " turf wars"; }, [[5, "warlord", "Warlord", 4]]);
  add("Turf War", "underdog", "Against All Odds", "Win a turf war for a side that started with under a tenth of the land", 4, S);
  /* world events (17z33, event-sim.js / world-events.js) */
  add("Together", "wev", "Answered the Call", "Help beat a world event: an outbreak, a Dark Area surge or a rampaging Mega", 2);
  add("Together", "wevOutbreak", "Patient Zero", "Beat a virus outbreak's Patient Zero", 3);
  add("Together", "wevSurge", "Rift Sealer", "Beat a Surge Lord and hand the land back", 3);
  add("Together", "wevRampage", "Mega Breaker", "Bring down a rampaging Mega", 3);
  ladder("Together", "wevWins", function (n) { return "Help beat " + n + " world events"; }, [[3, "wevVet", "Old Hand", 4]]);

  /* ---------------- Rival ---------------- */
  add("Rival", "rv1", "Rivalry", "Beat your rival", 1);
  ladder("Rival", "rwins", function (n) { return "Beat a rival " + n + " times"; }, [[10, "rv10", "Old Enemies", 2], [50, "rv50", "Nemesis", 3]]);
  add("Rival", "rv3", "Hat Trick", "Beat the rival three times in one run", 3);
  add("Rival", "rvup", "Underdog", "Beat a rival 5 or more job levels above your partner", 3);
  add("Rival", "rvup10", "Upset of the Century", "Beat a rival 10 or more job levels above your partner", 4);
  add("Rival", "rvlose", "Humbled", "Lose a run to your rival", 1, S);
  add("Rival", "tr10", "Trophy Hunter", "Hold 10 rival trophies", 2);
  add("Rival", "tr40", "Full Shelf", "Fill the Trophy Room: 40 trophies", 4);

  /* ---------------- Survival ---------------- */
  add("Survival", "t5", "Still Standing", "Survive 5 minutes", 1);
  add("Survival", "sum", "Summer", "Reach summer", 1);
  add("Survival", "fall", "Fall", "Reach fall", 2);
  add("Survival", "win", "Winter", "Reach winter", 2);
  add("Survival", "year", "A Full Year", "Survive spring, summer, fall and winter in one run", 3);
  add("Survival", "yr2", "Two Winters", "Survive two full years in one run", 4);
  add("Survival", "yr3", "Third Year", "Survive three full years in one run", 4);
  add("Survival", "yr5", "Five Years", "Survive five full years in one run", 4);
  ladder("Survival", "runs", function (n) { return "Finish " + n + " runs"; }, [[10, "r10", "Regular", 1], [50, "r50", "Dedicated", 2], [200, "r200", "Lifer", 3], [1000, "r1000", "A Thousand Nights", 4]]);
  add("Survival", "quick", "Blink", "Lose a run within a minute of the hatch", 1, S);
  add("Survival", "megadie", "The Bigger They Are", "Lose a run with a Mega partner", 2, S);
  add("Survival", "paci", "Pacifist", "Be three minutes into a run without a single KO", 3, S);
  add("Survival", "hoard", "Dragon's Hoard", "End a run still holding 500 Bits", 2, S);

  /* ---------------- World ---------------- */
  ladder("World", "spires", function (n) { return n === "1" ? "Break a black spire" : "Break " + n + " black spires"; }, [[1, "sp1", "Spire Breaker", 1], [25, "sp25", "Spire Storm", 2], [100, "sp100", "Skyline Wrecker", 3]]);
  ladder("World", "caches", function (n) { return n === "1" ? "Open a data cache" : "Open " + n + " data caches"; }, [[1, "ca1", "Data Miner", 1], [25, "ca25", "Prospector", 2], [200, "ca200", "Motherlode", 3]]);
  add("World", "catch", "Gotcha", "Catch a wild Digimon", 2);
  ladder("World", "catches", function (n) { return "Catch " + n + " wild Digimon"; }, [[10, "ct10", "Collector", 3], [50, "ct50", "Zookeeper", 4]]);
  add("World", "al1", "Companion", "Take a caught Digimon along as a companion", 1);
  add("World", "ala", "Borrowed Power", "DNA digivolve with your companion", 2);
  ladder("World", "shops", function (n) { return n === "1" ? "Buy something from Jijimon" : "Buy " + n + " things from Jijimon"; }, [[1, "shp1", "Customer", 1], [25, "shp25", "Regular Customer", 2]]);

  /* ---------------- Farm ---------------- */
  ladder("Farm", "feeds", function (n) { return n === "1" ? "Feed your partner" : "Feed your partner " + n + " times"; }, [[1, "fd1", "Dinner Time", 1], [100, "fd100", "Chef", 2], [1000, "fd1k", "Head Chef", 3]]);
  ladder("Farm", "harvests", function (n) { return n === "1" ? "Harvest a crop" : "Harvest " + n + " crops"; }, [[1, "hv1", "Green Thumb", 1], [50, "hv50", "Farmer", 2], [500, "hv500", "Harvest Moon", 3]]);
  ladder("Farm", "trains", function (n) { return n === "1" ? "Train at the Digi Farm" : "Train " + n + " times at the Digi Farm"; }, [[1, "tn1", "Training Day", 1], [100, "tn100", "Drill Sergeant", 2], [500, "tn500", "Iron Regimen", 3]]);
  ladder("Farm", "pets", function (n) { return "Play with your partner " + n + " times"; }, [[50, "pet50", "Best Friends", 2]]);
  add("Farm", "bal", "Balanced Diet", "Feed your partner a balanced meal", 1);
  add("Farm", "picky", "Picky Eater", "Feed your partner while it's sulking", 1, S);

  /* ---------------- Collection ---------------- */
  add("Collection", "egg", "New Shell", "Unlock an egg", 1);
  add("Collection", "eg10", "Egg Basket", "Have 10 eggs unlocked", 2);
  add("Collection", "egall", "Every Shell", "Unlock every egg", 4);
  add("Collection", "ds25", "Field Notes", "Raise 25 different Digimon", 1);
  add("Collection", "ds75", "Researcher", "Raise 75 different Digimon", 2);
  add("Collection", "ds150", "Professor", "Raise 150 different Digimon", 3);
  add("Collection", "dsall", "The Whole Tree", "Raise every Digimon there is", 4);
  add("Collection", "mem1", "Remember Me", "Have a partner leave a memory in the DigiBank", 1);
  add("Collection", "mem5", "Family Album", "Hold memories for 5 egg lines", 2);
  add("Collection", "mem3", "Legacy", "Hold a Mega's memory", 3);
  add("Collection", "lab1", "Lab Rat", "Buy an upgrade in the Lab", 1);
  add("Collection", "labm", "Fully Funded", "Take one Lab upgrade to its top level", 2);
  add("Collection", "laball", "Mad Scientist", "Take every Lab upgrade to its top level", 4);
  add("Collection", "rk5", "Rising", "Reach Tamer Rank 5", 1);
  add("Collection", "rk10", "Established", "Reach Tamer Rank 10", 2);
  add("Collection", "rk25", "Renowned", "Reach Tamer Rank 25", 3);
  add("Collection", "rk50", "Night's Legend", "Reach Tamer Rank 50", 4);

  /* ---------------- Together ---------------- */
  add("Together", "online", "Better Together", "Play a run online with a friend", 1);
  add("Together", "dna", "Two Become One", "DNA digivolve with a teammate", 2);
  ladder("Together", "dna", function (n) { return "DNA digivolve " + n + " times"; }, [[10, "dn10", "Jogress", 3]]);
  ladder("Together", "revs", function (n) { return n === "1" ? "Revive a friend's partner" : "Revive friends' partners " + n + " times"; }, [[1, "rev1", "Lifeline", 1], [25, "rev25", "Medic", 3]]);
  ladder("Together", "brawls", function (n) { return n === "1" ? "Win a survivor brawl" : "Win " + n + " survivor brawls"; }, [[1, "brw1", "Last One Standing", 2], [10, "brw10", "Champion of the Ring", 3]]);

  /* ---------------- Mastery (badges for badges) ---------------- */
  add("Mastery", "b25", "Decorated", "Earn 25 badges", 1);
  add("Mastery", "b50", "Distinguished", "Earn 50 badges", 2);
  add("Mastery", "b100", "Illustrious", "Earn 100 badges", 3);
  add("Mastery", "ball", "Completionist", "Earn every other badge", 4);

  /* ---------------- the rules ---------------- */
  var SMALL = { "Baby": 1, "In-Training": 1, "Rookie": 1 }, TINY = { "Baby": 1, "In-Training": 1 };
  function stage(form) { var sp = D.SPECIES && D.SPECIES[form]; return (sp && (sp.stageKey || sp.stage)) || ""; }
  function isMega(st) { return /^Mega/.test(st || ""); }

  /* every ladder badge whose total has been reached */
  function ladders(api) {
    var st = api.stats(), i, b;
    for (i = 0; i < LIST.length; i++) { b = LIST[i]; if (b.stat && (st[b.stat] || 0) >= b.need) api.award(b.id); }
  }
  /* a game event that is ours (profile.js has already counted kos, bosses, megas, evos, shinies, dna, bursts, catches) */
  function onEvent(api, e, localId, run) {
    var mine = e.id === localId, st, mySt, t = (run && run.time) || 0, en;
    if (e.type === "kill") {
      if (e.killer !== localId) return;
      en = D.ENEMIES && D.ENEMIES[e.enemyType]; mySt = run ? stage(run.form) : "";
      if (en && /Mega/.test(en.stageDisplay || "") && !e.boss) {
        if (run) { run._bMs = (run._bMs || 0) + 1; if (run._bMs >= 5) api.award("rms5"); }
        if (SMALL[mySt]) api.award("giant");
      }
      if (e.boss && TINY[mySt]) api.award("bossb");
      if (e.boss || (api.stats().kos % 50) === 0) ladders(api);
      return;
    }
    if (e.type === "lord.down") { if (mine) { api.bump("lords"); ladders(api); } return; }
    if (e.type === "rival.down") {
      if (e.by && e.by !== localId) return;
      api.bump("rwins"); api.award("rv1");
      if ((e.wins || 0) >= 3) api.award("rv3");
      if (run && (e.level || 0) - (run.level || 1) >= 5) api.award("rvup");
      if (run && (e.level || 0) - (run.level || 1) >= 10) api.award("rvup10");
      ladders(api); return;
    }
    if (e.type === "rival.won") { if (mine) api.award("rvlose"); return; }
    if (e.type === "coop.revive") { if (e.by === localId && e.id !== localId) { api.bump("revs"); ladders(api); } return; }
    if (e.type === "brawl.winner") { if (e.winnerId === localId) { api.bump("brawls"); ladders(api); } return; }
    if (!mine) return;
    if (e.type === "evolve" && e.kind !== "dna.revert") {
      st = stage(e.to);
      if (st === "Ultimate") api.bump("ulr");
      if (isMega(st)) api.bump("mgr");
      if ((st === "Champion" || st === "Armor" || st === "Hybrid") && t < seasonLen()) api.award("fastc");
      /* the first fall and winter start 2 and 3 seasons in (17z33: seasons are 486 s) */
      if (st === "Ultimate" && t < seasonLen() * 2) api.award("fastu");
      if (isMega(st) && t < seasonLen() * 3) api.award("fastm");
      ladders(api);
    } else if (e.type === "evo.hold") { api.bump("holds"); ladders(api); }
    else if (e.type === "evo.lucky") api.award("lucky");
    else if (e.type === "level") { if (e.level >= 10) api.award("jl10"); if (e.level >= 25) api.award("jl25"); if (e.level >= 50) api.award("jl50"); if (e.level >= 75) api.award("jl75"); }
    else if (e.type === "tamer.level") { if (e.level >= 10) api.award("bl10"); if (e.level >= 25) api.award("bl25"); if (e.level >= 50) api.award("bl50"); }
    else if (e.type === "skill.add") { if ((e.level || 0) >= 10) api.award("sk10"); }
    else if (e.type === "stat.add") { if ((e.value || 0) >= 50) api.award("st50"); }
    else if (e.type === "prop.used") { api.bump(e.kind === "spire" ? "spires" : "caches"); ladders(api); }
    else if (e.type === "ally.join") api.award("al1");
    else if (e.type === "ally.absorbed") api.award("ala");
    else if (e.type === "shop") { api.bump("shops"); ladders(api); }
    else if (e.type === "farm.feed" || e.type === "field.feed") { api.bump("feeds"); if (e.balanced) api.award("bal"); ladders(api); }
    else if (e.type === "farm.refuse") api.award("picky");
    else if (e.type === "farm.harvest") { api.bump("harvests", Math.max(1, e.n | 0)); ladders(api); }
    else if (e.type === "farm.train") { api.bump("trains"); ladders(api); }
    else if (e.type === "farm.pet") { api.bump("pets"); ladders(api); }
    else if (e.type === "burst.start" || e.type === "shiny" || e.type === "dna.done" || e.type === "capture") ladders(api);
  }
  /* while a run is going */
  function tick(api, run) {
    var t = run.time || 0, yl = ((D.SEASONS_CFG && D.SEASONS_CFG.lengthSec) || 486) * 4, k = run.kills || 0;
    if (t >= 300) api.award("t5");
    if (t >= yl / 4) api.award("sum");
    if (t >= yl / 2) api.award("fall");
    if (t >= yl * 0.75) api.award("win");
    if (t >= yl * 2) api.award("yr2");
    if (t >= yl * 3) api.award("yr3");
    if (t >= yl * 5) api.award("yr5");
    if (k >= 250) api.award("rk250");
    if (k >= 500) api.award("rk500");
    if (k >= 1000) api.award("rk1k");
    if (k >= 2500) api.award("rk2k");
    if (t >= 200 && k === 0 && stage(run.form) !== "Egg" && !/^digitama/.test(run.form || "")) api.award("paci");
  }
  /* a run has just ended (its `runs` total is already counted) */
  function runEnded(api, run) {
    var hatch = (D.HATCH && D.HATCH.time) || 20;
    if (!/^digitama/.test(run.form || "") && (run.time || 0) < hatch + 60) api.award("quick");
    if (isMega(stage(run.form))) api.award("megadie");
    if ((run.bits || 0) >= 500) api.award("hoard");
    ladders(api); meta(api);
  }
  /* things kept outside the run: rank, Lab, eggs, memories, trophies, the tree */
  function meta(api) {
    var info = D.saveInfo ? D.saveInfo() : {}, rank = api.rank(), lab = api.lab(), L = D.LAB, i, top = 0, any = 0, all = 1, n, mt = info.memTiers || {}, mems = 0, k, c, got;
    if (rank >= 5) api.award("rk5"); if (rank >= 10) api.award("rk10"); if (rank >= 25) api.award("rk25"); if (rank >= 50) api.award("rk50");
    if (L) {
      for (i = 0; i < L.list.length; i++) { n = lab[L.list[i].id] || 0; if (n) any = 1; if (n >= (L.list[i].max || L.cost.length)) top = 1; else all = 0; }
      if (any) api.award("lab1"); if (top) api.award("labm"); if (top && all) api.award("laball");
    }
    if ((info.eggs || 0) >= 10) api.award("eg10");
    if (info.eggsTotal && info.eggs >= info.eggsTotal) api.award("egall");
    for (k in mt) { mems++; if (mt[k] >= 3) api.award("mem3"); }
    if (mems >= 1) api.award("mem1"); if (mems >= 5) api.award("mem5");
    if ((info.trophies || 0) >= 10) api.award("tr10"); if ((info.trophies || 0) >= 40) api.award("tr40");
    c = api.card ? api.card() : null;
    if (c && c.st) {
      if (c.st.forms >= 25) api.award("ds25"); if (c.st.forms >= 75) api.award("ds75"); if (c.st.forms >= 150) api.award("ds150");
      if (c.st.formsOf && c.st.forms >= c.st.formsOf) api.award("dsall");
    }
    got = api.count();
    if (got >= 25) api.award("b25"); if (got >= 50) api.award("b50"); if (got >= 100) api.award("b100");
    if (api.count() - (api.has("ball") ? 1 : 0) >= LIST.length - 1) api.award("ball");
  }

  D.BADGES = { LIST: LIST, BY: BY, CATS: CATS, TIER: ["", "Bronze", "Silver", "Gold", "Prismatic"], onEvent: onEvent, tick: tick, runEnded: runEnded, meta: meta, ladders: ladders };
  if (typeof module !== "undefined" && module.exports) module.exports = D.BADGES;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
