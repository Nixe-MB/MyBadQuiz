/* MyBadQuiz – Boss Arena: a fast quiz shooter. Needs QB (js/app.js) and FX (js/fx.js).
   Four answer pods fall toward your ship. Shoot the correct one before they land.
   Combos boost damage, answering fast adds bonus damage, the boss gets angrier in phases. */
(() => {
const { $, esc, shuf, app, FX, sub, bank, store, toast, SUBJ, modal, close, subjChips } = QB;
const nx = () => !!(QB.nixe && QB.nixe());
const clampN = v => Math.max(-1, Math.min(1, v));
const DIFF = {
  easy:   { hp: 12, hearts: 6, fall: 18, name: 'Easy' },
  normal: { hp: 18, hearts: 5, fall: 14, name: 'Normal' },
  hard:   { hp: 24, hearts: 4, fall: 10, name: 'Hard' }
};
/* ---------- boss roster: 1 boss per subject + roaming bosses with unique mechanics ---------- */
const ROAM = [
  { id: 'swarm', name: 'Swarm Queen', icon: '🐝', art: 'hive', col: '#ffc247', mods: { wobble: 1 }, blurb: 'Answer pods wobble side to side as they fall.' },
  { id: 'glitch', name: 'Glitch Golem', icon: '🗿', art: 'golem', col: '#b08cff', mods: { glitch: 1 }, blurb: 'Pods swap lanes halfway down. Watch the letters.' },
  { id: 'drake', name: 'Inferno Drake', icon: '🐉', art: 'drake', col: '#ff6b3d', mods: { accel: 1 }, blurb: 'Pods speed up as they fall. Decide early.' },
  { id: 'wraith', name: 'Mist Wraith', icon: '🌫️', art: 'ghost', col: '#6fe3d4', mods: { fog: 1 }, blurb: 'Pods fade into fog mid-fall. Read fast, remember.' },
  { id: 'final', name: 'The Final Exam', icon: '📝', art: 'skull', col: '#ff4d6d', mods: { wobble: 1, glitch: 1, accel: 1, fog: 1 }, hp: 30, blurb: 'Every mechanic at once. 30 health. Good luck.' }
];
const SUB_MODS = { csa: {}, lcd: { glitch: 1 }, ddc: { accel: 1 }, fmss: { fog: 1 }, econ: { wobble: 1 }, fcs: { wobble: 1, glitch: 1 } };
const TAG = { wobble: '〰 Wobble', glitch: '⚡ Glitch', accel: '🔥 Accelerate', fog: '🌫 Fog' };
const SUB_ART = { csa: 'robot', lcd: 'golem', ddc: 'ghost', fmss: 'eye', econ: 'kraken', fcs: 'skull' };
const subBoss = s => ({ ...(s.boss || { name: 'Final Boss', icon: '👹' }), mods: (s.boss && s.boss.mods) || SUB_MODS[s.id] || {}, art: SUB_ART[s.id] || 'eye', col: s.color });
const bossList = () => [...SUBJ.map(s => ({ ...subBoss(s), id: 's-' + s.id, ids: [s.id], blurb: 'Guards ' + s.code + ' (' + s.title + ').', color: s.color })), ...ROAM.map(b => ({ ...b, ids: null, color: b.col }))];
QB.BOSS_LIST = bossList;
QB.bossMenu = function () {
  const pick = new Set(SUBJ.map(s => s.id)); let d = store.get('qb_diff', 'normal');
  const paint = () => {
    const rec = store.get('qb_boss', {}), list = bossList();
    modal.hidden = false;
    modal.innerHTML = `<div class="sheet wide" role="dialog" aria-modal="true"><h2>👾 Choose your boss</h2><p class="sub">Subject bosses guard one subject. Roaming bosses use the subjects you select below.</p>
    <div class="row" style="border:0"><label>Difficulty</label><div class="chips">${Object.keys(DIFF).map(k => `<button class="chip ${d === k ? 'on' : ''}" data-d="${k}">${k}</button>`).join('')}</div></div>
    <div class="row"><label>Roaming boss subjects</label><div class="chips">${subjChips(pick)}</div></div>
    <div class="bosses">${list.map((b, i) => { const r = rec[b.name]; return `<button class="bcard" data-b="${i}" style="--c:${b.color}"><canvas class="bprev" data-i="${i}" width="150" height="120"></canvas><b>${esc(b.name)}</b><small>${esc(b.blurb)}</small><span class="tags">${Object.keys(b.mods || {}).map(m => `<i>${TAG[m]}</i>`).join('') || '<i>Classic</i>'}${b.hp ? '<i>❤ ' + b.hp + ' HP</i>' : ''}</span><small>${r ? '👑 ' + r.w + ' wins · best ' + r.b : 'Not fought yet'}</small></button>`; }).join('')}</div>
    <div class="acts"><button class="btn ghost" id="cx">Close</button></div></div>`;
    modal.querySelectorAll('.chip[data-id]').forEach(c => c.onclick = () => { pick.has(c.dataset.id) ? pick.delete(c.dataset.id) : pick.add(c.dataset.id); paint(); });
    modal.querySelectorAll('.chip[data-d]').forEach(c => c.onclick = () => { d = c.dataset.d; paint(); });
    modal.querySelectorAll('.bcard').forEach(c => c.onclick = () => { const b = list[+c.dataset.b], ids = b.ids || [...pick]; if (!ids.length) return toast('Select at least one subject.'); store.set('qb_diff', d); close(); QB.bossGame(ids, d, { name: b.name, icon: b.icon, mods: b.mods, hp: b.hp, art: b.art, col: b.col }); });
    modal.querySelectorAll('.bprev').forEach(cv => { const b = list[+cv.dataset.i], x = cv.getContext('2d'); if (window.BossArt) BossArt.draw(x, b.art, { x: 75, y: 62, s: .46, t: 1, col: b.col, look: { x: 0, y: .8 } }); });
    $('#cx').onclick = close;
  };
  paint();
};
let G = null, keyFn = null, rz = null;
QB.onStop.push(() => {
  if (G) { G.off = true; G = null; }
  FX.music(false);
  if (keyFn) { document.removeEventListener('keydown', keyFn); keyFn = null; }
  if (rz) { removeEventListener('resize', rz); rz = null; }
});
QB.DIFF = DIFF;

QB.bossGame = function (ids, diff, bdef) {
  const D0 = DIFF[diff] || DIFF.normal, s = sub(ids[0]), boss = bdef || subBoss(s), mods = boss.mods || {}, D = { ...D0, hp: boss.hp || D0.hp };
  QB.stop();
  const Q = QB.Q = {
    ids, mode: 'boss', o: { count: 0, time: 0, sq: true, so: true, instant: true, auto: false }, pool: null, extra: { diff, bdef: boss }, base: shuf(ids.flatMap(id => bank(sub(id)))),
    idx: 0, list: [], ans: [], hints: new Set(), gone: {}, ff: 0, t0: Date.now(), left: 0, streak: 0, best: 0, ok: 0, seen: 0, done: false, fresh: false, paused: false,
    lives: D.hearts, bmax: D.hp, bhp: D.hp, boss, score: 0, diff: D.name, flawless: true, usedUlt: false
  };
  const hr = () => Array.from({ length: D.hearts }, (_, i) => `<span class="hrt ${i < Q.lives ? '' : 'lost'}">❤</span>`).join('');
  app.innerHTML = `<div class="arena" style="--c:${s.color}">
    <div class="ahud"><div class="abos"><canvas class="aic" id="aic" width="96" height="96"></canvas><div class="bhp"><b>${esc(boss.name)}</b> <small>· ${D.name}</small><div class="hpbar"><i id="bh" style="width:100%"></i></div></div></div>
    <div class="ast"><b id="sc">0</b><small>score</small></div><div class="ast"><b id="cb">x1</b><small>combo</small></div><div class="hearts" id="hr">${hr()}</div></div>
    <div class="stage" id="stg"><canvas id="cv"></canvas><div class="qban" id="qb"></div><div id="pods"></div><div class="fts" id="fl"></div><div class="over" id="ov"></div></div>
    <div class="actl"><div class="meter" title="Fills with every hit. Press Space when full."><i id="ch"></i><span>ULTIMATE</span></div>
    <button class="btn ghost" id="b50">½ 50/50 <small id="n50"></small></button><button class="btn ghost" id="bfz">❄ Freeze <small id="nfz"></small></button>
    <button class="btn" id="bul" disabled>💥 Ultimate</button><button class="btn ghost" id="bps">⏸</button><button class="btn ghost" id="bfs" title="Fullscreen" aria-label="Fullscreen">⛶</button><button class="btn ghost" id="bgv">Give up</button></div>
    <p class="keys">Keys: <b>1–4</b> or <b>A–D</b> shoot · <b>Space</b> ultimate · <b>F</b> freeze · <b>X</b> 50/50 · <b>P</b> pause</p></div>`;
  const aic = $('#aic').getContext('2d'); if (window.BossArt) BossArt.draw(aic, boss.art || 'eye', { x: 48, y: 44, s: .27, t: 1, col: boss.col || '#4fd1c5' });
  const stg = $('#stg'), cv = $('#cv'), ctx = cv.getContext('2d'), acc = getComputedStyle($('.arena')).getPropertyValue('--c').trim() || '#4fd1c5', skin = QB.skin ? QB.skin() : { color: null, shape: 'delta' }, sc = skin.color || acc;
  G = { off: false, W: 0, H: 0, q: null, pods: [], state: 'intro', t: 0, qt: D.fall, fz: 0, f50: 2, ffz: 2, charge: 0, paused: false, phase: 1, clock: 0, introT: 3.4, wait: 0,
        stars: Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), z: .3 + Math.random() })), parts: [], beams: [], shots: [], shake: 0, flash: 0, red: 0, hit: 0, dead: 0, sx: 0, aim: 0, last: performance.now(), cols: 4, rows: 1, nq: 0, perm: [0, 1, 2, 3], glitched: false, zoom: 0, stop: 0, rings: [], bx: 0, by: 100, bs: 1, look: { x: 0, y: 1 }, chg: 0, rage: 0, shield: 0, deadv: 0, lock: null, ia: 0 };
  const g = G;
  const size = () => {
    g.W = stg.clientWidth; g.H = stg.clientHeight; const d = Math.min(devicePixelRatio || 1, 2);
    cv.width = g.W * d; cv.height = g.H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    g.cols = g.W < 600 ? 2 : 4; g.rows = g.cols === 2 ? 2 : 1; if (!g.sx) g.sx = g.W / 2;
  };
  size(); rz = size; addEventListener('resize', rz);

  /* ---- HUD ---- */
  const hud = () => {
    $('#bh').style.width = Math.max(Q.bhp, 0) / Q.bmax * 100 + '%'; $('#sc').textContent = Q.score; $('#hr').innerHTML = hr();
    const m = Q.streak >= 6 ? 3 : Q.streak >= 3 ? 2 : 1; $('#cb').textContent = 'x' + m + (Q.streak ? ' · ' + Q.streak + '🔥' : '');
    $('#ch').style.width = Math.min(g.charge, 5) / 5 * 100 + '%'; $('#ch').parentElement.classList.toggle('full', g.charge >= 5);
    $('#bul').disabled = (g.charge < 5 && !nx()) || g.state !== 'play'; $('#b50').disabled = g.f50 <= 0 || g.state !== 'play'; $('#bfz').disabled = g.ffz <= 0 || g.state !== 'play' || g.fz > 0;
    $('#n50').textContent = '(' + g.f50 + ')'; $('#nfz').textContent = '(' + g.ffz + ')';
  };
  const say = (txt, x, y, col) => { const e = document.createElement('span'); e.textContent = txt; e.style.cssText = `left:${x}px;top:${y}px;color:${col || '#fff'}`; $('#fl').append(e); setTimeout(() => e.remove(), 1100); };
  const boom = (x, y, n, cols) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, v = 1 + Math.random() * 5; g.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, r: 2 + Math.random() * 3, c: cols[i % cols.length] }); } };
  const PC = ['#ffffff', acc, '#ffb347'], RC = ['#ff6b6b', '#ffb347', '#ffffff'];

  /* ---- pods ---- */
  const podW = () => g.W / g.cols - 12, podH = () => g.cols === 2 ? 72 : 92;
  const yTop = () => g.cols === 2 ? 305 : 275, yBot = () => g.H - 118 - (g.rows - 1) * (podH() + 8);
  function podPos(p, i) {
    const lane = g.perm[i], col = lane % g.cols, row = g.cols === 2 ? lane >> 1 : 0;
    let prog = Math.min(g.t / g.qeff, 1); if (mods.accel) prog = Math.pow(prog, 1.5);
    const wob = mods.wobble ? Math.sin(g.clock * 2.4 + i * 1.7) * Math.min(18, podW() * .12) : 0;
    return { x: col * (g.W / g.cols) + 6 + wob, y: yTop() + prog * (yBot() - yTop()) + row * (podH() + 8) };
  }
  function nextQ() {
    if (G !== g || g.off) return;
    const i = g.nq++ % Q.base.length; if (i === 0 && g.nq > 1) Q.base = shuf(Q.base);
    const q = { ...Q.base[i], ord: shuf([0, 1, 2, 3]) }; Q.list.push(q); Q.idx = Q.list.length - 1; g.q = q; g.t = 0;
    g.perm = [0, 1, 2, 3]; g.glitched = false;
    g.qeff = g.qt * (g.phase === 1 ? 1 : g.phase === 2 ? .85 : .72); g.state = 'play'; g.fz = 0; stg.classList.remove('frost');
    $('#qb').innerHTML = `<span class="qn">Round ${Q.list.length}</span>${esc(q.q)}<small id="tl"></small>`;
    $('#pods').innerHTML = q.ord.map((oi, p) => `<button class="pod" data-p="${p}" style="width:${podW()}px;min-height:${podH()}px"><b>${'ABCD'[p]}</b><span>${esc(q.o[oi])}</span></button>`).join('');
    g.pods = [...$('#pods').children].map((el, p) => { el.onclick = () => shoot(p); return { el, p, dead: false }; });
    FX.sfx('beep'); hud();
  }
  const podCenter = p => { const o = podPos(0, p), el = g.pods[p].el; return { x: o.x + podW() / 2, y: o.y + el.offsetHeight / 2 }; };

  /* ---- actions ---- */
  function shoot(p) {
    if (g.state !== 'play' || g.paused || g.pods[p].dead) return;
    resolve(p);
  }
  function resolve(p) {
    const q = g.q, ok = p >= 0 && q.ord[p] === q.a, eff = g.qeff;
    g.state = 'resolve'; g.wait = 1.25; Q.ans[Q.idx] = p; Q.seen++; QB.track(q.q, ok);
    const correct = q.ord.indexOf(q.a), cpod = g.pods[correct], px = podCenter(p >= 0 ? p : correct);
    g.pods.forEach((o, i) => { o.el.disabled = true; o.el.style.opacity = ''; if (i === correct) o.el.classList.add('ok'); else if (i === p) o.el.classList.add('bad'); else o.el.classList.add('dim'); });
    g.aim = px.x;
    if (ok) {
      Q.ok++; Q.streak++; Q.best = Math.max(Q.best, Q.streak);
      const mult = Q.streak >= 6 ? 3 : Q.streak >= 3 ? 2 : 1, quick = g.t < eff * .35 ? 1 : 0, dmg = mult + quick;
      Q.bhp = Math.max(0, Q.bhp - dmg); Q.score += 100 * dmg + Math.round((1 - g.t / eff) * 60);
      g.charge = Math.min(5, g.charge + 1); g.beams.push({ x1: g.sx, y1: g.H - 40, x2: px.x, y2: px.y, l: 1, c: sc, w: 5 }); g.beams.push({ x1: px.x, y1: px.y, x2: g.bx, y2: g.by, l: 1.2, c: '#ffffff', w: 3 });
      boom(px.x, px.y, 26, PC); boom(g.bx, g.by, 18, RC); g.rings.push({ x: g.bx, y: g.by, r: 10, l: 1, c: '#ffffff' }); g.hit = .5; g.lock = { x: px.x, y: px.y, l: 1 }; g.shake = 6; g.stop = .06; g.zoom = 1; FX.haptic(18);
      say('-' + dmg + (quick ? ' QUICK!' : mult > 1 ? ' COMBO!' : ''), px.x, px.y, '#3ddc97'); FX.sfx('laser'); setTimeout(() => FX.sfx('boom'), 120);
      if (Q.streak === 3 || Q.streak === 6) say('COMBO x' + mult, g.W / 2, g.H / 2, acc);
    } else {
      Q.streak = 0; if (!nx()) Q.lives--; Q.flawless = false; g.red = .6; g.shake = 14; FX.haptic([40, 30, 40]);
      volley(true);
      if (p >= 0) boom(px.x, px.y, 16, RC); say(p === -1 ? 'TOO SLOW!' : 'WRONG!', g.W / 2, g.H / 2, '#ff6b6b'); FX.sfx('hurt');
    }
    addXPq(ok);
    const ratio = Q.bhp / Q.bmax, ph = ratio < .34 ? 3 : ratio < .67 ? 2 : 1;
    if (ph > g.phase && Q.bhp > 0) { g.phase = ph; setTimeout(() => { say('PHASE ' + ph + '  –  ENRAGED!', g.W / 2, g.H * .38, '#ffb347'); FX.sfx('phase'); FX.intensity(ph - 1); g.shake = 12; }, 500); }
    hud();
    if (Q.bhp <= 0) { g.state = 'won'; g.wait = 2.4; g.dead = 1; setTimeout(() => { FX.sfx('boom'); boom(g.bx, g.by, 80, ['#ffffff', '#ffb347', '#ff6b6b', acc]); g.flash = 1; }, 400); }
    else if (Q.lives <= 0) { g.state = 'lost'; g.wait = 2; setTimeout(() => { FX.sfx('boom'); boom(g.sx, g.H - 40, 60, RC); }, 300); }
  }
  function addXPq(ok) { QB.addXP(ok ? 10 : 2); }
  function ult() {
    if (g.state !== 'play' || (g.charge < 5 && !nx()) || g.paused) return;
    g.charge = 0; Q.usedUlt = true; QB.award('ultimate'); Q.bhp = Math.max(0, Q.bhp - 3); Q.score += 300;
    g.beams.push({ x1: g.sx, y1: g.H - 40, x2: g.bx, y2: g.by, l: 1.6, c: '#ffffff', w: 26 }); g.beams.push({ x1: g.sx, y1: g.H - 40, x2: g.bx, y2: g.by, l: 1.6, c: acc, w: 44 });
    g.flash = .8; g.shake = 16; boom(g.bx, g.by, 60, PC); say('ULTIMATE  -3', g.W / 2, g.H * .35, '#fff'); FX.sfx('ult'); hud();
    if (Q.bhp <= 0) { g.state = 'won'; g.wait = 2.2; g.dead = 1; g.pods.forEach(o => o.el.classList.add('dim')); setTimeout(() => { FX.sfx('boom'); boom(g.bx, g.by, 80, ['#ffffff', '#ffb347', '#ff6b6b', acc]); }, 400); }
  }
  function freeze() { if (g.state !== 'play' || g.ffz <= 0 || g.fz > 0 || g.paused) return; if (!nx()) g.ffz--; g.fz = 4; stg.classList.add('frost'); FX.sfx('freeze'); say('TIME FREEZE', g.W / 2, g.H * .45, '#9fe8ff'); hud(); }
  function fifty() {
    if (g.state !== 'play' || g.f50 <= 0 || g.paused) return;
    const wrong = g.q.ord.map((oi, p) => oi === g.q.a ? -1 : p).filter(p => p >= 0 && !g.pods[p].dead); if (wrong.length < 2) return;
    if (!nx()) g.f50--; shuf(wrong).slice(0, 2).forEach(p => { const c = podCenter(p); g.pods[p].dead = true; g.pods[p].el.classList.add('gone'); boom(c.x, c.y, 14, RC); }); FX.sfx('boom'); hud();
  }
  function pause() {
    if (g.state === 'intro' || g.state === 'won' || g.state === 'lost') return;
    g.paused = !g.paused; $('#ov').innerHTML = g.paused ? '<div class="ovb"><h2>⏸ Paused</h2><p>Questions are hidden while paused.</p><button class="btn" id="rs">Resume</button></div>' : ''; $('#ov').classList.toggle('on', g.paused); stg.classList.toggle('hideq', g.paused);
    FX.music(!g.paused); if (g.paused) { const r = $('#rs'); r.onclick = pause; }
  }
  function end(won) { if (G !== g) return; FX.music(false); QB.finish(); }
  $('#b50').onclick = fifty; $('#bfz').onclick = freeze; $('#bul').onclick = ult; $('#bps').onclick = pause; $('#bfs').onclick = () => QB.fullscreen($('.arena'));
  $('#bgv').onclick = () => { if (confirm('Give up this fight?')) end(false); };
  keyFn = e => {
    if (!G || g.off || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || (e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (/^[1-4]$/.test(k)) shoot(+k - 1); else if ('abcd'.includes(k) && k.length === 1) shoot('abcd'.indexOf(k));
    else if (k === ' ') { e.preventDefault(); ult(); } else if (k === 'f') freeze(); else if (k === 'x') fifty(); else if (k === 'p' || k === 'escape') pause();
  };
  document.addEventListener('keydown', keyFn);

  /* ---- loop ---- */
  function volley(real) {
    for (let i = -1; i <= 1; i++) g.shots.push({ x: g.bx, y: g.by + 50 * g.bs, tx: g.sx + i * 34, ty: g.H - 62, t: -Math.abs(i) * .12, real, col: real ? '#ff5a5a' : '#ffb347' });
    if (real) FX.sfx('hurt'); else FX.sfx('laser');
  }
  function impact(sh) {
    g.shield = 1; g.rings.push({ x: sh.tx, y: sh.ty, r: 6, l: 1, c: sh.real ? '#ff6b6b' : '#9fe8ff' }); boom(sh.tx, sh.ty, sh.real ? 14 : 6, sh.real ? RC : ['#9fe8ff', '#ffffff']);
  }
  function update(dt) {
    g.clock += dt; g.zoom = Math.max(0, g.zoom - dt * 4); g.shake = Math.max(0, g.shake - dt * 30); g.hit = Math.max(0, g.hit - dt); g.red = Math.max(0, g.red - dt); g.flash = Math.max(0, g.flash - dt * 1.5);
    g.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .12; p.l -= dt * 1.1; }); g.parts = g.parts.filter(p => p.l > 0);
    g.beams.forEach(b => b.l -= dt * 3); g.beams = g.beams.filter(b => b.l > 0);
    g.shots.forEach(s => { s.t += dt * 1.6; if (s.t >= 1 && !s.done) { s.done = 1; impact(s); } }); g.shots = g.shots.filter(s => s.t < 1.05);
    g.rings.forEach(r => { r.r += dt * 260; r.l -= dt * 2.2; }); g.rings = g.rings.filter(r => r.l > 0); g.shield = Math.max(0, g.shield - dt * 2.4);
    g.rage += ((g.phase >= 3 ? 1 : g.phase === 2 ? .35 : 0) - g.rage) * Math.min(1, dt * 3);
    g.bs = Math.max(.6, Math.min(1.15, Math.min(g.W / 700, g.H / 760) * 1.12));
    g.bx = g.W / 2 + Math.sin(g.clock * (.45 + g.phase * .15)) * g.W * .2; g.by = 132 * g.bs + Math.sin(g.clock * 1.7) * 7;
    g.look = { x: clampN((g.sx - g.bx) / (g.W / 2)), y: .85 };
    if (g.lock) { g.lock.l -= dt * 1.3; if (g.lock.l <= 0) g.lock = null; }
    if (g.state === 'won') { g.deadv = Math.min(1, g.deadv + dt * .45); if (Math.random() < dt * 16) { boom(g.bx + (Math.random() - .5) * 150 * g.bs, g.by + (Math.random() - .5) * 120 * g.bs, 9, ['#ffffff', '#ffb347', '#ff6b6b']); if (Math.random() < .3) FX.sfx('boom'); } }
    g.sx += ((g.aim || g.W / 2) - g.sx) * Math.min(1, dt * 9);
    if (g.paused) return;
    if (g.state === 'intro') {
      g.introT -= dt; const n = Math.ceil(g.introT - .4);
      if (!g.ib) { g.ib = 1; $('#ov').classList.add('on'); $('#ov').innerHTML = `<div class="ovb big"><canvas id="ia" width="240" height="200"></canvas><h2>${esc(boss.name)}</h2><p>${D.name} · shoot the right answer before the pods land</p><p class="tags" style="justify-content:center">${Object.keys(mods).map(m => `<i>${TAG[m]}</i>`).join('')}</p><div class="cd" id="cdn"></div></div>`; }
      const ia = $('#ia'); if (ia && window.BossArt) { const x = ia.getContext('2d'); x.clearRect(0, 0, 240, 200); BossArt.draw(x, boss.art || 'eye', { x: 120, y: 100, s: .62, t: g.clock, col: boss.col || acc, look: { x: Math.sin(g.clock), y: .8 }, charge: n <= 0 ? .8 : 0 }); }
      if (g.cdn !== n) { g.cdn = n; const cd = $('#cdn'); if (cd) cd.textContent = n > 0 ? n : 'FIGHT!'; FX.sfx(n > 0 ? 'beep' : 'go'); if (n === 3) FX.music(true); }
      if (g.introT <= 0) { $('#ov').classList.remove('on'); $('#ov').innerHTML = ''; nextQ(); }
    } else if (g.state === 'play') {
      if (g.fz > 0) g.fz -= dt; else g.t += dt;
      if (g.fz <= 0) stg.classList.remove('frost');
      const left = Math.max(0, g.qeff - g.t); const tl = $('#tl'); if (tl) tl.textContent = '⏱ ' + Math.ceil(left) + 's' + (g.fz > 0 ? '  ❄' : '');
      if (left < 3 && Math.floor(g.t * 2) !== g.lastTick) { g.lastTick = Math.floor(g.t * 2); FX.sfx('tick'); }
      if (g.t >= g.qeff) resolve(-1);
      const pr = g.t / g.qeff;
      if (mods.glitch && !g.glitched && pr > .45) { g.glitched = true; g.perm = shuf(g.perm); say('GLITCH!', g.W / 2, g.H * .5, '#b08cff'); FX.sfx('freezeHit'); g.shake = 8; }
      if (mods.fog) { const f = pr > .33 && pr < .8 ? '.2' : ''; g.pods.forEach(o => { if (!o.dead && g.state === 'play') o.el.style.opacity = f; }); }
      g.chg = pr > .34 && pr < .5 ? (pr - .34) / .16 : 0;
      if (!g.shotAt && pr >= .5) { g.shotAt = 1; volley(false); }
    } else {
      g.wait -= dt;
      if (g.wait <= 0) { g.shotAt = 0; if (g.state === 'play' || g.state === 'resolve') nextQ(); else end(g.state === 'won'); g.wait = 99; }
    }
    g.pods.forEach((o, i) => { if (!o.el) return; const pp = podPos(o, i); o.el.style.transform = `translate(${pp.x}px,${pp.y}px)`; });
  }
  /* static scenery (sky, nebula, planet, ridge, floor) cached to an offscreen canvas */
  function buildBg() {
    const W = g.W, H = g.H, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), hy = H * .5, col = boss.col || acc;
    const sky = x.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#050a14'); sky.addColorStop(.6, g.phase === 3 ? '#2a0b18' : g.phase === 2 ? '#1a1030' : '#0a1d33'); sky.addColorStop(1, g.phase === 3 ? '#5a1426' : g.phase === 2 ? '#3a1d5e' : '#143a5c'); x.fillStyle = sky; x.fillRect(0, 0, W, hy + 2);
    [[.2, .22, .5, BossArt ? BossArt.rgba(col, .16) : 'rgba(80,160,255,.16)'], [.8, .3, .45, 'rgba(176,140,255,.14)'], [.55, .1, .35, 'rgba(255,120,120,.08)']].forEach(([px, py, pr, cc]) => { const gr = x.createRadialGradient(W * px, H * py, 0, W * px, H * py, W * pr); gr.addColorStop(0, cc); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, hy + 2); });
    const pr = Math.min(W, H) * .15, px = W * .8, py = H * .2, pg = x.createRadialGradient(px - pr * .35, py - pr * .35, pr * .1, px, py, pr); pg.addColorStop(0, BossArt ? BossArt.shade(col, 1.2) : '#8fb'); pg.addColorStop(.7, BossArt ? BossArt.shade(col, .5) : '#356'); pg.addColorStop(1, '#05080e'); x.fillStyle = pg; x.beginPath(); x.arc(px, py, pr, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py, pr * 1.6, pr * .32, -.3, 0, 6.3); x.stroke();
    x.fillStyle = '#050b12'; x.beginPath(); x.moveTo(0, hy); let seed = 7; for (let i = 0; i <= 28; i++) { seed = (seed * 9301 + 49297) % 233280; x.lineTo(i * W / 28, hy - 8 - (seed / 233280) * H * .07 * (i % 3 ? .6 : 1.2)); } x.lineTo(W, hy); x.closePath(); x.fill();
    const fl = x.createLinearGradient(0, hy, 0, H); fl.addColorStop(0, BossArt ? BossArt.rgba(col, .35) : 'rgba(60,160,200,.35)'); fl.addColorStop(.25, '#07121e'); fl.addColorStop(1, '#030710'); x.fillStyle = fl; x.fillRect(0, hy, W, H - hy);
    x.save(); x.translate(W / 2, hy); x.scale(1, .16); const hg = x.createRadialGradient(0, 0, 0, 0, 0, W * .62); hg.addColorStop(0, BossArt ? BossArt.rgba(col, .5) : 'rgba(80,200,220,.4)'); hg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = hg; x.fillRect(-W, -W, W * 2, W * 2); x.restore();
    g.bgc = c; g.bgk = W + 'x' + H + ':' + g.phase;
  }
  function drawShip(ctx, H) {
    const ang = Math.max(-.7, Math.min(.7, ((g.aim || g.W / 2) - g.sx) / 260)) * .4;
    ctx.save(); ctx.translate(g.sx, H - 38); ctx.rotate(ang);
    // thruster
    const fl = 16 + Math.random() * 10; const tg = ctx.createLinearGradient(0, 8, 0, 8 + fl * 2); tg.addColorStop(0, '#ffffff'); tg.addColorStop(.35, '#ffb347'); tg.addColorStop(1, 'rgba(255,80,20,0)'); ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(-7, 10); ctx.lineTo(0, 10 + fl * 2); ctx.lineTo(7, 10); ctx.fill();
    ctx.fillStyle = sc; ctx.shadowColor = sc; ctx.shadowBlur = 22; ctx.beginPath();
    if (skin.shape === 'dart') { ctx.moveTo(0, -30); ctx.lineTo(10, 18); ctx.lineTo(0, 10); ctx.lineTo(-10, 18); }
    else if (skin.shape === 'twin') { ctx.moveTo(0, -20); ctx.lineTo(8, 4); ctx.lineTo(24, 18); ctx.lineTo(8, 12); ctx.lineTo(0, 16); ctx.lineTo(-8, 12); ctx.lineTo(-24, 18); ctx.lineTo(-8, 4); }
    else { ctx.moveTo(0, -24); ctx.lineTo(18, 16); ctx.lineTo(0, 8); ctx.lineTo(-18, 16); }
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.3); ctx.fill();
    // shield bubble
    const sa = .1 + g.shield * .6 + Math.sin(g.clock * 3) * .03; ctx.strokeStyle = `rgba(150,230,255,${sa})`; ctx.lineWidth = 2 + g.shield * 3; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 6.3); ctx.stroke();
    ctx.fillStyle = `rgba(150,230,255,${sa * .18})`; ctx.fill(); ctx.restore();
  }
  function draw() {
    const W = g.W, H = g.H, sh = g.shake ? (Math.random() - .5) * g.shake : 0;
    if (!g.bgc || g.bgk !== W + 'x' + H + ':' + g.phase) buildBg();
    ctx.save(); ctx.translate(sh, sh * .6); const zz = 1 + g.zoom * .03; ctx.translate(W / 2, H / 2); ctx.scale(zz, zz); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(g.bgc, 0, 0, W, H);
    // twinkling stars (upper half only)
    g.stars.forEach(s => { s.y += s.z * .0016; if (s.y > .5) { s.y = 0; s.x = Math.random(); } ctx.globalAlpha = .25 + s.z * .5 + Math.sin(g.clock * 3 + s.x * 40) * .15; ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.z * 2, s.z * 2); }); ctx.globalAlpha = 1;
    // perspective neon grid floor
    const hy = H * .5, col = boss.col || acc; ctx.lineWidth = 1; ctx.strokeStyle = BossArt ? BossArt.rgba(col, .28) : 'rgba(80,200,220,.28)';
    for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * W * .018, hy); ctx.lineTo(W / 2 + i * W * .17, H); ctx.stroke(); }
    const off = (g.clock * (.22 + g.phase * .07)) % 1; for (let k = 0; k < 11; k++) { const z = (k + off) / 11; ctx.globalAlpha = z * .9; ctx.beginPath(); ctx.moveTo(0, hy + (H - hy) * z * z); ctx.lineTo(W, hy + (H - hy) * z * z); ctx.stroke(); } ctx.globalAlpha = 1;
    // boss shadow on floor + the boss itself
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(g.bx, hy + 40, 90 * g.bs, 14 * g.bs, 0, 0, 6.3); ctx.fill();
    const bsh = g.hit > 0 ? (Math.random() - .5) * 8 : 0;
    if (window.BossArt) BossArt.draw(ctx, boss.art || 'eye', { x: g.bx + bsh, y: g.by, s: g.bs * ({ drake: .82, hive: .9, kraken: .92 }[boss.art] || 1), t: g.clock, col, look: g.look, hit: g.hit, rage: g.rage, charge: g.chg, dead: g.deadv });
    else { ctx.font = '58px serif'; ctx.textAlign = 'center'; ctx.fillText(boss.icon, g.bx, g.by); }
    // enemy shots
    g.shots.forEach(s => { if (s.t < 0) return; const x = s.x + (s.tx - s.x) * s.t, y = s.y + (s.ty - s.y) * s.t; ctx.fillStyle = s.col; ctx.shadowColor = s.col; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 6.3); ctx.fill(); ctx.shadowBlur = 0; });
    // beams
    g.beams.forEach(b => { ctx.globalAlpha = Math.max(Math.min(b.l, 1), 0); ctx.strokeStyle = b.c; ctx.lineWidth = b.w * b.l; ctx.shadowColor = b.c; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); }); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    // shockwave rings
    g.rings.forEach(r => { ctx.globalAlpha = Math.max(r.l, 0) * .8; ctx.strokeStyle = r.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.3); ctx.stroke(); }); ctx.globalAlpha = 1;
    // lock-on reticle
    if (g.lock) { const l = g.lock, a = g.clock * 3, rr = 34 + (1 - l.l) * 18; ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(a); ctx.globalAlpha = Math.min(1, l.l * 1.4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(rr, -rr); ctx.lineTo(rr, -rr + 14); ctx.moveTo(rr, -rr); ctx.lineTo(rr - 14, -rr); ctx.stroke(); } ctx.restore(); ctx.globalAlpha = 1; }
    g.parts.forEach(p => { ctx.globalAlpha = Math.max(p.l, 0); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.r, p.r); }); ctx.globalAlpha = 1;
    if (g.state !== 'lost' || g.wait > 1.6) drawShip(ctx, H);
    if (g.red > 0) { ctx.fillStyle = `rgba(255,60,60,${g.red * .45})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    if (g.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${g.flash * .7})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }
  if (nx()) toast('✨ MyBadQuiz mode: unlimited lives, ultimate and power-ups. This fight will not be recorded.');
  (function loop(now) {
    if (g.off || G !== g) return; requestAnimationFrame(loop);
    if (document.hidden) { g.last = now; return; }
    const dt = Math.min((now - g.last) / 1000 || 0, .05); g.last = now; if (g.stop > 0) g.stop -= dt; else update(dt); draw();
  })(performance.now());
  hud();
};
})();
