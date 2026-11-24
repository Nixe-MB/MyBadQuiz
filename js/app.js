/* MyBadQuiz engine – subjects are loaded from /data/*.js (window.SUBJECTS). No need to edit this file to add subjects. */
(() => {
'use strict';
const SUBJ = window.SUBJECTS || [], FX = window.FX || { sfx() {}, confetti() {}, burst() {} };
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app'), modal = $('#modal');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuf = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const fmt = s => `${s / 60 | 0}:${String(s % 60).padStart(2, '0')}`;
const L = 'ABCDEF';
const QB = window.QB = { onStop: [] };
/* stubs: js/profile.js replaces these with the real thing */
Object.assign(QB, { ev() {}, addCoins() {}, heroUser: () => '', questsHtml: () => '', bindQuests() {}, arenaBar: () => '', bossRecord() {}, me: () => ({ k: 'e', v: '🦊' }), avatar: a => '' });
const sub = id => SUBJ.find(s => s.id === id);
const bank = s => s.questions.map(([q, o, a, h]) => ({ q, o, a, h, sid: s.id }));
const allQ = () => SUBJ.flatMap(bank);
const DEF = { count: 25, time: 0, sq: true, so: true, instant: true, auto: false };
let cfg = { ...DEF, ...store.get('qb_cfg', {}) }, Q = null, FC = null, timer = null, qTimer = null;

/* ---------- theme ---------- */
document.documentElement.dataset.theme = store.get('qb_theme', 'dark');
const themeBtn = $('#theme');
const paintTheme = () => themeBtn.textContent = document.documentElement.dataset.theme === 'dark' ? '☾' : '☀';
paintTheme();
themeBtn.onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; store.set('qb_theme', t); paintTheme(); applySet(); };

/* ---------- progress: XP, levels, day streak, badges, bookmarks ---------- */
const prog = () => store.get('qb_prog', { xp: 0, days: [], badges: [] });
const lvl = xp => Math.floor(xp / 200) + 1;
const BADGES = {
  first: ['🚀', 'First steps', 'Finish a quiz'], five: ['📚', 'Dedicated', 'Finish 5 quizzes'], perfect: ['💯', 'Perfectionist', 'Score 100%'],
  streak10: ['🔥', 'On fire', '10 in a row in practice'], mix: ['🌐', 'All-rounder', 'Finish a mixed quiz'], saver: ['⭐', 'Collector', 'Save 5 questions'],
  fast: ['⚡', 'Speedster', '25+ questions, 80%+, under 5 min'], boss: ['👑', 'Boss slayer', 'Defeat a boss'], daily: ['📅', 'Daily grinder', 'Finish a daily challenge'],
  survive: ['🛡️', 'Survivor', 'Score 15 in Survival'], map: ['🗺️', 'Cartographer', 'Master 20 questions'],
  night: ['🦉', 'Night owl', 'Answer a question after 10 pm'], early: ['🌅', 'Early bird', 'Answer a question between 5 and 8 am'],
  c100: ['💪', 'Century', 'Answer 100 questions'], c500: ['🏋️', 'Grinder', 'Answer 500 questions'], acc: ['🎯', 'Sharpshooter', '90%+ accuracy over 50+ answers'],
  lvl5: ['⭐', 'Rising star', 'Reach level 5'], lvl10: ['🌟', 'Superstar', 'Reach level 10'], streak20: ['⚡', 'Unstoppable', '20 correct in a row'],
  flawless: ['🛡️', 'Flawless', 'Beat a boss without losing a heart'], ultimate: ['💥', 'Ultimate', 'Fire the boss-fight ultimate'],
  scholar: ['🎓', 'Scholar', 'Master 50 questions'], master: ['🏆', 'Subject master', 'Master every question of one subject'],
  three: ['📆', 'On a roll', '3-day study streak'], week: ['🗓️', 'Week warrior', '7-day study streak'], nohint: ['🧠', 'No help needed', '100% on 10+ questions with no hints or 50/50'],
  rival: ['🤝', 'Rival', 'Finish an online race'], champion: ['🏁', 'Champion', 'Win an online race'], explorer: ['🧭', 'Explorer', 'Take a quiz in every subject']
};
const stats = () => store.get('qb_stats', { t: 0, c: 0, d: {} });
function checkBadges() {
  const st = stats(), p = prog(), h = new Date().getHours(), m = mas(), ds = dayStreak();
  if (h >= 22 || h < 4) award('night'); if (h >= 5 && h < 8) award('early');
  if (st.t >= 100) award('c100'); if (st.t >= 500) award('c500'); if (st.t >= 50 && st.c / st.t >= .9) award('acc');
  if (lvl(p.xp) >= 5) award('lvl5'); if (lvl(p.xp) >= 10) award('lvl10'); if (ds >= 3) award('three'); if (ds >= 7) award('week');
  if (masteredCount() >= 50) award('scholar');
  if (SUBJ.some(s => s.questions.every(q => mlevel(m[q[0]]) === 3))) award('master');
  const hh = hist(); if (SUBJ.length && SUBJ.every(s => hh.some(x => x.sid === s.id))) award('explorer');
  const mk = Math.floor(masteredCount() / 10), mr = store.get('qb_mrew', 0); if (mk > mr) { store.set('qb_mrew', mk); QB.addCoins(20 * (mk - mr)); toast('🧠 ' + mk * 10 + ' questions mastered! +' + 20 * (mk - mr) + ' coins'); }
}
const toastQ = [];
function toast(m) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.append(box); }
  const last = box.lastElementChild; if ((last && last.textContent === m && Date.now() - (last._t || 0) < 1500) || toastQ.includes(m)) return;
  if (box.children.length >= 3) { toastQ.push(m); return; }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; t._t = Date.now(); box.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => { t.remove(); if (toastQ.length) toast(toastQ.shift()); }, 320); }, 3200);
}
function addXP(n) {
  const p = prog(), before = lvl(p.xp), day = new Date().toDateString();
  p.xp += n; if (!p.days.includes(day)) p.days = [...p.days, day].slice(-90);
  store.set('qb_prog', p);
  if (lvl(p.xp) > before) { toast('⬆ Level ' + lvl(p.xp) + ' reached! +' + lvl(p.xp) * 10 + ' coins'); FX.banner('LEVEL UP!', 'You reached level ' + lvl(p.xp)); FX.confetti(); QB.addCoins(lvl(p.xp) * 10); FX.sfx('level'); }
  checkBadges(); if (QB.paintPf) QB.paintPf();
}
function award(k) { const p = prog(); if (p.badges.includes(k)) return; p.badges.push(k); store.set('qb_prog', p); toast(BADGES[k][0] + ' Badge unlocked: ' + BADGES[k][1] + ' (+25 coins)'); QB.addCoins(25); FX.sfx('level'); }
const dayStreak = () => { const d = new Set(prog().days), t = new Date(); let n = 0; if (!d.has(t.toDateString())) t.setDate(t.getDate() - 1); while (d.has(t.toDateString())) { n++; t.setDate(t.getDate() - 1); } return n; };
const bm = () => new Set(store.get('qb_bm', []));
function toggleBm(t) { const s = bm(); s.has(t) ? s.delete(t) : s.add(t); store.set('qb_bm', [...s]); FX.sfx('star'); if (s.size >= 5) award('saver'); return s.has(t); }
const hist = () => store.get('qb_history', []);
const stop = () => { clearInterval(timer); clearInterval(qTimer); timer = qTimer = null; if (QB.wake) QB.wake(false); QB.onStop.forEach(f => { try { f(); } catch (e) {} }); };

/* ---------- mastery tracking (per question) ---------- */
const mas = () => store.get('qb_mas', {});
function track(q, ok) { const m = mas(), r = m[q] || { s: 0, c: 0, w: 0 }; r.s++; if (ok) { r.c++; r.w = 0; } else r.w = 1; m[q] = r; store.set('qb_mas', m);
  const st = stats(), k = new Date().toISOString().slice(0, 10); st.t++; if (ok) st.c++; st.d[k] = (st.d[k] || 0) + 1;
  const ks = Object.keys(st.d).sort(); while (ks.length > 120) delete st.d[ks.shift()]; store.set('qb_stats', st);
  if (st.t % 50 === 0) { const r = 10 + (Math.random() * 50 | 0); QB.addCoins(r); toast('🎁 Mystery chest! +' + r + ' coins'); FX.sfx('coin'); } }
const mlevel = r => !r ? 0 : r.w ? 1 : (r.c >= 2 && r.c / r.s >= .7) ? 3 : 2;
const MC = ['var(--bd)', '#ff6b6b', '#ffb347', '#3ddc97'], MN = ['Unseen', 'Weak', 'Learning', 'Mastered'];
const masteredCount = () => Object.values(mas()).filter(r => mlevel(r) === 3).length;
function masteryMap(sid) {
  const m = mas(), legend = `<div class="legend">${MN.map((n, i) => `<span><i style="background:${MC[i]}"></i>${n}</span>`).join('')}</div>`;
  const info = sj => { const cells = sj.questions.map(q => mlevel(m[q[0]])); return { cells, cnt: [0, 1, 2, 3].map(l => cells.filter(x => x === l).length) }; };
  if (!sid || sid === 'all') return `<div class="mm">${SUBJ.map(sj => { const { cnt } = info(sj), n = sj.questions.length; return `<button class="mrow brow" data-pick="${sj.id}" style="--c:${sj.color}"><div class="mh"><b>${sj.icon} ${esc(sj.code)} <small>${esc(sj.title)}</small></b><small>${cnt[3]} mastered · ${cnt[2]} learning · ${cnt[1]} weak · ${cnt[0]} unseen</small></div><div class="stack">${[3, 2, 1, 0].map(l => `<i style="width:${cnt[l] / n * 100}%;background:${MC[l]}"></i>`).join('')}</div></button>`; }).join('')}${legend}<p class="sub">Tap a subject (or use the filter above) to see every question as a square.</p></div>`;
  const sj = sub(sid), { cells, cnt } = info(sj);
  return `<div class="mm"><div class="mrow" style="--c:${sj.color}"><div class="mh"><b>${sj.icon} ${esc(sj.code)} <small>${esc(sj.title)}</small></b><small>${cnt[3]} mastered · ${cnt[2]} learning · ${cnt[1]} weak · ${cnt[0]} unseen</small></div>
  <div class="cells">${sj.questions.map((q, i) => `<i data-s="${sj.id}" data-i="${i}" style="background:${MC[cells[i]]};animation-delay:${i * 10}ms" title="${esc(q[0])} (${MN[cells[i]]})"></i>`).join('')}</div></div>${legend}</div>`;
}

