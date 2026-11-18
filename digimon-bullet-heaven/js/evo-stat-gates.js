/* Hidden competing-stat caps on every evolution edge (regular + rarity).
 * Wraps TREE.conditionsMet after the rarity layer. Does not edit evolution-tree.js.
 * Tunables live on D.EVO_STAT_GATES (see docs/EVOLUTION.md and docs/RARITY.md).
 */
(function (global) {
  "use strict";

  var isNode = typeof module === "object" && module.exports;
  var root = isNode
    ? (typeof global !== "undefined" ? global : this)
    : (typeof window !== "undefined" ? window : this);
  var D = (root.DBH = root.DBH || {});
  var TREE = D.EVO_TREE || root.EVO_TREE || null;
  var origConditionsMet = null;
  var installed = false;
  var condCaps = typeof WeakMap === "function" ? new WeakMap() : null;
  var bruteOverride = {};

  var DEFAULTS = {
    themes: {
      strength: { maxIntelligence: 48, maxAgility: 80 },
      wisdom: { maxOffense: 40, maxOffensePerIntelligence: 2 },
      speed: { maxOffense: 48 },
      balance: {
        maxOffensePerIntelligence: 2,
        maxIntelligencePerOffense: 2,
        maxOffensePerAgility: 2.5,
        maxAgilityPerOffense: 2.5
      },
      brute: {}
    },
    typeThemes: {
      Dinosaur: "strength",
      "Dragon Man": "strength",
      "Fire Dragon": "strength",
      "Armored Dragon": "strength",
      "Ancient Dragon": "strength",
      "Ancient Dragon Man": "strength",
      "Evil Dragon": "strength",
      "Dark Dragon": "strength",
      "Mythical Dragon": "strength",
      "Holy Dragon": "strength",
      "Machine Dragon": "strength",
      "Rock Dragon": "strength",
      "Sky Dragon": "strength",
      Fire: "strength",
      Warrior: "strength",
      Cyborg: "strength",
      "Beast Man": "strength",
      Ceratopsian: "strength",
      Weapon: "strength",
      Ore: "strength",
      Mineral: "strength",
      "Baby Dragon": "strength",
      "Small Dragon": "strength",
      "Mini Dragon": "strength",
      Wizard: "wisdom",
      Pixie: "wisdom",
      Mutant: "wisdom",
      Machine: "wisdom",
      "God Man": "wisdom",
      Deity: "wisdom",
      Puppet: "wisdom",
      Unidentified: "wisdom",
      Seed: "wisdom",
      Vegetation: "wisdom",
      Bulb: "wisdom",
      Ancient: "wisdom",
      Insectoid: "speed",
      Bird: "speed",
      "Mini Bird": "speed",
      "Baby Bird": "speed",
      "Giant Bird": "speed",
      "Ancient Bird": "speed",
      "Bird Man": "speed",
      "Holy Beast": "speed",
      Mammal: "speed",
      Aquatic: "speed",
      "Sea Beast": "speed",
      Crustacean: "speed",
      Amphibian: "speed",
      "Sea Animal": "speed",
      "Aquatic Beast Man": "speed",
      Angel: "balance",
      "Mini Angel": "balance",
      "High Angel": "balance",
      "Great Angel": "balance",
      Seraph: "balance",
      "Holy Knight": "balance",
      "Holy Sword": "balance",
      Composite: "balance",
      "Rare Animal": "balance",
      "Mysterious Beast": "balance",
      "Mythical Beast": "balance",
      Slime: "brute",
      Undead: "brute",
      Ghost: "brute",
      Mutation: "brute",
      Mollusk: "brute",
      "Dark Angel": "brute",
      "Little Devil": "brute",
      "Demon Lord": "brute",
      "Dark Beast": "brute"
    },
    nameHints: [
      { re: /numemon|sukamon|raremon|geremon|garbagemon|warumonzaemon|scumon/i, theme: "brute" },
      { re: /wargrey|tyranno|greymon|growlmon|geogrey|metalgrey|flareriza|monochromon|tuskmon/i, theme: "strength" },
      { re: /wizard|wizarmon|wizardmon|sourai|wismon|clockmon|datamon|andromon/i, theme: "wisdom" },
      { re: /garuru|rapidmon|hawkmon|aquilamon|piddomon|birdramon|kyukimon|stingmon/i, theme: "speed" },
      { re: /ange|holy|seraph|magnaange| Angewomon|lucemon/i, theme: "balance" }
    ],
    kindThemes: {
      neglect: "brute",
      dark: "brute",
      fallback: "brute",
      recover: "brute"
    },
    overrides: {}
  };

  function cfg() {
    var user = D.EVO_STAT_GATES || {};
    if (!cfg._merged) {
      cfg._merged = {
        themes: Object.assign({}, DEFAULTS.themes, user.themes || {}),
        typeThemes: Object.assign({}, DEFAULTS.typeThemes, user.typeThemes || {}),
        nameHints: user.nameHints || DEFAULTS.nameHints,
        kindThemes: Object.assign({}, DEFAULTS.kindThemes, user.kindThemes || {}),
        overrides: user.overrides || DEFAULTS.overrides
      };
      if (user.themes) {
        var k;
        for (k in DEFAULTS.themes) {
          if (!Object.prototype.hasOwnProperty.call(DEFAULTS.themes, k)) continue;
          cfg._merged.themes[k] = Object.assign({}, DEFAULTS.themes[k], (user.themes && user.themes[k]) || {});
        }
      }
    }
    return cfg._merged;
  }

  function edgeKey(from, to, kind) {
    return (from || "") + ">" + (to || "") + ":" + (kind || "");
  }

  function speciesRec(id) {
    if (!id) return null;
    if (TREE && TREE.species && TREE.species[id]) return TREE.species[id];
    if (D.SPECIES && D.SPECIES[id]) return D.SPECIES[id];
    return null;
  }

  function hintTheme(id, type) {
    var c = cfg();
    var i, h, name = id || "";
    var rec = speciesRec(id);
    if (rec && rec.name) name = rec.name + " " + id;
    if (type && c.typeThemes[type]) return c.typeThemes[type];
    for (i = 0; i < c.nameHints.length; i++) {
      h = c.nameHints[i];
      if (h.re && h.re.test(name)) return h.theme;
    }
    return null;
  }

  function themeOf(from, branch) {
    if (!branch) return "balance";
    var to = branch.to;
    var kind = branch.kind || "standard";
    var key = edgeKey(from, to, kind);
    if (bruteOverride[key]) return "brute";
    var c = cfg();
    if (c.overrides[key]) return c.overrides[key];
    if (c.kindThemes[kind]) return c.kindThemes[kind];
    var rec = speciesRec(to);
    var type = rec && rec.type;
    var hinted = hintTheme(to, type);
    if (hinted) return hinted;
    if (kind === "standard") return "balance";
    return "balance";
  }

  function capsForTheme(theme) {
    var c = cfg();
    var t = c.themes[theme] || {};
    var out = {};
    var k;
    for (k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out[k] = t[k];
    return out;
  }

  function tighter(a, b) {
    if (a == null) return b;
    if (b == null) return a;
    return a < b ? a : b;
  }

  function mergeCaps(base, extra) {
    var out = Object.assign({}, base || {});
    if (!extra) return out;
    var keys = [
      "maxOffense", "maxIntelligence", "maxAgility",
      "maxOffensePerIntelligence", "maxIntelligencePerOffense",
      "maxOffensePerAgility", "maxAgilityPerOffense",
      "maxIntelligencePerAgility", "maxAgilityPerIntelligence"
    ];
    var i, k;
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (extra[k] != null) out[k] = tighter(out[k], extra[k]);
    }
    return out;
  }

  function rarityExtra(branch, from) {
    if (D.rarity && D.rarity.extraOfBranch) return D.rarity.extraOfBranch(branch, from) || null;
    if (branch && branch.conditions && branch.conditions.__rarityExtra) return branch.conditions.__rarityExtra;
    return null;
  }

  function capsFor(from, branch) {
    var theme = themeOf(from, branch);
    var caps = capsForTheme(theme);
    caps = mergeCaps(caps, rarityExtra(branch, from));
    return { theme: theme, caps: caps };
  }

  function statOf(stats, name) {
    if (!stats) return 0;
    var ts = stats.trainStats || {};
    if (name === "offense") return stats.offense != null ? stats.offense : (ts.offense || 0);
    if (name === "intelligence") return stats.intelligence != null ? stats.intelligence : (ts.intelligence || 0);
    if (name === "agility") return stats.agility != null ? stats.agility : (ts.agility || 0);
    return 0;
  }

  function capsMetOn(caps, stats) {
    if (!caps) return true;
    if (stats && (stats.debugBypassRarity || stats.debugBypassCaps)) return true;
    var off = statOf(stats, "offense");
    var intel = statOf(stats, "intelligence");
    var agi = statOf(stats, "agility");
    if (caps.maxOffense != null && off > caps.maxOffense) return false;
    if (caps.maxIntelligence != null && intel > caps.maxIntelligence) return false;
    if (caps.maxAgility != null && agi > caps.maxAgility) return false;
    if (caps.maxOffensePerIntelligence != null && off > caps.maxOffensePerIntelligence * intel) return false;
    if (caps.maxIntelligencePerOffense != null && intel > caps.maxIntelligencePerOffense * off) return false;
    if (caps.maxOffensePerAgility != null && off > caps.maxOffensePerAgility * agi) return false;
    if (caps.maxAgilityPerOffense != null && agi > caps.maxAgilityPerOffense * off) return false;
    if (caps.maxIntelligencePerAgility != null && intel > caps.maxIntelligencePerAgility * agi) return false;
    if (caps.maxAgilityPerIntelligence != null && agi > caps.maxAgilityPerIntelligence * intel) return false;
    return true;
  }

  function recOf(cond) {
    if (!cond) return null;
    if (cond.__statCaps) return cond.__statCaps;
    if (condCaps && condCaps.has(cond)) return condCaps.get(cond);
    return null;
  }

  function capsMet(cond, stats) {
    var rec = recOf(cond);
    if (!rec) return true;
    return capsMetOn(rec.caps, stats);
  }

  function attach(cond, rec) {
    if (!cond || !rec) return;
    cond.__statCaps = rec;
    if (condCaps) condCaps.set(cond, rec);
  }

  function ensureBrutePaths() {
    if (!TREE || !TREE.branches) return;
    var from, list, i, b, hasBrute, pick, key, kinds, ki;
    kinds = ["neglect", "dark", "fallback"];
    for (from in TREE.branches) {
      if (!Object.prototype.hasOwnProperty.call(TREE.branches, from)) continue;
      list = TREE.branches[from] || [];
      if (!list.length) continue;
      hasBrute = false;
      pick = null;
      for (i = 0; i < list.length; i++) {
        b = list[i];
        if (themeOf(from, b) === "brute") { hasBrute = true; break; }
      }
      if (hasBrute) continue;
      for (ki = 0; ki < kinds.length && !pick; ki++) {
        for (i = 0; i < list.length; i++) {
          if (list[i].kind === kinds[ki]) { pick = list[i]; break; }
        }
      }
      if (!pick) pick = list[list.length - 1];
      if (pick) {
        key = edgeKey(from, pick.to, pick.kind);
        bruteOverride[key] = "brute";
      }
    }
  }

  function walkAndAttach() {
    if (!TREE || !TREE.branches) return;
    var from, list, i, b, rec;
    for (from in TREE.branches) {
      if (!Object.prototype.hasOwnProperty.call(TREE.branches, from)) continue;
      list = TREE.branches[from] || [];
      for (i = 0; i < list.length; i++) {
        b = list[i];
        rec = capsFor(from, b);
        rec.from = from;
        rec.to = b.to;
        rec.kind = b.kind;
        if (b.conditions) attach(b.conditions, rec);
      }
    }
  }

  function conditionsMetWrapped(cond, stats) {
    if (origConditionsMet && !origConditionsMet(cond, stats)) return false;
    if (!origConditionsMet && !cond) return true;
    return capsMet(cond, stats);
  }

  function install(tree) {
    if (tree) TREE = tree;
    if (!TREE && D.EVO_TREE) TREE = D.EVO_TREE;
    if (!TREE && root.EVO_TREE) TREE = root.EVO_TREE;
    if (!TREE) return api;
    cfg._merged = null;
    bruteOverride = {};
    ensureBrutePaths();
    walkAndAttach();
    if (typeof TREE.conditionsMet === "function" && TREE.conditionsMet !== conditionsMetWrapped) {
      origConditionsMet = TREE.conditionsMet;
      TREE.conditionsMet = conditionsMetWrapped;
    } else if (!origConditionsMet) {
      origConditionsMet = TREE.conditionsMet;
    }
    installed = true;
    return api;
  }

  function lopsidedStrengthStats() {
    return { offense: 80, intelligence: 10, agility: 10, trainStats: { offense: 80, intelligence: 10, agility: 10 } };
  }

  function findEdgeByTheme(theme) {
    if (!TREE || !TREE.branches) return null;
    var from, list, i, b;
    for (from in TREE.branches) {
      if (!Object.prototype.hasOwnProperty.call(TREE.branches, from)) continue;
      list = TREE.branches[from] || [];
      for (i = 0; i < list.length; i++) {
        b = list[i];
        if (themeOf(from, b) === theme) {
          return { from: from, branch: b, theme: theme, caps: capsFor(from, b).caps };
        }
      }
    }
    return null;
  }

  function minMaxConflict(cond, caps) {
    if (!cond && !caps) return null;
    cond = cond || {};
    caps = caps || {};
    var pairs = [
      ["minOffense", "maxOffense"],
      ["minIntelligence", "maxIntelligence"],
      ["minAgility", "maxAgility"],
      ["minFood", "maxFood"],
      ["minHappiness", "maxHappiness"],
      ["minBond", "maxBond"],
      ["minLevel", "maxLevel"],
      ["minHpRatio", "maxHpRatio"]
    ];
    var i, mn, mx;
    for (i = 0; i < pairs.length; i++) {
      mn = cond[pairs[i][0]];
      mx = cond[pairs[i][1]] != null ? cond[pairs[i][1]] : caps[pairs[i][1]];
      if (mn != null && mx != null && mn > mx) return pairs[i][0] + " (" + mn + ") > " + pairs[i][1] + " (" + mx + ")";
    }
    return null;
  }

  function validate(tree) {
    if (tree) TREE = tree;
    if (!installed) install(TREE);
    var errors = [];
    var warnings = [];
    var from, list, i, b, rec, conflict, statsList, si, open, species, stage;
    var vectors = [
      { offense: 0, intelligence: 0, agility: 0 },
      { offense: 99, intelligence: 0, agility: 0 },
      { offense: 0, intelligence: 99, agility: 0 },
      { offense: 0, intelligence: 0, agility: 99 },
      { offense: 99, intelligence: 99, agility: 0 },
      { offense: 99, intelligence: 0, agility: 99 },
      { offense: 0, intelligence: 99, agility: 99 }
    ];
    if (!TREE || !TREE.branches) {
      return { ok: false, errors: ["no evolution tree"], warnings: warnings };
    }
    for (from in TREE.branches) {
      if (!Object.prototype.hasOwnProperty.call(TREE.branches, from)) continue;
      list = TREE.branches[from] || [];
      for (i = 0; i < list.length; i++) {
        b = list[i];
        rec = capsFor(from, b);
        conflict = minMaxConflict(b.conditions || {}, rec.caps);
        if (conflict) errors.push(from + " → " + b.to + " (" + b.kind + "): min > max: " + conflict);
      }
      if (!list.length) continue;
      species = speciesRec(from);
      stage = species && species.stage;
      if (stage === "Mega" || stage === "Mega+" || stage === "Armor") {
        var outs = list.filter(function (x) {
          return ["mode", "standard", "fallback", "special", "warp", "fusion"].indexOf(x.kind) >= 0;
        });
        if (!outs.length) continue;
      }
      for (si = 0; si < vectors.length; si++) {
        open = 0;
        for (i = 0; i < list.length; i++) {
          b = list[i];
          rec = capsFor(from, b);
          if (capsMetOn(rec.caps, vectors[si])) open++;
        }
        if (open <= 0) {
          errors.push(from + " unreachable under caps with stats " + JSON.stringify(vectors[si]));
          break;
        }
      }
    }

    var bal = findEdgeByTheme("balance");
    var str = findEdgeByTheme("strength");
    var lop = lopsidedStrengthStats();
    var lopOk = true;
    if (!bal) {
      errors.push("no balance-themed edge found for lopsided-strength test");
      lopOk = false;
    } else if (capsMetOn(bal.caps, lop)) {
      errors.push("lopsided strength should block balance edge " + bal.from + " → " + bal.branch.to);
      lopOk = false;
    }
    if (!str) {
      errors.push("no strength-themed edge found for lopsided-strength test");
      lopOk = false;
    } else if (!capsMetOn(str.caps, lop)) {
      errors.push("lopsided strength should allow strength edge " + str.from + " → " + str.branch.to);
      lopOk = false;
    }
    var zero = { offense: 0, intelligence: 0, agility: 0 };
    if (str && !capsMetOn(str.caps, zero)) {
      errors.push("zero training blocked strength edge " + str.from + " → " + str.branch.to);
    }

    return {
      ok: errors.length === 0,
      errors: errors,
      warnings: warnings,
      lopsided: {
        ok: lopOk,
        blockedBalance: !!(bal && !capsMetOn(bal.caps, lop)),
        allowedStrength: !!(str && capsMetOn(str.caps, lop)),
        balance: bal ? (bal.from + " → " + bal.branch.to + " (" + bal.branch.kind + ")") : null,
        strength: str ? (str.from + " → " + str.branch.to + " (" + str.branch.kind + ")") : null
      }
    };
  }

  var api = {
    install: install,
    themeOf: themeOf,
    capsFor: capsFor,
    capsMet: capsMet,
    capsMetOn: capsMetOn,
    validate: validate,
    findEdgeByTheme: findEdgeByTheme,
    lopsidedStrengthStats: lopsidedStrengthStats,
    defaults: DEFAULTS
  };

  D.evoStatGates = api;
  D.EVO_STAT_GATES_DEFAULTS = DEFAULTS;

  if (TREE) install(TREE);
  else if (!isNode && typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function () {
      if (D.EVO_TREE) TREE = D.EVO_TREE;
      install();
    });
  }

  if (isNode) module.exports = api;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
