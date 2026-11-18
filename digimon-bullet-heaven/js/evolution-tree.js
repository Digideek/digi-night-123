/* Digimon UP branching evolution tree.
 * Standalone data module. Does not depend on game.js or data.js.
 * Not wired into the live game — merge later.
 *
 * Usage (browser): window.EVO_TREE
 * Usage (node):    const { EVO_TREE } = require('./evolution-tree.js');
 */
(function (global) {
  "use strict";

  var DATA = {
  "version": 1,
  "title": "Digimon UP branching evolution tree (data only, not wired into the live game)",
  "priority": {
    "warp": 100,
    "armor": 90,
    "fusion": 80,
    "mode": 75,
    "dark": 70,
    "special": 60,
    "recover": 55,
    "standard": 50,
    "neglect": 35,
    "fallback": 20
  },
  "priorityOrder": [
    "warp",
    "armor",
    "fusion",
    "mode",
    "dark",
    "special",
    "recover",
    "standard",
    "neglect",
    "fallback"
  ],
  "priorityNote": "When several branches qualify, the highest priority wins. Neglect uses max-food / max-joy caps so it does not overlap a passing good-care check. Fallback has the loosest minimums and the lowest priority, so mid-care still evolves into the default form.",
  "existingGatesPreserved": [
    {
      "from": "botamon",
      "to": "koromon",
      "kind": "standard",
      "conditions": {
        "minLevel": 2,
        "minFood": 2,
        "minHappiness": 35,
        "minHpRatio": 0.3
      }
    },
    {
      "from": "koromon",
      "to": "agumon",
      "kind": "standard",
      "conditions": {
        "minLevel": 4,
        "minFood": 5,
        "minHappiness": 45,
        "minHpRatio": 0.35
      }
    },
    {
      "from": "punimon",
      "to": "tsunomon",
      "kind": "standard",
      "conditions": {
        "minLevel": 2,
        "minFood": 2,
        "minHappiness": 35,
        "minHpRatio": 0.3
      }
    },
    {
      "from": "tsunomon",
      "to": "gabumon",
      "kind": "standard",
      "conditions": {
        "minLevel": 4,
        "minFood": 5,
        "minHappiness": 45,
        "minHpRatio": 0.35
      }
    },
    {
      "from": "agumon",
      "to": "greymon",
      "kind": "standard",
      "conditions": {
        "minLevel": 8,
        "minFood": 15,
        "minHappiness": 55,
        "minHpRatio": 0.4
      }
    },
    {
      "from": "agumon",
      "to": "numemon",
      "kind": "neglect",
      "conditions": {
        "minLevel": 8,
        "maxFood": 7,
        "maxHappiness": 25,
        "minHpRatio": 0
      }
    },
    {
      "from": "greymon",
      "to": "metalgreymon",
      "kind": "standard",
      "conditions": {
        "minLevel": 15,
        "minFood": 40,
        "minHappiness": 65,
        "minHpRatio": 0.5
      }
    },
    {
      "from": "metalgreymon",
      "to": "wargreymon",
      "kind": "standard",
      "conditions": {
        "minLevel": 22,
        "minFood": 75,
        "minHappiness": 75,
        "minHpRatio": 0.6
      }
    },
    {
      "from": "gabumon",
      "to": "garurumon",
      "kind": "standard",
      "conditions": {
        "minLevel": 8,
        "minFood": 15,
        "minHappiness": 55,
        "minHpRatio": 0.4
      }
    },
    {
      "from": "gabumon",
      "to": "numemon",
      "kind": "neglect",
      "conditions": {
        "minLevel": 8,
        "maxFood": 7,
        "maxHappiness": 25,
        "minHpRatio": 0
      }
    },
    {
      "from": "garurumon",
      "to": "weregarurumon",
      "kind": "standard",
      "conditions": {
        "minLevel": 15,
        "minFood": 40,
        "minHappiness": 65,
        "minHpRatio": 0.5
      }
    },
    {
      "from": "weregarurumon",
      "to": "metalgarurumon",
      "kind": "standard",
      "conditions": {
        "minLevel": 22,
        "minFood": 75,
        "minHappiness": 75,
        "minHpRatio": 0.6
      }
    },
    {
      "from": "numemon",
      "to": "greymon",
      "kind": "recover",
      "conditions": {
        "minLevel": 10,
        "minFood": 22,
        "minHappiness": 70,
        "minHpRatio": 0.5
      }
    }
  ],
  "idAliases": {
    "demidevilmon": "demidevimon",
    "tri": "tanemon",
    "piccolomon": "piximon"
  },
  "stageDisplay": {
    "Baby I": "Baby I",
    "Baby II": "Baby II (In-Training)",
    "Rookie": "Child (Rookie)",
    "Champion": "Adult (Champion)",
    "Ultimate": "Perfect (Ultimate)",
    "Mega": "Ultimate (Mega)",
    "Mega+": "Ultimate (Mega+)",
    "Armor": "Armor",
    "Hybrid": "Hybrid",
    "Unknown": "Unknown"
  },
  "species": {
    "digmon": {
      "id": "digmon",
      "name": "Digmon",
      "stage": "Armor",
      "stageDisplay": "Armor",
      "attribute": "Free",
      "type": "Insectoid",
      "idleFrames": 16,
      "walkFrames": 10,
      "nativeWidth": 62,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/digmon",
      "atlas": "atlases-up-all/digmon.png"
    },
    "flamedramon": {
      "id": "flamedramon",
      "name": "Flamedramon",
      "stage": "Armor",
      "stageDisplay": "Armor",
      "attribute": "Free",
      "type": "Dragon Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 47,
      "nativeHeight": 65,
      "stillOnly": false,
      "framesDir": "frames-up-all/flamedramon",
      "atlas": "atlases-up-all/flamedramon.png"
    },
    "halsemon": {
      "id": "halsemon",
      "name": "Halsemon",
      "stage": "Armor",
      "stageDisplay": "Armor",
      "attribute": "Free",
      "type": "Beast",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 76,
      "nativeHeight": 54,
      "stillOnly": false,
      "framesDir": "frames-up-all/halsemon",
      "atlas": "atlases-up-all/halsemon.png"
    },
    "magnamon": {
      "id": "magnamon",
      "name": "Magnamon",
      "stage": "Armor",
      "stageDisplay": "Armor",
      "attribute": "Free",
      "type": "Holy Dragon",
      "idleFrames": 16,
      "walkFrames": 11,
      "nativeWidth": 59,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/magnamon",
      "atlas": "atlases-up-all/magnamon.png"
    },
    "nefertimon": {
      "id": "nefertimon",
      "name": "Nefertimon",
      "stage": "Armor",
      "stageDisplay": "Armor",
      "attribute": "Free",
      "type": "Holy Beast",
      "idleFrames": 16,
      "walkFrames": 17,
      "nativeWidth": 99,
      "nativeHeight": 84,
      "stillOnly": false,
      "framesDir": "frames-up-all/nefertimon",
      "atlas": "atlases-up-all/nefertimon.png"
    },
    "pegasusmon": {
      "id": "pegasusmon",
      "name": "Pegasusmon",
      "stage": "Armor",
      "stageDisplay": "Armor",
      "attribute": "Free",
      "type": "Holy Beast",
      "idleFrames": 16,
      "walkFrames": 15,
      "nativeWidth": 73,
      "nativeHeight": 61,
      "stillOnly": false,
      "framesDir": "frames-up-all/pegasusmon",
      "atlas": "atlases-up-all/pegasusmon.png"
    },
    "botamon": {
      "id": "botamon",
      "name": "Botamon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 14,
      "nativeWidth": 42,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/botamon",
      "atlas": "atlases-up-all/botamon.png"
    },
    "chibomon": {
      "id": "chibomon",
      "name": "Chibomon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 48,
      "nativeHeight": 41,
      "stillOnly": false,
      "framesDir": "frames-up-all/chibomon",
      "atlas": "atlases-up-all/chibomon.png"
    },
    "choromon": {
      "id": "choromon",
      "name": "Choromon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Machine",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 53,
      "nativeHeight": 44,
      "stillOnly": false,
      "framesDir": "frames-up-all/choromon",
      "atlas": "atlases-up-all/choromon.png"
    },
    "cotsucomon": {
      "id": "cotsucomon",
      "name": "Cotsucomon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Armor",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 50,
      "nativeHeight": 47,
      "stillOnly": false,
      "framesDir": "frames-up-all/cotsucomon",
      "atlas": "atlases-up-all/cotsucomon.png"
    },
    "jyarimon": {
      "id": "jyarimon",
      "name": "Jyarimon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 17,
      "nativeWidth": 43,
      "nativeHeight": 41,
      "stillOnly": false,
      "framesDir": "frames-up-all/jyarimon",
      "atlas": "atlases-up-all/jyarimon.png"
    },
    "kuramon": {
      "id": "kuramon",
      "name": "Kuramon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Unidentified",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 41,
      "nativeHeight": 36,
      "stillOnly": false,
      "framesDir": "frames-up-all/kuramon",
      "atlas": "atlases-up-all/kuramon.png"
    },
    "leafmon": {
      "id": "leafmon",
      "name": "Leafmon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 15,
      "walkFrames": 13,
      "nativeWidth": 48,
      "nativeHeight": 53,
      "stillOnly": false,
      "framesDir": "frames-up-all/leafmon",
      "atlas": "atlases-up-all/leafmon.png"
    },
    "nyokimon": {
      "id": "nyokimon",
      "name": "Nyokimon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Seed",
      "idleFrames": 16,
      "walkFrames": 11,
      "nativeWidth": 49,
      "nativeHeight": 55,
      "stillOnly": false,
      "framesDir": "frames-up-all/nyokimon",
      "atlas": "atlases-up-all/nyokimon.png"
    },
    "pabumon": {
      "id": "pabumon",
      "name": "Pabumon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 43,
      "nativeHeight": 40,
      "stillOnly": false,
      "framesDir": "frames-up-all/pabumon",
      "atlas": "atlases-up-all/pabumon.png"
    },
    "pichimon": {
      "id": "pichimon",
      "name": "Pichimon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 49,
      "nativeHeight": 48,
      "stillOnly": false,
      "framesDir": "frames-up-all/pichimon",
      "atlas": "atlases-up-all/pichimon.png"
    },
    "poyomon": {
      "id": "poyomon",
      "name": "Poyomon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 15,
      "walkFrames": 13,
      "nativeWidth": 43,
      "nativeHeight": 48,
      "stillOnly": false,
      "framesDir": "frames-up-all/poyomon",
      "atlas": "atlases-up-all/poyomon.png"
    },
    "punimon": {
      "id": "punimon",
      "name": "Punimon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 44,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/punimon",
      "atlas": "atlases-up-all/punimon.png"
    },
    "pupumon": {
      "id": "pupumon",
      "name": "Pupumon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 45,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/pupumon",
      "atlas": "atlases-up-all/pupumon.png"
    },
    "pururumon": {
      "id": "pururumon",
      "name": "Pururumon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 51,
      "nativeHeight": 33,
      "stillOnly": false,
      "framesDir": "frames-up-all/pururumon",
      "atlas": "atlases-up-all/pururumon.png"
    },
    "putimon": {
      "id": "putimon",
      "name": "Putimon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "",
      "idleFrames": 16,
      "walkFrames": 10,
      "nativeWidth": 54,
      "nativeHeight": 58,
      "stillOnly": false,
      "framesDir": "frames-up-all/putimon",
      "atlas": "atlases-up-all/putimon.png"
    },
    "puwamon": {
      "id": "puwamon",
      "name": "Puwamon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Baby Bird",
      "idleFrames": 19,
      "walkFrames": 14,
      "nativeWidth": 48,
      "nativeHeight": 56,
      "stillOnly": false,
      "framesDir": "frames-up-all/puwamon",
      "atlas": "atlases-up-all/puwamon.png"
    },
    "relemon": {
      "id": "relemon",
      "name": "Relemon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 50,
      "nativeHeight": 38,
      "stillOnly": false,
      "framesDir": "frames-up-all/relemon",
      "atlas": "atlases-up-all/relemon.png"
    },
    "sakumon": {
      "id": "sakumon",
      "name": "Sakumon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Weapon",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 40,
      "nativeHeight": 58,
      "stillOnly": false,
      "framesDir": "frames-up-all/sakumon",
      "atlas": "atlases-up-all/sakumon.png"
    },
    "tsubumon": {
      "id": "tsubumon",
      "name": "Tsubumon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 11,
      "nativeWidth": 40,
      "nativeHeight": 45,
      "stillOnly": false,
      "framesDir": "frames-up-all/tsubumon",
      "atlas": "atlases-up-all/tsubumon.png"
    },
    "yukimibotamon": {
      "id": "yukimibotamon",
      "name": "YukimiBotamon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 41,
      "nativeHeight": 42,
      "stillOnly": false,
      "framesDir": "frames-up-all/yukimibotamon",
      "atlas": "atlases-up-all/yukimibotamon.png"
    },
    "yuramon": {
      "id": "yuramon",
      "name": "Yuramon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Seed",
      "idleFrames": 13,
      "walkFrames": 14,
      "nativeWidth": 38,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/yuramon",
      "atlas": "atlases-up-all/yuramon.png"
    },
    "zerimon": {
      "id": "zerimon",
      "name": "Zerimon",
      "stage": "Baby I",
      "stageDisplay": "Baby I",
      "attribute": "None",
      "type": "Slime",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 55,
      "nativeHeight": 52,
      "stillOnly": false,
      "framesDir": "frames-up-all/zerimon",
      "atlas": "atlases-up-all/zerimon.png"
    },
    "budmon": {
      "id": "budmon",
      "name": "Budmon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Vegetation",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 54,
      "nativeHeight": 41,
      "stillOnly": false,
      "framesDir": "frames-up-all/budmon",
      "atlas": "atlases-up-all/budmon.png"
    },
    "bukamon": {
      "id": "bukamon",
      "name": "Bukamon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 44,
      "nativeHeight": 55,
      "stillOnly": false,
      "framesDir": "frames-up-all/bukamon",
      "atlas": "atlases-up-all/bukamon.png"
    },
    "cupimon": {
      "id": "cupimon",
      "name": "Cupimon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Mini Angel",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 34,
      "nativeHeight": 46,
      "stillOnly": false,
      "framesDir": "frames-up-all/cupimon",
      "atlas": "atlases-up-all/cupimon.png"
    },
    "demimeramon": {
      "id": "demimeramon",
      "name": "DemiMeramon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Fire",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 43,
      "nativeHeight": 52,
      "stillOnly": false,
      "framesDir": "frames-up-all/demimeramon",
      "atlas": "atlases-up-all/demimeramon.png"
    },
    "demiveemon": {
      "id": "demiveemon",
      "name": "DemiVeemon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Baby Dragon",
      "idleFrames": 16,
      "walkFrames": 16,
      "nativeWidth": 43,
      "nativeHeight": 47,
      "stillOnly": false,
      "framesDir": "frames-up-all/demiveemon",
      "atlas": "atlases-up-all/demiveemon.png"
    },
    "gigimon": {
      "id": "gigimon",
      "name": "Gigimon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 16,
      "walkFrames": 22,
      "nativeWidth": 47,
      "nativeHeight": 49,
      "stillOnly": false,
      "framesDir": "frames-up-all/gigimon",
      "atlas": "atlases-up-all/gigimon.png"
    },
    "gummymon": {
      "id": "gummymon",
      "name": "Gummymon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 13,
      "walkFrames": 15,
      "nativeWidth": 49,
      "nativeHeight": 52,
      "stillOnly": false,
      "framesDir": "frames-up-all/gummymon",
      "atlas": "atlases-up-all/gummymon.png"
    },
    "kakkinmon": {
      "id": "kakkinmon",
      "name": "Kakkinmon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Armor",
      "idleFrames": 13,
      "walkFrames": 6,
      "nativeWidth": 44,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/kakkinmon",
      "atlas": "atlases-up-all/kakkinmon.png"
    },
    "kodokugumon": {
      "id": "kodokugumon",
      "name": "Kodokugumon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 16,
      "walkFrames": 16,
      "nativeWidth": 72,
      "nativeHeight": 43,
      "stillOnly": false,
      "framesDir": "frames-up-all/kodokugumon",
      "atlas": "atlases-up-all/kodokugumon.png"
    },
    "koromon": {
      "id": "koromon",
      "name": "Koromon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 13,
      "walkFrames": 9,
      "nativeWidth": 55,
      "nativeHeight": 52,
      "stillOnly": false,
      "framesDir": "frames-up-all/koromon",
      "atlas": "atlases-up-all/koromon.png"
    },
    "minomon": {
      "id": "minomon",
      "name": "Minomon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Larva",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 39,
      "nativeHeight": 44,
      "stillOnly": false,
      "framesDir": "frames-up-all/minomon",
      "atlas": "atlases-up-all/minomon.png"
    },
    "missimon": {
      "id": "missimon",
      "name": "Missimon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Machine",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 58,
      "nativeHeight": 55,
      "stillOnly": false,
      "framesDir": "frames-up-all/missimon",
      "atlas": "atlases-up-all/missimon.png"
    },
    "motimon": {
      "id": "motimon",
      "name": "Motimon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 13,
      "walkFrames": 8,
      "nativeWidth": 42,
      "nativeHeight": 43,
      "stillOnly": false,
      "framesDir": "frames-up-all/motimon",
      "atlas": "atlases-up-all/motimon.png"
    },
    "nyaromon": {
      "id": "nyaromon",
      "name": "Nyaromon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 70,
      "nativeHeight": 56,
      "stillOnly": false,
      "framesDir": "frames-up-all/nyaromon",
      "atlas": "atlases-up-all/nyaromon.png"
    },
    "pagumon": {
      "id": "pagumon",
      "name": "Pagumon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 48,
      "nativeHeight": 42,
      "stillOnly": false,
      "framesDir": "frames-up-all/pagumon",
      "atlas": "atlases-up-all/pagumon.png"
    },
    "pinamon": {
      "id": "pinamon",
      "name": "Pinamon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Baby Bird",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 57,
      "nativeHeight": 44,
      "stillOnly": false,
      "framesDir": "frames-up-all/pinamon",
      "atlas": "atlases-up-all/pinamon.png"
    },
    "poromon": {
      "id": "poromon",
      "name": "Poromon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Mini Bird",
      "idleFrames": 13,
      "walkFrames": 14,
      "nativeWidth": 48,
      "nativeHeight": 57,
      "stillOnly": false,
      "framesDir": "frames-up-all/poromon",
      "atlas": "atlases-up-all/poromon.png"
    },
    "sakuttomon": {
      "id": "sakuttomon",
      "name": "Sakuttomon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Weapon",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 45,
      "nativeHeight": 49,
      "stillOnly": false,
      "framesDir": "frames-up-all/sakuttomon",
      "atlas": "atlases-up-all/sakuttomon.png"
    },
    "tanemon": {
      "id": "tanemon",
      "name": "Tanemon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Bulb",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 48,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/tanemon",
      "atlas": "atlases-up-all/tanemon.png"
    },
    "tokomon": {
      "id": "tokomon",
      "name": "Tokomon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 55,
      "nativeHeight": 61,
      "stillOnly": false,
      "framesDir": "frames-up-all/tokomon",
      "atlas": "atlases-up-all/tokomon.png"
    },
    "tsumemon": {
      "id": "tsumemon",
      "name": "Tsumemon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Unidentified",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 64,
      "nativeHeight": 59,
      "stillOnly": false,
      "framesDir": "frames-up-all/tsumemon",
      "atlas": "atlases-up-all/tsumemon.png"
    },
    "tsunomon": {
      "id": "tsunomon",
      "name": "Tsunomon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 50,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/tsunomon",
      "atlas": "atlases-up-all/tsunomon.png"
    },
    "tumblemon": {
      "id": "tumblemon",
      "name": "Tumblemon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Ore",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 49,
      "nativeHeight": 47,
      "stillOnly": false,
      "framesDir": "frames-up-all/tumblemon",
      "atlas": "atlases-up-all/tumblemon.png"
    },
    "upamon": {
      "id": "upamon",
      "name": "Upamon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Amphibian",
      "idleFrames": 13,
      "walkFrames": 8,
      "nativeWidth": 42,
      "nativeHeight": 38,
      "stillOnly": false,
      "framesDir": "frames-up-all/upamon",
      "atlas": "atlases-up-all/upamon.png"
    },
    "viximon": {
      "id": "viximon",
      "name": "Viximon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Lesser",
      "idleFrames": 17,
      "walkFrames": 13,
      "nativeWidth": 53,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/viximon",
      "atlas": "atlases-up-all/viximon.png"
    },
    "yokomon": {
      "id": "yokomon",
      "name": "Yokomon",
      "stage": "Baby II",
      "stageDisplay": "Baby II (In-Training)",
      "attribute": "None",
      "type": "Bulb",
      "idleFrames": 16,
      "walkFrames": 12,
      "nativeWidth": 45,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/yokomon",
      "atlas": "atlases-up-all/yokomon.png"
    },
    "aegiomon": {
      "id": "aegiomon",
      "name": "Aegiomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "God Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 52,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/aegiomon",
      "atlas": "atlases-up-all/aegiomon.png"
    },
    "akatorimon": {
      "id": "akatorimon",
      "name": "Akatorimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Giant Bird",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 72,
      "nativeHeight": 78,
      "stillOnly": false,
      "framesDir": "frames-up-all/akatorimon",
      "atlas": "atlases-up-all/akatorimon.png"
    },
    "angemon": {
      "id": "angemon",
      "name": "Angemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Angel",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 81,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/angemon",
      "atlas": "atlases-up-all/angemon.png"
    },
    "ankiromon": {
      "id": "ankiromon",
      "name": "Ankylomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Armored Dragon",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 76,
      "nativeHeight": 60,
      "stillOnly": false,
      "framesDir": "frames-up-all/ankiromon",
      "atlas": "atlases-up-all/ankiromon.png"
    },
    "aquilamon": {
      "id": "aquilamon",
      "name": "Aquilamon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Giant Bird",
      "idleFrames": 26,
      "walkFrames": 17,
      "nativeWidth": 77,
      "nativeHeight": 69,
      "stillOnly": false,
      "framesDir": "frames-up-all/aquilamon",
      "atlas": "atlases-up-all/aquilamon.png"
    },
    "bakemon": {
      "id": "bakemon",
      "name": "Bakemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Ghost",
      "idleFrames": 22,
      "walkFrames": 21,
      "nativeWidth": 73,
      "nativeHeight": 73,
      "stillOnly": false,
      "framesDir": "frames-up-all/bakemon",
      "atlas": "atlases-up-all/bakemon.png"
    },
    "birdramon": {
      "id": "birdramon",
      "name": "Birdramon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Giant Bird",
      "idleFrames": 17,
      "walkFrames": 13,
      "nativeWidth": 76,
      "nativeHeight": 73,
      "stillOnly": false,
      "framesDir": "frames-up-all/birdramon",
      "atlas": "atlases-up-all/birdramon.png"
    },
    "clockmon": {
      "id": "clockmon",
      "name": "Clockmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Machine",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 72,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/clockmon",
      "atlas": "atlases-up-all/clockmon.png"
    },
    "devidramon": {
      "id": "devidramon",
      "name": "Devidramon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Evil Dragon",
      "idleFrames": 22,
      "walkFrames": 19,
      "nativeWidth": 76,
      "nativeHeight": 81,
      "stillOnly": false,
      "framesDir": "frames-up-all/devidramon",
      "atlas": "atlases-up-all/devidramon.png"
    },
    "devimon": {
      "id": "devimon",
      "name": "Devimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Dark Angel",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 126,
      "nativeHeight": 149,
      "stillOnly": false,
      "framesDir": "frames-up-all/devimon",
      "atlas": "atlases-up-all/devimon.png"
    },
    "dokugumon": {
      "id": "dokugumon",
      "name": "Dokugumon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 74,
      "nativeHeight": 55,
      "stillOnly": false,
      "framesDir": "frames-up-all/dokugumon",
      "atlas": "atlases-up-all/dokugumon.png"
    },
    "ebidramon": {
      "id": "ebidramon",
      "name": "Ebidramon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Aquatic",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 84,
      "nativeHeight": 69,
      "stillOnly": false,
      "framesDir": "frames-up-all/ebidramon",
      "atlas": "atlases-up-all/ebidramon.png"
    },
    "exveemon": {
      "id": "exveemon",
      "name": "ExVeemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Mythical Dragon",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 68,
      "nativeHeight": 65,
      "stillOnly": false,
      "framesDir": "frames-up-all/exveemon",
      "atlas": "atlases-up-all/exveemon.png"
    },
    "flarerizamon": {
      "id": "flarerizamon",
      "name": "Flarerizamon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Fire Dragon",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 88,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/flarerizamon",
      "atlas": "atlases-up-all/flarerizamon.png"
    },
    "flymon": {
      "id": "flymon",
      "name": "Flymon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 61,
      "nativeHeight": 68,
      "stillOnly": false,
      "framesDir": "frames-up-all/flymon",
      "atlas": "atlases-up-all/flymon.png"
    },
    "frigimon": {
      "id": "frigimon",
      "name": "Frigimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Ice-Snow",
      "idleFrames": 14,
      "walkFrames": 13,
      "nativeWidth": 55,
      "nativeHeight": 72,
      "stillOnly": false,
      "framesDir": "frames-up-all/frigimon",
      "atlas": "atlases-up-all/frigimon.png"
    },
    "gargomon": {
      "id": "gargomon",
      "name": "Gargomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Dark Beast",
      "idleFrames": 16,
      "walkFrames": 11,
      "nativeWidth": 74,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/gargomon",
      "atlas": "atlases-up-all/gargomon.png"
    },
    "garurumon": {
      "id": "garurumon",
      "name": "Garurumon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Beast",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 91,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/garurumon",
      "atlas": "atlases-up-all/garurumon.png"
    },
    "gatomon": {
      "id": "gatomon",
      "name": "Gatomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Holy Beast",
      "idleFrames": 16,
      "walkFrames": 9,
      "nativeWidth": 74,
      "nativeHeight": 69,
      "stillOnly": false,
      "framesDir": "frames-up-all/gatomon",
      "atlas": "atlases-up-all/gatomon.png"
    },
    "gekomon": {
      "id": "gekomon",
      "name": "Gekomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Amphibian",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 50,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/gekomon",
      "atlas": "atlases-up-all/gekomon.png"
    },
    "gesomon": {
      "id": "gesomon",
      "name": "Gesomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Mollusk",
      "idleFrames": 16,
      "walkFrames": 10,
      "nativeWidth": 72,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/gesomon",
      "atlas": "atlases-up-all/gesomon.png"
    },
    "gladimon": {
      "id": "gladimon",
      "name": "Gladimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Warrior",
      "idleFrames": 11,
      "walkFrames": 13,
      "nativeWidth": 73,
      "nativeHeight": 65,
      "stillOnly": false,
      "framesDir": "frames-up-all/gladimon",
      "atlas": "atlases-up-all/gladimon.png"
    },
    "golemon": {
      "id": "golemon",
      "name": "Golemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Mineral",
      "idleFrames": 28,
      "walkFrames": 19,
      "nativeWidth": 90,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/golemon",
      "atlas": "atlases-up-all/golemon.png"
    },
    "greymon": {
      "id": "greymon",
      "name": "Greymon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Dinosaur",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 59,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/greymon",
      "atlas": "atlases-up-all/greymon.png"
    },
    "growlmon": {
      "id": "growlmon",
      "name": "Growlmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Dark Dragon",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 65,
      "nativeHeight": 68,
      "stillOnly": false,
      "framesDir": "frames-up-all/growlmon",
      "atlas": "atlases-up-all/growlmon.png"
    },
    "guardromon": {
      "id": "guardromon",
      "name": "Guardromon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Machine",
      "idleFrames": 32,
      "walkFrames": 16,
      "nativeWidth": 70,
      "nativeHeight": 73,
      "stillOnly": false,
      "framesDir": "frames-up-all/guardromon",
      "atlas": "atlases-up-all/guardromon.png"
    },
    "guardromon_gold": {
      "id": "guardromon_gold",
      "name": "Guardromon (Gold)",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Machine",
      "idleFrames": 32,
      "walkFrames": 16,
      "nativeWidth": 70,
      "nativeHeight": 73,
      "stillOnly": false,
      "framesDir": "frames-up-all/guardromon_gold",
      "atlas": "atlases-up-all/guardromon_gold.png"
    },
    "hi-commandramon": {
      "id": "hi-commandramon",
      "name": "Hi-Commandramon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 81,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/hi-commandramon",
      "atlas": "atlases-up-all/hi-commandramon.png"
    },
    "hoverespimon": {
      "id": "hoverespimon",
      "name": "HoverEspimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 80,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/hoverespimon",
      "atlas": "atlases-up-all/hoverespimon.png"
    },
    "hudiemon": {
      "id": "hudiemon",
      "name": "Hudiemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Insectoid",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 74,
      "nativeHeight": 96,
      "stillOnly": false,
      "framesDir": "frames-up-all/hudiemon",
      "atlas": "atlases-up-all/hudiemon.png"
    },
    "icemon": {
      "id": "icemon",
      "name": "Icemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Ice-Snow",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 48,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/icemon",
      "atlas": "atlases-up-all/icemon.png"
    },
    "ikkakumon": {
      "id": "ikkakumon",
      "name": "Ikkakumon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Sea Beast",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 76,
      "nativeHeight": 72,
      "stillOnly": false,
      "framesDir": "frames-up-all/ikkakumon",
      "atlas": "atlases-up-all/ikkakumon.png"
    },
    "jazardmon": {
      "id": "jazardmon",
      "name": "Jazardmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Machine Dragon",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 82,
      "nativeHeight": 54,
      "stillOnly": false,
      "framesDir": "frames-up-all/jazardmon",
      "atlas": "atlases-up-all/jazardmon.png"
    },
    "kabuterimon": {
      "id": "kabuterimon",
      "name": "Kabuterimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Insectoid",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 68,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/kabuterimon",
      "atlas": "atlases-up-all/kabuterimon.png"
    },
    "kiwimon": {
      "id": "kiwimon",
      "name": "Kiwimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Ancient Bird",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 63,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/kiwimon",
      "atlas": "atlases-up-all/kiwimon.png"
    },
    "kokatorimon": {
      "id": "kokatorimon",
      "name": "Kokatorimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Giant Bird",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 72,
      "nativeHeight": 78,
      "stillOnly": false,
      "framesDir": "frames-up-all/kokatorimon",
      "atlas": "atlases-up-all/kokatorimon.png"
    },
    "kuwagamon": {
      "id": "kuwagamon",
      "name": "Kuwagamon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 109,
      "nativeHeight": 107,
      "stillOnly": false,
      "framesDir": "frames-up-all/kuwagamon",
      "atlas": "atlases-up-all/kuwagamon.png"
    },
    "kyubimon": {
      "id": "kyubimon",
      "name": "Kyubimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Mysterious Beast",
      "idleFrames": 13,
      "walkFrames": 9,
      "nativeWidth": 74,
      "nativeHeight": 74,
      "stillOnly": false,
      "framesDir": "frames-up-all/kyubimon",
      "atlas": "atlases-up-all/kyubimon.png"
    },
    "lavorvomon": {
      "id": "lavorvomon",
      "name": "Lavorvomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Rock Dragon",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 100,
      "nativeHeight": 69,
      "stillOnly": false,
      "framesDir": "frames-up-all/lavorvomon",
      "atlas": "atlases-up-all/lavorvomon.png"
    },
    "leomon": {
      "id": "leomon",
      "name": "Leomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Beast Man",
      "idleFrames": 30,
      "walkFrames": 13,
      "nativeWidth": 73,
      "nativeHeight": 81,
      "stillOnly": false,
      "framesDir": "frames-up-all/leomon",
      "atlas": "atlases-up-all/leomon.png"
    },
    "machmon": {
      "id": "machmon",
      "name": "Machmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Cyborg",
      "idleFrames": 8,
      "walkFrames": 13,
      "nativeWidth": 97,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/machmon",
      "atlas": "atlases-up-all/machmon.png"
    },
    "madleomon": {
      "id": "madleomon",
      "name": "MadLeomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Undead",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 85,
      "nativeHeight": 69,
      "stillOnly": false,
      "framesDir": "frames-up-all/madleomon",
      "atlas": "atlases-up-all/madleomon.png"
    },
    "mekanorimon": {
      "id": "mekanorimon",
      "name": "Mekanorimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Machine",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 77,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/mekanorimon",
      "atlas": "atlases-up-all/mekanorimon.png"
    },
    "meramon": {
      "id": "meramon",
      "name": "Meramon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Fire",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 44,
      "nativeHeight": 75,
      "stillOnly": false,
      "framesDir": "frames-up-all/meramon",
      "atlas": "atlases-up-all/meramon.png"
    },
    "mojyamon": {
      "id": "mojyamon",
      "name": "Mojyamon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Rare Animal",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 71,
      "nativeHeight": 76,
      "stillOnly": false,
      "framesDir": "frames-up-all/mojyamon",
      "atlas": "atlases-up-all/mojyamon.png"
    },
    "monochromon": {
      "id": "monochromon",
      "name": "Monochromon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Armored Dragon",
      "idleFrames": 16,
      "walkFrames": 10,
      "nativeWidth": 71,
      "nativeHeight": 52,
      "stillOnly": false,
      "framesDir": "frames-up-all/monochromon",
      "atlas": "atlases-up-all/monochromon.png"
    },
    "numemon": {
      "id": "numemon",
      "name": "Numemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Mollusk",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 52,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/numemon",
      "atlas": "atlases-up-all/numemon.png"
    },
    "oboromon": {
      "id": "oboromon",
      "name": "Oboromon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Undead",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 159,
      "nativeHeight": 101,
      "stillOnly": false,
      "framesDir": "frames-up-all/oboromon",
      "atlas": "atlases-up-all/oboromon.png"
    },
    "octmon": {
      "id": "octmon",
      "name": "Octomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Mollusk",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 79,
      "nativeHeight": 72,
      "stillOnly": false,
      "framesDir": "frames-up-all/octmon",
      "atlas": "atlases-up-all/octmon.png"
    },
    "petermon": {
      "id": "petermon",
      "name": "Petermon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Pixie",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 66,
      "nativeHeight": 68,
      "stillOnly": false,
      "framesDir": "frames-up-all/petermon",
      "atlas": "atlases-up-all/petermon.png"
    },
    "porcupamon": {
      "id": "porcupamon",
      "name": "Porcupamon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Puppet",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 43,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/porcupamon",
      "atlas": "atlases-up-all/porcupamon.png"
    },
    "raremon": {
      "id": "raremon",
      "name": "Raremon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Undead",
      "idleFrames": 20,
      "walkFrames": 19,
      "nativeWidth": 89,
      "nativeHeight": 60,
      "stillOnly": false,
      "framesDir": "frames-up-all/raremon",
      "atlas": "atlases-up-all/raremon.png"
    },
    "redvegiemon": {
      "id": "redvegiemon",
      "name": "RedVegiemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Vegetation",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 87,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/redvegiemon",
      "atlas": "atlases-up-all/redvegiemon.png"
    },
    "roachmon": {
      "id": "roachmon",
      "name": "Roachmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 80,
      "nativeHeight": 85,
      "stillOnly": false,
      "framesDir": "frames-up-all/roachmon",
      "atlas": "atlases-up-all/roachmon.png"
    },
    "seadramon": {
      "id": "seadramon",
      "name": "Seadramon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Aquatic",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 110,
      "nativeHeight": 74,
      "stillOnly": false,
      "framesDir": "frames-up-all/seadramon",
      "atlas": "atlases-up-all/seadramon.png"
    },
    "shellmon": {
      "id": "shellmon",
      "name": "Shellmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Mollusk",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 81,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/shellmon",
      "atlas": "atlases-up-all/shellmon.png"
    },
    "sistermon_ciel": {
      "id": "sistermon_ciel",
      "name": "Sistermon Ciel",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Puppet",
      "idleFrames": 10,
      "walkFrames": 6,
      "nativeWidth": 61,
      "nativeHeight": 65,
      "stillOnly": false,
      "framesDir": "frames-up-all/sistermon_ciel",
      "atlas": "atlases-up-all/sistermon_ciel.png"
    },
    "sistermon_noir": {
      "id": "sistermon_noir",
      "name": "Sistermon Noir",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Puppet",
      "idleFrames": 15,
      "walkFrames": 10,
      "nativeWidth": 60,
      "nativeHeight": 68,
      "stillOnly": false,
      "framesDir": "frames-up-all/sistermon_noir",
      "atlas": "atlases-up-all/sistermon_noir.png"
    },
    "skullknightmon": {
      "id": "skullknightmon",
      "name": "SkullKnightmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Undead",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 86,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/skullknightmon",
      "atlas": "atlases-up-all/skullknightmon.png"
    },
    "starmon": {
      "id": "starmon",
      "name": "Starmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Mutant",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 68,
      "nativeHeight": 61,
      "stillOnly": false,
      "framesDir": "frames-up-all/starmon",
      "atlas": "atlases-up-all/starmon.png"
    },
    "stingmon": {
      "id": "stingmon",
      "name": "Stingmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Free",
      "type": "Insectoid",
      "idleFrames": 16,
      "walkFrames": 9,
      "nativeWidth": 67,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/stingmon",
      "atlas": "atlases-up-all/stingmon.png"
    },
    "sunflowmon": {
      "id": "sunflowmon",
      "name": "Sunflowmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Vegetation",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 67,
      "nativeHeight": 69,
      "stillOnly": false,
      "framesDir": "frames-up-all/sunflowmon",
      "atlas": "atlases-up-all/sunflowmon.png"
    },
    "tankmon": {
      "id": "tankmon",
      "name": "Tankmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Cyborg",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 75,
      "nativeHeight": 57,
      "stillOnly": false,
      "framesDir": "frames-up-all/tankmon",
      "atlas": "atlases-up-all/tankmon.png"
    },
    "tialudomon": {
      "id": "tialudomon",
      "name": "TiaLudomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Armor",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 69,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/tialudomon",
      "atlas": "atlases-up-all/tialudomon.png"
    },
    "tobiumon": {
      "id": "tobiumon",
      "name": "Tobiumon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Aquatic",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 73,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/tobiumon",
      "atlas": "atlases-up-all/tobiumon.png"
    },
    "togemon": {
      "id": "togemon",
      "name": "Togemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Vegetation",
      "idleFrames": 17,
      "walkFrames": 13,
      "nativeWidth": 62,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/togemon",
      "atlas": "atlases-up-all/togemon.png"
    },
    "tortomon": {
      "id": "tortomon",
      "name": "Tortomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Reptile",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 102,
      "nativeHeight": 71,
      "stillOnly": false,
      "framesDir": "frames-up-all/tortomon",
      "atlas": "atlases-up-all/tortomon.png"
    },
    "troopmon": {
      "id": "troopmon",
      "name": "Troopmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Undead",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 68,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/troopmon",
      "atlas": "atlases-up-all/troopmon.png"
    },
    "tuskmon": {
      "id": "tuskmon",
      "name": "Tuskmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Dinosaur",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 72,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/tuskmon",
      "atlas": "atlases-up-all/tuskmon.png"
    },
    "tyrannomon": {
      "id": "tyrannomon",
      "name": "Tyrannomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Dinosaur",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 57,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/tyrannomon",
      "atlas": "atlases-up-all/tyrannomon.png"
    },
    "unimon": {
      "id": "unimon",
      "name": "Unimon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Mythical Beast",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 70,
      "nativeHeight": 71,
      "stillOnly": false,
      "framesDir": "frames-up-all/unimon",
      "atlas": "atlases-up-all/unimon.png"
    },
    "vilemon": {
      "id": "vilemon",
      "name": "Vilemon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Little Devil",
      "idleFrames": 32,
      "walkFrames": 13,
      "nativeWidth": 80,
      "nativeHeight": 71,
      "stillOnly": false,
      "framesDir": "frames-up-all/vilemon",
      "atlas": "atlases-up-all/vilemon.png"
    },
    "woodmon": {
      "id": "woodmon",
      "name": "Woodmon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Virus",
      "type": "Vegetation",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 85,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/woodmon",
      "atlas": "atlases-up-all/woodmon.png"
    },
    "yakiimon": {
      "id": "yakiimon",
      "name": "Yaki-imon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Vegetation",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 57,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/yakiimon",
      "atlas": "atlases-up-all/yakiimon.png"
    },
    "youkomon": {
      "id": "youkomon",
      "name": "Youkomon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Data",
      "type": "Mysterious Beast",
      "idleFrames": 13,
      "walkFrames": 9,
      "nativeWidth": 74,
      "nativeHeight": 74,
      "stillOnly": false,
      "framesDir": "frames-up-all/youkomon",
      "atlas": "atlases-up-all/youkomon.png"
    },
    "zubaeagermon": {
      "id": "zubaeagermon",
      "name": "ZubaEagermon",
      "stage": "Champion",
      "stageDisplay": "Adult (Champion)",
      "attribute": "Vaccine",
      "type": "Weapon",
      "idleFrames": 10,
      "walkFrames": 6,
      "nativeWidth": 74,
      "nativeHeight": 71,
      "stillOnly": false,
      "framesDir": "frames-up-all/zubaeagermon",
      "atlas": "atlases-up-all/zubaeagermon.png"
    },
    "apocalymon": {
      "id": "apocalymon",
      "name": "Apocalymon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Unknown",
      "type": "Unidentified",
      "idleFrames": 21,
      "walkFrames": 16,
      "nativeWidth": 147,
      "nativeHeight": 135,
      "stillOnly": false,
      "framesDir": "frames-up-all/apocalymon",
      "atlas": "atlases-up-all/apocalymon.png"
    },
    "apollomon": {
      "id": "apollomon",
      "name": "Apollomon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Holy Beast",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 101,
      "nativeHeight": 118,
      "stillOnly": false,
      "framesDir": "frames-up-all/apollomon",
      "atlas": "atlases-up-all/apollomon.png"
    },
    "atratusmon_beatbreak": {
      "id": "atratusmon_beatbreak",
      "name": "Atratusmon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "Mutation",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 118,
      "nativeHeight": 110,
      "stillOnly": false,
      "framesDir": "frames-up-all/atratusmon_beatbreak",
      "atlas": "atlases-up-all/atratusmon_beatbreak.png"
    },
    "blackwargreymon": {
      "id": "blackwargreymon",
      "name": "BlackWarGreymon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Dragon Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 85,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/blackwargreymon",
      "atlas": "atlases-up-all/blackwargreymon.png"
    },
    "bryweludramon": {
      "id": "bryweludramon",
      "name": "BryweLudramon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "Armor",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 147,
      "nativeHeight": 111,
      "stillOnly": false,
      "framesDir": "frames-up-all/bryweludramon",
      "atlas": "atlases-up-all/bryweludramon.png"
    },
    "diablomon": {
      "id": "diablomon",
      "name": "Diaboromon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Unknown",
      "type": "Unidentified",
      "idleFrames": 23,
      "walkFrames": 19,
      "nativeWidth": 144,
      "nativeHeight": 99,
      "stillOnly": false,
      "framesDir": "frames-up-all/diablomon",
      "atlas": "atlases-up-all/diablomon.png"
    },
    "dianamon": {
      "id": "dianamon",
      "name": "Dianamon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "God Man",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 74,
      "nativeHeight": 87,
      "stillOnly": false,
      "framesDir": "frames-up-all/dianamon",
      "atlas": "atlases-up-all/dianamon.png"
    },
    "durandamon": {
      "id": "durandamon",
      "name": "Durandamon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Holy Sword",
      "idleFrames": 14,
      "walkFrames": 13,
      "nativeWidth": 93,
      "nativeHeight": 142,
      "stillOnly": false,
      "framesDir": "frames-up-all/durandamon",
      "atlas": "atlases-up-all/durandamon.png"
    },
    "gallantmon": {
      "id": "gallantmon",
      "name": "Gallantmon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Holy Knight",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 109,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/gallantmon",
      "atlas": "atlases-up-all/gallantmon.png"
    },
    "heavyleomon": {
      "id": "heavyleomon",
      "name": "HeavyLeomon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Machine",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 126,
      "nativeHeight": 114,
      "stillOnly": false,
      "framesDir": "frames-up-all/heavyleomon",
      "atlas": "atlases-up-all/heavyleomon.png"
    },
    "herculeskabuterimon": {
      "id": "herculeskabuterimon",
      "name": "HerculesKabuterimon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Insectoid",
      "idleFrames": 19,
      "walkFrames": 26,
      "nativeWidth": 103,
      "nativeHeight": 108,
      "stillOnly": false,
      "framesDir": "frames-up-all/herculeskabuterimon",
      "atlas": "atlases-up-all/herculeskabuterimon.png"
    },
    "hiandromon": {
      "id": "hiandromon",
      "name": "HiAndromon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 80,
      "nativeHeight": 95,
      "stillOnly": false,
      "framesDir": "frames-up-all/hiandromon",
      "atlas": "atlases-up-all/hiandromon.png"
    },
    "hydramon": {
      "id": "hydramon",
      "name": "Hydramon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Vegetation",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 133,
      "nativeHeight": 112,
      "stillOnly": false,
      "framesDir": "frames-up-all/hydramon",
      "atlas": "atlases-up-all/hydramon.png"
    },
    "imperialdramon_dragonmode": {
      "id": "imperialdramon_dragonmode",
      "name": "Imperialdramon (Dragon Mode)",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Free",
      "type": "Ancient Dragon",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 151,
      "nativeHeight": 120,
      "stillOnly": false,
      "framesDir": "frames-up-all/imperialdramon_dragonmode",
      "atlas": "atlases-up-all/imperialdramon_dragonmode.png"
    },
    "jijimon": {
      "id": "jijimon",
      "name": "Jijimon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Ancient",
      "idleFrames": 1,
      "walkFrames": 1,
      "nativeWidth": 65,
      "nativeHeight": 69,
      "stillOnly": true,
      "framesDir": "frames-up-all/jijimon",
      "atlas": "atlases-up-all/jijimon.png"
    },
    "machinedramon": {
      "id": "machinedramon",
      "name": "Machinedramon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Machine",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 86,
      "nativeHeight": 104,
      "stillOnly": false,
      "framesDir": "frames-up-all/machinedramon",
      "atlas": "atlases-up-all/machinedramon.png"
    },
    "magnadramon": {
      "id": "magnadramon",
      "name": "Magnadramon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Holy Dragon",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 113,
      "nativeHeight": 108,
      "stillOnly": false,
      "framesDir": "frames-up-all/magnadramon",
      "atlas": "atlases-up-all/magnadramon.png"
    },
    "malomyotismon": {
      "id": "malomyotismon",
      "name": "MaloMyotismon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Demon Lord",
      "idleFrames": 26,
      "walkFrames": 13,
      "nativeWidth": 129,
      "nativeHeight": 118,
      "stillOnly": false,
      "framesDir": "frames-up-all/malomyotismon",
      "atlas": "atlases-up-all/malomyotismon.png"
    },
    "megagargomon": {
      "id": "megagargomon",
      "name": "MegaGargomon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Machine",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 110,
      "nativeHeight": 117,
      "stillOnly": false,
      "framesDir": "frames-up-all/megagargomon",
      "atlas": "atlases-up-all/megagargomon.png"
    },
    "metalgarurumon": {
      "id": "metalgarurumon",
      "name": "MetalGarurumon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 9,
      "nativeWidth": 113,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/metalgarurumon",
      "atlas": "atlases-up-all/metalgarurumon.png"
    },
    "metalseadramon": {
      "id": "metalseadramon",
      "name": "MetalSeadramon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "Cyborg",
      "idleFrames": 26,
      "walkFrames": 13,
      "nativeWidth": 159,
      "nativeHeight": 140,
      "stillOnly": false,
      "framesDir": "frames-up-all/metalseadramon",
      "atlas": "atlases-up-all/metalseadramon.png"
    },
    "minervamon": {
      "id": "minervamon",
      "name": "Minervamon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "God Man",
      "idleFrames": 13,
      "walkFrames": 11,
      "nativeWidth": 62,
      "nativeHeight": 73,
      "stillOnly": false,
      "framesDir": "frames-up-all/minervamon",
      "atlas": "atlases-up-all/minervamon.png"
    },
    "phoenixmon": {
      "id": "phoenixmon",
      "name": "Phoenixmon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Holy Beast",
      "idleFrames": 20,
      "walkFrames": 17,
      "nativeWidth": 126,
      "nativeHeight": 120,
      "stillOnly": false,
      "framesDir": "frames-up-all/phoenixmon",
      "atlas": "atlases-up-all/phoenixmon.png"
    },
    "piedmon": {
      "id": "piedmon",
      "name": "Piedmon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Wizard",
      "idleFrames": 17,
      "walkFrames": 10,
      "nativeWidth": 94,
      "nativeHeight": 99,
      "stillOnly": false,
      "framesDir": "frames-up-all/piedmon",
      "atlas": "atlases-up-all/piedmon.png"
    },
    "puppetmon": {
      "id": "puppetmon",
      "name": "Puppetmon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Virus",
      "type": "Puppet",
      "idleFrames": 22,
      "walkFrames": 13,
      "nativeWidth": 113,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/puppetmon",
      "atlas": "atlases-up-all/puppetmon.png"
    },
    "rosemon": {
      "id": "rosemon",
      "name": "Rosemon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "Pixie",
      "idleFrames": 17,
      "walkFrames": 10,
      "nativeWidth": 90,
      "nativeHeight": 86,
      "stillOnly": false,
      "framesDir": "frames-up-all/rosemon",
      "atlas": "atlases-up-all/rosemon.png"
    },
    "sakuyamon": {
      "id": "sakuyamon",
      "name": "Sakuyamon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Data",
      "type": "Deity",
      "idleFrames": 16,
      "walkFrames": 9,
      "nativeWidth": 71,
      "nativeHeight": 91,
      "stillOnly": false,
      "framesDir": "frames-up-all/sakuyamon",
      "atlas": "atlases-up-all/sakuyamon.png"
    },
    "seraphimon": {
      "id": "seraphimon",
      "name": "Seraphimon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Seraph",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 84,
      "nativeHeight": 127,
      "stillOnly": false,
      "framesDir": "frames-up-all/seraphimon",
      "atlas": "atlases-up-all/seraphimon.png"
    },
    "skadimon": {
      "id": "skadimon",
      "name": "Skadimon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Ice-Snow",
      "idleFrames": 20,
      "walkFrames": 13,
      "nativeWidth": 127,
      "nativeHeight": 109,
      "stillOnly": false,
      "framesDir": "frames-up-all/skadimon",
      "atlas": "atlases-up-all/skadimon.png"
    },
    "slashangemon": {
      "id": "slashangemon",
      "name": "SlashAngemon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Great Angel",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 108,
      "nativeHeight": 111,
      "stillOnly": false,
      "framesDir": "frames-up-all/slashangemon",
      "atlas": "atlases-up-all/slashangemon.png"
    },
    "valkyrimon": {
      "id": "valkyrimon",
      "name": "Valkyrimon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Free",
      "type": "Warrior",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 111,
      "nativeHeight": 107,
      "stillOnly": false,
      "framesDir": "frames-up-all/valkyrimon",
      "atlas": "atlases-up-all/valkyrimon.png"
    },
    "vikemon": {
      "id": "vikemon",
      "name": "Vikemon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Free",
      "type": "Beast Man",
      "idleFrames": 23,
      "walkFrames": 17,
      "nativeWidth": 122,
      "nativeHeight": 139,
      "stillOnly": false,
      "framesDir": "frames-up-all/vikemon",
      "atlas": "atlases-up-all/vikemon.png"
    },
    "wargreymon": {
      "id": "wargreymon",
      "name": "WarGreymon",
      "stage": "Mega",
      "stageDisplay": "Ultimate (Mega)",
      "attribute": "Vaccine",
      "type": "Dragon Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 85,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/wargreymon",
      "atlas": "atlases-up-all/wargreymon.png"
    },
    "armageddemon": {
      "id": "armageddemon",
      "name": "Armageddemon",
      "stage": "Mega+",
      "stageDisplay": "Ultimate (Mega+)",
      "attribute": "Unknown",
      "type": "Unidentified",
      "idleFrames": 16,
      "walkFrames": 26,
      "nativeWidth": 181,
      "nativeHeight": 135,
      "stillOnly": false,
      "framesDir": "frames-up-all/armageddemon",
      "atlas": "atlases-up-all/armageddemon.png"
    },
    "imperialdramon_fightermode": {
      "id": "imperialdramon_fightermode",
      "name": "Imperialdramon (Fighter Mode)",
      "stage": "Mega+",
      "stageDisplay": "Ultimate (Mega+)",
      "attribute": "Free",
      "type": "Ancient Dragon Man",
      "idleFrames": 13,
      "walkFrames": 26,
      "nativeWidth": 147,
      "nativeHeight": 121,
      "stillOnly": false,
      "framesDir": "frames-up-all/imperialdramon_fightermode",
      "atlas": "atlases-up-all/imperialdramon_fightermode.png"
    },
    "agumon": {
      "id": "agumon",
      "name": "Agumon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Reptile",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 66,
      "nativeHeight": 56,
      "stillOnly": false,
      "framesDir": "frames-up-all/agumon",
      "atlas": "atlases-up-all/agumon.png"
    },
    "armadillomon": {
      "id": "armadillomon",
      "name": "Armadillomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Free",
      "type": "Mammal",
      "idleFrames": 13,
      "walkFrames": 9,
      "nativeWidth": 62,
      "nativeHeight": 47,
      "stillOnly": false,
      "framesDir": "frames-up-all/armadillomon",
      "atlas": "atlases-up-all/armadillomon.png"
    },
    "biyomon": {
      "id": "biyomon",
      "name": "Biyomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Baby Bird",
      "idleFrames": 16,
      "walkFrames": 10,
      "nativeWidth": 46,
      "nativeHeight": 57,
      "stillOnly": false,
      "framesDir": "frames-up-all/biyomon",
      "atlas": "atlases-up-all/biyomon.png"
    },
    "candlemon": {
      "id": "candlemon",
      "name": "Candlemon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Fire",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 53,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/candlemon",
      "atlas": "atlases-up-all/candlemon.png"
    },
    "chiropmon_beatbreak": {
      "id": "chiropmon_beatbreak",
      "name": "Chiropmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Mammal",
      "idleFrames": 11,
      "walkFrames": 19,
      "nativeWidth": 68,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/chiropmon_beatbreak",
      "atlas": "atlases-up-all/chiropmon_beatbreak.png"
    },
    "crabmon": {
      "id": "crabmon",
      "name": "Crabmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Crustacean",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 65,
      "nativeHeight": 47,
      "stillOnly": false,
      "framesDir": "frames-up-all/crabmon",
      "atlas": "atlases-up-all/crabmon.png"
    },
    "demidevimon": {
      "id": "demidevimon",
      "name": "DemiDevimon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Little Devil",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 77,
      "nativeHeight": 61,
      "stillOnly": false,
      "framesDir": "frames-up-all/demidevimon",
      "atlas": "atlases-up-all/demidevimon.png"
    },
    "dracmon": {
      "id": "dracmon",
      "name": "Dracmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Undead",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 58,
      "nativeHeight": 58,
      "stillOnly": false,
      "framesDir": "frames-up-all/dracmon",
      "atlas": "atlases-up-all/dracmon.png"
    },
    "espimon": {
      "id": "espimon",
      "name": "Espimon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 61,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/espimon",
      "atlas": "atlases-up-all/espimon.png"
    },
    "gabumon": {
      "id": "gabumon",
      "name": "Gabumon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Reptile",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 63,
      "nativeHeight": 59,
      "stillOnly": false,
      "framesDir": "frames-up-all/gabumon",
      "atlas": "atlases-up-all/gabumon.png"
    },
    "gazimon": {
      "id": "gazimon",
      "name": "Gazimon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Mammal",
      "idleFrames": 19,
      "walkFrames": 19,
      "nativeWidth": 60,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/gazimon",
      "atlas": "atlases-up-all/gazimon.png"
    },
    "gekkomon": {
      "id": "gekkomon",
      "name": "Gekkomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Reptile",
      "idleFrames": 21,
      "walkFrames": 10,
      "nativeWidth": 69,
      "nativeHeight": 58,
      "stillOnly": false,
      "framesDir": "frames-up-all/gekkomon",
      "atlas": "atlases-up-all/gekkomon.png"
    },
    "ghostmon": {
      "id": "ghostmon",
      "name": "Ghostmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Ghost",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 80,
      "nativeHeight": 83,
      "stillOnly": false,
      "framesDir": "frames-up-all/ghostmon",
      "atlas": "atlases-up-all/ghostmon.png"
    },
    "gizamon": {
      "id": "gizamon",
      "name": "Gizamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Sea Animal",
      "idleFrames": 16,
      "walkFrames": 10,
      "nativeWidth": 73,
      "nativeHeight": 78,
      "stillOnly": false,
      "framesDir": "frames-up-all/gizamon",
      "atlas": "atlases-up-all/gizamon.png"
    },
    "gomamon": {
      "id": "gomamon",
      "name": "Gomamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Sea Beast",
      "idleFrames": 16,
      "walkFrames": 9,
      "nativeWidth": 65,
      "nativeHeight": 56,
      "stillOnly": false,
      "framesDir": "frames-up-all/gomamon",
      "atlas": "atlases-up-all/gomamon.png"
    },
    "gotsumon": {
      "id": "gotsumon",
      "name": "Gotsumon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Ore",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 42,
      "nativeHeight": 60,
      "stillOnly": false,
      "framesDir": "frames-up-all/gotsumon",
      "atlas": "atlases-up-all/gotsumon.png"
    },
    "guilmon": {
      "id": "guilmon",
      "name": "Guilmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Reptile",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 46,
      "nativeHeight": 57,
      "stillOnly": false,
      "framesDir": "frames-up-all/guilmon",
      "atlas": "atlases-up-all/guilmon.png"
    },
    "hagurumon": {
      "id": "hagurumon",
      "name": "Hagurumon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Machine",
      "idleFrames": 34,
      "walkFrames": 26,
      "nativeWidth": 70,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/hagurumon",
      "atlas": "atlases-up-all/hagurumon.png"
    },
    "hawkmon": {
      "id": "hawkmon",
      "name": "Hawkmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Free",
      "type": "Bird",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 58,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/hawkmon",
      "atlas": "atlases-up-all/hawkmon.png"
    },
    "keramon": {
      "id": "keramon",
      "name": "Keramon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Unknown",
      "type": "Unidentified",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 62,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/keramon",
      "atlas": "atlases-up-all/keramon.png"
    },
    "kokabuterimon": {
      "id": "kokabuterimon",
      "name": "Kokabuterimon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 69,
      "nativeHeight": 74,
      "stillOnly": false,
      "framesDir": "frames-up-all/kokabuterimon",
      "atlas": "atlases-up-all/kokabuterimon.png"
    },
    "kokuwamon": {
      "id": "kokuwamon",
      "name": "Kokuwamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Machine",
      "idleFrames": 19,
      "walkFrames": 19,
      "nativeWidth": 57,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/kokuwamon",
      "atlas": "atlases-up-all/kokuwamon.png"
    },
    "lalamon": {
      "id": "lalamon",
      "name": "Lalamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Vegetation",
      "idleFrames": 15,
      "walkFrames": 10,
      "nativeWidth": 44,
      "nativeHeight": 63,
      "stillOnly": false,
      "framesDir": "frames-up-all/lalamon",
      "atlas": "atlases-up-all/lalamon.png"
    },
    "ludomon": {
      "id": "ludomon",
      "name": "Ludomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Armor",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 62,
      "nativeHeight": 55,
      "stillOnly": false,
      "framesDir": "frames-up-all/ludomon",
      "atlas": "atlases-up-all/ludomon.png"
    },
    "mushroomon": {
      "id": "mushroomon",
      "name": "Mushroomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Vegetation",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 49,
      "nativeHeight": 57,
      "stillOnly": false,
      "framesDir": "frames-up-all/mushroomon",
      "atlas": "atlases-up-all/mushroomon.png"
    },
    "otamamon": {
      "id": "otamamon",
      "name": "Otamamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Amphibian",
      "idleFrames": 21,
      "walkFrames": 12,
      "nativeWidth": 71,
      "nativeHeight": 47,
      "stillOnly": false,
      "framesDir": "frames-up-all/otamamon",
      "atlas": "atlases-up-all/otamamon.png"
    },
    "palmon": {
      "id": "palmon",
      "name": "Palmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Vegetation",
      "idleFrames": 17,
      "walkFrames": 10,
      "nativeWidth": 47,
      "nativeHeight": 58,
      "stillOnly": false,
      "framesDir": "frames-up-all/palmon",
      "atlas": "atlases-up-all/palmon.png"
    },
    "patamon": {
      "id": "patamon",
      "name": "Patamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Mammal",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 60,
      "nativeHeight": 64,
      "stillOnly": false,
      "framesDir": "frames-up-all/patamon",
      "atlas": "atlases-up-all/patamon.png"
    },
    "pristimon_beatbreak": {
      "id": "pristimon_beatbreak",
      "name": "Pristimon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Puppet",
      "idleFrames": 17,
      "walkFrames": 13,
      "nativeWidth": 57,
      "nativeHeight": 59,
      "stillOnly": false,
      "framesDir": "frames-up-all/pristimon_beatbreak",
      "atlas": "atlases-up-all/pristimon_beatbreak.png"
    },
    "renamon": {
      "id": "renamon",
      "name": "Renamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Beast Man",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 83,
      "nativeHeight": 86,
      "stillOnly": false,
      "framesDir": "frames-up-all/renamon",
      "atlas": "atlases-up-all/renamon.png"
    },
    "salamon": {
      "id": "salamon",
      "name": "Salamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Mammal",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 59,
      "nativeHeight": 58,
      "stillOnly": false,
      "framesDir": "frames-up-all/salamon",
      "atlas": "atlases-up-all/salamon.png"
    },
    "sangomon": {
      "id": "sangomon",
      "name": "Sangomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Mollusk",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 68,
      "nativeHeight": 49,
      "stillOnly": false,
      "framesDir": "frames-up-all/sangomon",
      "atlas": "atlases-up-all/sangomon.png"
    },
    "shoutmon_xroswars": {
      "id": "shoutmon_xroswars",
      "name": "Shoutmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Data",
      "type": "Small Dragon",
      "idleFrames": 19,
      "walkFrames": 9,
      "nativeWidth": 67,
      "nativeHeight": 59,
      "stillOnly": false,
      "framesDir": "frames-up-all/shoutmon_xroswars",
      "atlas": "atlases-up-all/shoutmon_xroswars.png"
    },
    "solarmon": {
      "id": "solarmon",
      "name": "Solarmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Machine",
      "idleFrames": 34,
      "walkFrames": 26,
      "nativeWidth": 70,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/solarmon",
      "atlas": "atlases-up-all/solarmon.png"
    },
    "syakomon": {
      "id": "syakomon",
      "name": "Syakomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Virus",
      "type": "Crustacean",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 51,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/syakomon",
      "atlas": "atlases-up-all/syakomon.png"
    },
    "tentomon": {
      "id": "tentomon",
      "name": "Tentomon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Insectoid",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 59,
      "nativeHeight": 66,
      "stillOnly": false,
      "framesDir": "frames-up-all/tentomon",
      "atlas": "atlases-up-all/tentomon.png"
    },
    "terriermon": {
      "id": "terriermon",
      "name": "Terriermon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Beast",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 61,
      "nativeHeight": 59,
      "stillOnly": false,
      "framesDir": "frames-up-all/terriermon",
      "atlas": "atlases-up-all/terriermon.png"
    },
    "veemon": {
      "id": "veemon",
      "name": "Veemon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Free",
      "type": "Mini Dragon",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 58,
      "nativeHeight": 60,
      "stillOnly": false,
      "framesDir": "frames-up-all/veemon",
      "atlas": "atlases-up-all/veemon.png"
    },
    "wormmon": {
      "id": "wormmon",
      "name": "Wormmon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Free",
      "type": "Larva",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 56,
      "nativeHeight": 57,
      "stillOnly": false,
      "framesDir": "frames-up-all/wormmon",
      "atlas": "atlases-up-all/wormmon.png"
    },
    "zubamon": {
      "id": "zubamon",
      "name": "Zubamon",
      "stage": "Rookie",
      "stageDisplay": "Child (Rookie)",
      "attribute": "Vaccine",
      "type": "Weapon",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 62,
      "nativeHeight": 62,
      "stillOnly": false,
      "framesDir": "frames-up-all/zubamon",
      "atlas": "atlases-up-all/zubamon.png"
    },
    "aegiochusmon": {
      "id": "aegiochusmon",
      "name": "Aegiochusmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "God Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 79,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/aegiochusmon",
      "atlas": "atlases-up-all/aegiochusmon.png"
    },
    "andromon": {
      "id": "andromon",
      "name": "Andromon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Cyborg",
      "idleFrames": 16,
      "walkFrames": 11,
      "nativeWidth": 52,
      "nativeHeight": 88,
      "stillOnly": false,
      "framesDir": "frames-up-all/andromon",
      "atlas": "atlases-up-all/andromon.png"
    },
    "angewomon": {
      "id": "angewomon",
      "name": "Angewomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "High Angel",
      "idleFrames": 16,
      "walkFrames": 17,
      "nativeWidth": 87,
      "nativeHeight": 103,
      "stillOnly": false,
      "framesDir": "frames-up-all/angewomon",
      "atlas": "atlases-up-all/angewomon.png"
    },
    "bluemeramon": {
      "id": "bluemeramon",
      "name": "BlueMeramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Fire",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 67,
      "nativeHeight": 102,
      "stillOnly": false,
      "framesDir": "frames-up-all/bluemeramon",
      "atlas": "atlases-up-all/bluemeramon.png"
    },
    "cherrymon": {
      "id": "cherrymon",
      "name": "Cherrymon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Vegetation",
      "idleFrames": 19,
      "walkFrames": 16,
      "nativeWidth": 97,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/cherrymon",
      "atlas": "atlases-up-all/cherrymon.png"
    },
    "datamon": {
      "id": "datamon",
      "name": "Datamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Machine",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 67,
      "nativeHeight": 50,
      "stillOnly": false,
      "framesDir": "frames-up-all/datamon",
      "atlas": "atlases-up-all/datamon.png"
    },
    "digitamamon": {
      "id": "digitamamon",
      "name": "Digitamamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Perfect",
      "idleFrames": 13,
      "walkFrames": 11,
      "nativeWidth": 56,
      "nativeHeight": 79,
      "stillOnly": false,
      "framesDir": "frames-up-all/digitamamon",
      "atlas": "atlases-up-all/digitamamon.png"
    },
    "dinobeemon": {
      "id": "dinobeemon",
      "name": "Dinobeemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Free",
      "type": "Mutant",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 114,
      "nativeHeight": 108,
      "stillOnly": false,
      "framesDir": "frames-up-all/dinobeemon",
      "atlas": "atlases-up-all/dinobeemon.png"
    },
    "divermon": {
      "id": "divermon",
      "name": "Divermon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Aquatic Beast Man",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 76,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/divermon",
      "atlas": "atlases-up-all/divermon.png"
    },
    "duramon": {
      "id": "duramon",
      "name": "Duramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Weapon",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 94,
      "nativeHeight": 99,
      "stillOnly": false,
      "framesDir": "frames-up-all/duramon",
      "atlas": "atlases-up-all/duramon.png"
    },
    "etemon": {
      "id": "etemon",
      "name": "Etemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Puppet",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 89,
      "nativeHeight": 95,
      "stillOnly": false,
      "framesDir": "frames-up-all/etemon",
      "atlas": "atlases-up-all/etemon.png"
    },
    "fumamon": {
      "id": "fumamon",
      "name": "Fumamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 6,
      "nativeWidth": 90,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/fumamon",
      "atlas": "atlases-up-all/fumamon.png"
    },
    "garbagemon": {
      "id": "garbagemon",
      "name": "Garbagemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Mutant",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 48,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/garbagemon",
      "atlas": "atlases-up-all/garbagemon.png"
    },
    "garudamon": {
      "id": "garudamon",
      "name": "Garudamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Bird Man",
      "idleFrames": 21,
      "walkFrames": 11,
      "nativeWidth": 108,
      "nativeHeight": 112,
      "stillOnly": false,
      "framesDir": "frames-up-all/garudamon",
      "atlas": "atlases-up-all/garudamon.png"
    },
    "gigadramon": {
      "id": "gigadramon",
      "name": "Gigadramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 83,
      "nativeHeight": 96,
      "stillOnly": false,
      "framesDir": "frames-up-all/gigadramon",
      "atlas": "atlases-up-all/gigadramon.png"
    },
    "hippogryphonmon": {
      "id": "hippogryphonmon",
      "name": "Hippogryphonmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Mythical Beast",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 123,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/hippogryphonmon",
      "atlas": "atlases-up-all/hippogryphonmon.png"
    },
    "infermon": {
      "id": "infermon",
      "name": "Infermon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Unknown",
      "type": "Unidentified",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 111,
      "nativeHeight": 74,
      "stillOnly": false,
      "framesDir": "frames-up-all/infermon",
      "atlas": "atlases-up-all/infermon.png"
    },
    "jagamon": {
      "id": "jagamon",
      "name": "Jagamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Vegetation",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 88,
      "nativeHeight": 80,
      "stillOnly": false,
      "framesDir": "frames-up-all/jagamon",
      "atlas": "atlases-up-all/jagamon.png"
    },
    "jazarichmon": {
      "id": "jazarichmon",
      "name": "Jazarichmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Machine Dragon",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 164,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/jazarichmon",
      "atlas": "atlases-up-all/jazarichmon.png"
    },
    "kimeramon": {
      "id": "kimeramon",
      "name": "Kimeramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Composite",
      "idleFrames": 28,
      "walkFrames": 19,
      "nativeWidth": 131,
      "nativeHeight": 114,
      "stillOnly": false,
      "framesDir": "frames-up-all/kimeramon",
      "atlas": "atlases-up-all/kimeramon.png"
    },
    "knightmon": {
      "id": "knightmon",
      "name": "Knightmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Warrior",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 112,
      "nativeHeight": 127,
      "stillOnly": false,
      "framesDir": "frames-up-all/knightmon",
      "atlas": "atlases-up-all/knightmon.png"
    },
    "kyukimon": {
      "id": "kyukimon",
      "name": "Kyukimon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Mysterious Beast",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 92,
      "nativeHeight": 93,
      "stillOnly": false,
      "framesDir": "frames-up-all/kyukimon",
      "atlas": "atlases-up-all/kyukimon.png"
    },
    "ladydevimon": {
      "id": "ladydevimon",
      "name": "LadyDevimon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Dark Angel",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 83,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/ladydevimon",
      "atlas": "atlases-up-all/ladydevimon.png"
    },
    "lavogaritamon": {
      "id": "lavogaritamon",
      "name": "Lavogaritamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Rock Dragon",
      "idleFrames": 13,
      "walkFrames": 16,
      "nativeWidth": 122,
      "nativeHeight": 105,
      "stillOnly": false,
      "framesDir": "frames-up-all/lavogaritamon",
      "atlas": "atlases-up-all/lavogaritamon.png"
    },
    "lilamon": {
      "id": "lilamon",
      "name": "Lilamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Pixie",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 76,
      "nativeHeight": 96,
      "stillOnly": false,
      "framesDir": "frames-up-all/lilamon",
      "atlas": "atlases-up-all/lilamon.png"
    },
    "lillymon": {
      "id": "lillymon",
      "name": "Lillymon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Pixie",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 44,
      "nativeHeight": 67,
      "stillOnly": false,
      "framesDir": "frames-up-all/lillymon",
      "atlas": "atlases-up-all/lillymon.png"
    },
    "loaderliomon": {
      "id": "loaderliomon",
      "name": "Loaderliomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Machine",
      "idleFrames": 17,
      "walkFrames": 9,
      "nativeWidth": 128,
      "nativeHeight": 83,
      "stillOnly": false,
      "framesDir": "frames-up-all/loaderliomon",
      "atlas": "atlases-up-all/loaderliomon.png"
    },
    "magnaangemon": {
      "id": "magnaangemon",
      "name": "MagnaAngemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "High Angel",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 120,
      "nativeHeight": 106,
      "stillOnly": false,
      "framesDir": "frames-up-all/magnaangemon",
      "atlas": "atlases-up-all/magnaangemon.png"
    },
    "mammothmon": {
      "id": "mammothmon",
      "name": "Mammothmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Ancient Beast",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 87,
      "nativeHeight": 91,
      "stillOnly": false,
      "framesDir": "frames-up-all/mammothmon",
      "atlas": "atlases-up-all/mammothmon.png"
    },
    "marinbullmon": {
      "id": "marinbullmon",
      "name": "Marinbullmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Mollusk",
      "idleFrames": 16,
      "walkFrames": 19,
      "nativeWidth": 100,
      "nativeHeight": 93,
      "stillOnly": false,
      "framesDir": "frames-up-all/marinbullmon",
      "atlas": "atlases-up-all/marinbullmon.png"
    },
    "megadramon": {
      "id": "megadramon",
      "name": "Megadramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 94,
      "nativeHeight": 95,
      "stillOnly": false,
      "framesDir": "frames-up-all/megadramon",
      "atlas": "atlases-up-all/megadramon.png"
    },
    "megakabuterimon": {
      "id": "megakabuterimon",
      "name": "MegaKabuterimon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 19,
      "nativeWidth": 90,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/megakabuterimon",
      "atlas": "atlases-up-all/megakabuterimon.png"
    },
    "megaseadramon": {
      "id": "megaseadramon",
      "name": "MegaSeadramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Aquatic",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 125,
      "nativeHeight": 102,
      "stillOnly": false,
      "framesDir": "frames-up-all/megaseadramon",
      "atlas": "atlases-up-all/megaseadramon.png"
    },
    "metalgreymon": {
      "id": "metalgreymon",
      "name": "MetalGreymon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 103,
      "nativeHeight": 93,
      "stillOnly": false,
      "framesDir": "frames-up-all/metalgreymon",
      "atlas": "atlases-up-all/metalgreymon.png"
    },
    "meteormon": {
      "id": "meteormon",
      "name": "Meteormon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Ore",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 72,
      "nativeHeight": 87,
      "stillOnly": false,
      "framesDir": "frames-up-all/meteormon",
      "atlas": "atlases-up-all/meteormon.png"
    },
    "monzaemon": {
      "id": "monzaemon",
      "name": "Monzaemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Puppet",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 56,
      "nativeHeight": 88,
      "stillOnly": false,
      "framesDir": "frames-up-all/monzaemon",
      "atlas": "atlases-up-all/monzaemon.png"
    },
    "murasamemon_beatbreak": {
      "id": "murasamemon_beatbreak",
      "name": "Murasamemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Beast Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 95,
      "nativeHeight": 71,
      "stillOnly": false,
      "framesDir": "frames-up-all/murasamemon_beatbreak",
      "atlas": "atlases-up-all/murasamemon_beatbreak.png"
    },
    "myotismon": {
      "id": "myotismon",
      "name": "Myotismon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Undead",
      "idleFrames": 19,
      "walkFrames": 8,
      "nativeWidth": 114,
      "nativeHeight": 94,
      "stillOnly": false,
      "framesDir": "frames-up-all/myotismon",
      "atlas": "atlases-up-all/myotismon.png"
    },
    "okuwamon": {
      "id": "okuwamon",
      "name": "Okuwamon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Insectoid",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 124,
      "nativeHeight": 127,
      "stillOnly": false,
      "framesDir": "frames-up-all/okuwamon",
      "atlas": "atlases-up-all/okuwamon.png"
    },
    "paildramon": {
      "id": "paildramon",
      "name": "Paildramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Free",
      "type": "Dragon Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 115,
      "nativeHeight": 110,
      "stillOnly": false,
      "framesDir": "frames-up-all/paildramon",
      "atlas": "atlases-up-all/paildramon.png"
    },
    "parrotmon": {
      "id": "parrotmon",
      "name": "Parrotmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Giant Bird",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 119,
      "nativeHeight": 111,
      "stillOnly": false,
      "framesDir": "frames-up-all/parrotmon",
      "atlas": "atlases-up-all/parrotmon.png"
    },
    "phantomon": {
      "id": "phantomon",
      "name": "Phantomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Ghost",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 92,
      "nativeHeight": 112,
      "stillOnly": false,
      "framesDir": "frames-up-all/phantomon",
      "atlas": "atlases-up-all/phantomon.png"
    },
    "piximon": {
      "id": "piximon",
      "name": "Piximon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Pixie",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 87,
      "nativeHeight": 79,
      "stillOnly": false,
      "framesDir": "frames-up-all/piximon",
      "atlas": "atlases-up-all/piximon.png"
    },
    "polarbearmon": {
      "id": "polarbearmon",
      "name": "Polarbearmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Ice-Snow",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 99,
      "nativeHeight": 92,
      "stillOnly": false,
      "framesDir": "frames-up-all/polarbearmon",
      "atlas": "atlases-up-all/polarbearmon.png"
    },
    "pumpkinmon": {
      "id": "pumpkinmon",
      "name": "Pumpkinmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Puppet",
      "idleFrames": 19,
      "walkFrames": 13,
      "nativeWidth": 62,
      "nativeHeight": 70,
      "stillOnly": false,
      "framesDir": "frames-up-all/pumpkinmon",
      "atlas": "atlases-up-all/pumpkinmon.png"
    },
    "raijiludomon": {
      "id": "raijiludomon",
      "name": "RaijiLudomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Armor",
      "idleFrames": 16,
      "walkFrames": 16,
      "nativeWidth": 95,
      "nativeHeight": 97,
      "stillOnly": false,
      "framesDir": "frames-up-all/raijiludomon",
      "atlas": "atlases-up-all/raijiludomon.png"
    },
    "rapidmon": {
      "id": "rapidmon",
      "name": "Rapidmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Cyborg",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 93,
      "nativeHeight": 98,
      "stillOnly": false,
      "framesDir": "frames-up-all/rapidmon",
      "atlas": "atlases-up-all/rapidmon.png"
    },
    "scorpiomon": {
      "id": "scorpiomon",
      "name": "Scorpiomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Insectoid",
      "idleFrames": 19,
      "walkFrames": 19,
      "nativeWidth": 101,
      "nativeHeight": 86,
      "stillOnly": false,
      "framesDir": "frames-up-all/scorpiomon",
      "atlas": "atlases-up-all/scorpiomon.png"
    },
    "shakkoumon": {
      "id": "shakkoumon",
      "name": "Shakkoumon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Free",
      "type": "Mutant",
      "idleFrames": 16,
      "walkFrames": 13,
      "nativeWidth": 74,
      "nativeHeight": 107,
      "stillOnly": false,
      "framesDir": "frames-up-all/shakkoumon",
      "atlas": "atlases-up-all/shakkoumon.png"
    },
    "shogungekomon": {
      "id": "shogungekomon",
      "name": "ShogunGekomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Amphibian",
      "idleFrames": 16,
      "walkFrames": 11,
      "nativeWidth": 77,
      "nativeHeight": 98,
      "stillOnly": false,
      "framesDir": "frames-up-all/shogungekomon",
      "atlas": "atlases-up-all/shogungekomon.png"
    },
    "silphymon": {
      "id": "silphymon",
      "name": "Silphymon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Free",
      "type": "Beast Man",
      "idleFrames": 16,
      "walkFrames": 17,
      "nativeWidth": 74,
      "nativeHeight": 89,
      "stillOnly": false,
      "framesDir": "frames-up-all/silphymon",
      "atlas": "atlases-up-all/silphymon.png"
    },
    "tankdramon": {
      "id": "tankdramon",
      "name": "Tankdramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Machine",
      "idleFrames": 13,
      "walkFrames": 10,
      "nativeWidth": 117,
      "nativeHeight": 86,
      "stillOnly": false,
      "framesDir": "frames-up-all/tankdramon",
      "atlas": "atlases-up-all/tankdramon.png"
    },
    "taomon": {
      "id": "taomon",
      "name": "Taomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Wizard",
      "idleFrames": 16,
      "walkFrames": 17,
      "nativeWidth": 63,
      "nativeHeight": 90,
      "stillOnly": false,
      "framesDir": "frames-up-all/taomon",
      "atlas": "atlases-up-all/taomon.png"
    },
    "triceramon": {
      "id": "triceramon",
      "name": "Triceramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Data",
      "type": "Ceratopsian",
      "idleFrames": 22,
      "walkFrames": 19,
      "nativeWidth": 105,
      "nativeHeight": 85,
      "stillOnly": false,
      "framesDir": "frames-up-all/triceramon",
      "atlas": "atlases-up-all/triceramon.png"
    },
    "wargrowlmon": {
      "id": "wargrowlmon",
      "name": "WarGrowlmon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Cyborg",
      "idleFrames": 19,
      "walkFrames": 17,
      "nativeWidth": 95,
      "nativeHeight": 88,
      "stillOnly": false,
      "framesDir": "frames-up-all/wargrowlmon",
      "atlas": "atlases-up-all/wargrowlmon.png"
    },
    "warumonzaemon": {
      "id": "warumonzaemon",
      "name": "WaruMonzaemon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Virus",
      "type": "Puppet",
      "idleFrames": 16,
      "walkFrames": 16,
      "nativeWidth": 81,
      "nativeHeight": 87,
      "stillOnly": false,
      "framesDir": "frames-up-all/warumonzaemon",
      "atlas": "atlases-up-all/warumonzaemon.png"
    },
    "weregarurumon": {
      "id": "weregarurumon",
      "name": "WereGarurumon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Beast Man",
      "idleFrames": 13,
      "walkFrames": 13,
      "nativeWidth": 67,
      "nativeHeight": 88,
      "stillOnly": false,
      "framesDir": "frames-up-all/weregarurumon",
      "atlas": "atlases-up-all/weregarurumon.png"
    },
    "wingdramon": {
      "id": "wingdramon",
      "name": "Wingdramon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Sky Dragon",
      "idleFrames": 19,
      "walkFrames": 19,
      "nativeWidth": 135,
      "nativeHeight": 101,
      "stillOnly": false,
      "framesDir": "frames-up-all/wingdramon",
      "atlas": "atlases-up-all/wingdramon.png"
    },
    "zudomon": {
      "id": "zudomon",
      "name": "Zudomon",
      "stage": "Ultimate",
      "stageDisplay": "Perfect (Ultimate)",
      "attribute": "Vaccine",
      "type": "Sea Beast",
      "idleFrames": 16,
      "walkFrames": 17,
      "nativeWidth": 125,
      "nativeHeight": 116,
      "stillOnly": false,
      "framesDir": "frames-up-all/zudomon",
      "atlas": "atlases-up-all/zudomon.png"
    }
  },
  "branches": {
    "digmon": [
      {
        "to": "jagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "megakabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shakkoumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "shakkoumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "flamedramon": [
      {
        "to": "wargrowlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "wingdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "paildramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "paildramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "halsemon": [
      {
        "to": "garudamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "hippogryphonmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "silphymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "silphymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "magnamon": [],
    "nefertimon": [
      {
        "to": "angewomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kyukimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "silphymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "silphymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pegasusmon": [
      {
        "to": "hippogryphonmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "magnaangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shakkoumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "shakkoumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "botamon": [
      {
        "to": "demimeramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "koromon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "koromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "chibomon": [
      {
        "to": "demiveemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "demiveemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "choromon": [
      {
        "to": "kakkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "motimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "sakuttomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "missimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "missimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "cotsucomon": [
      {
        "to": "tumblemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kakkinmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "kakkinmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "jyarimon": [
      {
        "to": "gigimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gigimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kuramon": [
      {
        "to": "pagumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tsumemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tsumemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "leafmon": [
      {
        "to": "minomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "minomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "nyokimon": [
      {
        "to": "budmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "tanemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "yokomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "yokomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pabumon": [
      {
        "to": "tanemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "yokomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "motimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "motimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pichimon": [
      {
        "to": "upamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "bukamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "bukamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "poyomon": [
      {
        "to": "tokomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tokomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "punimon": [
      {
        "to": "tumblemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tsunomon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tsunomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pupumon": [
      {
        "to": "tanemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tanemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pururumon": [
      {
        "to": "poromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "poromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "putimon": [
      {
        "to": "cupimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "cupimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "puwamon": [
      {
        "to": "biyomon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "pinamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "pinamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "relemon": [
      {
        "to": "viximon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "viximon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "sakumon": [
      {
        "to": "sakuttomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "sakuttomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tsubumon": [
      {
        "to": "upamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "upamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "yukimibotamon": [
      {
        "to": "frigimon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "icemon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "nyaromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "nyaromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "yuramon": [
      {
        "to": "budmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 25,
          "minHpRatio": 0.3,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "tanemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tanemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "zerimon": [
      {
        "to": "gummymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 2,
          "minFood": 2,
          "minHappiness": 35,
          "minHpRatio": 0.3
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "pagumon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 3,
          "maxFood": 1,
          "maxHappiness": 20,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gummymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 3,
          "minFood": 1,
          "minHappiness": 20,
          "minHpRatio": 0.15
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "budmon": [
      {
        "to": "mushroomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "palmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lalamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "lalamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "bukamon": [
      {
        "to": "crabmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "gizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "otamamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "sangomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "syakomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "gomamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gomamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "cupimon": [
      {
        "to": "salamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "terriermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "patamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "patamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "demimeramon": [
      {
        "to": "ghostmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "solarmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "candlemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "candlemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "demiveemon": [
      {
        "to": "veemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "veemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gigimon": [
      {
        "to": "lavorvomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "shoutmon_xroswars",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official prior form."
      },
      {
        "to": "guilmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "guilmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gummymon": [
      {
        "to": "terriermon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "terriermon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kakkinmon": [
      {
        "to": "ludomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zubamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gotsumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gotsumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kodokugumon": [
      {
        "to": "dokugumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "wormmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tentomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tentomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "koromon": [
      {
        "to": "shoutmon_xroswars",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official Xros Wars prior form."
      },
      {
        "to": "agumon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "agumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "minomon": [
      {
        "to": "kodokugumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kokabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kokuwamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "wormmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "wormmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "missimon": [
      {
        "to": "espimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "hagurumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "hagurumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "motimon": [
      {
        "to": "espimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gotsumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "hagurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kokabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kokuwamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "solarmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tentomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tentomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "nyaromon": [
      {
        "to": "gatomon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "gekkomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "ghostmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "salamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "salamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pagumon": [
      {
        "to": "dracmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gazimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "ghostmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "demidevimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "demidevimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pinamon": [
      {
        "to": "kokatorimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "biyomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "biyomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "poromon": [
      {
        "to": "hawkmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "hawkmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "sakuttomon": [
      {
        "to": "solarmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zubamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "zubamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tanemon": [
      {
        "to": "palmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "palmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tokomon": [
      {
        "to": "salamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shoutmon_xroswars",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official prior form."
      },
      {
        "to": "patamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "patamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tsumemon": [
      {
        "to": "demidevimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "dracmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "kodokugumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "madleomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "keramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "keramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tsunomon": [
      {
        "to": "gazimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "veemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "gabumon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gabumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tumblemon": [
      {
        "to": "ludomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zubamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gotsumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gotsumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "upamon": [
      {
        "to": "gekkomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "armadillomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "armadillomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "viximon": [
      {
        "to": "renamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "renamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "yokomon": [
      {
        "to": "wormmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 35,
          "minHpRatio": 0.35
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "biyomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 4,
          "minFood": 5,
          "minHappiness": 45,
          "minHpRatio": 0.35
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "gazimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 5,
          "maxFood": 3,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "biyomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 5,
          "minFood": 3,
          "minHappiness": 25,
          "minHpRatio": 0.2
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "aegiomon": [
      {
        "to": "aegiochusmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical Aegiomon line."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "aegiochusmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "akatorimon": [
      {
        "to": "garudamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "parrotmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "digitamamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "digitamamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "angemon": [
      {
        "to": "shakkoumon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "ankiromon"
        },
        "note": "Official fusion evolution.",
        "partner": "ankiromon"
      },
      {
        "to": "devimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "myotismon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "hippogryphonmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "magnaangemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "magnaangemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "ankiromon": [
      {
        "to": "shakkoumon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "angemon"
        },
        "note": "Official fusion evolution.",
        "partner": "angemon"
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "meteormon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "meteormon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "aquilamon": [
      {
        "to": "silphymon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "gatomon"
        },
        "note": "Official fusion evolution.",
        "partner": "gatomon"
      },
      {
        "to": "hippogryphonmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "parrotmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "garudamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "garudamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "bakemon": [
      {
        "to": "ladydevimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "phantomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "pumpkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "myotismon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "myotismon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "birdramon": [
      {
        "to": "hippogryphonmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "parrotmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "garudamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "garudamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "clockmon": [
      {
        "to": "phantomon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "andromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "datamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "knightmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "knightmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "devidramon": [
      {
        "to": "ladydevimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "myotismon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "wingdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "gigadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gigadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "devimon": [
      {
        "to": "infermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "ladydevimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "phantomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "skullknightmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "myotismon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "myotismon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "dokugumon": [
      {
        "to": "myotismon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "okuwamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "ladydevimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "ladydevimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "ebidramon": [
      {
        "to": "scorpiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shogungekomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megaseadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "megaseadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "exveemon": [
      {
        "to": "dinobeemon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "stingmon"
        },
        "note": "Official fusion evolution.",
        "partner": "stingmon"
      },
      {
        "to": "paildramon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "stingmon"
        },
        "note": "Official fusion evolution.",
        "partner": "stingmon"
      },
      {
        "to": "megadramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "wingdramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "wingdramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "flarerizamon": [
      {
        "to": "megadramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "lavogaritamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "wargrowlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "bluemeramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "bluemeramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "flymon": [
      {
        "to": "dinobeemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megakabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "okuwamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "okuwamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "frigimon": [
      {
        "to": "monzaemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "polarbearmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "mammothmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "mammothmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gargomon": [
      {
        "to": "warumonzaemon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "monzaemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "rapidmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "rapidmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "garurumon": [
      {
        "to": "skullknightmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kimeramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 8,
            "Data": 8,
            "Virus": 8
          }
        },
        "note": "Official fusion component."
      },
      {
        "to": "mammothmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "weregarurumon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "weregarurumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gatomon": [
      {
        "to": "nefertimon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Official armor evolution."
      },
      {
        "to": "silphymon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "aquilamon"
        },
        "note": "Official fusion evolution.",
        "partner": "aquilamon"
      },
      {
        "to": "ladydevimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kyukimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lillymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "angewomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "angewomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gekomon": [
      {
        "to": "digitamamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shogungekomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "shogungekomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gesomon": [
      {
        "to": "myotismon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "marinbullmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "megaseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "scorpiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "divermon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "divermon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gladimon": [
      {
        "to": "skullknightmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "duramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "knightmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "knightmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "golemon": [
      {
        "to": "meteormon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "mammothmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "mammothmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "greymon": [
      {
        "to": "gigadramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "megadramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kimeramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 8,
            "Data": 8,
            "Virus": 8
          }
        },
        "note": "Composite Perfect. Unlocks after KOs of several attributes."
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "wargrowlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalgreymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "growlmon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "megadramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "lavogaritamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "wargrowlmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "wargrowlmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "guardromon": [
      {
        "to": "datamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "guardromon_gold",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Gold subspecies."
      },
      {
        "to": "rapidmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "andromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "andromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "guardromon_gold": [
      {
        "to": "magnamon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Official armor path."
      },
      {
        "to": "duramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official next form."
      },
      {
        "to": "andromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Official next form."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "andromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "hi-commandramon": [
      {
        "to": "tankdramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tankdramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "hoverespimon": [
      {
        "to": "datamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "jazarichmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tankdramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "tankdramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "hudiemon": [
      {
        "to": "lillymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lilamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "lilamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "icemon": [
      {
        "to": "mammothmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "polarbearmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "meteormon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "meteormon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "ikkakumon": [
      {
        "to": "divermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "mammothmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "megaseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "zudomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "zudomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "jazardmon": [
      {
        "to": "gigadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tankdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "jazarichmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jazarichmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kabuterimon": [
      {
        "to": "okuwamon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "jagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "kimeramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 8,
            "Data": 8,
            "Virus": 8
          }
        },
        "note": "Official fusion component."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megakabuterimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "megakabuterimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kiwimon": [
      {
        "to": "cherrymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "garudamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "lillymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "parrotmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "lilamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "lilamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kokatorimon": [
      {
        "to": "parrotmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "digitamamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "digitamamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kuwagamon": [
      {
        "to": "dinobeemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kimeramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 8,
            "Data": 8,
            "Virus": 8
          }
        },
        "note": "Official fusion component."
      },
      {
        "to": "megakabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "okuwamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "okuwamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kyubimon": [
      {
        "to": "ladydevimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kyukimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "taomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "taomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "lavorvomon": [
      {
        "to": "flarerizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "lavogaritamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "lavogaritamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "leomon": [
      {
        "to": "madleomon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "etemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kyukimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "mammothmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "monzaemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "weregarurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "loaderliomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "loaderliomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "machmon": [
      {
        "to": "gigadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "rapidmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "loaderliomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "loaderliomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "madleomon": [
      {
        "to": "skullknightmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "murasamemon_beatbreak",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official prior Cougarmon has no UP sprite; MadLeomon is the closest Virus Beast Man Adult."
      },
      {
        "to": "weregarurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "loaderliomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "loaderliomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "mekanorimon": [
      {
        "to": "andromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gigadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "jazarichmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tankdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "datamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "datamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "meramon": [
      {
        "to": "lavogaritamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "wargrowlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "bluemeramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "bluemeramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "mojyamon": [
      {
        "to": "etemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "monzaemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "polarbearmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "mammothmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "mammothmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "monochromon": [
      {
        "to": "megadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "meteormon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "digitamamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "digitamamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "numemon": [
      {
        "to": "warumonzaemon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "digitamamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "etemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "greymon",
        "kind": "recover",
        "priority": 57,
        "conditions": {
          "minLevel": 10,
          "minFood": 22,
          "minHappiness": 70,
          "minHpRatio": 0.5
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "monzaemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "monzaemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "oboromon": [
      {
        "to": "fumamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "skullknightmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "phantomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "phantomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "octmon": [
      {
        "to": "divermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "marinbullmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "scorpiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shogungekomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "shogungekomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "petermon": [
      {
        "to": "phantomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "pumpkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "piximon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "piximon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "porcupamon": [
      {
        "to": "skullknightmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "warumonzaemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "raremon": [
      {
        "to": "infermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "garbagemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "datamon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "garbagemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "redvegiemon": [
      {
        "to": "jagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "cherrymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "cherrymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "roachmon": [
      {
        "to": "okuwamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "garbagemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "garbagemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "seadramon": [
      {
        "to": "divermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "marinbullmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "scorpiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megaseadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "megaseadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "shellmon": [
      {
        "to": "divermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "marinbullmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "megaseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "scorpiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "digitamamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "digitamamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "sistermon_ciel": [
      {
        "to": "sistermon_noir",
        "kind": "mode",
        "priority": 75,
        "conditions": {
          "minLevel": 15,
          "minHappiness": 70,
          "minHpRatio": 0.5
        },
        "note": "Official mode evolution."
      },
      {
        "to": "ladydevimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "angewomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "taomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "taomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "sistermon_noir": [
      {
        "to": "sistermon_ciel",
        "kind": "mode",
        "priority": 75,
        "conditions": {
          "minLevel": 15,
          "minHappiness": 70,
          "minHpRatio": 0.5
        },
        "note": "Official mode evolution."
      },
      {
        "to": "weregarurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "ladydevimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "ladydevimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "skullknightmon": [
      {
        "to": "knightmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "phantomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "phantomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "starmon": [
      {
        "to": "monzaemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "rapidmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shakkoumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "meteormon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "meteormon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "stingmon": [
      {
        "to": "dinobeemon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "exveemon"
        },
        "note": "Official fusion evolution.",
        "partner": "exveemon"
      },
      {
        "to": "paildramon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 70,
          "minHpRatio": 0.5,
          "requiresPartner": "exveemon"
        },
        "note": "Official fusion evolution.",
        "partner": "exveemon"
      },
      {
        "to": "okuwamon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "dinobeemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "dinobeemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "sunflowmon": [
      {
        "to": "cherrymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lillymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "pumpkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lilamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "lilamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tankmon": [
      {
        "to": "andromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gigadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "rapidmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "raijiludomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raijiludomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tialudomon": [
      {
        "to": "loaderliomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "raijiludomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "raijiludomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tobiumon": [
      {
        "to": "marinbullmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "megaseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "divermon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "divermon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "togemon": [
      {
        "to": "cherrymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "jagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lilamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "pumpkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "lillymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "lillymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tortomon": [
      {
        "to": "megakabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shakkoumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shogungekomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "jagamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jagamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "troopmon": [
      {
        "to": "tankdramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "tankdramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tuskmon": [
      {
        "to": "mammothmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "wargrowlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "megadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "megadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tyrannomon": [
      {
        "to": "megadramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 15,
          "minFood": 20,
          "minHpRatio": 0.5,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "lavogaritamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "metalgreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "triceramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "wargrowlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "piximon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "piximon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "unimon": [
      {
        "to": "hippogryphonmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "mammothmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "piximon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "shakkoumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "magnaangemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "magnaangemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "vilemon": [
      {
        "to": "ladydevimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "myotismon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "phantomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piedmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "infermon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "warumonzaemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "infermon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "woodmon": [
      {
        "to": "jagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "pumpkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "cherrymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "cherrymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "yakiimon": [
      {
        "to": "pumpkinmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "jagamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jagamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "youkomon": [
      {
        "to": "kyukimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "ladydevimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 55,
          "minHpRatio": 0.5,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "taomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "taomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "zubaeagermon": [
      {
        "to": "duramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 15,
          "minFood": 40,
          "minHappiness": 65,
          "minHpRatio": 0.5
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "garbagemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 15,
          "maxFood": 20,
          "maxHappiness": 30,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "duramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 16,
          "minFood": 28,
          "minHappiness": 40,
          "minHpRatio": 0.3
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "apocalymon": [],
    "apollomon": [],
    "atratusmon_beatbreak": [],
    "blackwargreymon": [],
    "bryweludramon": [],
    "diablomon": [
      {
        "to": "armageddemon",
        "kind": "mode",
        "priority": 75,
        "conditions": {
          "minLevel": 28,
          "minHappiness": 70,
          "minHpRatio": 0.5
        },
        "note": "Official mode evolution."
      },
      {
        "to": "armageddemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 85,
          "minHpRatio": 0.7
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "armageddemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 24,
          "maxFood": 50,
          "maxHappiness": 40,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "armageddemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 26,
          "minFood": 70,
          "minHappiness": 60,
          "minHpRatio": 0.45
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "dianamon": [],
    "durandamon": [],
    "gallantmon": [],
    "heavyleomon": [],
    "herculeskabuterimon": [],
    "hiandromon": [],
    "hydramon": [],
    "imperialdramon_dragonmode": [
      {
        "to": "imperialdramon_fightermode",
        "kind": "mode",
        "priority": 75,
        "conditions": {
          "minLevel": 28,
          "minHappiness": 70,
          "minHpRatio": 0.5
        },
        "note": "Official mode evolution."
      },
      {
        "to": "imperialdramon_fightermode",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 85,
          "minHpRatio": 0.7
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "armageddemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 24,
          "maxFood": 50,
          "maxHappiness": 40,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "imperialdramon_fightermode",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 26,
          "minFood": 70,
          "minHappiness": 60,
          "minHpRatio": 0.45
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "jijimon": [],
    "machinedramon": [
      {
        "to": "apocalymon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 70,
          "minHpRatio": 0.7,
          "requiresPartner": "metalseadramon+piedmon+puppetmon"
        },
        "note": "Official fusion evolution.",
        "partner": "metalseadramon+piedmon+puppetmon"
      },
      {
        "to": "armageddemon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 28,
          "minFood": 50,
          "minHpRatio": 0.7,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "apocalymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 85,
          "minHpRatio": 0.7
        },
        "note": "Default good-care branch (promoted so the line does not stall)."
      },
      {
        "to": "armageddemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 24,
          "maxFood": 50,
          "maxHappiness": 40,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "apocalymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 26,
          "minFood": 70,
          "minHappiness": 60,
          "minHpRatio": 0.45
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "magnadramon": [],
    "malomyotismon": [],
    "megagargomon": [],
    "metalgarurumon": [],
    "metalseadramon": [
      {
        "to": "apocalymon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 70,
          "minHpRatio": 0.7,
          "requiresPartner": "machinedramon+piedmon+puppetmon"
        },
        "note": "Official fusion evolution.",
        "partner": "machinedramon+piedmon+puppetmon"
      },
      {
        "to": "apocalymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 85,
          "minHpRatio": 0.7
        },
        "note": "Default good-care branch (promoted so the line does not stall)."
      },
      {
        "to": "armageddemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 24,
          "maxFood": 50,
          "maxHappiness": 40,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "apocalymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 26,
          "minFood": 70,
          "minHappiness": 60,
          "minHpRatio": 0.45
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "minervamon": [],
    "phoenixmon": [],
    "piedmon": [
      {
        "to": "apocalymon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 70,
          "minHpRatio": 0.7,
          "requiresPartner": "machinedramon+metalseadramon+puppetmon"
        },
        "note": "Official fusion evolution.",
        "partner": "machinedramon+metalseadramon+puppetmon"
      },
      {
        "to": "apocalymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 85,
          "minHpRatio": 0.7
        },
        "note": "Default good-care branch (promoted so the line does not stall)."
      },
      {
        "to": "armageddemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 24,
          "maxFood": 50,
          "maxHappiness": 40,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "apocalymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 26,
          "minFood": 70,
          "minHappiness": 60,
          "minHpRatio": 0.45
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "puppetmon": [
      {
        "to": "apocalymon",
        "kind": "fusion",
        "priority": 80,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 70,
          "minHpRatio": 0.7,
          "requiresPartner": "machinedramon+metalseadramon+piedmon"
        },
        "note": "Official fusion evolution.",
        "partner": "machinedramon+metalseadramon+piedmon"
      },
      {
        "to": "apocalymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 28,
          "minFood": 100,
          "minHappiness": 85,
          "minHpRatio": 0.7
        },
        "note": "Default good-care branch (promoted so the line does not stall)."
      },
      {
        "to": "armageddemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 24,
          "maxFood": 50,
          "maxHappiness": 40,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "apocalymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 26,
          "minFood": 70,
          "minHappiness": 60,
          "minHpRatio": 0.45
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "rosemon": [],
    "sakuyamon": [],
    "seraphimon": [],
    "skadimon": [],
    "slashangemon": [],
    "valkyrimon": [],
    "vikemon": [],
    "wargreymon": [],
    "armageddemon": [],
    "imperialdramon_fightermode": [],
    "agumon": [
      {
        "to": "blackwargreymon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1,
          "minFaints": 1,
          "minDesperationTime": 6
        },
        "note": "Official dark warp evolution."
      },
      {
        "to": "wargreymon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "devidramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "flarerizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "meramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "monochromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tuskmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tyrannomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "greymon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 37,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "bakemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "greymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "armadillomon": [
      {
        "to": "digmon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Official armor evolution."
      },
      {
        "to": "golemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "monochromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "shellmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "tortomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "ankiromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "ankiromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "biyomon": [
      {
        "to": "kokatorimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "akatorimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "aquilamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kiwimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "unimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "birdramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "bakemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "birdramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "candlemon": [
      {
        "to": "devimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "bakemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "clockmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "flarerizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "woodmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "meramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "meramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "chiropmon_beatbreak": [
      {
        "to": "bakemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Alternate dark Adult."
      },
      {
        "to": "devimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Official mid-forms (Night Chiropmon, Nosferamon) have no UP sprites; Devimon is the closest Virus bat/dark Adult."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "devimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "crabmon": [
      {
        "to": "gesomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "seadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "shellmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "ebidramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "ebidramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "demidevimon": [
      {
        "to": "bakemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "devidramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "dokugumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "skullknightmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vilemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "devimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "devimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "dracmon": [
      {
        "to": "bakemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "devidramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "porcupamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vilemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "youkomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "devimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "devimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "espimon": [
      {
        "to": "guardromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "mekanorimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "hoverespimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "hoverespimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gabumon": [
      {
        "to": "metalgarurumon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "frigimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "leomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "mojyamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "monochromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "unimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "garurumon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 37,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "garurumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gazimon": [
      {
        "to": "madleomon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "devimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "garurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "leomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "porcupamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tuskmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "vilemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "devidramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "devidramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gekkomon": [
      {
        "to": "atratusmon_beatbreak",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official Beat Break warp."
      },
      {
        "to": "fumamon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "gekomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "gekomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "ghostmon": [
      {
        "to": "oboromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "petermon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "bakemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "bakemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gizamon": [
      {
        "to": "devidramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "ebidramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "seadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "tuskmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tyrannomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "gesomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "gesomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gomamon": [
      {
        "to": "ankiromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "frigimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "gesomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "mojyamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "seadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "shellmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "tortomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "ikkakumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "bakemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "ikkakumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gotsumon": [
      {
        "to": "ankiromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "gladimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "golemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "icemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "starmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tortomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "monochromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "monochromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "guilmon": [
      {
        "to": "gallantmon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "devidramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "flarerizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "lavorvomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "meramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tuskmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "tyrannomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "growlmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "growlmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "hagurumon": [
      {
        "to": "clockmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "gladimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "golemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "hi-commandramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "jazardmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "machmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "mekanorimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "starmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "troopmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "guardromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "guardromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "hawkmon": [
      {
        "to": "halsemon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Official armor evolution."
      },
      {
        "to": "kokatorimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "akatorimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "birdramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "kiwimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "aquilamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "aquilamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "keramon": [
      {
        "to": "infermon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "vilemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "roachmon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "vilemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kokabuterimon": [
      {
        "to": "kabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kuwagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tortomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "flymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "roachmon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "flymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kokuwamon": [
      {
        "to": "guardromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "jazardmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "kabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kuwagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "mekanorimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "clockmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "roachmon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "clockmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "lalamon": [
      {
        "to": "kiwimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "togemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "woodmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "yakiimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "sunflowmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "redvegiemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "sunflowmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "ludomon": [
      {
        "to": "hi-commandramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tialudomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "tialudomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "mushroomon": [
      {
        "to": "kiwimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "sunflowmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "togemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "woodmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "yakiimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "kuwagamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "redvegiemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "kuwagamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "otamamon": [
      {
        "to": "gesomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "octmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "seadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "shellmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "gekomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "gekomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "palmon": [
      {
        "to": "kuwagamon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kiwimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "sunflowmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "woodmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "yakiimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "togemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "bakemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "redvegiemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "togemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "patamon": [
      {
        "to": "pegasusmon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Official armor evolution."
      },
      {
        "to": "devimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "aegiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Alternate Vaccine/Data holy rookie prior; Elecmon is missing."
      },
      {
        "to": "gatomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "leomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "unimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "angemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "bakemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "angemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pristimon_beatbreak": [
      {
        "to": "leomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Alternate Vaccine Adult."
      },
      {
        "to": "gladimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Official mid-forms (Wolvermon, Artiomon, Bearcatmon) have no UP sprites; Gladimon is the closest Vaccine warrior Adult."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gladimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "renamon": [
      {
        "to": "sakuyamon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "youkomon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kyubimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "kyubimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "salamon": [
      {
        "to": "sistermon_noir",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "aegiomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Elecmon (usual prior) has no UP sprite; Salamon is the closest Vaccine rookie in the set."
      },
      {
        "to": "angemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "frigimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "garurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "mojyamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "sistermon_ciel",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "unimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "gatomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "gatomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "sangomon": [
      {
        "to": "seadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "shellmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "tobiumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "ebidramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "ebidramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "shoutmon_xroswars": [
      {
        "to": "growlmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official listed evolution (meat-heavy)."
      },
      {
        "to": "guardromon_gold",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official prior form."
      },
      {
        "to": "greymon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Official listed evolution."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "greymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "solarmon": [
      {
        "to": "clockmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "flarerizamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "gladimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "guardromon_gold",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official prior form."
      },
      {
        "to": "lavorvomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "meramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "starmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "tankmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "guardromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "guardromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "syakomon": [
      {
        "to": "ebidramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "octmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish"
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "seadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "shellmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "gesomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "gesomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tentomon": [
      {
        "to": "dokugumon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "kuwagamon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "flymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "stingmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "kabuterimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "bakemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "roachmon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "kabuterimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "terriermon": [
      {
        "to": "megagargomon",
        "kind": "warp",
        "priority": 100,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 90,
          "minHpRatio": 0.7,
          "minBossesBeaten": 1
        },
        "note": "Official warp evolution."
      },
      {
        "to": "gargomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "gargomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "veemon": [
      {
        "to": "flamedramon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Official armor evolution."
      },
      {
        "to": "magnamon",
        "kind": "armor",
        "priority": 90,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 60,
          "minHpRatio": 0.4,
          "minBossesBeaten": 1,
          "item": "digimental"
        },
        "note": "Digimental of Miracles (future shop item)."
      },
      {
        "to": "tyrannomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "exveemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "exveemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "wormmon": [
      {
        "to": "dokugumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "flymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "hudiemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "kuwagamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "woodmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "stingmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "raremon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "roachmon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "stingmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "zubamon": [
      {
        "to": "skullknightmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 8,
          "minFood": 7,
          "minHpRatio": 0.4,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "gladimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "guardromon_gold",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4
        },
        "note": "Official prior form."
      },
      {
        "to": "tialudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 45,
          "minHpRatio": 0.4,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "zubaeagermon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 8,
          "minFood": 15,
          "minHappiness": 55,
          "minHpRatio": 0.4
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "numemon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 8,
          "maxFood": 7,
          "maxHappiness": 25,
          "minHpRatio": 0
        },
        "note": "Official care-mistake evolution."
      },
      {
        "to": "zubaeagermon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 10,
          "minFood": 10,
          "minHappiness": 35,
          "minHpRatio": 0.25
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "aegiochusmon": [
      {
        "to": "apollomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Default good-care branch (promoted so the line does not stall)."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "apollomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Canonical Mega is Jupitermon (no UP sprite). Apollomon is the closest Olympos XII Mega in the set."
      }
    ],
    "andromon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "hiandromon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "hiandromon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "angewomon": [
      {
        "to": "ladydevimon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "rosemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "seraphimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "magnadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "magnadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "bluemeramon": [
      {
        "to": "apollomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Flaremon (canonical prior) has no UP sprite; BlueMeramon is the closest fire Perfect."
      },
      {
        "to": "piedmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "cherrymon": [
      {
        "to": "hydramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "jijimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "puppetmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "rosemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "rosemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "datamon": [
      {
        "to": "diablomon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "hiandromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "digitamamon": [
      {
        "to": "piedmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "minervamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution."
      },
      {
        "to": "rosemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "jijimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jijimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "dinobeemon": [
      {
        "to": "herculeskabuterimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "divermon": [
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "zudomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "metalseadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalseadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "duramon": [
      {
        "to": "gallantmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "durandamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "durandamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "etemon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "piedmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "jijimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jijimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "fumamon": [
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "sakuyamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "sakuyamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "garbagemon": [
      {
        "to": "machinedramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piedmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "puppetmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "jijimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jijimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "garudamon": [
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "phoenixmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "phoenixmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "gigadramon": [
      {
        "to": "metalseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "hippogryphonmon": [
      {
        "to": "phoenixmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "magnadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "magnadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "infermon": [
      {
        "to": "armageddemon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "malomyotismon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Listed among official priors on Wikimon."
      },
      {
        "to": "diablomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "diablomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "jagamon": [
      {
        "to": "puppetmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "jijimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "rosemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "rosemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "jazarichmon": [
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kimeramon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Alternate dark Mega."
      },
      {
        "to": "armageddemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Official evolution."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "armageddemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "knightmon": [
      {
        "to": "durandamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "gallantmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "hiandromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "minervamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution."
      },
      {
        "to": "seraphimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "slashangemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "slashangemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "kyukimon": [
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "sakuyamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "sakuyamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "ladydevimon": [
      {
        "to": "rosemon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "minervamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution."
      },
      {
        "to": "piedmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "piedmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "lavogaritamon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "apollomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Alternate fire Perfect prior."
      },
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "phoenixmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "phoenixmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "lilamon": [
      {
        "to": "hydramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "minervamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution."
      },
      {
        "to": "rosemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "rosemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "lillymon": [
      {
        "to": "hydramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "magnadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "minervamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution."
      },
      {
        "to": "rosemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "rosemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "loaderliomon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "heavyleomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "heavyleomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "magnaangemon": [
      {
        "to": "gallantmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "magnadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "seraphimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "seraphimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "mammothmon": [
      {
        "to": "metalgarurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "skadimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "skadimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "marinbullmon": [
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "metalseadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalseadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "megadramon": [
      {
        "to": "blackwargreymon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official prior form."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "megakabuterimon": [
      {
        "to": "herculeskabuterimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "herculeskabuterimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "megaseadramon": [
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "metalseadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalseadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "metalgreymon": [
      {
        "to": "blackwargreymon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Virus MetalGreymon dark Mega."
      },
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "wargreymon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "wargreymon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "meteormon": [
      {
        "to": "machinedramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "piedmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "metalgarurumon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalgarurumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "monzaemon": [
      {
        "to": "warumonzaemon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "minervamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution."
      },
      {
        "to": "sakuyamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "seraphimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "jijimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jijimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "murasamemon_beatbreak": [
      {
        "to": "heavyleomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Alternate beast Mega."
      },
      {
        "to": "minervamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Official Mega Habakirimon has no UP sprite; Minervamon is the closest Virus warrior Mega."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "minervamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "myotismon": [
      {
        "to": "malomyotismon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Adventure 02 Mega. VenomMyotismon has no UP sprite, so this is the available dark Mega."
      },
      {
        "to": "piedmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "piedmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "okuwamon": [
      {
        "to": "rosemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "herculeskabuterimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "herculeskabuterimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "paildramon": [
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "parrotmon": [
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "phoenixmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "phoenixmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "phantomon": [
      {
        "to": "piedmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "piedmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "piximon": [
      {
        "to": "rosemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "valkyrimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "jijimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "jijimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "polarbearmon": [
      {
        "to": "metalgarurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "skadimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "skadimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "pumpkinmon": [
      {
        "to": "piedmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "puppetmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "rosemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "rosemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "raijiludomon": [
      {
        "to": "heavyleomon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "hiandromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "bryweludramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "bryweludramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "rapidmon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "hiandromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "megagargomon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "megagargomon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "scorpiomon": [
      {
        "to": "vikemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "metalseadramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalseadramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "shakkoumon": [
      {
        "to": "phoenixmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "seraphimon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "vikemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "vikemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "shogungekomon": [
      {
        "to": "piedmon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "metalseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "vikemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "vikemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "silphymon": [
      {
        "to": "phoenixmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "berry"
        },
        "note": "Official branch favoured when berry is the food eaten most."
      },
      {
        "to": "rosemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "sakuyamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "slashangemon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "valkyrimon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "valkyrimon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "tankdramon": [
      {
        "to": "hiandromon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "taomon": [
      {
        "to": "dianamon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official Wikimon evolution; moon-aspect alternative to Sakuyamon."
      },
      {
        "to": "sakuyamon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "sakuyamon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "triceramon": [
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "vikemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "vikemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "wargrowlmon": [
      {
        "to": "machinedramon",
        "kind": "dark",
        "priority": 70,
        "conditions": {
          "minLevel": 22,
          "minFood": 37,
          "minHpRatio": 0.6,
          "maxHappiness": 45,
          "minFaints": 2,
          "minDesperationTime": 8,
          "minCareMistakes": 2
        },
        "note": "Official dark evolution."
      },
      {
        "to": "blackwargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official prior form."
      },
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat",
          "minKillsAttribute": {
            "Vaccine": 12
          }
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "gallantmon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "gallantmon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "warumonzaemon": [
      {
        "to": "piedmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "puppetmon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "machinedramon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "machinedramon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "weregarurumon": [
      {
        "to": "magnadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "murasamemon_beatbreak",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6
        },
        "note": "Beast Man alternate Perfect."
      },
      {
        "to": "metalgarurumon",
        "kind": "standard",
        "priority": 52,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Existing in-game gate, unchanged.",
        "existingGate": true
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "metalgarurumon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "wingdramon": [
      {
        "to": "wargreymon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "meat"
        },
        "note": "Official branch favoured when meat is the food eaten most."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "imperialdramon_dragonmode",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ],
    "zudomon": [
      {
        "to": "metalgarurumon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official untagged evolution."
      },
      {
        "to": "metalseadramon",
        "kind": "special",
        "priority": 60,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 65,
          "minHpRatio": 0.6,
          "mostFood": "fish",
          "minKillsAttribute": {
            "Virus": 12
          }
        },
        "note": "Official branch favoured when fish is the food eaten most."
      },
      {
        "to": "vikemon",
        "kind": "standard",
        "priority": 50,
        "conditions": {
          "minLevel": 22,
          "minFood": 75,
          "minHappiness": 75,
          "minHpRatio": 0.6
        },
        "note": "Canonical good-care branch."
      },
      {
        "to": "jijimon",
        "kind": "neglect",
        "priority": 35,
        "conditions": {
          "minLevel": 20,
          "maxFood": 35,
          "maxHappiness": 35,
          "minHpRatio": 0
        },
        "note": "Neglect / care-mistake branch."
      },
      {
        "to": "vikemon",
        "kind": "fallback",
        "priority": 20,
        "conditions": {
          "minLevel": 22,
          "minFood": 50,
          "minHappiness": 50,
          "minHpRatio": 0.4
        },
        "note": "Looser gates so mid-care still evolves into the default form."
      }
    ]
  },
  "enemies": {
    "Baby I": [
      {
        "id": "botamon",
        "name": "Botamon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "chibomon",
        "name": "Chibomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "choromon",
        "name": "Choromon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "cotsucomon",
        "name": "Cotsucomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "jyarimon",
        "name": "Jyarimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "kuramon",
        "name": "Kuramon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "leafmon",
        "name": "Leafmon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "nyokimon",
        "name": "Nyokimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "pabumon",
        "name": "Pabumon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "pichimon",
        "name": "Pichimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "poyomon",
        "name": "Poyomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "punimon",
        "name": "Punimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "pupumon",
        "name": "Pupumon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "pururumon",
        "name": "Pururumon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "putimon",
        "name": "Putimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "puwamon",
        "name": "Puwamon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "relemon",
        "name": "Relemon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "sakumon",
        "name": "Sakumon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "tsubumon",
        "name": "Tsubumon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "yukimibotamon",
        "name": "YukimiBotamon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "yuramon",
        "name": "Yuramon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "zerimon",
        "name": "Zerimon",
        "attribute": "None",
        "role": "swarm"
      }
    ],
    "Baby II (In-Training)": [
      {
        "id": "budmon",
        "name": "Budmon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "bukamon",
        "name": "Bukamon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "cupimon",
        "name": "Cupimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "demimeramon",
        "name": "DemiMeramon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "demiveemon",
        "name": "DemiVeemon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "gigimon",
        "name": "Gigimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "gummymon",
        "name": "Gummymon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "kakkinmon",
        "name": "Kakkinmon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "kodokugumon",
        "name": "Kodokugumon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "koromon",
        "name": "Koromon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "minomon",
        "name": "Minomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "missimon",
        "name": "Missimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "motimon",
        "name": "Motimon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "nyaromon",
        "name": "Nyaromon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "pagumon",
        "name": "Pagumon",
        "attribute": "None",
        "role": "swarm",
        "note": "Current early swarm; unchanged."
      },
      {
        "id": "pinamon",
        "name": "Pinamon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "poromon",
        "name": "Poromon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "sakuttomon",
        "name": "Sakuttomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "tanemon",
        "name": "Tanemon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "tokomon",
        "name": "Tokomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "tsumemon",
        "name": "Tsumemon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "tsunomon",
        "name": "Tsunomon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "tumblemon",
        "name": "Tumblemon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "upamon",
        "name": "Upamon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "viximon",
        "name": "Viximon",
        "attribute": "None",
        "role": "swarm"
      },
      {
        "id": "yokomon",
        "name": "Yokomon",
        "attribute": "None",
        "role": "swarm"
      }
    ],
    "Child (Rookie)": [
      {
        "id": "agumon",
        "name": "Agumon",
        "attribute": "Vaccine",
        "role": "swarm"
      },
      {
        "id": "armadillomon",
        "name": "Armadillomon",
        "attribute": "Free",
        "role": "fast"
      },
      {
        "id": "biyomon",
        "name": "Biyomon",
        "attribute": "Vaccine",
        "role": "fast"
      },
      {
        "id": "candlemon",
        "name": "Candlemon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "chiropmon_beatbreak",
        "name": "Chiropmon",
        "attribute": "Virus",
        "role": "fast"
      },
      {
        "id": "crabmon",
        "name": "Crabmon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "demidevimon",
        "name": "DemiDevimon",
        "attribute": "Virus",
        "role": "fast",
        "note": "Current fast flyer; unchanged."
      },
      {
        "id": "dracmon",
        "name": "Dracmon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "espimon",
        "name": "Espimon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "gabumon",
        "name": "Gabumon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "gazimon",
        "name": "Gazimon",
        "attribute": "Virus",
        "role": "bruiser",
        "note": "Current mid bruiser; unchanged."
      },
      {
        "id": "gekkomon",
        "name": "Gekkomon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "ghostmon",
        "name": "Ghostmon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "gizamon",
        "name": "Gizamon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "gomamon",
        "name": "Gomamon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "gotsumon",
        "name": "Gotsumon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "guilmon",
        "name": "Guilmon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "hagurumon",
        "name": "Hagurumon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "hawkmon",
        "name": "Hawkmon",
        "attribute": "Free",
        "role": "fast"
      },
      {
        "id": "keramon",
        "name": "Keramon",
        "attribute": "Unknown",
        "role": "swarm"
      },
      {
        "id": "kokabuterimon",
        "name": "Kokabuterimon",
        "attribute": "Virus",
        "role": "fast"
      },
      {
        "id": "kokuwamon",
        "name": "Kokuwamon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "lalamon",
        "name": "Lalamon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "ludomon",
        "name": "Ludomon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "mushroomon",
        "name": "Mushroomon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "otamamon",
        "name": "Otamamon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "palmon",
        "name": "Palmon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "patamon",
        "name": "Patamon",
        "attribute": "Data",
        "role": "fast"
      },
      {
        "id": "pristimon_beatbreak",
        "name": "Pristimon",
        "attribute": "Vaccine",
        "role": "swarm"
      },
      {
        "id": "renamon",
        "name": "Renamon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "salamon",
        "name": "Salamon",
        "attribute": "Vaccine",
        "role": "fast"
      },
      {
        "id": "sangomon",
        "name": "Sangomon",
        "attribute": "Data",
        "role": "swarm"
      },
      {
        "id": "shoutmon_xroswars",
        "name": "Shoutmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "solarmon",
        "name": "Solarmon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "syakomon",
        "name": "Syakomon",
        "attribute": "Virus",
        "role": "swarm"
      },
      {
        "id": "tentomon",
        "name": "Tentomon",
        "attribute": "Vaccine",
        "role": "fast"
      },
      {
        "id": "terriermon",
        "name": "Terriermon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "veemon",
        "name": "Veemon",
        "attribute": "Free",
        "role": "bruiser"
      },
      {
        "id": "wormmon",
        "name": "Wormmon",
        "attribute": "Free",
        "role": "swarm"
      },
      {
        "id": "zubamon",
        "name": "Zubamon",
        "attribute": "Vaccine",
        "role": "swarm"
      }
    ],
    "Adult (Champion)": [
      {
        "id": "aegiomon",
        "name": "Aegiomon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "akatorimon",
        "name": "Akatorimon",
        "attribute": "Data",
        "role": "fast"
      },
      {
        "id": "angemon",
        "name": "Angemon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "ankiromon",
        "name": "Ankylomon",
        "attribute": "Free",
        "role": "bruiser"
      },
      {
        "id": "aquilamon",
        "name": "Aquilamon",
        "attribute": "Free",
        "role": "fast"
      },
      {
        "id": "bakemon",
        "name": "Bakemon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "birdramon",
        "name": "Birdramon",
        "attribute": "Vaccine",
        "role": "fast"
      },
      {
        "id": "clockmon",
        "name": "Clockmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "devidramon",
        "name": "Devidramon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "devimon",
        "name": "Devimon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "dokugumon",
        "name": "Dokugumon",
        "attribute": "Virus",
        "role": "fast"
      },
      {
        "id": "ebidramon",
        "name": "Ebidramon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "exveemon",
        "name": "ExVeemon",
        "attribute": "Free",
        "role": "bruiser"
      },
      {
        "id": "flarerizamon",
        "name": "Flarerizamon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "flymon",
        "name": "Flymon",
        "attribute": "Virus",
        "role": "fast"
      },
      {
        "id": "frigimon",
        "name": "Frigimon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "gargomon",
        "name": "Gargomon",
        "attribute": "Free",
        "role": "bruiser"
      },
      {
        "id": "garurumon",
        "name": "Garurumon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "gatomon",
        "name": "Gatomon",
        "attribute": "Vaccine",
        "role": "fast"
      },
      {
        "id": "gekomon",
        "name": "Gekomon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "gesomon",
        "name": "Gesomon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "gladimon",
        "name": "Gladimon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "golemon",
        "name": "Golemon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "greymon",
        "name": "Greymon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "growlmon",
        "name": "Growlmon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "guardromon",
        "name": "Guardromon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "guardromon_gold",
        "name": "Guardromon (Gold)",
        "attribute": "Free",
        "role": "bruiser"
      },
      {
        "id": "hi-commandramon",
        "name": "Hi-Commandramon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "hoverespimon",
        "name": "HoverEspimon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "hudiemon",
        "name": "Hudiemon",
        "attribute": "Free",
        "role": "fast"
      },
      {
        "id": "icemon",
        "name": "Icemon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "ikkakumon",
        "name": "Ikkakumon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "jazardmon",
        "name": "Jazardmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "kabuterimon",
        "name": "Kabuterimon",
        "attribute": "Vaccine",
        "role": "fast"
      },
      {
        "id": "kiwimon",
        "name": "Kiwimon",
        "attribute": "Data",
        "role": "fast"
      },
      {
        "id": "kokatorimon",
        "name": "Kokatorimon",
        "attribute": "Data",
        "role": "fast"
      },
      {
        "id": "kuwagamon",
        "name": "Kuwagamon",
        "attribute": "Virus",
        "role": "boss",
        "note": "Current rotating boss; unchanged."
      },
      {
        "id": "kyubimon",
        "name": "Kyubimon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "lavorvomon",
        "name": "Lavorvomon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "leomon",
        "name": "Leomon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "machmon",
        "name": "Machmon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "madleomon",
        "name": "MadLeomon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "mekanorimon",
        "name": "Mekanorimon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "meramon",
        "name": "Meramon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "mojyamon",
        "name": "Mojyamon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "monochromon",
        "name": "Monochromon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "numemon",
        "name": "Numemon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "oboromon",
        "name": "Oboromon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "octmon",
        "name": "Octomon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "petermon",
        "name": "Petermon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "porcupamon",
        "name": "Porcupamon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "raremon",
        "name": "Raremon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "redvegiemon",
        "name": "RedVegiemon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "roachmon",
        "name": "Roachmon",
        "attribute": "Virus",
        "role": "fast"
      },
      {
        "id": "seadramon",
        "name": "Seadramon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "shellmon",
        "name": "Shellmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "sistermon_ciel",
        "name": "Sistermon Ciel",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "sistermon_noir",
        "name": "Sistermon Noir",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "skullknightmon",
        "name": "SkullKnightmon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "starmon",
        "name": "Starmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "stingmon",
        "name": "Stingmon",
        "attribute": "Free",
        "role": "fast"
      },
      {
        "id": "sunflowmon",
        "name": "Sunflowmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "tankmon",
        "name": "Tankmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "tialudomon",
        "name": "TiaLudomon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "tobiumon",
        "name": "Tobiumon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "togemon",
        "name": "Togemon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "tortomon",
        "name": "Tortomon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "troopmon",
        "name": "Troopmon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "tuskmon",
        "name": "Tuskmon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "tyrannomon",
        "name": "Tyrannomon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "unimon",
        "name": "Unimon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "vilemon",
        "name": "Vilemon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "woodmon",
        "name": "Woodmon",
        "attribute": "Virus",
        "role": "bruiser"
      },
      {
        "id": "yakiimon",
        "name": "Yaki-imon",
        "attribute": "Vaccine",
        "role": "bruiser"
      },
      {
        "id": "youkomon",
        "name": "Youkomon",
        "attribute": "Data",
        "role": "bruiser"
      },
      {
        "id": "zubaeagermon",
        "name": "ZubaEagermon",
        "attribute": "Vaccine",
        "role": "bruiser"
      }
    ],
    "Armor": [
      {
        "id": "digmon",
        "name": "Digmon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "flamedramon",
        "name": "Flamedramon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "halsemon",
        "name": "Halsemon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "magnamon",
        "name": "Magnamon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "nefertimon",
        "name": "Nefertimon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "pegasusmon",
        "name": "Pegasusmon",
        "attribute": "Free",
        "role": "elite"
      }
    ],
    "Perfect (Ultimate)": [
      {
        "id": "aegiochusmon",
        "name": "Aegiochusmon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "andromon",
        "name": "Andromon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "angewomon",
        "name": "Angewomon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "bluemeramon",
        "name": "BlueMeramon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "cherrymon",
        "name": "Cherrymon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "datamon",
        "name": "Datamon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "digitamamon",
        "name": "Digitamamon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "dinobeemon",
        "name": "Dinobeemon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "divermon",
        "name": "Divermon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "duramon",
        "name": "Duramon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "etemon",
        "name": "Etemon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "fumamon",
        "name": "Fumamon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "garbagemon",
        "name": "Garbagemon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "garudamon",
        "name": "Garudamon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "gigadramon",
        "name": "Gigadramon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "hippogryphonmon",
        "name": "Hippogryphonmon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "infermon",
        "name": "Infermon",
        "attribute": "Unknown",
        "role": "elite"
      },
      {
        "id": "jagamon",
        "name": "Jagamon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "jazarichmon",
        "name": "Jazarichmon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "kimeramon",
        "name": "Kimeramon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "knightmon",
        "name": "Knightmon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "kyukimon",
        "name": "Kyukimon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "ladydevimon",
        "name": "LadyDevimon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "lavogaritamon",
        "name": "Lavogaritamon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "lilamon",
        "name": "Lilamon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "lillymon",
        "name": "Lillymon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "loaderliomon",
        "name": "Loaderliomon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "magnaangemon",
        "name": "MagnaAngemon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "mammothmon",
        "name": "Mammothmon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "marinbullmon",
        "name": "Marinbullmon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "megakabuterimon",
        "name": "MegaKabuterimon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "megaseadramon",
        "name": "MegaSeadramon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "megadramon",
        "name": "Megadramon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "metalgreymon",
        "name": "MetalGreymon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "meteormon",
        "name": "Meteormon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "monzaemon",
        "name": "Monzaemon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "murasamemon_beatbreak",
        "name": "Murasamemon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "myotismon",
        "name": "Myotismon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "okuwamon",
        "name": "Okuwamon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "paildramon",
        "name": "Paildramon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "parrotmon",
        "name": "Parrotmon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "phantomon",
        "name": "Phantomon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "piximon",
        "name": "Piximon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "polarbearmon",
        "name": "Polarbearmon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "pumpkinmon",
        "name": "Pumpkinmon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "raijiludomon",
        "name": "RaijiLudomon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "rapidmon",
        "name": "Rapidmon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "scorpiomon",
        "name": "Scorpiomon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "shakkoumon",
        "name": "Shakkoumon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "shogungekomon",
        "name": "ShogunGekomon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "silphymon",
        "name": "Silphymon",
        "attribute": "Free",
        "role": "elite"
      },
      {
        "id": "tankdramon",
        "name": "Tankdramon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "taomon",
        "name": "Taomon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "triceramon",
        "name": "Triceramon",
        "attribute": "Data",
        "role": "elite"
      },
      {
        "id": "wargrowlmon",
        "name": "WarGrowlmon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "warumonzaemon",
        "name": "WaruMonzaemon",
        "attribute": "Virus",
        "role": "elite"
      },
      {
        "id": "weregarurumon",
        "name": "WereGarurumon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "wingdramon",
        "name": "Wingdramon",
        "attribute": "Vaccine",
        "role": "elite"
      },
      {
        "id": "zudomon",
        "name": "Zudomon",
        "attribute": "Vaccine",
        "role": "elite"
      }
    ],
    "Ultimate (Mega)": [
      {
        "id": "apocalymon",
        "name": "Apocalymon",
        "attribute": "Unknown",
        "role": "boss"
      },
      {
        "id": "apollomon",
        "name": "Apollomon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "atratusmon_beatbreak",
        "name": "Atratusmon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "blackwargreymon",
        "name": "BlackWarGreymon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "bryweludramon",
        "name": "BryweLudramon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "diablomon",
        "name": "Diaboromon",
        "attribute": "Unknown",
        "role": "boss"
      },
      {
        "id": "dianamon",
        "name": "Dianamon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "durandamon",
        "name": "Durandamon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "gallantmon",
        "name": "Gallantmon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "heavyleomon",
        "name": "HeavyLeomon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "herculeskabuterimon",
        "name": "HerculesKabuterimon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "hiandromon",
        "name": "HiAndromon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "hydramon",
        "name": "Hydramon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "imperialdramon_dragonmode",
        "name": "Imperialdramon (Dragon Mode)",
        "attribute": "Free",
        "role": "boss"
      },
      {
        "id": "jijimon",
        "name": "Jijimon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "machinedramon",
        "name": "Machinedramon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "magnadramon",
        "name": "Magnadramon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "malomyotismon",
        "name": "MaloMyotismon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "megagargomon",
        "name": "MegaGargomon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "metalgarurumon",
        "name": "MetalGarurumon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "metalseadramon",
        "name": "MetalSeadramon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "minervamon",
        "name": "Minervamon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "phoenixmon",
        "name": "Phoenixmon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "piedmon",
        "name": "Piedmon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "puppetmon",
        "name": "Puppetmon",
        "attribute": "Virus",
        "role": "boss"
      },
      {
        "id": "rosemon",
        "name": "Rosemon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "sakuyamon",
        "name": "Sakuyamon",
        "attribute": "Data",
        "role": "boss"
      },
      {
        "id": "seraphimon",
        "name": "Seraphimon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "skadimon",
        "name": "Skadimon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "slashangemon",
        "name": "SlashAngemon",
        "attribute": "Vaccine",
        "role": "boss"
      },
      {
        "id": "valkyrimon",
        "name": "Valkyrimon",
        "attribute": "Free",
        "role": "boss"
      },
      {
        "id": "vikemon",
        "name": "Vikemon",
        "attribute": "Free",
        "role": "boss"
      },
      {
        "id": "wargreymon",
        "name": "WarGreymon",
        "attribute": "Vaccine",
        "role": "boss"
      }
    ],
    "Ultimate (Mega+)": [
      {
        "id": "armageddemon",
        "name": "Armageddemon",
        "attribute": "Unknown",
        "role": "boss"
      },
      {
        "id": "imperialdramon_fightermode",
        "name": "Imperialdramon (Fighter Mode)",
        "attribute": "Free",
        "role": "boss"
      }
    ]
  },
  "payloadHint": {
    "framesBytes": 44626970,
    "framesMB": 42.56,
    "atlasPngBytes": 20099287,
    "atlasPngMB": 19.17,
    "atlasJsonBytes": 757065,
    "frameFileCount": 8049,
    "atlasCount": 281,
    "recommendation": "Use per-species PNG atlases in atlases-up-all/ and lazy-load by evolution line (starter egg line first, then any branch the run unlocks, plus the current wave's enemy species). Individual frames in frames-up-all/ are the source of truth and match the existing 16-species layout."
  }
};

  function mostFood(foodCounts) {
    if (!foodCounts) return null;
    var best = null, bestN = 0;
    for (var k in foodCounts) {
      if (Object.prototype.hasOwnProperty.call(foodCounts, k) && foodCounts[k] > bestN) {
        best = k;
        bestN = foodCounts[k];
      }
    }
    return best;
  }

  function conditionsMet(cond, stats) {
    if (!cond) return true;
    stats = stats || {};
    function has(n) { return cond[n] != null; }
    if (has("minLevel") && (stats.level || 0) < cond.minLevel) return false;
    if (has("maxLevel") && (stats.level || 0) > cond.maxLevel) return false;
    if (has("minFood") && (stats.meals || 0) < cond.minFood) return false;
    if (has("maxFood") && (stats.meals || 0) > cond.maxFood) return false;
    if (has("minHappiness") && (stats.joy == null ? (stats.happiness || 0) : stats.joy) < cond.minHappiness) return false;
    if (has("maxHappiness") && (stats.joy == null ? (stats.happiness || 0) : stats.joy) > cond.maxHappiness) return false;
    if (has("minHpRatio") && (stats.hpRatio == null ? 1 : stats.hpRatio) < cond.minHpRatio) return false;
    if (has("maxHpRatio") && (stats.hpRatio == null ? 1 : stats.hpRatio) > cond.maxHpRatio) return false;
    if (has("minCareMistakes") && (stats.careMistakes || 0) < cond.minCareMistakes) return false;
    if (has("maxCareMistakes") && (stats.careMistakes || 0) > cond.maxCareMistakes) return false;
    if (has("minFaints") && (stats.faints || 0) < cond.minFaints) return false;
    if (has("maxFaints") && (stats.faints || 0) > cond.maxFaints) return false;
    if (has("minDesperationTime") && (stats.desperationTime || 0) < cond.minDesperationTime) return false;
    if (has("minBossesBeaten") && (stats.bossesBeaten || 0) < cond.minBossesBeaten) return false;
    if (cond.mostFood) {
      var mf = stats.mostFood || mostFood(stats.foodCounts);
      if (mf !== cond.mostFood) return false;
    }
    if (cond.minKillsAttribute) {
      var ka = stats.killsAttribute || {};
      for (var attr in cond.minKillsAttribute) {
        if ((ka[attr] || 0) < cond.minKillsAttribute[attr]) return false;
      }
    }
    if (cond.minKillsSpecies) {
      var ks = stats.killsSpecies || {};
      for (var sp in cond.minKillsSpecies) {
        if ((ks[sp] || 0) < cond.minKillsSpecies[sp]) return false;
      }
    }
    if (cond.requiresPartner) {
      var have = stats.partners || stats.partnerId || [];
      if (typeof have === "string") have = [have];
      var needed = String(cond.requiresPartner).split("+");
      for (var i = 0; i < needed.length; i++) {
        if (have.indexOf(needed[i]) === -1) return false;
      }
    }
    if (cond.item) {
      var items = stats.items || [];
      if (items.indexOf(cond.item) === -1) return false;
    }
    return true;
  }

  function pickEvolution(fromId, stats) {
    var list = (DATA.branches[fromId] || []).slice();
    list.sort(function (a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (!!b.existingGate !== !!a.existingGate) return a.existingGate ? -1 : 1;
      return String(a.to).localeCompare(String(b.to));
    });
    var matched = [];
    /* Use the (possibly wrapped) public conditionsMet so hidden layers —
     * rarity, stat caps, stage gates, diet — actually apply to the pick. */
    var cm = (typeof EVO_TREE !== "undefined" && EVO_TREE && EVO_TREE.conditionsMet) || conditionsMet;
    for (var i = 0; i < list.length; i++) {
      if (cm(list[i].conditions, stats)) matched.push(list[i]);
    }
    return matched.length ? matched[0] : null;
  }

  var EVO_TREE = {
    version: DATA.version,
    priority: DATA.priority,
    priorityOrder: DATA.priorityOrder,
    species: DATA.species,
    branches: DATA.branches,
    enemies: DATA.enemies,
    existingGatesPreserved: DATA.existingGatesPreserved,
    idAliases: DATA.idAliases,
    stageDisplay: DATA.stageDisplay,
    payloadHint: DATA.payloadHint,
    conditionsMet: conditionsMet,
    pickEvolution: pickEvolution,
    mostFood: mostFood
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = EVO_TREE;
    module.exports.EVO_TREE = EVO_TREE;
  }
  global.EVO_TREE = EVO_TREE;
})(typeof window !== "undefined" ? window : globalThis);
