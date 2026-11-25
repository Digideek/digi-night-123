/* Browser perf check (17z33): two players in Chrome, snow wins a war right beside the host, both screens measured.
 * Needs playwright + Chrome and the server running:  node host-game.js --port 8790
 * then:  node scripts/perf-snow-browser.js <path to playwright> http://127.0.0.1:8790/ 40 TAG */
/* Two players; snow grows beside the host on its own (the real war); measure both screens. */
const { chromium } = require(process.argv[2]);
const URL = process.argv[3], SECS = +(process.argv[4] || 50), TAG = process.argv[5] || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const mk = async (tag, vp, name) => {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.__js = []; window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); try { cb(t); } finally { if (window.__js.length < 50000) window.__js.push(performance.now() - a); } }); });
    await ctx.addInitScript(n => { try { localStorage.setItem('dbh_profile_v1', JSON.stringify({ name: n, ghost: 'byte', pic: 'agumon', created: Date.now(), stats: {}, ach: {}, toured: 1 })); } catch (e) {} }, name);
    const p = await ctx.newPage(); p.on('pageerror', e => console.log(tag, 'ERR', e.message));
    await p.goto(URL); await p.waitForTimeout(3000); return p; };
  const H = await mk('host', { width: 1920, height: 1080 }, 'Isaac'), G = await mk('guest', { width: 1280, height: 720 }, 'Deke');
  const code = await H.evaluate(() => new Promise(r => DBH.online.host('Isaac', e => r(e || DBH.online.code()))));
  await G.evaluate(c => new Promise(r => DBH.online.join(c, 'Deke', e => r(e || 'ok'))), code);
  await G.evaluate(() => DBH.online.interceptStart('agumon', DBH.getSelectedTamer && DBH.getSelectedTamer()));
  await H.waitForTimeout(1500);
  await H.evaluate(() => { DBH.online.interceptStart('agumon', DBH.getSelectedTamer && DBH.getSelectedTamer()); return DBH.online.startGame(); });
  for (let i = 0; i < 40; i++) { if ((await H.evaluate(() => DBH.getState())) === 'playing' && (await G.evaluate(() => DBH.getState())) === 'playing') break; await H.waitForTimeout(1000); }
  /* put both players on a snow border, out of the start area, and let snow win the war there */
  const spot = await H.evaluate(() => {
    const D = DBH, w = D.world, s = D.getMissionAuth().sim, span = w.TERR * w.TILE();
    for (let r = 6; r < 120; r++) for (let a = 0; a < 48; a++) {
      const cx = Math.round(Math.cos(a / 48 * 6.283) * r), cy = Math.round(Math.sin(a / 48 * 6.283) * r);
      if (w.cellOwner(cx, cy) !== 'snow') continue;
      let other = null; [[1,0],[-1,0],[0,1],[0,-1]].forEach(d => { const o = w.cellOwner(cx + d[0], cy + d[1]); if (o !== 'snow') other = [cx + d[0], cy + d[1], o]; });
      if (!other) continue;
      const x = (other[0] + 0.5) * span, y = (other[1] + 0.5) * span;
      if (s._startZone && s._startZone(x, y) >= 2) continue;
      if (w.isRaised && w.isRaised(x, y, 12)) continue;
      return { x, y, against: other[2] };
    }
    return null;
  });
  if (!spot) { console.log('no snow border found'); await b.close(); return; }
  await H.evaluate(sp => { const D = DBH, s = D.getMissionAuth().sim;
    s.players.forEach((p, i) => { p.x = sp.x + i * 60; p.y = sp.y; p.mx = sp.x + i * 60 + 40; p.my = sp.y + 20; });
    D.WAR.base = Object.assign({}, D.WAR.base, { snow: 3 }); D.WAR.rate = 0.25; }, spot);
  await H.waitForTimeout(4000);
  const probe = `(() => { const D = DBH, ws = D.world.stats ? D.world.stats() : {}; window.__m = { t0: performance.now(), frames: [], last: performance.now(), b0: ws.builds || 0, ms0: ws.buildMs || 0, da0: ws.dropAll || 0, tv0: D.world.territoryVersion(), mv0: D.world.mapVersion(), step: 0, stepMax: 0, nav: 0 };
    const ma = D.getMissionAuth(), s = ma && ma.sim;
    if (s && s.step && !s.__w) { s.__w = 1; const o = s.step; s.step = function () { const t = performance.now(); const v = o.apply(this, arguments); const d = performance.now() - t; window.__m.step += d; window.__m.stepMax = Math.max(window.__m.stepMax, d); return v; }; }
    (function f(t) { const m = window.__m; m.frames.push(t - m.last); m.last = t; requestAnimationFrame(f); })(performance.now()); })()`;
  await H.evaluate(probe); await G.evaluate(probe);
  const cdp = await H.context().newCDPSession(H);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  await H.evaluate(secs => { const s = DBH.getMissionAuth().sim, p = s.players[0]; let a = 0; const x0 = p.x, y0 = p.y;
    const id = setInterval(() => { a += 0.04; p.x = x0 + Math.cos(a) * 700; p.y = y0 + Math.sin(a * 1.3) * 500; p.mx = p.x + 50; p.my = p.y + 20; }, 50); setTimeout(() => clearInterval(id), secs * 1000); }, SECS);
  await H.evaluate(() => { window.__js.length = 0; }); await G.evaluate(() => { window.__js.length = 0; });
  await H.waitForTimeout(SECS * 1000);
  const { profile } = await cdp.send('Profiler.stop');
  const read = `(() => { const D = DBH, m = window.__m, ws = D.world.stats ? D.world.stats() : {}, f = m.frames.slice(5).sort((a, b) => a - b), secs = (performance.now() - m.t0) / 1000;
    const r = D.getRun(); return { fps: +(f.length / secs).toFixed(1), median: Math.round(f[f.length >> 1]), p95: Math.round(f[Math.floor(f.length * .95)]), worst: Math.round(f[f.length - 1]), over50: f.filter(x => x > 50).length,
      groundBuilt: (ws.builds || 0) - m.b0, groundMs: Math.round((ws.buildMs || 0) - m.ms0), fullRedraws: (ws.dropAll || 0) - m.da0, borderChanges: D.world.territoryVersion() - m.tv0, mapChanges: D.world.mapVersion() - m.mv0,
      simMs: Math.round(m.step), simMaxStep: Math.round(m.stepMax), secs: Math.round(secs), q: D.perf && D.perf.q, terrLen: (D.world.territoryString() || '').length,
      js: (() => { const j = window.__js.slice().sort((a, b) => a - b); return { perFrame: +(j[j.length >> 1]).toFixed(1), p95: +(j[Math.floor(j.length * .95)]).toFixed(1), worst: Math.round(j[j.length - 1]), over16: j.filter(x => x > 16).length, over33: j.filter(x => x > 33).length, frames: j.length }; })(),
      enemies: (() => { const ma = D.getMissionAuth(), sm = ma && ma.sim; return sm ? sm.enemies.length + ' (' + sm.enemies.filter(e => !e.dead && Math.hypot(e.x - sm.players[0].x, e.y - sm.players[0].y) < 1200).length + ' near)' : ''; })(),
      others: (r.others || []).map(o => o.id), snowCells: (D.world.territoryString().match(/snow/g) || []).length }; })()`;
  const h = await H.evaluate(read), g = await G.evaluate(read);
  console.log(TAG, 'spot', JSON.stringify(spot));
  console.log(TAG, 'HOST ', JSON.stringify(h));
  console.log(TAG, 'GUEST', JSON.stringify(g));
  console.log(TAG, 'same map on both screens:', (await H.evaluate(() => DBH.world.territoryString())) === (await G.evaluate(() => DBH.world.territoryString())));
  const byId = {}; profile.nodes.forEach(n => byId[n.id] = n); const self = {}; let tot = 0;
  profile.samples.forEach((s, i) => { const cf = byId[s].callFrame; const k = (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop() + ':' + cf.lineNumber; self[k] = (self[k] || 0) + profile.timeDeltas[i]; tot += profile.timeDeltas[i]; });
  /* inside the simulation step: inclusive time of what it calls (two levels down) */
  { const kids = {}; profile.nodes.forEach(n => { (n.children || []).forEach(c => kids[c] = n.id); });
    const selfT = {}; profile.samples.forEach((s2, i) => { selfT[s2] = (selfT[s2] || 0) + profile.timeDeltas[i]; });
    const incl = {}; const total = id => { if (incl[id] != null) return incl[id]; let t = selfT[id] || 0; (byId[id].children || []).forEach(c => t += total(c)); return incl[id] = t; };
    const nm = id => { const cf = byId[id].callFrame; return (cf.functionName || '(anon)') + ':' + cf.lineNumber; };
    const agg = {}; let stepT = 0;
    profile.nodes.forEach(n => { if (n.callFrame.functionName !== 'MissionSim.step') return; stepT += total(n.id);
      (n.children || []).forEach(c => { agg[nm(c)] = (agg[nm(c)] || 0) + total(c); (byId[c].children || []).forEach(g2 => { const k = '   ' + nm(c) + ' > ' + nm(g2); agg[k] = (agg[k] || 0) + total(g2); }); }); });
    const deep = {}; profile.nodes.forEach(n => { if (n.callFrame.functionName !== 'MissionSim._resolveBodies') return; (function walk(id, depth) { (byId[id].children || []).forEach(c => { const k = nm(c); deep[k] = (deep[k] || 0) + (selfT[c] || 0); walk(c, depth + 1); }); })(n.id, 0); deep['(own)'] = (deep['(own)'] || 0) + (selfT[n.id] || 0); });
    console.log(TAG, 'under _resolveBodies, by own time:'); Object.entries(deep).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log('   ' + Math.round(v / 1000).toString().padStart(6) + ' ms  ' + k));
    console.log(TAG, 'inside MissionSim.step (' + Math.round(stepT / 1000) + ' ms in all):');
    Object.entries(agg).filter(([k]) => !k.startsWith('   ')).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => { console.log('   ' + Math.round(v / 1000).toString().padStart(6) + ' ms  ' + k);
      Object.entries(agg).filter(([k2]) => k2.startsWith('   ' + k + ' >')).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([k2, v2]) => console.log('         ' + Math.round(v2 / 1000).toString().padStart(6) + ' ms  ' + k2.split(' > ')[1])); }); }
  console.log(TAG, 'host CPU, top:'); Object.entries(self).filter(([k]) => !/^\((idle)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log('   ' + (100 * v / tot).toFixed(1).padStart(5) + '%  ' + k));
  await b.close();
})();
