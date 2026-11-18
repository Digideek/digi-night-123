/* node scripts/tester-test.js : tester mode keeps nothing (js/tester.js) */
const path = require("path"), root = path.join(__dirname, "..");
let failed = 0;
function ok(c, m) { if (!c) { failed++; console.log("  FAIL " + m); } else console.log("  ok " + m); }
const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; },
  key: i => Object.keys(mem)[i] || null, get length() { return Object.keys(mem).length; }
};
global.window = global;
global.DBH = {};
require(path.join(root, "js/devlock.js"));
mem.dbh_profile_v1 = '{"name":"Isaac","bits":40}'; mem.dbh_save_v1 = '{"eggUnlocks":{}}'; mem.other_site = "x";
const real = JSON.stringify(mem);
require(path.join(root, "js/tester.js"));
const T = global.DBH.tester;
ok(JSON.stringify(mem) === real, "loading the game with no tester session changes nothing saved");
ok(T.enter("letmein") === false && !T.isOn() && JSON.stringify(mem) === real, "a wrong code does nothing");
ok(!/holy|union/.test(require("fs").readFileSync(path.join(root, "js/tester.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "")), "the code itself is not written in the file, only its hash");
ok(T._backup() && mem.dn_tester_backup_v1 != null, "going in copies the real save aside");
mem.dbh_profile_v1 = '{"name":"Isaac","bits":10040}'; mem.dbh_save_v1 = '{"eggUnlocks":{"a":true}}'; mem.dbh_new_thing = "made while testing"; mem.other_site = "y";
ok(T._backup() && JSON.parse(mem.dn_tester_backup_v1).dbh_profile_v1 === '{"name":"Isaac","bits":40}', "copying aside twice never overwrites the real save with a tester one");
ok(T._restore(), "coming out puts it back");
ok(mem.dbh_profile_v1 === '{"name":"Isaac","bits":40}' && mem.dbh_save_v1 === '{"eggUnlocks":{}}', "the profile and the save are as they were");
ok(!("dbh_new_thing" in mem) && !("dn_tester_backup_v1" in mem), "anything saved while testing is gone, and so is the copy");
ok(T._restore() === false, "with no tester session to undo, a restore does nothing");
console.log(failed ? failed + " FAILED" : "tester-test: all passed");
process.exit(failed ? 1 : 0);