/* ---------- settings + palettes ---------- */
const PAL = { circuit: ['#4fd1c5', '#0a1a24', '#10293a', '#12303f', '#25495a'], ember: ['#ff9f55', '#1a1210', '#2a1c17', '#2f201a', '#5a3a2e'], orchid: ['#c18cff', '#140f22', '#1f1833', '#251c3d', '#463668'], forest: ['#6ee7a0', '#0b1a14', '#10281d', '#13301f', '#27553c'] };
const set = () => ({ pal: 'circuit', fx: true, vol: 1, size: 100, music: true, respect: false, name: '', lb: false, safe: false, blockPics: false, scareOK: true, trail: true, ...store.get('qb_set', {}) });
QB.settings = () => set(); QB.safeMode = () => !!set().safe;
function applySet() {
  const s = set(), r = document.documentElement, p = PAL[s.pal] || PAL.circuit, dark = r.dataset.theme === 'dark';
  r.style.setProperty('--c', p[0]);
  ['--bg', '--bg2', '--card', '--bd'].forEach((k, i) => dark ? r.style.setProperty(k, p[i + 1]) : r.style.removeProperty(k));
  r.style.fontSize = s.size + '%'; r.dataset.fx = s.fx ? 'on' : 'off';
  if (FX.setVol) FX.setVol(s.vol); if (FX.setCalm) FX.setCalm(!s.fx || (s.respect && matchMedia('(prefers-reduced-motion: reduce)').matches)); if (FX.setMusic) FX.setMusic(s.music); if (FX.setTrail) FX.setTrail(s.trail !== false);
}
const ST = { tab: 'general', taps: 0 };
function openSettings(tab) {
  if (typeof tab === 'string') ST.tab = tab;
  const paint = () => {
    const s = set(), secret = store.get('qb_secret', false); if (ST.tab === 'secret' && !secret) ST.tab = 'general';
    const tabs = [['general', 'General'], ['online', 'Online & privacy'], ...(secret ? [['secret', '🤫 Secret']] : [])];
    const general = `<div class="row"><label>Display name<small>Shown in races, boss raids and on score cards</small></label><input class="search" id="nm2" style="margin:0;width:170px" maxlength="14" value="${esc(s.name || '')}" placeholder="Your name"></div>
    <div class="row"><label>Color palette</label><div class="chips">${Object.keys(PAL).map(k => `<button class="chip ${s.pal === k ? 'on' : ''}" style="--c:${PAL[k][0]}" data-p="${k}">${k}</button>`).join('')}</div></div>
    <div class="row"><label>Visual effects<small>Background, particles, tilt, ripples</small></label>${sw('fx', s.fx)}</div>
    <div class="row"><label>Cursor sparkle trail</label>${sw('trail', s.trail !== false)}</div>
    <div class="row"><label>Game music<small>Battle and race soundtrack</small></label>${sw('music', s.music)}</div>
    <div class="row"><label>Follow system reduce-motion<small>Off by default. Turn on if animations bother you</small></label>${sw('respect', s.respect)}</div>
    <div class="row"><label>Sound volume</label><input type="range" id="vol" min="0" max="1" step=".1" value="${s.vol}"></div>
    <div class="row"><label>Text size</label><div class="chips">${[90, 100, 115, 130].map(n => `<button class="chip ${s.size === n ? 'on' : ''}" data-z="${n}">${n}%</button>`).join('')}</div></div>
    <div class="row"><label>Install as an app<small>Works offline for studying (multiplayer needs internet)</small></label><button class="btn ghost" id="inst">Install</button></div>
    <div class="row"><label>Reset all data<small>History, XP, mastery, saved questions, coins</small></label><button class="btn ghost" id="rst">Reset</button></div>`;
    const online = `<p class="sub">Controls what other players can do to you and see about you.</p>
    <div class="row"><label>Show my stats on the leaderboard<small>Name, level, XP, wins, mastery. Off by default.</small></label>${sw('lb', s.lb)}</div>
    <div class="row"><label>Safe mode<small>No flashbangs, screen shaking, jumpscares or loud scare sounds</small></label>${sw('safe', s.safe)}</div>
    <div class="row"><label>Allow jumpscares to hit me</label>${sw('scareOK', s.scareOK !== false)}</div>
    <div class="row"><label>Block pictures from other players<small>Jumpscares then use a generated face instead of their uploads</small></label>${sw('blockPics', s.blockPics)}</div>`;
    modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><h2 id="sth" title="Settings">Settings</h2><div class="subtabs" style="margin-bottom:12px">${tabs.map(([k, t]) => `<button class="${ST.tab === k ? 'on' : ''}" data-st="${k}">${t}</button>`).join('')}</div>${ST.tab === 'general' ? general : ST.tab === 'online' ? online : (QB.secretHtml ? QB.secretHtml() : '')}<div class="acts"><button class="btn" id="ok">Done</button></div></div>`;
    const up = o => { store.set('qb_set', { ...set(), ...o }); applySet(); paint(); };
    modal.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { ST.tab = b.dataset.st; paint(); });
    modal.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const k = b.dataset.sw, cur = k === 'scareOK' || k === 'trail' ? s[k] !== false : !!s[k]; up({ [k]: !cur }); if (k === 'lb' && QB.lbToggle) QB.lbToggle(!cur); });
    modal.querySelectorAll('[data-p]').forEach(b => b.onclick = () => up({ pal: b.dataset.p }));
    modal.querySelectorAll('[data-z]').forEach(b => b.onclick = () => up({ size: +b.dataset.z }));
    const nm = $('#nm2'); if (nm) nm.onchange = e => { up({ name: e.target.value.trim().slice(0, 14) }); if (QB.paintPf) QB.paintPf(); };
    const vol = $('#vol'); if (vol) { vol.oninput = e => { store.set('qb_set', { ...set(), vol: +e.target.value }); applySet(); }; vol.onchange = () => FX.sfx('ok'); }
    const rst = $('#rst'); if (rst) rst.onclick = () => { if (confirm('Erase ALL MyBadQuiz data on this device?')) { Object.keys(localStorage).filter(k => k.startsWith('qb_')).forEach(k => localStorage.removeItem(k)); toast('Data reset. Reloading…'); setTimeout(() => location.reload(), 600); } };
    const inst = $('#inst'); if (inst) inst.onclick = () => QB.install && QB.install();
    $('#sth').onclick = () => { if (secret) return; if (++ST.taps >= 5) { store.set('qb_secret', true); toast('🤫 You found the secret tab!'); FX.sfx('level'); ST.tab = 'secret'; paint(); } };
    if (ST.tab === 'secret' && QB.secretBind) QB.secretBind();
    $('#ok').onclick = close;
  };
  modal.hidden = false; paint();
}

/* ---------- command palette (Ctrl+K or /) ---------- */
function palette() {
  const cmds = [
    ...['subjects', 'practice', 'arena', 'cards', 'library', 'history', 'ranks', 'about'].map(t => ({ n: 'Go to ' + t, f: () => go(t) })),
    ...SUBJ.map(s => ({ n: 'Quiz: ' + s.title, f: () => setup([s.id], 'quiz') })),
    ...SUBJ.map(s => ({ n: 'Boss battle: ' + s.title, f: () => startBoss([s.id]) })),
    { n: 'Daily challenge', f: startDaily }, { n: 'Online race', f: () => QB.versus() }, { n: 'Weak spots review', f: startWeak }, { n: 'Survival mode', f: () => startSurvival(SUBJ.map(s => s.id)) },
    { n: 'Toggle light / dark theme', f: () => themeBtn.click() }, { n: 'Toggle sound', f: () => $('#mute').click() }, { n: 'Open settings', f: openSettings }
  ];
  let q = '', i = 0;
  const list = () => cmds.filter(c => c.n.toLowerCase().includes(q.toLowerCase()));
  const run = c => { close(); if (c) c.f(); };
  const paint = () => {
    const l = list(); i = Math.min(i, Math.max(l.length - 1, 0));
    $('#pl').innerHTML = l.map((c, k) => `<button class="pi ${k === i ? 'on' : ''}" data-k="${k}">${esc(c.n)}</button>`).join('') || '<div class="empty">No commands match.</div>';
    $('#pl').querySelectorAll('.pi').forEach(b => b.onclick = () => run(l[+b.dataset.k]));
  };
  modal.hidden = false;
  modal.innerHTML = `<div class="sheet pal" role="dialog" aria-modal="true"><input class="search" id="pq" placeholder="Type a command… (↑ ↓ Enter, Esc)" autocomplete="off"><div id="pl"></div></div>`;
  const inp = $('#pq'); inp.focus(); paint();
  inp.oninput = () => { q = inp.value; i = 0; paint(); };
  inp.onkeydown = e => {
    const l = list();
    if (e.key === 'ArrowDown') { i = Math.min(i + 1, l.length - 1); paint(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { i = Math.max(i - 1, 0); paint(); e.preventDefault(); }
    else if (e.key === 'Enter') run(l[i]);
  };
}

/* ---------- arena: boss battle, daily, survival, weak spots ---------- */
const O = { count: 0, time: 0, sq: true, so: true, instant: true, auto: false };
function viewArena() {
  const d = store.get('qb_daily', {}), today = new Date().toDateString(), hi = store.get('qb_hi', 0);
  const weak = Object.values(mas()).filter(r => mlevel(r) === 1 || mlevel(r) === 2).length;
  const tiles = [
    ['👾', 'Boss Arena', 'A quiz shooter. Answer pods fall at your ship: shoot the right one fast. Combos, phases, ultimate and battle music.', 'boss', '#ff6b6b'],
    ['🏁', 'Online Race', 'Race friends on other devices with a room code. Same questions, fastest correct answers win.', 'race', '#5fb4ff'],
    ['📅', 'Daily Challenge', d.date === today ? `Done today: ${d.score}/${d.total}. New questions tomorrow.` : 'The same 10 questions for everyone today. Build your day streak.', 'daily', '#ffb347'],
    ['🛡️', 'Survival', `Three lives and endless questions. How far can you get? Best run: ${hi}.`, 'surv', '#3ddc97'],
    ['🎯', 'Weak Spots', weak ? `${weak} questions you missed or are still learning come first.` : 'Smart review serves the questions you miss. Play a few rounds first.', 'weak', '#b08cff']
  ];
  app.innerHTML = `<section class="hero"><h1>The arena.</h1><p>Game modes beyond a regular quiz. Every mode feeds your mastery map, XP and coins.</p></section>
  ${QB.arenaBar()}${QB.questsHtml()}
  <div class="grid">${tiles.map((t, i) => `<button class="card tilt" data-m="${t[3]}" style="--c:${t[4]};animation-delay:${i * 90}ms"><span class="ic">${t[0]}</span><h3>${t[1]}</h3><span>${t[2]}</span><span class="go">Play</span></button>`).join('')}</div>`;
  QB.bindQuests();
  app.querySelectorAll('[data-m]').forEach(c => c.onclick = () => ({ boss: () => QB.bossMenu(), race: () => QB.versus(), daily: startDaily, surv: () => pickSubjects('Survival', startSurvival), weak: startWeak })[c.dataset.m]());
}
function pickSubjects(title, fn, diff) {
  const pick = new Set(SUBJ.map(s => s.id)); let d = store.get('qb_diff', 'normal');
  const paint = () => {
    modal.hidden = false;
    modal.innerHTML = `<div class="sheet"><h2>${title}</h2><p class="sub">Choose which subjects to draw questions from.</p><div class="chips">${subjChips(pick)}</div>
    ${diff ? `<div class="row"><label>Difficulty<small>Fall speed, boss health and hearts</small></label><div class="chips">${['easy', 'normal', 'hard'].map(k => `<button class="chip ${d === k ? 'on' : ''}" data-d="${k}">${k}</button>`).join('')}</div></div>` : ''}
    <div class="acts"><button class="btn ghost" id="cx">Cancel</button><button class="btn" id="st" ${pick.size ? '' : 'disabled'}>Start</button></div></div>`;
    modal.querySelectorAll('.chip[data-id]').forEach(c => c.onclick = () => { pick.has(c.dataset.id) ? pick.delete(c.dataset.id) : pick.add(c.dataset.id); paint(); });
    modal.querySelectorAll('.chip[data-d]').forEach(c => c.onclick = () => { d = c.dataset.d; paint(); });
    $('#cx').onclick = close; $('#st').onclick = () => { close(); fn([...pick], d); };
  };
  paint();
}
function startBoss(ids, d) { if (!QB.bossGame) return toast('Boss module failed to load.'); store.set('qb_diff', d); QB.bossGame(ids, d); }
function startSurvival(ids) { start(ids, { ...O, auto: cfg.auto }, 'survival', null, { title: 'Survival' }); }
function startDaily() {
  const today = new Date().toDateString(); let seed = [...today].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pool = allQ().map(q => [rnd(), q]).sort((a, b) => a[0] - b[0]).slice(0, 10).map(x => x[1]);
  start(SUBJ.map(s => s.id), { ...O, instant: false, sq: false, so: false, time: 10 }, 'quiz', pool, { daily: true, title: 'Daily challenge' });
}
function startWeak() {
  const m = mas(), pool = allQ().filter(q => { const l = mlevel(m[q.q]); return l === 1 || l === 2; }).sort((a, b) => mlevel(m[a.q]) - mlevel(m[b.q])).slice(0, 25);
  if (!pool.length) return toast('Play a few quizzes first. Weak Spots then targets your misses.');
  start([...new Set(pool.map(q => q.sid))], { ...O, auto: cfg.auto }, 'practice', pool, { title: 'Weak spots' });
}

/* ---------- shareable score card (PNG) ---------- */
function shareCard(d) {
  const a = QB.me(); if (a && a.k === 'i') { const im = new Image(); im.onload = () => shareCard2(d, im); im.onerror = () => shareCard2(d); im.src = a.v; } else shareCard2(d);
}
function shareCard2(d, img) {
  const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--c').trim() || '#4fd1c5', p = prog(), st = stats(), name = set().name || 'Player';
  const grade = d.pct >= 95 ? 'S' : d.pct >= 85 ? 'A' : d.pct >= 70 ? 'B' : d.pct >= 50 ? 'C' : 'D';
  const rank = d.pct >= 95 ? 'Diamond' : d.pct >= 85 ? 'Gold' : d.pct >= 70 ? 'Silver' : d.pct >= 50 ? 'Bronze' : 'Rookie';
  const rc = { Diamond: '#8ae8ff', Gold: '#ffd166', Silver: '#cfd8dc', Bronze: '#e59866', Rookie: '#9aa7ad' }[rank];
  const rr = (a, b, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); };
  const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#08141d'); bg.addColorStop(1, '#17394b'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1;
  for (let i = 0; i < W; i += 44) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 44) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
  const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'transparent'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
  glow(930, 300, 380, rc + '55'); glow(120, 560, 320, acc + '33');
  // logo + brand
  const lg = x.createLinearGradient(60, 50, 120, 110); lg.addColorStop(0, acc); lg.addColorStop(1, '#b08cff'); x.fillStyle = lg; rr(60, 50, 58, 58, 16); x.fill();
  x.fillStyle = '#06222a'; x.font = '800 40px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('?', 89, 94); x.textAlign = 'left';
  x.fillStyle = '#e8f3f1'; x.font = '800 40px system-ui, sans-serif'; x.fillText('MyBadQuiz', 134, 93);
  // subject + heading
  x.fillStyle = acc; rr(60, 140, x.measureText ? 20 + (d.code || 'QUIZ').length * 20 : 120, 40, 20); x.fill(); x.fillStyle = '#06222a'; x.font = '700 24px system-ui, sans-serif'; x.fillText(d.code || 'QUIZ', 76, 168);
  x.fillStyle = '#8fb0b5'; x.font = '500 28px system-ui, sans-serif'; x.fillText(String(d.title).slice(0, 44), 60, 222);
  x.fillStyle = '#e8f3f1'; x.font = '700 34px system-ui, sans-serif'; x.fillText(d.heading, 60, 266);
  // big percent
  x.fillStyle = acc; x.font = '800 190px system-ui, sans-serif'; x.fillText(d.pct + '%', 52, 440);
  x.fillStyle = '#e8f3f1'; x.font = '600 38px system-ui, sans-serif'; x.fillText(`${d.score} / ${d.total} correct` + (d.pts != null ? `  ·  ${d.pts} pts` : ''), 62, 496);
  // stat chips
  const chips = [['Time', fmt(d.secs)], ['Level', lvl(p.xp)], ['Streak', dayStreak() + 'd'], ['Badges', p.badges.length + '/' + Object.keys(BADGES).length], ['Mastered', masteredCount()], ['Accuracy', (st.t ? Math.round(st.c / st.t * 100) : 0) + '%']];
  let cx = 60; chips.forEach(([k, v]) => { x.font = '600 24px system-ui, sans-serif'; const w = Math.max(x.measureText(k + '  ' + v).width + 34, 100); x.fillStyle = 'rgba(255,255,255,.08)'; rr(cx, 528, w, 46, 23); x.fill(); x.fillStyle = '#8fb0b5'; x.fillText(k, cx + 17, 559); x.fillStyle = '#fff'; x.fillText(String(v), cx + 17 + x.measureText(k + '  ').width, 559); cx += w + 10; });
  // ring + grade
  x.lineWidth = 30; x.lineCap = 'round'; x.strokeStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(930, 290, 150, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = rc; x.beginPath(); x.arc(930, 290, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.pct / 100); x.stroke();
  x.fillStyle = rc; x.font = '800 190px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText(grade, 930, 355);
  x.font = '700 34px system-ui, sans-serif'; x.fillText(rank.toUpperCase(), 930, 495); x.textAlign = 'left';
  // avatar
  { const a = QB.me(), ax = 1100, ay = 80; x.save(); x.beginPath(); x.arc(ax, ay, 46, 0, Math.PI * 2); x.closePath(); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill();
    if (img) { x.clip(); x.drawImage(img, ax - 46, ay - 46, 92, 92); } else { x.font = '58px "Segoe UI Emoji","Apple Color Emoji",serif'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText(a.v || '🦊', ax, ay + 20); }
    x.restore(); x.lineWidth = 5; x.strokeStyle = rc; x.beginPath(); x.arc(ax, ay, 48, 0, Math.PI * 2); x.stroke(); x.textAlign = 'left'; }
  // footer
  x.fillStyle = '#8fb0b5'; x.font = '500 22px system-ui, sans-serif'; x.textAlign = 'right'; x.fillText(`${name}  ·  ${new Date().toLocaleDateString()}  ·  for review and learning`, W - 50, 604); x.textAlign = 'left';
  c.toBlob(async b => {
    if (!b) return;
    if (d.share && navigator.share) { try { const f = new File([b], 'mybadquiz-score.png', { type: 'image/png' }); const data = { title: 'MyBadQuiz', text: `I scored ${d.pct}% (${d.score}/${d.total}) on ${d.title} in MyBadQuiz!` }; if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f]; await navigator.share(data); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mybadquiz-score.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Score card saved');
  });
}

/* ---------- navigation ---------- */
$('.brand').onclick = e => { e.preventDefault(); go('subjects'); };
$('#nav').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.tab); };
function go(t) {
  if (((Q && !Q.done) || (QB.busy && QB.busy())) && !confirm('Leave the current session? Your progress will be lost.')) return;
  stop(); Q = null; FC = null;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  const view = ({ subjects: viewSubjects, practice: viewPractice, arena: viewArena, cards: viewCards, library: viewLibrary, history: viewHistory, ranks: () => QB.viewRanks(), about: () => QB.viewAbout() })[t];
  if (document.startViewTransition && document.documentElement.dataset.fx !== 'off') { try { document.startViewTransition(view); } catch (e) { view(); } } else view();
  scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- subjects ---------- */
function viewSubjects() {
  const h = hist(), total = SUBJ.reduce((n, s) => n + s.questions.length, 0), p = prog(), xpIn = p.xp % 200, st = stats(), got = st.d[new Date().toISOString().slice(0, 10)] || 0, acc = st.t ? Math.round(st.c / st.t * 100) : 0;
  const cardHtml = (s, i, mix) => {
    const mine = mix ? h : h.filter(x => x.sid === s.id), best = mine.length ? Math.max(...mine.map(x => x.pct)) : null;
    const mm = mas(), mt = mix ? total : s.questions.length, mc = mix ? masteredCount() : s.questions.filter(q => mlevel(mm[q[0]]) === 3).length;
    return `<button class="card tilt" data-id="${s.id}" style="--c:${s.color};animation-delay:${i * 90}ms">
      <span class="ic">${s.icon}</span><small>${esc(s.code)}${s.course ? ' · ' + esc(s.course) : ''} · ${s.questions.length} questions</small>
      <h3>${esc(s.title)}</h3><span>${esc(s.description)}</span>
      <small>${best === null ? 'Not attempted yet' : `Best score: ${best}% · ${mine.length} attempt${mine.length > 1 ? 's' : ''}`}</small><div class="mini"><i style="width:${mc / mt * 100}%"></i></div><small>${mc}/${mt} mastered</small><span class="go">Start quiz</span></button>`;
  };
  const rec = (() => { const m = mas(); return SUBJ.map(s => ({ s, r: s.questions.filter(q => mlevel(m[q[0]]) === 3).length / s.questions.length })).sort((a, b) => a.r - b.r)[0]; })();
  const mix = SUBJ.length > 1 ? { id: 'mix', code: 'ALL', title: 'Mega Mix', icon: '🌐', color: '#b08cff', description: 'Questions from every subject shuffled into one exam.', questions: { length: total } } : null;
  app.innerHTML = `
  <section class="hero">${QB.heroUser()}<h1>Review smarter for your exams.</h1>
  <p>Pick a subject card, choose your rules, and test yourself. Every answer can be found in the handouts.</p>
  <div class="stats"><span class="pill"><b data-count="${SUBJ.length}">${SUBJ.length}</b> subjects</span><span class="pill"><b data-count="${total}">${total}</b> questions</span><span class="pill">Level <b data-count="${lvl(p.xp)}">${lvl(p.xp)}</b></span><span class="pill">Day streak <b>${dayStreak()}</b> ${dayStreak() ? '🔥' : ''}</span>${st.t ? `<span class="pill">Accuracy <b>${acc}%</b></span>` : ''}</div>
  ${rec ? `<button class="rec" id="rec">🎯 Suggested next: <b>${esc(rec.s.code)}</b> is your least mastered subject (${Math.round(rec.r * 100)}%). Start a practice round →</button>` : ''}
  <div class="goal"><span>Daily goal: <b>${Math.min(got, 20)}/20</b> questions${got >= 20 ? ' ✅' : ''}</span><div class="mini"><i style="width:${Math.min(got / 20, 1) * 100}%"></i></div></div>
  <div class="xp" title="${xpIn}/200 XP to next level"><i style="width:0" data-w="${xpIn / 2}"></i></div></section>
  ${SUBJ.length >= 5 ? '<input class="search" id="sf" placeholder="Filter subjects… (name, code or course)" aria-label="Filter subjects">' : ''}
  <div class="grid" id="sg">${SUBJ.map((s, i) => cardHtml(s, i)).join('')}${mix ? cardHtml(mix, SUBJ.length, true) : ''}
  <div class="card add" style="animation-delay:${(SUBJ.length + 1) * 90}ms"><h3>More subjects soon</h3><small>Add a file in /data to create a new card.</small></div></div>`;
  const sfi = $('#sf'); if (sfi) sfi.oninput = () => { const t = sfi.value.toLowerCase(); app.querySelectorAll('#sg .card[data-id]').forEach(c => { const sj = sub(c.dataset.id), hay = sj ? (sj.title + ' ' + sj.code + ' ' + sj.course).toLowerCase() : 'mega mix all'; c.style.display = hay.includes(t) ? '' : 'none'; }); };
  const rb = $('#rec'); if (rb) rb.onclick = () => start([rec.s.id], { ...O, auto: cfg.auto }, 'practice');
  if (FX.countAll) FX.countAll(app);
  requestAnimationFrame(() => setTimeout(() => { const x = $('.xp i'); if (x) x.style.width = x.dataset.w + '%'; }, 80));
  app.querySelectorAll('.card[data-id]').forEach(c => c.onclick = () => setup(c.dataset.id === 'mix' ? SUBJ.map(s => s.id) : [c.dataset.id], 'quiz'));
}

/* ---------- setup modal ---------- */
const sw = (id, on) => `<button class="sw ${on ? 'on' : ''}" data-sw="${id}" role="switch" aria-checked="${on}"></button>`;
function setup(ids, mode, pool) {
  const s = sub(ids[0]), total = ids.reduce((n, i) => n + sub(i).questions.length, 0);
  const opts = [10, 25, 50, 0].filter(n => n === 0 || n < total);
  const paint = () => {
    modal.innerHTML = `<div class="sheet" style="--c:${s.color}" role="dialog" aria-modal="true">
    <h2>${ids.length > 1 ? 'Mega Mix' : esc(s.title)}</h2><p class="sub">${pool ? pool.length + ' questions' : 'Set up your session'}</p>
    ${pool ? '' : `<div class="row"><label>Number of questions</label><div class="chips">${opts.map(n => `<button class="chip ${cfg.count === n ? 'on' : ''}" data-n="${n}">${n || 'All'}</button>`).join('')}</div></div>`}
    <div class="row"><label>Time limit<small>Turn off for unlimited time</small></label>${sw('timed', cfg.time > 0)}</div>
    ${cfg.time > 0 ? `<div class="row"><label>Minutes</label><div class="chips">${[5, 10, 20, 30, 45, 60].map(m => `<button class="chip ${cfg.time === m ? 'on' : ''}" data-t="${m}">${m}</button>`).join('')}</div></div>` : ''}
    <div class="row"><label>Instant feedback<small>See right/wrong right after answering</small></label>${sw('instant', cfg.instant)}</div>
    <div class="row"><label>Auto-next<small>Move on automatically after feedback</small></label>${sw('auto', cfg.auto)}</div>
    <div class="row"><label>Shuffle questions</label>${sw('sq', cfg.sq)}</div>
    <div class="row"><label>Shuffle choices</label>${sw('so', cfg.so)}</div>
    <div class="acts"><button class="btn ghost" id="cx">Cancel</button><button class="btn" id="st">Start</button></div></div>`;
    modal.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { cfg.count = +b.dataset.n; paint(); });
    modal.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { cfg.time = +b.dataset.t; paint(); });
    modal.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const k = b.dataset.sw; if (k === 'timed') cfg.time = cfg.time ? 0 : 20; else cfg[k] = !cfg[k]; paint(); });
    $('#cx').onclick = close;
    $('#st').onclick = () => { store.set('qb_cfg', cfg); close(); start(ids, { ...cfg }, mode, pool); };
  };
  modal.hidden = false; paint();
}
const close = () => modal.hidden = true;
modal.onclick = e => { if (e.target === modal) close(); };
const DD = { open: false };
const subjChips = pick => `<details class="dd" ${DD.open ? 'open' : ''}><summary>Subjects <b>${pick.size}/${SUBJ.length}</b></summary><div class="ddb"><div class="ddt"><button type="button" class="lnk" data-dd="all">Select all</button><button type="button" class="lnk" data-dd="none">Clear</button></div><div class="chips">${SUBJ.map(s => `<button class="chip ${pick.has(s.id) ? 'on' : ''}" style="--c:${s.color}" data-id="${s.id}">${s.icon} ${esc(s.code)}</button>`).join('')}</div></div></details>`;
document.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('dd')) DD.open = e.target.open; }, true);
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-dd]'); if (!b) return; const dd = b.closest('.dd'), want = b.dataset.dd; [...dd.querySelectorAll('.chip[data-id]')].filter(c => want === 'all' ? !c.classList.contains('on') : c.classList.contains('on')).forEach(c => c.click()); });

/* ---------- practice tab ---------- */
function viewPractice() {
  const pick = new Set(SUBJ.map(s => s.id));
  const paint = () => {
    app.innerHTML = `<div class="panel"><h2>Practice mode</h2>
    <p class="sub">No timer, no pressure. Questions keep coming in random order with instant feedback, the handout reference, sound effects and a streak counter. Hints are always one tap away.</p>
    <div class="row" style="border:0"><label>Subjects</label><div class="chips">${subjChips(pick)}</div></div>
    <div class="row"><label>Auto-next<small>Move on after each answer</small></label>${sw('auto', cfg.auto)}</div>
    <div class="acts" style="justify-content:flex-start"><button class="btn" id="go" ${pick.size ? '' : 'disabled'}>Start practicing</button></div></div>`;
    app.querySelectorAll('.chip').forEach(c => c.onclick = () => { pick.has(c.dataset.id) ? pick.delete(c.dataset.id) : pick.add(c.dataset.id); paint(); });
    $('[data-sw]').onclick = () => { cfg.auto = !cfg.auto; store.set('qb_cfg', cfg); paint(); };
    $('#go').onclick = () => start([...pick], { count: 0, time: 0, sq: true, so: true, instant: true, auto: cfg.auto }, 'practice');
  };
  paint();
}

/* ---------- flashcards ---------- */
function viewCards() {
  const pick = new Set(SUBJ.map(s => s.id)); let saved = false, weakOnly = false;
  const paint = () => {
    app.innerHTML = `<div class="panel"><h2>Flashcards</h2>
    <p class="sub">Read the question, flip the card to see the answer and handout reference, then mark whether you knew it. Missed cards can be repeated.</p>
    <div class="row" style="border:0"><label>Subjects</label><div class="chips">${subjChips(pick)}</div></div>
    <div class="row"><label>Saved questions only</label>${sw('sv', saved)}</div>
    <div class="row"><label>Weak and learning only<small>Cards you missed or are still learning</small></label>${sw('wk', weakOnly)}</div>
    <div class="acts" style="justify-content:flex-start"><button class="btn" id="go">Start flashcards</button></div></div>`;
    app.querySelectorAll('.chip').forEach(c => c.onclick = () => { pick.has(c.dataset.id) ? pick.delete(c.dataset.id) : pick.add(c.dataset.id); paint(); });
    app.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { if (b.dataset.sw === 'sv') saved = !saved; else weakOnly = !weakOnly; paint(); });
    $('#go').onclick = () => { const b = bm(), m = mas(), d = allQ().filter(q => pick.has(q.sid) && (!saved || b.has(q.q)) && (!weakOnly || [1, 2].includes(mlevel(m[q.q])))); d.length ? runCards(shuf(d)) : toast('No cards match. Save some questions first.'); };
  };
  paint();
}
function runCards(deck) {
  let i = 0, miss = [], known = 0;
  FC = { flip: () => {}, ans: () => {} };
  const paint = () => {
    if (i >= deck.length) {
      FC = null; if (known === deck.length) { FX.sfx('win'); FX.confetti(); } else FX.sfx('level');
      addXP(known * 3);
      app.innerHTML = `<div class="res"><h2>Deck finished</h2><div class="stats"><span class="pill">Knew <b>${known}</b></span><span class="pill">Missed <b>${miss.length}</b></span></div>
      <div class="acts">${miss.length ? '<button class="btn" id="rm">Review missed</button>' : ''}<button class="btn ghost" id="rs">Restart deck</button><button class="btn ghost" id="bk">Back</button></div></div>`;
      const rm = $('#rm'); if (rm) rm.onclick = () => runCards(shuf(miss));
      $('#rs').onclick = () => runCards(shuf(deck)); $('#bk').onclick = () => go('cards'); return;
    }
    const q = deck[i], s = sub(q.sid);
    app.innerHTML = `<div class="quiz" style="--c:${s.color}"><div class="qtop"><span class="meta">Card ${i + 1} of ${deck.length} · ${known} known</span><span class="tag">${esc(s.code)}</span></div>
    <div class="bar"><i style="width:${(i / deck.length) * 100}%"></i></div>
    <div class="fc in" id="fc"><div class="fi"><div class="face"><small>Question · tap to flip</small><h2>${esc(q.q)}</h2></div>
    <div class="face back"><small>Answer</small><h2>${esc(q.o[q.a])}</h2><small>📖 ${esc(q.h)}</small></div></div></div>
    <div class="nav2"><div><button class="btn ghost" id="fl">Flip (Space)</button></div><div><button class="btn ghost" id="mi">✗ Missed</button><button class="btn" id="kn">✓ Knew it</button></div></div></div>`;
    const flip = () => { $('#fc').classList.toggle('flip'); FX.sfx('flip'); };
    const ans = ok => { QB.ev('card'); ok ? known++ : miss.push(q); FX.sfx(ok ? 'ok' : 'bad'); i++; paint(); };
    FC = { flip, ans };
    $('#fc').onclick = flip; $('#fl').onclick = flip; $('#kn').onclick = () => ans(true); $('#mi').onclick = () => ans(false);
  };
  paint();
}

/* ---------- library (search / saved) ---------- */
function viewLibrary() {
  let term = '', sid = 'all', lv = -1, shown = 30;
  app.innerHTML = `<section class="hero"><h1>Question library</h1><p>Search every question with its answer and handout reference. Star questions to save them, listen to them, or look the topic up online.</p></section>
  <input class="search" id="q" placeholder="Search questions, answers or topics…" aria-label="Search">
  <div class="toolbar">${sel('ls', [['all', 'All subjects'], ['saved', '★ Saved only'], ...SUBJ.map(s => [s.id, s.icon + ' ' + s.code + ' · ' + s.title])], 'all')}${sel('lm', [['-1', 'Any mastery'], ...MN.map((n, i) => [String(i), n])], '-1')}<span class="pill" id="ct"></span><button class="btn ghost" id="pr">Practice these</button><button class="btn ghost" id="pp">🖨 Print</button></div>
  <div class="rev" id="ll" style="margin-top:0"></div><div class="acts" style="justify-content:center" id="mw"></div>`;
  const list = () => { const b = bm(), t = term.toLowerCase(), m = mas(); return allQ().filter(x => (sid === 'all' || (sid === 'saved' ? b.has(x.q) : x.sid === sid)) && (lv < 0 || mlevel(m[x.q]) === lv) && (x.q + ' ' + x.o.join(' ') + ' ' + x.h).toLowerCase().includes(t)); };
  const paint = () => {
    const l = list(), b = bm(), m = mas(); $('#ct').innerHTML = `<b>${l.length}</b> question${l.length === 1 ? '' : 's'}`;
    $('#ll').innerHTML = l.length ? l.slice(0, shown).map((x, i) => `<div class="ri ok" style="animation-delay:${Math.min(i, 10) * 25}ms"><button class="star ${b.has(x.q) ? 'on' : ''}" data-q="${i}" aria-label="Save">★</button><span class="dot" style="background:${MC[mlevel(m[x.q])]}" title="${MN[mlevel(m[x.q])]}"></span><b>${esc(x.q)}</b><p>Answer: <b>${esc(x.o[x.a])}</b></p><p>📖 ${esc(x.h)} <span class="tag">${esc(sub(x.sid).code)}</span></p><p><button class="ico" data-wiki="${esc(x.o[x.a])}" data-ctx="${esc(x.q)}">📚 Learn more</button> <button class="ico" data-say="${esc(x.q + ' Answer: ' + x.o[x.a])}">🔊 Read</button></p></div>`).join('') : '<div class="empty">Nothing found. Try another search, or star some questions first.</div>';
    $('#mw').innerHTML = l.length > shown ? `<button class="btn ghost" id="sm">Show ${Math.min(30, l.length - shown)} more (${l.length - shown} left)</button>` : '';
    const sm = $('#sm'); if (sm) sm.onclick = () => { shown += 30; paint(); };
    $('#ll').querySelectorAll('.star').forEach(st => st.onclick = () => { toggleBm(l[+st.dataset.q].q); paint(); });
  };
  $('#q').oninput = e => { term = e.target.value; shown = 30; paint(); };
  $('#ls').onchange = e => { sid = e.target.value; shown = 30; paint(); };
  $('#lm').onchange = e => { lv = +e.target.value; shown = 30; paint(); };
  $('#pp').onclick = () => { shown = 9999; paint(); setTimeout(() => print(), 60); };
  $('#pr').onclick = () => { const l = list(); l.length ? start([...new Set(l.map(x => x.sid))], { count: 0, time: 0, sq: true, so: true, instant: true, auto: cfg.auto }, 'practice', l) : toast('Nothing to practice yet.'); };
  paint();
}

/* ---------- history extras ---------- */
function spark(h) {
  const d = h.slice(0, 15).reverse(); if (d.length < 2) return '';
  const W = 600, H = 130, pts = d.map((x, i) => [10 + i / (d.length - 1) * (W - 20), H - 14 - x.pct / 100 * (H - 28)]);
  return `<h3>Score trend</h3><div class="spark"><svg viewBox="0 0 ${W} ${H}"><polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="var(--c)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${pts.map((q, i) => `<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="var(--c)"><title>${d[i].pct}% · ${esc(d[i].title)}</title></circle>`).join('')}</svg></div>`;
}
function heat() {
  const st = stats(), now = new Date(), cells = [];
  for (let i = 34; i >= 0; i--) { const t = new Date(now); t.setDate(t.getDate() - i); const k = t.toISOString().slice(0, 10), n = st.d[k] || 0; cells.push(`<i class="hc l${n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : 3}" title="${k}: ${n} answered"></i>`); }
  return `<h3>Study activity</h3><div class="heat">${cells.join('')}</div><p class="sub" style="margin:6px 0 18px">${st.t} answers all time · ${st.t ? Math.round(st.c / st.t * 100) : 0}% correct</p>`;
}
function subjStats(h) {
  const rows = SUBJ.map(s => { const m = h.filter(x => x.sid === s.id); return m.length ? `<span class="pill" style="border-color:${s.color}"><b>${esc(s.code)}</b> avg ${Math.round(m.reduce((n, x) => n + x.pct, 0) / m.length)}% · best ${Math.max(...m.map(x => x.pct))}%</span>` : ''; }).join('');
  return rows ? `<h3>By subject</h3><div class="stats" style="margin:8px 0 22px">${rows}</div>` : '';
}
function showQ(sid, i) {
  const s = sub(sid); if (!s || !s.questions[i]) return; const q = s.questions[i], r = mas()[q[0]];
  modal.hidden = false;
  modal.innerHTML = `<div class="sheet" style="--c:${s.color}"><span class="tag">${esc(s.code)} · ${MN[mlevel(r)]}</span><h2 style="font-size:1.25rem;margin:8px 0 12px">${esc(q[0])}</h2>
  <p><b>Answer:</b> ${esc(q[1][q[2]])}</p><p class="sub" style="margin-top:8px">📖 ${esc(q[3])}</p>${r ? `<p class="sub">Seen ${r.s} time${r.s > 1 ? 's' : ''}, ${r.c} correct.</p>` : '<p class="sub">Not attempted yet.</p>'}<div class="acts"><button class="btn" id="ok">Close</button></div></div>`;
  $('#ok').onclick = close;
}

/* ---------- history ---------- */
const HS = { sid: 'all', tab: 'overview', n: 20 };
const sel = (id, opts, cur) => `<select class="sel" id="${id}" aria-label="Filter">${opts.map(([v, t]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
function exportAll() {
  const data = {}; Object.keys(localStorage).filter(k => k.startsWith('qb_')).forEach(k => { try { data[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {} });
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'MyBadQuiz', v: 2, data }, null, 1)], { type: 'application/json' })); a.download = 'mybadquiz-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
function importAll(d) {
  const src = d.data || { qb_history: d.history, qb_bm: d.bookmarks, qb_prog: d.progress }, G = k => store.get(k, undefined);
  const seen = new Set(hist().map(x => x.date)); store.set('qb_history', [...hist(), ...(src.qb_history || []).filter(x => !seen.has(x.date))].sort((a, b) => b.date - a.date).slice(0, 100));
  store.set('qb_bm', [...new Set([...bm(), ...(src.qb_bm || [])])]);
  const o = prog(), n = src.qb_prog || {}; store.set('qb_prog', { xp: Math.max(o.xp, n.xp || 0), days: [...new Set([...o.days, ...(n.days || [])])], badges: [...new Set([...o.badges, ...(n.badges || [])])] });
  const mm = mas(), nm = src.qb_mas || {}; Object.keys(nm).forEach(k => { if (!mm[k] || nm[k].s > mm[k].s) mm[k] = nm[k]; }); store.set('qb_mas', mm);
  const st = stats(), ns = src.qb_stats; if (ns) { const d2 = { ...ns.d }; Object.keys(st.d).forEach(k => d2[k] = Math.max(d2[k] || 0, st.d[k])); store.set('qb_stats', { t: Math.max(st.t, ns.t || 0), c: Math.max(st.c, ns.c || 0), d: d2 }); }
  if (src.qb_rw != null) store.set('qb_rw', Math.max(store.get('qb_rw', 0), src.qb_rw));
  if (src.qb_coins != null) store.set('qb_coins', Math.max(store.get('qb_coins', 0), src.qb_coins));
  if (src.qb_own) { const lo = store.get('qb_own', {}); store.set('qb_own', { ship: [...new Set([...(lo.ship || []), ...(src.qb_own.ship || [])])], frame: [...new Set([...(lo.frame || []), ...(src.qb_own.frame || [])])] }); }
  if (src.qb_boss) { const lb = store.get('qb_boss', {}); Object.keys(src.qb_boss).forEach(k => { const a = lb[k] || { w: 0, b: 0, p: 0 }, b = src.qb_boss[k]; lb[k] = { w: Math.max(a.w, b.w), b: Math.max(a.b, b.b), p: Math.max(a.p, b.p) }; }); store.set('qb_boss', lb); }
  ['qb_set', 'qb_eq', 'qb_cfg', 'qb_theme', 'qb_diff', 'qb_hi'].forEach(k => { if (src[k] != null && G(k) === undefined) store.set(k, src[k]); });
}
function viewHistory() {
  const all = hist(), p = prog(), h = HS.sid === 'all' ? all : all.filter(x => x.sid === HS.sid);
  const avg = h.length ? Math.round(h.reduce((n, x) => n + x.pct, 0) / h.length) : 0, tabs = [['overview', 'Overview'], ['mastery', 'Mastery map'], ['badges', 'Badges ' + p.badges.length + '/' + Object.keys(BADGES).length], ['attempts', 'Attempts ' + h.length]];
  let body = '';
  if (HS.tab === 'overview') body = `${spark(h)}${heat()}${subjStats(all)}`;
  else if (HS.tab === 'mastery') body = masteryMap(HS.sid);
  else if (HS.tab === 'badges') body = `<div class="badges">${Object.entries(BADGES).map(([k, b], i) => `<div class="bd ${p.badges.includes(k) ? '' : 'lock'}" style="animation-delay:${Math.min(i, 14) * 40}ms"><span>${b[0]}</span><b>${b[1]}</b><small>${b[2]}</small></div>`).join('')}</div>`;
  else body = h.length ? `<div class="hist">${h.slice(0, HS.n).map((x, i) => `<div class="hi" style="--c:${(sub(x.sid) || { color: '#b08cff' }).color};animation-delay:${Math.min(i, 12) * 40}ms">
    <div class="pc">${x.pct}%</div><div class="grow"><b>${esc(x.title)}</b><br><small>${x.score}/${x.total} correct · ${fmt(x.secs)} · ${new Date(x.date).toLocaleString()}</small><div class="mini"><i style="width:${x.pct}%"></i></div></div>
    <button class="btn ghost" data-r="${x.sid}">Retake</button><button class="btn ghost" data-d="${x.date}" aria-label="Delete">✕</button></div>`).join('')}</div>${h.length > HS.n ? `<div class="acts" style="justify-content:center"><button class="btn ghost" id="more">Show ${Math.min(20, h.length - HS.n)} more</button></div>` : ''}` : `<div class="empty">No attempts here yet. Take a quiz and it will show up.</div>`;
  app.innerHTML = `<section class="hero"><h1>Your history</h1><p>Everything is saved in this browser. Use export to back it up or move it to another device.</p>
  <div class="stats"><span class="pill"><b>${h.length}</b> attempts</span><span class="pill">Average <b>${avg}%</b></span><span class="pill">Best <b>${h.length ? Math.max(...h.map(x => x.pct)) : 0}%</b></span><span class="pill"><b>${p.xp}</b> XP · Level <b>${lvl(p.xp)}</b></span></div></section>
  <div class="toolbar">${sel('hs', [['all', 'All subjects'], ...SUBJ.map(s => [s.id, s.icon + ' ' + s.code + ' · ' + s.title])], HS.sid)}<div class="subtabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" class="${HS.tab === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div></div>
  <div class="tabpane" id="tp">${body}</div>
  <div class="acts"><button class="btn ghost" id="ex">Export backup</button><button class="btn ghost" id="im">Import backup</button>${all.length ? '<button class="btn ghost" id="clr">Clear history</button>' : ''}<input type="file" id="fi" accept="application/json" hidden></div>`;
  $('#hs').onchange = e => { HS.sid = e.target.value; HS.n = 20; viewHistory(); };
  app.querySelectorAll('.subtabs [data-t]').forEach(b => b.onclick = () => { HS.tab = b.dataset.t; viewHistory(); });
  app.querySelectorAll('.cells i').forEach(i => i.onclick = () => showQ(i.dataset.s, +i.dataset.i));
  app.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { HS.sid = b.dataset.pick; viewHistory(); });
  app.querySelectorAll('[data-r]').forEach(b => b.onclick = () => setup(b.dataset.r === 'mix' ? SUBJ.map(s => s.id) : [b.dataset.r], 'quiz'));
  app.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { store.set('qb_history', hist().filter(x => String(x.date) !== b.dataset.d)); viewHistory(); });
  const mo = $('#more'); if (mo) mo.onclick = () => { HS.n += 20; viewHistory(); };
  const c = $('#clr'); if (c) c.onclick = () => { if (confirm('Delete all saved attempts?')) { store.set('qb_history', []); viewHistory(); } };
  $('#ex').onclick = exportAll; $('#im').onclick = () => $('#fi').click();
  $('#fi').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { importAll(JSON.parse(r.result)); toast('Backup imported. Reloading…'); setTimeout(() => location.reload(), 700); } catch (err) { toast('That file is not a valid backup.'); } }; r.readAsText(f); };
}

/* ---------- quiz engine ---------- */
const endless = () => Q.mode === 'practice' || Q.mode === 'survival';
const instant = () => Q.mode !== 'quiz' || Q.o.instant;
const locked = () => instant() && Q.ans[Q.idx] != null;
const mkq = q => ({ ...q, ord: Q.o.so ? shuf(q.o.map((_, i) => i)) : q.o.map((_, i) => i) });

function start(ids, o, mode, pool, extra = {}) {
  stop();
  let list = pool ? [...pool] : ids.flatMap(id => bank(sub(id)));
  if (o.sq) list = shuf(list);
  if (o.count && mode === 'quiz' && !pool) list = list.slice(0, o.count);
  const bmax = Math.min(15, list.length);
  Q = { ids, o, mode, pool: pool || null, extra, base: list, idx: 0, ans: [], hints: new Set(), gone: {}, ff: 2, t0: Date.now(), left: o.time * 60,
    streak: 0, best: 0, ok: 0, seen: 0, done: false, fresh: true, paused: false, lives: mode === 'boss' ? 5 : 3, bmax, bhp: bmax, qt: 30, ql: 30, fx: '', ...extra };
  Q.list = list.map(mkq);
  runTimer(); if (QB.wake) QB.wake(true);
  if (mode === 'boss') qTimer = setInterval(qTick, 1000);
  document.querySelectorAll('#nav button').forEach(b => b.classList.remove('on'));
  renderQ();
}
function runTimer() {
  if (Q.mode !== 'quiz' || !Q.o.time) return;
  timer = setInterval(() => {
    Q.left--; const t = $('#tm'); if (t) { t.textContent = fmt(Math.max(Q.left, 0)); t.classList.toggle('warn', Q.left <= 60); }
    if (Q.left <= 10 && Q.left > 0) FX.sfx('tick');
    if (Q.left <= 0) finish();
  }, 1000);
}
function qTick() {
  if (!Q || Q.done || Q.paused || locked()) return;
  Q.ql--; const b = $('#qbar'), n = $('#qn');
  if (b) b.style.width = Q.ql / Q.qt * 100 + '%'; if (n) n.textContent = Q.ql;
  if (Q.ql <= 5 && Q.ql > 0) FX.sfx('tick');
  if (Q.ql <= 0) pick(-1);
}
function pause() {
  if (Q.mode !== 'quiz' || !Q.o.time || Q.done) return;
  stop(); Q.paused = true;
  app.innerHTML = `<div class="panel" style="text-align:center"><h2>⏸ Paused</h2><p class="sub">The timer is stopped and the questions are hidden.</p><button class="btn" id="rs">Resume</button></div>`;
  $('#rs').onclick = () => { Q.paused = false; runTimer(); renderQ(); };
}
const hearts = (n, max) => Array.from({ length: max }, (_, i) => `<span class="hrt ${i < n ? '' : 'lost'}">❤</span>`).join('');

function renderQ() {
  const q = Q.list[Q.idx], a = Q.ans[Q.idx], lock = locked(), s = sub(q.sid), n = Q.list.length, inf = endless(), boss = Q.mode === 'boss', surv = Q.mode === 'survival';
  const fresh = Q.fresh, fx = Q.fx, gone = Q.gone[Q.idx] || [], saved = bm().has(q.q), plain = !inf && !boss;
  const right = a != null && a >= 0 && q.ord[a] === q.a, answered = Q.ans.filter(x => x != null).length;
  if (boss && fresh) Q.ql = Q.qt;
  const hud = boss ? `<div class="hud ${fx === 'hurt' ? 'hurt' : ''}"><div class="bossbox"><span class="boss ${fx === 'hit' ? 'hit' : ''} ${Q.bhp <= 0 ? 'dead' : ''}">${Q.boss.icon}</span>
    <div class="bhp"><b>${esc(Q.boss.name)}</b><div class="hpbar"><i style="width:${Q.bhp / Q.bmax * 100}%"></i></div></div></div><div class="hearts">${hearts(Q.lives, 5)}</div></div>
    <div class="qbar"><i id="qbar" style="width:${Q.ql / Q.qt * 100}%"></i></div><div class="meta" style="text-align:right;margin:-6px 0 10px">⏱ <span id="qn">${Q.ql}</span>s</div>`
    : surv ? `<div class="hud ${fx === 'hurt' ? 'hurt' : ''}"><b>Survival · score ${Q.ok}</b><div class="hearts">${hearts(Q.lives, 3)}</div></div>` : '';
  const metaTxt = plain ? `Question ${Q.idx + 1} of ${n} · ${answered} answered` : `${boss ? 'Round ' + (Q.seen + (lock ? 0 : 1)) + ' · ' : ''}Streak <b>${Q.streak >= 3 ? '<span class="flame">🔥</span>' : ''}${Q.streak}</b> · Best <b>${Q.best}</b> · ${Q.ok}/${Q.seen}`;
  const ffOff = lock || a != null || Q.gone[Q.idx] || (!inf && Q.ff <= 0);
  app.innerHTML = `<div class="quiz ${Q.streak >= 5 ? 'hot' : ''}" style="--c:${s.color}">${hud}
  <div class="qtop"><span class="meta">${metaTxt}</span>
  <span style="display:flex;gap:8px;align-items:center">${plain && Q.o.time ? '<button class="btn ghost" id="pz" style="padding:6px 12px" aria-label="Pause">⏸</button>' : ''}${plain && Q.o.time ? `<span class="timer ${Q.left <= 60 ? 'warn' : ''}" id="tm">${fmt(Math.max(Q.left, 0))}</span>` : ''}</span></div>
  ${plain ? `<div class="bar"><i style="width:${(Q.idx / n) * 100}%" id="pb"></i></div>` : ''}
  <div class="qcard ${fresh ? 'in' : ''}"><button class="star ${saved ? 'on' : ''}" id="bk" aria-label="Save question" title="Save (S)">★</button><button class="ico say" data-say="${esc(q.q + '. ' + q.ord.map((oi, p) => L[p] + '. ' + q.o[oi]).join('. '))}" aria-label="Read aloud" title="Read aloud">🔊</button><span class="tag">${esc(s.code)}</span><h2>${esc(q.q)}</h2>
  <div class="opts ${fresh ? 'fresh' : ''}">${q.ord.map((oi, p) => {
    let c = 'opt'; if (a === p) c += ' sel'; if (gone.includes(p)) c += ' gone';
    if (lock) { c += ' lock'; if (oi === q.a) c += ' ok'; else if (a === p) c += ' bad'; else c += ' dim'; }
    return `<button class="${c}" data-p="${p}"><b>${L[p]}</b><span>${esc(q.o[oi])}</span></button>`;
  }).join('')}</div>
  ${lock ? `<div class="fb ${right ? 'ok' : 'bad'}">${right ? '✓ Correct!' : (a === -1 ? '⏱ Time is up. ' : '✗ Not quite. ') + 'The correct answer is ' + L[q.ord.indexOf(q.a)] + '.'}</div>` : ''}
  ${Q.hints.has(Q.idx) || (lock && Q.mode !== 'quiz') ? `<div class="hint"><b>${lock && Q.mode !== 'quiz' ? 'Reference' : 'Hint'}:</b> ${esc(q.h)}</div>` : ''}
  <div class="nav2"><div><button class="btn ghost" id="hb">💡 Hint</button><button class="btn ghost" id="ff" ${ffOff ? 'disabled' : ''}>½ 50/50${inf ? '' : ' (' + Q.ff + ')'}</button>${plain ? '<button class="btn ghost" id="pv" ' + (Q.idx ? '' : 'disabled') + '>← Back</button>' : ''}</div>
  <div>${plain ? (Q.idx < n - 1 ? '<button class="btn" id="nx">Next →</button>' : '') + '<button class="btn ' + (Q.idx < n - 1 ? 'ghost' : '') + '" id="fn">Finish</button>'
    : `<button class="btn ghost" id="fn">${Q.mode === 'practice' ? 'End session' : 'Give up'}</button><button class="btn" id="nx" ${Q.mode === 'practice' || lock ? '' : 'disabled'}>${a == null ? 'Skip →' : 'Next →'}</button>`}</div></div></div>
  ${plain ? `<div class="dots">${Q.list.map((_, i) => `<i class="${Q.ans[i] != null ? 'a' : ''} ${i === Q.idx ? 'now' : ''}" data-i="${i}" title="Question ${i + 1}"></i>`).join('')}</div>` : ''}</div>`;
  Q.fresh = false; Q.fx = '';
  app.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.p));
  $('#hb').onclick = hint; $('#bk').onclick = bookmark; $('#ff').onclick = fifty;
  const nx = $('#nx'), pv = $('#pv'), fn = $('#fn'), pz = $('#pz');
  if (nx) nx.onclick = next; if (pv) pv.onclick = () => move(-1); if (fn) fn.onclick = tryFinish; if (pz) pz.onclick = pause;
  app.querySelectorAll('.dots i').forEach(d => d.onclick = () => { Q.idx = +d.dataset.i; Q.fresh = true; renderQ(); });
  requestAnimationFrame(() => { const pb = $('#pb'); if (pb) pb.style.width = ((Q.idx + 1) / n) * 100 + '%'; });
  if (fx === 'hurt') { app.classList.add('shake'); setTimeout(() => app.classList.remove('shake'), 480); }
}
function bookmark() { toggleBm(Q.list[Q.idx].q); renderQ(); }
function fifty() {
  if (!Q || Q.paused || locked() || Q.ans[Q.idx] != null || Q.gone[Q.idx] || (!endless() && Q.ff <= 0)) return;
  const q = Q.list[Q.idx], wrong = q.ord.map((oi, p) => oi === q.a ? -1 : p).filter(p => p >= 0);
  Q.usedHelp = true; Q.gone[Q.idx] = shuf(wrong).slice(0, 2); if (!endless()) Q.ff--; FX.sfx('hint'); renderQ();
}
function pick(p) {
  if (!Q || Q.done || locked() || Q.paused) return;
  const q = Q.list[Q.idx], ok = p >= 0 && q.ord[p] === q.a, inf = endless(), inst = instant(), boss = Q.mode === 'boss', surv = Q.mode === 'survival';
  Q.ans[Q.idx] = p; Q.seen++; track(q.q, ok);
  if (ok) { Q.ok++; Q.streak++; Q.best = Math.max(Q.best, Q.streak); if (Q.mode !== 'quiz' && Q.best >= 10) award('streak10'); if (Q.best >= 20) award('streak20'); } else Q.streak = 0;
  if (boss) { if (ok) { Q.bhp--; Q.fx = 'hit'; } else { Q.lives--; Q.fx = 'hurt'; } }
  if (surv && !ok) { Q.lives--; Q.fx = 'hurt'; }
  inst ? FX.sfx(ok ? 'ok' : 'bad') : FX.sfx('click');
  addXP(ok ? 10 : 2); QB.ev('answer'); if (ok) QB.ev('correct'); QB.ev('streak', Q.streak);
  renderQ();
  const el = $('.opt.ok'); if (ok && el && inst) { const r = el.getBoundingClientRect(); FX.burst(r.left + 40, r.top + r.height / 2); FX.floatText('+10 XP', r.right - 70, r.top + 4); }
  if (Q.mode !== 'quiz' && ok && Q.streak % 5 === 0) { FX.sfx('level'); toast('🔥 ' + Q.streak + ' in a row!'); FX.confetti(); }
  if (surv && Q.ok >= 15) award('survive');
  if ((boss && (Q.bhp <= 0 || Q.lives <= 0)) || (surv && Q.lives <= 0)) return void setTimeout(() => { if (Q && !Q.done) finish(); }, 1400);
  if (Q.o.auto && inst) { const i = Q.idx; setTimeout(() => { if (Q && !Q.done && !Q.paused && Q.idx === i && (Q.mode !== 'quiz' || i < Q.list.length - 1)) next(); }, 1400); }
}
function hint() { Q.usedHelp = true; FX.sfx('hint'); Q.hints.has(Q.idx) ? Q.hints.delete(Q.idx) : Q.hints.add(Q.idx); renderQ(); }
function move(d) { Q.idx = Math.min(Q.list.length - 1, Math.max(0, Q.idx + d)); Q.fresh = true; renderQ(); }
function next() {
  if (Q.mode !== 'quiz') {
    if (Q.idx >= Q.list.length - 1) Q.list.push(...shuf(Q.base).map(mkq));
    Q.idx++; Q.fresh = true; return renderQ();
  }
  move(1);
}
function tryFinish() {
  if (Q.mode !== 'quiz') return finish();
  const left = Q.list.length - Q.ans.filter(x => x != null).length;
  if (left && !confirm(`${left} question${left > 1 ? 's are' : ' is'} unanswered. Finish anyway?`)) return;
  finish();
}

document.addEventListener('visibilitychange', () => { if (document.hidden && Q && !Q.done && Q.mode === 'quiz' && Q.o.time && !Q.paused) pause(); });
window.addEventListener('error', () => { const n = Date.now(); if (n - (window.__errT || 0) > 15000) { window.__errT = n; toast('Something glitched. Your progress is safe.'); } });

/* ---------- results ---------- */
function finish() {
  stop(); Q.done = true;
  const part = Q.mode !== 'quiz', boss = Q.mode === 'boss';
  const rows = Q.list.map((q, i) => ({ q, a: Q.ans[i], i })).filter(r => !part || r.a != null)
    .map(r => ({ q: r.q, a: r.a, st: r.a == null ? 'sk' : (r.a >= 0 && r.q.ord[r.a] === r.q.a) ? 'ok' : 'bad' }));
  const score = rows.filter(r => r.st === 'ok').length, total = rows.length || 1, pct = Math.round(score / total * 100);
  const secs = Math.round((Date.now() - Q.t0) / 1000), mixed = Q.ids.length > 1, s = sub(Q.ids[0]), won = boss && Q.bhp <= 0;
  const title = boss ? 'Boss · ' + Q.boss.name : Q.title || (mixed ? 'Mega Mix' : s.title);
  const heading = boss ? (won ? 'Victory!' : 'Defeated') : Q.mode === 'survival' ? 'Run over' : Q.mode === 'practice' ? 'Practice summary' : 'Quiz complete';
  if (Q.mode !== 'practice' && rows.length && !(boss && QB.nixe())) {
    const h = [{ sid: mixed ? 'mix' : s.id, title: (Q.pool && !Q.daily ? 'Retry · ' : '') + title, score, total, pct, secs, date: Date.now() }, ...hist()].slice(0, 100);
    QB.ev('quiz'); if (Q.mode === 'quiz' && total >= 10 && pct >= 80) QB.ev('quiz80'); QB.addCoins(pct >= 80 ? 20 : 8);
    store.set('qb_history', h); award('first'); if (h.length >= 5) award('five');
    if (Q.mode === 'quiz' && pct === 100 && total >= 5) { award('perfect'); QB.addCoins(30); toast('💯 Perfect score bonus +30 coins'); } if (Q.mode === 'quiz' && pct === 100 && total >= 10 && !Q.usedHelp) award('nohint'); if (Q.mode === 'quiz' && mixed) award('mix');
    if (Q.mode === 'quiz' && total >= 25 && pct >= 80 && secs < 300) award('fast');
    if (won) { award('boss'); if (Q.flawless) award('flawless'); }
    if (boss) { QB.bossRecord(Q.boss, won, Q.score); if (won) QB.ev('bossWin'); QB.addCoins(won ? 40 : 5); }
    if (Q.daily) { store.set('qb_daily', { date: new Date().toDateString(), score, total }); award('daily'); QB.addCoins(20); }
    if (Q.mode === 'survival' && Q.ok > store.get('qb_hi', 0)) { store.set('qb_hi', Q.ok); toast('🏆 New survival record: ' + Q.ok); }
    addXP(boss ? (won ? 80 : 10) : pct >= 90 ? 50 : pct >= 70 ? 25 : 10); if (QB.lbPush) QB.lbPush();
  }
  if (masteredCount() >= 20) award('map');
  (boss ? won : pct >= 60) ? FX.sfx('win') : FX.sfx('lose'); if (boss ? won : pct >= 80) FX.confetti();
  const wrong = rows.filter(r => r.st !== 'ok');
  const msg = boss ? (won ? 'The boss is down. Your handout knowledge was too strong.' : 'You ran out of hearts. Review the misses and challenge it again.')
    : pct >= 90 ? 'Outstanding! You are exam-ready.' : pct >= 75 ? 'Great job. A little more review and you are there.' : pct >= 50 ? 'Good start. Review the missed items below.' : 'Keep going. Read the hints and try again.';
  app.innerHTML = `<div class="res" style="--c:${s.color}"><h2>${heading}</h2>
  <div class="ring"><svg viewBox="0 0 200 200" width="210" height="210"><circle class="bg" cx="100" cy="100" r="90"/><circle class="fg" id="fg" cx="100" cy="100" r="90"/></svg><div><span id="num">0%</span><small>${score} / ${total}</small></div></div>
  <p>${msg}</p>
  <div class="stats"><span class="pill">Correct <b>${score}</b></span><span class="pill">Wrong <b>${rows.filter(r => r.st === 'bad').length}</b></span><span class="pill">Skipped <b>${rows.filter(r => r.st === 'sk').length}</b></span><span class="pill">Time <b>${fmt(secs)}</b></span>${Q.score != null ? `<span class="pill">Score <b>${Q.score}</b></span>` : ''}</div>
  <div class="acts"><button class="btn" id="rt">${boss ? 'Fight again' : 'Retry'}</button>${wrong.length && ['quiz', 'practice'].includes(Q.mode) ? '<button class="btn ghost" id="rw">' + (Q.mode === 'practice' ? 'Practice missed' : 'Retry wrong only') + '</button>' : ''}<button class="btn ghost" id="sc">Save score card</button><button class="btn ghost" id="shr">Share</button><button class="btn ghost" id="hm">Back to subjects</button></div>
  ${rows.length ? `<div class="rev"><div class="chips"><button class="chip on" data-f="all">All (${rows.length})</button><button class="chip" data-f="bad">Missed (${wrong.length})</button></div><div id="rl">${rows.map((r, i) => rev(r, i)).join('')}</div></div>` : ''}</div>`;
  requestAnimationFrame(() => setTimeout(() => { const f = $('#fg'); if (f) f.style.strokeDashoffset = 565 - 565 * pct / 100; }, 60));
  const t0 = performance.now(); (function tick(t) { const k = Math.min((t - t0) / 1400, 1), n = $('#num'); if (n) n.textContent = Math.round(pct * (1 - Math.pow(1 - k, 3))) + '%'; if (n && k < 1) requestAnimationFrame(tick); })(t0);
  $('#rt').onclick = () => { const q = Q; Q = null; q.mode === 'boss' ? QB.bossGame(q.ids, (q.extra || {}).diff, (q.extra || {}).bdef) : start(q.ids, q.o, q.mode, q.pool, q.extra); };
  const rw = $('#rw'); if (rw) rw.onclick = () => { const q = Q, p = wrong.map(r => ({ q: r.q.q, o: r.q.o, a: r.q.a, h: r.q.h, sid: r.q.sid })); Q = null; start(q.ids, { ...q.o, count: 0 }, q.mode, p, { title: q.title }); };
  const cd = { title, pct, score, total, secs, heading, pts: Q.score, code: mixed ? 'MIX' : s.code };
  $('#sc').onclick = () => shareCard(cd); $('#shr').onclick = () => shareCard({ ...cd, share: true });
  $('#hm').onclick = () => { Q = null; go('subjects'); };
  app.querySelectorAll('[data-f]').forEach(c => c.onclick = () => {
    app.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === c));
    $('#rl').innerHTML = rows.filter(r => c.dataset.f === 'all' || r.st !== 'ok').map((r, i) => rev(r, i)).join('');
  });
}
const rev = (r, i) => `<div class="ri ${r.st}" style="animation-delay:${Math.min(i, 10) * 40}ms"><b>${r.st === 'ok' ? '✓' : r.st === 'sk' ? '–' : '✗'} ${esc(r.q.q)}</b>
  <p>Your answer: <b>${r.a == null || r.a < 0 ? (r.a === -1 ? 'No answer (time up)' : 'Skipped') : esc(r.q.o[r.q.ord[r.a]])}</b></p>${r.st === 'ok' ? '' : `<p>Correct answer: <b>${esc(r.q.o[r.q.a])}</b></p>`}<p>📖 ${esc(r.q.h)}</p><p><button class="ico" data-wiki="${esc(r.q.o[r.q.a])}" data-ctx="${esc(r.q.q)}">📚 Learn more</button> <button class="ico" data-say="${esc(r.q.q + ' Answer: ' + r.q.o[r.q.a])}">🔊 Read</button></p></div>`;

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); return; }
  if (e.key === 'Escape' && !modal.hidden) { close(); return; }
  if (!modal.hidden || typing) return;
  if (e.key === '/') { e.preventDefault(); palette(); return; }
  if (FC) {
    if (e.key === ' ') { e.preventDefault(); FC.flip(); } else if (e.key === 'ArrowRight') FC.ans(true); else if (e.key === 'ArrowLeft') FC.ans(false);
    return;
  }
  if (!Q || Q.done || Q.paused || Q.mode === 'boss') return;
  const k = e.key.toLowerCase();
  if (/^[1-4]$/.test(k)) pick(+k - 1);
  else if ('abcd'.includes(k) && k.length === 1) pick('abcd'.indexOf(k));
  else if (k === 'h') hint();
  else if (k === 'f') fifty();
  else if (k === 's') bookmark();
  else if (k === 'p') pause();
  else if (k === 'arrowright' || k === 'enter') { if (Q.mode === 'quiz' ? Q.idx < Q.list.length - 1 : (Q.mode === 'practice' || locked())) next(); }
  else if (k === 'arrowleft' && Q.mode === 'quiz') move(-1);
});

Object.defineProperties(QB, { Q: { get: () => Q, set: v => { Q = v; } }, cfg: { get: () => cfg } });
Object.assign(QB, { masteredCount, viewSubjects, O, $, esc, shuf, store, fmt, L, SUBJ, sub, bank, allQ, toast, addXP, award, track, app, modal, close, sw, subjChips, go, start, stop, finish, lvl, prog, mlevel, mas, stats, FX, BADGES, hist, dayStreak });
$('#cfg').onclick = openSettings; $('#kb').onclick = palette;
applySet();
})();
