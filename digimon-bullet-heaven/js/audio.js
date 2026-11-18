/* Digi Night — sound. Everything is synthesized in the browser (Web Audio);
 * there are no audio files.
 *
 *   D.audio.sfx(name)            level-up jingles, thunder, firework pops
 *   D.audio.setScene(id)         which piece of music plays ("spring",
 *                                "spring_night", "boss", "eclipse", "farm",
 *                                "title", or null for silence); crossfades
 *   D.audio.setAmbience(k, lvl)  looping rain hiss, 0..1
 *   D.audio.setMuted / setMusic  the ♪ and ♫ buttons
 *
 * Music is written as data (TRACKS): a key, a scale, one chord per bar, and
 * a part each for lead, arpeggio, bass and drums, in scale degrees. A
 * look-ahead scheduler turns that into notes: pulse and triangle voices for
 * the chiptune pieces, a filter-wobbled bass and half-time drums for the
 * 8-bit dubstep ones. Each season's night version is the same tune moved
 * into a darker scale with a driving bass, so it is recognisably the same
 * place after dark.
 */
(function (global) {
  "use strict";
  var D = (global.DBH = global.DBH || {});

  var ac = null, master = null, musicBus = null, sfxBus = null, ambBus = null, comp = null;
  var noiseBuf = null, waves = {};
  var muted = false, musicOn = true;
  var MUSIC_VOL = 0.6, SFX_VOL = 1;
  var MUSIC_KEY = "dn_music_on";

  try { if (global.localStorage && global.localStorage.getItem(MUSIC_KEY) === "0") musicOn = false; } catch (e0) {}

  function ctx() {
    if (ac) return ac;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try {
      ac = new AC();
      comp = ac.createDynamicsCompressor();
      comp.threshold.value = -9; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.18;
      master = ac.createGain(); master.gain.value = muted ? 0 : 1;
      musicBus = ac.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0;
      sfxBus = ac.createGain(); sfxBus.gain.value = SFX_VOL;
      ambBus = ac.createGain(); ambBus.gain.value = 1;
      musicBus.connect(comp); sfxBus.connect(comp); ambBus.connect(comp);
      comp.connect(master); master.connect(ac.destination);
      var n = ac.sampleRate * 1, i, d;
      noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
      d = noiseBuf.getChannelData(0);
      for (i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      waves.p25 = pulseWave(0.25);
      waves.p12 = pulseWave(0.125);
    } catch (e) { ac = null; }
    return ac;
  }

  /* a pulse wave of the given duty, the sound of an 8-bit console's square channels */
  function pulseWave(duty) {
    var N = 32, re = new Float32Array(N), im = new Float32Array(N), n;
    for (n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }

  function unlock() {
    var c = ctx();
    if (c && c.state === "suspended") { try { c.resume(); } catch (e) {} }
  }

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- voices ---------- */
  function tone(bus, wave, freq, t, dur, vol, o) {
    if (!ac || !(freq > 0)) return;
    o = o || {};
    var osc = ac.createOscillator(), g = ac.createGain(), a = o.attack == null ? 0.004 : o.attack, r = o.release == null ? 0.04 : o.release;
    if (waves[wave]) osc.setPeriodicWave(waves[wave]); else osc.type = wave || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    if (o.vib) {
      var l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = o.vib; lg.gain.value = freq * 0.012;
      l.connect(lg); lg.connect(osc.frequency); l.start(t + dur * 0.35); l.stop(t + dur + r + 0.02);
    }
    if (o.detune) osc.detune.value = o.detune;
    g.gain.value = 0;                 /* silent until its moment: a node's gain is 1 until its first event */
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (o.decay) g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * o.decay), t + dur);
    else g.gain.setValueAtTime(vol, t + Math.max(a, dur - 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    osc.connect(g); g.connect(bus);
    osc.start(t); osc.stop(t + dur + r + 0.03);
  }

  function noise(bus, t, dur, vol, type, f0, f1, q) {
    if (!ac) return;
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type || "highpass"; f.frequency.setValueAtTime(f0 || 4000, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.Q.value = q || 0.7;
    g.gain.value = 0;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  function kick(bus, t, vol) {
    if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    g.gain.value = 0;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.22);
    tone(bus, "square", 90, t, 0.012, vol * 0.25, { release: 0.01 });
  }
  function snare(bus, t, vol) {
    noise(bus, t, 0.13, vol, "bandpass", 1900, 1200, 0.9);
    tone(bus, "triangle", 210, t, 0.05, vol * 0.7, { slide: 130, release: 0.03 });
  }
  function hat(bus, t, vol, open) { noise(bus, t, open ? 0.12 : 0.03, vol, "highpass", 7600); }

  /* the dubstep bass: a saw and a square an octave apart through a resonant
   * low-pass filter that an LFO opens and shuts `rate` times a beat */
  function wobble(bus, freq, t, dur, vol, rateHz, depth) {
    if (!ac) return;
    var o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
    o1.type = "sawtooth"; o2.type = "square";
    o1.frequency.value = freq; o2.frequency.value = freq * 2; o2.detune.value = 9;
    f.type = "lowpass"; f.Q.value = 9; f.frequency.value = 260 + (depth || 900);
    l.type = "sine"; l.frequency.value = rateHz; lg.gain.value = depth || 900;
    l.connect(lg); lg.connect(f.frequency);
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.02)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(bus);
    o1.start(t); o2.start(t); l.start(t);
    o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02); l.stop(t + dur + 0.02);
  }

  /* ---------- sound effects ---------- */
  var SFX = {
    /* job level: a quick bright run up, a sparkle, and three little firework pops */
    job: function (t) {
      var n = [84, 88, 91, 96], i;
      for (i = 0; i < n.length; i++) tone(sfxBus, "p25", hz(n[i]), t + i * 0.055, 0.07, 0.07, { decay: 0.5 });
      tone(sfxBus, "p12", hz(100), t + 0.22, 0.22, 0.05, { decay: 0.2, vib: 14 });
      tone(sfxBus, "triangle", hz(103), t + 0.26, 0.3, 0.05, { decay: 0.1 });
      for (i = 0; i < 6; i++) tone(sfxBus, "p12", hz(96 + [0, 7, 4, 12, 7, 16][i]), t + 0.3 + i * 0.045, 0.03, 0.028, { release: 0.02 });
    },
    pop: function (t) {
      noise(sfxBus, t, 0.09, 0.06, "bandpass", 2600, 900, 1.2);
      tone(sfxBus, "triangle", 900, t, 0.06, 0.04, { slide: 300, release: 0.03 });
      noise(sfxBus, t + 0.05, 0.22, 0.025, "highpass", 6000);
    },
    /* base level: a short fanfare in two voices that lands on a held chord */
    base: function (t) {
      var a = [67, 72, 76, 79], i;
      for (i = 0; i < 3; i++) {
        tone(sfxBus, "p25", hz(a[i]), t + i * 0.1, 0.085, 0.07, { release: 0.03 });
        tone(sfxBus, "triangle", hz(a[i] - 12), t + i * 0.1, 0.085, 0.08, { release: 0.03 });
      }
      tone(sfxBus, "p25", hz(79), t + 0.3, 0.5, 0.07, { decay: 0.35, vib: 6 });
      tone(sfxBus, "p12", hz(84), t + 0.3, 0.5, 0.045, { decay: 0.3, vib: 6 });
      tone(sfxBus, "triangle", hz(60), t + 0.3, 0.55, 0.09, { decay: 0.4 });
      tone(sfxBus, "triangle", hz(64), t + 0.3, 0.55, 0.05, { decay: 0.4 });
      noise(sfxBus, t + 0.3, 0.5, 0.03, "bandpass", 1200, 7000, 2);
    },
    thunder: function (t, near) {
      var v = near == null ? 1 : near;
      noise(sfxBus, t, 0.07, 0.22 * v, "highpass", 2400);
      noise(sfxBus, t + 0.03, 1.5, 0.3 * v, "lowpass", 520, 60, 0.6);
      noise(sfxBus, t + 0.35, 1.3, 0.14 * v, "lowpass", 240, 50, 0.6);
      tone(sfxBus, "sine", 62, t + 0.02, 0.5, 0.2 * v, { slide: 34, release: 0.3 });
    },
    /* a blow landing: a short thud, pitched a little differently each time */
    hit: function (t, w) {
      var v = 0.6 + 0.4 * (w == null ? 0.6 : w), p = 0.85 + Math.random() * 0.35;
      noise(sfxBus, t, 0.05, 0.07 * v, "bandpass", 1100 * p, 320, 1);
      tone(sfxBus, "triangle", 170 * p, t, 0.05, 0.09 * v, { slide: 80, release: 0.03 });
    },
    crit: function (t) {
      noise(sfxBus, t, 0.07, 0.1, "highpass", 2600);
      noise(sfxBus, t, 0.09, 0.09, "bandpass", 900, 260, 1);
      tone(sfxBus, "triangle", 200, t, 0.08, 0.12, { slide: 70, release: 0.04 });
      tone(sfxBus, "p25", 1480, t + 0.005, 0.07, 0.05, { slide: 880, release: 0.03 });
    },
    kill: function (t) {
      noise(sfxBus, t, 0.14, 0.1, "lowpass", 1700, 220, 0.8);
      tone(sfxBus, "square", 230, t, 0.1, 0.045, { slide: 62, release: 0.04 });
      tone(sfxBus, "p12", 660, t + 0.03, 0.05, 0.03, { slide: 1320, release: 0.03 });
    },
    bigkill: function (t) {
      noise(sfxBus, t, 0.08, 0.2, "highpass", 1800);
      noise(sfxBus, t + 0.02, 0.9, 0.26, "lowpass", 900, 70, 0.6);
      tone(sfxBus, "sine", 96, t, 0.55, 0.26, { slide: 34, release: 0.25 });
      tone(sfxBus, "square", 180, t, 0.18, 0.06, { slide: 50, release: 0.06 });
      [72, 76, 79, 84].forEach(function (n, i) { tone(sfxBus, "p25", hz(n), t + 0.22 + i * 0.06, 0.09, 0.045, { decay: 0.4 }); });
    },
    /* the rival's entrance: three falling notes and a sting */
    rival: function (t) {
      [79, 75, 72].forEach(function (n, i) { tone(sfxBus, "p25", hz(n), t + i * 0.09, 0.08, 0.07, { release: 0.03 }); tone(sfxBus, "triangle", hz(n - 24), t + i * 0.09, 0.08, 0.09, { release: 0.03 }); });
      tone(sfxBus, "p12", hz(78), t + 0.3, 0.4, 0.06, { decay: 0.3, vib: 9 });
      tone(sfxBus, "triangle", hz(42), t + 0.3, 0.45, 0.11, { decay: 0.4 });
      noise(sfxBus, t + 0.3, 0.3, 0.05, "bandpass", 3000, 600, 2);
    },
    sizzle: function (t) { noise(sfxBus, t, 0.5, 0.05, "bandpass", 3200, 5200, 1.5); },
    whoosh: function (t) { noise(sfxBus, t, 0.6, 0.06, "bandpass", 300, 1800, 1.2); }
  };

  function sfx(name, arg) {
    if (muted) return;
    var c = ctx();
    if (!c || !SFX[name]) return;
    unlock();
    try { SFX[name](c.currentTime + 0.01, arg); } catch (e) {}
  }

  /* ---------- ambience (rain) ---------- */
  var amb = {};
  function setAmbience(kind, level) {
    level = Math.max(0, Math.min(1, level || 0));
    var a = amb[kind];
    if (!a) {
      if (level <= 0 || !ctx() || ac.state !== "running") return;
      a = amb[kind] = { src: ac.createBufferSource(), f: ac.createBiquadFilter(), g: ac.createGain(), level: 0 };
      a.src.buffer = noiseBuf; a.src.loop = true;
      a.f.type = "bandpass"; a.f.frequency.value = 2600; a.f.Q.value = 0.4;
      a.g.gain.value = 0;
      a.src.connect(a.f); a.f.connect(a.g); a.g.connect(ambBus);
      a.src.start();
    }
    if (Math.abs(a.level - level) < 0.02) return;
    a.level = level;
    try { a.g.gain.setTargetAtTime(level * 0.05, ac.currentTime, 0.4); } catch (e) {}
  }

  /* ---------- music data ---------- */
  var MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], PHRYG = [0, 1, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10], HARM = [0, 2, 3, 5, 7, 8, 11];

  /* Lead bars: tokens are scale degrees from the key (7 = an octave up),
   * "." a rest, "-" hold the note. 8 tokens = eighth notes, 16 = sixteenths.
   * Arp and bass patterns index the bar's chord: 0 root, 1 third, 2 fifth,
   * 3 the root an octave up. Drum rows are 16 steps, x = hit, o = open hat. */
  var TRACKS = {
    title: {
      bpm: 104, key: 62, scale: MINOR, prog: [0, 5, 6, 0, 3, 5, 6, 4],
      lead: { wave: "p25", oct: 0, vol: 0.05, vib: 5, bars: [
        "0 . 4 . 7 - 4 .", "5 . 7 . 9 - 7 .", "6 . 8 . 10 - 8 .", "9 8 7 4 7 - . .",
        "10 . 7 . 5 7 10 .", "9 . 7 . 5 7 9 12", "13 - 10 - 8 10 13 -", "11 - 8 - 6 4 . ."] },
      arp: { wave: "p12", oct: 0, vol: 0.022, pat: [0, 1, 2, 3, 2, 1, 2, 1], div: 2 },
      bass: { wave: "triangle", oct: -2, vol: 0.085, bars: ["0 . . 0 . . 2 .", "0 . . 0 . 2 0 ."] },
      drums: { k: ["x.......x.x....."], s: ["....x.......x..."], h: ["..x...x...x...x."], vol: 0.6 }
    },
    farm: {
      bpm: 92, key: 65, scale: MAJOR, prog: [0, 5, 3, 4, 0, 5, 3, 4],
      lead: { wave: "triangle", oct: 0, vol: 0.085, vib: 5, bars: [
        "2 - 4 - 7 - 4 -", "7 - 5 - 9 - 7 -", "5 - 7 - 10 - 7 5", "6 - 4 - 8 - . .",
        "9 - 7 - 4 - 2 -", "9 7 5 7 9 - 12 -", "10 - 7 5 3 5 7 -", "8 6 4 6 4 - . ."] },
      arp: { wave: "p25", oct: -1, vol: 0.02, pat: [0, 2, 1, 2], div: 2 },
      bass: { wave: "triangle", oct: -2, vol: 0.08, bars: ["0 . . . 2 . . ."] },
      drums: { k: ["x.........x....."], s: ["........x......."], h: ["....x.......x..."], vol: 0.4 }
    },
    spring: {
      bpm: 132, key: 60, scale: MAJOR, prog: [0, 4, 5, 3, 0, 4, 3, 4],
      lead: { wave: "p25", oct: 0, vol: 0.055, vib: 6, bars: [
        "4 . 2 4 7 - 4 .", "6 . 4 6 8 - 6 4", "7 - 5 7 9 - 7 5", "7 5 3 5 7 - - .",
        "4 . 2 4 7 - 9 .", "8 - 6 8 11 - 8 6", "10 9 7 5 7 - 5 3", "4 - 6 - 8 6 4 ."] },
      arp: { wave: "p12", oct: 0, vol: 0.022, pat: [0, 1, 2, 1], div: 4 },
      bass: { wave: "triangle", oct: -2, vol: 0.09, bars: ["0 . 0 0 . 0 2 .", "0 . 0 0 . 2 3 2"] },
      drums: { k: ["x.....x.x......."], s: ["....x.......x..."], h: ["x.x.x.x.x.x.x.x."], vol: 0.55 },
      night: { scale: MINOR }
    },
    summer: {
      bpm: 150, key: 62, scale: MAJOR, prog: [0, 3, 4, 3, 5, 3, 4, 4],
      lead: { wave: "p25", oct: 0, vol: 0.055, vib: 7, bars: [
        "2 4 7 . 9 7 4 .", "3 5 7 . 10 7 5 .", "4 6 8 . 11 8 6 .", "10 - 7 5 7 - 5 3",
        "9 7 5 . 7 9 12 -", "10 - 7 10 12 10 7 5", "8 - 6 8 11 - 13 -", "11 8 6 4 8 - . ."] },
      arp: { wave: "p12", oct: 0, vol: 0.022, pat: [0, 2, 1, 2, 3, 2, 1, 2], div: 4 },
      bass: { wave: "triangle", oct: -2, vol: 0.09, bars: ["0 0 . 0 0 . 2 0", "0 0 . 0 3 . 2 0"] },
      drums: { k: ["x...x...x...x..."], s: ["....x.......x.x."], h: ["..x...x...x...x."], vol: 0.6 },
      night: { scale: PHRYG }
    },
    fall: {
      bpm: 112, key: 57, scale: MINOR, prog: [0, 5, 2, 6, 0, 5, 3, 4],
      lead: { wave: "p25", oct: 1, vol: 0.048, vib: 5, bars: [
        "4 - 2 - 0 2 4 -", "5 - 7 - 9 7 5 -", "6 - 4 - 2 4 6 9", "8 - 6 - 8 - . .",
        "7 - 9 7 4 - 2 -", "7 5 7 9 12 - 9 -", "10 - 7 - 5 7 10 -", "8 - 6 4 6 - . ."] },
      arp: { wave: "p12", oct: 0, vol: 0.024, pat: [0, 1, 2, 3, 2, 1], div: 4 },
      bass: { wave: "triangle", oct: -1, vol: 0.085, bars: ["0 . . 0 2 . 0 .", "0 . . 0 2 . 3 ."] },
      drums: { k: ["x.......x.x....."], s: ["....x.......x..."], h: ["x...x.x.x...x.x."], vol: 0.5 },
      night: { scale: PHRYG }
    },
    winter: {
      bpm: 96, key: 64, scale: MINOR, prog: [0, 0, 5, 6, 0, 2, 3, 4],
      lead: { wave: "triangle", oct: 1, vol: 0.085, vib: 4, echo: true, bars: [
        "4 . . 7 . . 9 .", "8 . 7 . 4 . . .", "7 . . 9 . . 12 .", "10 . 8 . 6 . . .",
        "11 . 9 . 7 . 4 .", "6 . 9 . 11 . 9 .", "10 . 7 . 5 . 3 .", "4 . 6 . 8 . . ."] },
      arp: { wave: "p12", oct: 0, vol: 0.018, pat: [0, 2, 3, 2, 1, 2], div: 4 },
      bass: { wave: "triangle", oct: -2, vol: 0.085, bars: ["0 . . . . . 2 .", "0 . . . 0 . . ."] },
      drums: { k: ["x..............."], s: ["........x......."], h: ["....x.....x...x."], vol: 0.4 },
      night: { scale: HARM }
    },
    /* 8-bit dubstep: four bars of build, then the drop loops */
    boss: {
      bpm: 140, key: 53, scale: MINOR, prog: [0, 0, 5, 6, 0, 0, 5, 6, 0, 0, 3, 4], loopFrom: 4, dub: true,
      lead: { wave: "p25", oct: 1, vol: 0.045, vib: 9, bars: [
        "0 . 0 . 0 . 0 . 2 . 2 . 2 . 2 .", "4 . 4 . 4 . 4 . 7 . 7 . 7 . 7 .", "5 . 7 . 9 . 12 . 5 . 7 . 9 . 12 .", "6 8 10 13 6 8 10 13 8 10 13 15 13 15 17 20",
        ". . . . . . . . . . . . 7 - 6 4", ". . . . . . . . 9 - 7 - . . . .", ". . . . 12 - 11 9 . . . . . . . .", ". . . . . . . . 13 - 10 - 8 6 4 -",
        ". . . . . . . . . . . . 7 - 9 11", ". . . . . . . . 14 - 11 - . . . .", ". . . . 10 - 9 7 . . . . 10 9 7 5", "8 - . . 8 - . . 11 - 8 6 4 - . ."] },
      arp: { wave: "p12", oct: 1, vol: 0.016, pat: [0, 3, 2, 3, 1, 3, 2, 3], div: 4, bars: [1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1] },
      wob: { oct: -1, vol: 0.11, depth: 1000, bars: [
        null, null, null, null,
        [[0, 6, 2], [0, 2, 4], [0, 4, 3], [6, 4, 6]], [[0, 4, 4], [0, 4, 2], [2, 2, 8], [0, 2, 8], [1, 4, 3]],
        [[0, 6, 2], [0, 2, 6], [4, 4, 4], [2, 4, 3]], [[0, 4, 3], [0, 4, 6], [0, 2, 8], [2, 2, 8], [4, 4, 2]],
        [[0, 3, 4], [0, 3, 4], [0, 2, 8], [0, 4, 2], [6, 4, 6]], [[0, 4, 6], [3, 4, 3], [2, 4, 4], [0, 4, 8]],
        [[0, 6, 2], [0, 2, 4], [2, 4, 6], [4, 4, 3]], [[0, 2, 8], [0, 2, 8], [0, 4, 4], [2, 4, 6], [4, 4, 12]]] },
      bass: { wave: "triangle", oct: -1, vol: 0.09, bars: ["0 . . . 0 . . .", "0 . . . 0 . . .", "0 . 0 . 0 . 0 .", "0 0 0 0 0 0 0 0"], only: [0, 1, 2, 3] },
      drums: { vol: 0.8,
        k: ["x.......x.......", "x.......x.......", "x...x...x...x...", "x.x.x.x.xxxxxxxx", "x.........x.....", "x......x..x.....", "x.........x.....", "x..x......x...x."],
        s: ["................", "................", "....x.......x...", "....x...x.x.xxxx", "........x.......", "........x.......", "........x.......", "........x.....xx"],
        h: ["..x...x...x...x.", "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "..x...x.....x.o.", "..x.x.x.....x.x.", "..x...x.....x.o.", "..x.x.x...x.xxxx"],
        loopFrom: 4 }
    },
    eclipse: {
      bpm: 150, key: 50, scale: PHRYG, prog: [0, 0, 1, 0, 0, 0, 1, 6, 0, 0, 5, 6], loopFrom: 4, dub: true,
      lead: { wave: "p12", oct: 1, vol: 0.04, vib: 10, bars: [
        "7 . . . 7 . . . 8 . . . 7 . . .", "7 . . 7 . . 7 . 8 . . 8 . . 7 .", "7 . 7 . 8 . 8 . 7 . 7 . 4 . 4 .", "0 2 4 7 2 4 7 9 4 7 9 11 7 9 11 14",
        "7 - . 7 . . 4 . 7 - . 8 . . 7 .", ". . . . . . . . 11 - 9 - 8 - 7 -", "7 - . 7 . . 4 . 8 - . 9 . . 8 .", ". . . . . . . . 6 - 8 - 10 - 13 -",
        "14 - . 14 . . 11 . 14 - . 15 . . 14 .", ". . . . . . . . 11 - 9 - 8 - 7 -", "12 - . 12 . . 9 . 12 - 14 - 16 - 14 -", "13 - 10 - 8 - 6 - 8 6 4 2 4 - . ."] },
      arp: { wave: "p25", oct: 1, vol: 0.014, pat: [0, 2, 3, 2], div: 4, bars: [1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      wob: { oct: -1, vol: 0.11, depth: 1150, bars: [
        null, null, null, null,
        [[0, 4, 4], [0, 2, 8], [0, 2, 8], [0, 4, 6], [1, 4, 3]], [[0, 6, 6], [0, 2, 12], [4, 4, 4], [1, 4, 8]],
        [[0, 4, 4], [0, 2, 8], [0, 2, 8], [1, 4, 6], [1, 4, 3]], [[6, 6, 6], [6, 2, 12], [4, 4, 4], [1, 4, 8]],
        [[0, 2, 8], [0, 2, 8], [0, 4, 3], [0, 4, 6], [1, 4, 4]], [[0, 6, 6], [0, 2, 12], [4, 4, 4], [1, 4, 8]],
        [[5, 4, 4], [5, 2, 8], [5, 2, 8], [5, 4, 6], [4, 4, 3]], [[6, 4, 6], [6, 4, 12], [1, 4, 8], [1, 2, 12], [1, 2, 16]]] },
      bass: { wave: "triangle", oct: -1, vol: 0.09, bars: ["0 . . . . . . .", "0 . . . 0 . . .", "0 . 0 . 0 . 0 .", "0 0 0 0 0 0 0 0"], only: [0, 1, 2, 3] },
      drums: { vol: 0.8,
        k: ["x...............", "x.......x.......", "x...x...x...x...", "x.x.x.x.xxxxxxxx", "x.....x...x.....", "x......x..x.....", "x.....x...x.....", "x..x......x..x.."],
        s: ["................", "................", "....x.......x...", "..x...x.x.x.xxxx", "........x.......", "........x.......", "........x.......", "........x...x.xx"],
        h: ["....x.......x...", "..x...x...x...x.", "x.x.x.x.x.x.x.x.", "xxxxxxxxxxxxxxxx", "..x.x.x.....x.o.", "x.x.x.x.x.x.x.x.", "..x.x.x.....x.o.", "x.x.x.x.xxx.xxxx"],
        loopFrom: 4 }
    }
  };

  /* ---------- sequencer ---------- */
  function parseBar(str) {
    var tok = String(str).trim().split(/\s+/), n = tok.length, st = 16 / n, out = [], i, j, v;
    for (i = 0; i < n; i++) {
      v = tok[i];
      if (v === "." || v === "-") continue;
      j = i + 1;
      while (j < n && tok[j] === "-") j++;
      out.push({ step: i * st, len: (j - i) * st, deg: parseInt(v, 10) });
    }
    return out;
  }
  function degToMidi(key, scale, deg) {
    var o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7;
    return key + scale[d] + 12 * o;
  }
  function chordDeg(root, idx) { return root + [0, 2, 4, 7][idx % 4] + 7 * Math.floor(idx / 4); }

  function compile(id) {
    var night = /_night$/.test(id), base = TRACKS[id.replace(/_night$/, "")], T, k;
    if (!base) return null;
    T = { id: id, src: base, night: night, bpm: base.bpm, key: base.key, scale: base.scale, bars: base.prog.length, loopFrom: base.loopFrom || 0, cache: {} };
    if (night && base.night) for (k in base.night) T[k] = base.night[k];
    return T;
  }
  function barOf(list, bar, loopFrom, total) {
    /* a short list repeats; drum lists of a `dub` track have their own intro/loop split */
    if (!list || !list.length) return null;
    if (loopFrom && list.length < total) return bar < loopFrom ? list[bar % Math.min(list.length, loopFrom)] : list[loopFrom + ((bar - loopFrom) % (list.length - loopFrom))];
    return list[bar % list.length];
  }
  function leadBar(T, part, bar) {
    var key = (part === T.src.lead ? "L" : "B") + bar, c = T.cache[key];
    if (!c) c = T.cache[key] = parseBar(part.bars[bar % part.bars.length]);
    return c;
  }

  function Player(id) {
    this.T = compile(id);
    this.id = id;
    this.gain = ac.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.connect(musicBus);
    this.bar = 0; this.step = 0;
    this.next = ac.currentTime + 0.08;
    this.dead = false;
  }
  Player.prototype.fade = function (to, secs) {
    var g = this.gain.gain, t = ac.currentTime;
    try { g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value), t); g.exponentialRampToValueAtTime(Math.max(0.0001, to), t + secs); } catch (e) {}
  };
  Player.prototype.schedule = function (t, bar, step) {
    var T = this.T, S = T.src, out = this.gain, spb = 60 / T.bpm, st = spb / 4, root = S.prog[bar % S.prog.length], i, n, ev, m, p, row, dv, idx, wb, acc;
    var night = T.night, dub = !!S.dub;
    /* lead */
    p = S.lead;
    if (p) {
      ev = leadBar(T, p, bar);
      for (i = 0; i < ev.length; i++) if (ev[i].step === step) {
        n = ev[i]; m = degToMidi(T.key + 12 * (p.oct || 0), T.scale, n.deg);
        tone(out, night && p.wave === "p25" ? "p12" : p.wave, hz(m), t, n.len * st * 0.92, p.vol * (night ? 0.9 : 1), { vib: n.len >= 4 ? p.vib : 0, decay: 0.55, release: 0.05 });
        if (p.echo || night) tone(out, p.wave, hz(m), t + st * 3, n.len * st * 0.6, p.vol * 0.3, { decay: 0.4 });
      }
    }
    /* arpeggio over the bar's chord */
    p = S.arp;
    if (p && (!p.bars || p.bars[bar % p.bars.length])) {
      dv = p.div === 4 ? 1 : (p.div === 2 ? 2 : 4);
      if (step % dv === 0) {
        idx = p.pat[((bar * 16 + step) / dv) % p.pat.length | 0];
        m = degToMidi(T.key + 12 * (p.oct || 0), T.scale, chordDeg(root, idx));
        tone(out, p.wave, hz(m), t, st * dv * 0.8, p.vol, { decay: 0.35, release: 0.02 });
      }
    }
    /* bass: the written line by day; at night a pulse on every eighth */
    p = S.bass;
    if (p && (!p.only || p.only.indexOf(bar) !== -1)) {
      if (night) {
        if (step % 2 === 0) {
          m = degToMidi(T.key + 12 * (p.oct || 0), T.scale, chordDeg(root, step === 14 ? 2 : (step === 6 ? 3 : 0)));
          tone(out, "triangle", hz(m), t, st * 1.5, p.vol, { release: 0.03 });
          tone(out, "p25", hz(m + 12), t, st * 0.9, p.vol * 0.16, { release: 0.02 });
        }
      } else {
        ev = leadBar(T, p, bar);
        for (i = 0; i < ev.length; i++) if (ev[i].step === step) {
          m = degToMidi(T.key + 12 * (p.oct || 0), T.scale, chordDeg(root, ev[i].deg));
          tone(out, p.wave, hz(m), t, ev[i].len * st * 0.9, p.vol, { release: 0.03 });
        }
      }
    }
    /* wobble bass */
    p = S.wob;
    if (p && p.bars[bar % p.bars.length]) {
      wb = p.bars[bar % p.bars.length]; acc = 0;
      for (i = 0; i < wb.length; i++) {
        if (acc === step) {
          m = degToMidi(T.key + 12 * (p.oct || 0), T.scale, root + wb[i][0] - (wb[i][0] > 4 ? 7 : 0));
          wobble(out, hz(m), t, wb[i][1] * st, p.vol, wb[i][2] / spb / 2, p.depth);
        }
        acc += wb[i][1];
      }
    }
    /* drums */
    p = S.drums;
    if (p) {
      row = barOf(p.k, bar, p.loopFrom, T.bars);
      if (row && row.charAt(step) === "x") kick(out, t, 0.3 * p.vol);
      else if (night && !dub && step % 4 === 0) kick(out, t, 0.26 * p.vol);        /* four on the floor after dark */
      row = barOf(p.s, bar, p.loopFrom, T.bars);
      if (row && row.charAt(step) === "x") snare(out, t, 0.13 * p.vol);
      row = barOf(p.h, bar, p.loopFrom, T.bars);
      if (row && row.charAt(step) === "x") hat(out, t, 0.045 * p.vol);
      else if (row && row.charAt(step) === "o") hat(out, t, 0.05 * p.vol, true);
      else if (night && !dub && step % 2 === 1) hat(out, t, 0.02 * p.vol);
    }
    /* the build before a drop: a rising hiss through its last bar */
    if (dub && T.loopFrom && bar === T.loopFrom - 1 && step === 0) noise(out, t, st * 16, 0.05, "bandpass", 500, 9000, 3);
  };
  Player.prototype.pump = function (now, ahead) {
    var T = this.T, st = 60 / T.bpm / 4;
    if (this.next < now - 0.2) this.next = now + 0.05;                         /* the tab slept: pick the beat back up */
    while (this.next < now + ahead) {
      /* a step whose moment has already passed is dropped, never bunched up with the next ones */
      if (this.next >= now - 0.005) { try { this.schedule(Math.max(this.next, now + 0.004), this.bar, this.step); } catch (e) {} }
      this.next += st;
      this.step += 1;
      if (this.step >= 16) { this.step = 0; this.bar += 1; if (this.bar >= T.bars) this.bar = T.loopFrom; }
    }
  };

  var players = [], scene = null, wantScene = null, timer = null;
  function pump() {
    if (!ac || ac.state !== "running") return;
    var now = ac.currentTime, i, p;
    if (wantScene !== scene) startScene(wantScene);
    for (i = players.length - 1; i >= 0; i--) {
      p = players[i];
      if (p.dead) { if (now > p.deadAt) { try { p.gain.disconnect(); } catch (e) {} players.splice(i, 1); } continue; }
      if (musicOn && !muted) p.pump(now, 0.34);
      else p.next = now + 0.05;
    }
  }
  function startScene(id) {
    var i, p, now = ac.currentTime;
    for (i = 0; i < players.length; i++) {
      p = players[i];
      if (!p.dead) { p.dead = true; p.deadAt = now + 1.6; p.fade(0.0001, 1.1); }
    }
    scene = id;
    if (!id || !TRACKS[id.replace(/_night$/, "")]) return;
    p = new Player(id);
    p.fade(1, 0.9);
    players.push(p);
  }
  function setScene(id) {
    wantScene = id || null;
    if (!timer && typeof setInterval === "function") timer = setInterval(pump, 45);
  }

  function setMuted(m) {
    muted = !!m;
    if (master) { try { master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.03); } catch (e) {} }
  }
  function setMusic(on) {
    musicOn = !!on;
    try { if (global.localStorage) global.localStorage.setItem(MUSIC_KEY, musicOn ? "1" : "0"); } catch (e) {}
    if (musicBus) { try { musicBus.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, ac.currentTime, 0.08); } catch (e2) {} }
  }

  /* browsers only let sound start after a click or a key */
  if (global.addEventListener) {
    ["pointerdown", "keydown", "touchstart"].forEach(function (n) {
      global.addEventListener(n, function () { ctx(); unlock(); }, { passive: true, capture: true });
    });
  }

  D.audio = {
    ctx: ctx,
    unlock: unlock,
    sfx: sfx,
    setScene: setScene,
    setAmbience: setAmbience,
    setMuted: setMuted,
    setMusic: setMusic,
    musicOn: function () { return musicOn; },
    scene: function () { return scene; },
    wanted: function () { return wantScene; },
    TRACKS: TRACKS,
    _parseBar: parseBar,
    _compile: compile,
    _degToMidi: degToMidi
  };
  if (typeof module === "object" && module.exports) module.exports = D.audio;
})(typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this));
