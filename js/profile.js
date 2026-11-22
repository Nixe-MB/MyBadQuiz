/* MyBadQuiz – profile: avatar (emoji or your own photo), coins, daily quests, shop (ship skins + avatar frames), boss trophies. */
(() => {
const { $, esc, store, toast, modal, close, FX, app, lvl, prog } = QB;
const EMO = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐯', '🐵', '🐶', '🐱', '🦁', '🐨', '🐰', '🐻', '🦉', '🐧', '🦖', '🐲', '🤖', '👾', '👽', '🥷', '🧙', '🦸', '🎃', '🔥', '⚡', '🌟', '💎', '🚀', '🎮', '🧠', '🎧'];
const SHIPS = [
  { id: 'classic', name: 'Classic', color: null, shape: 'delta', cost: 0 },
  { id: 'dart', name: 'Neon Dart', color: '#ff5fd2', shape: 'dart', cost: 80 },
  { id: 'twin', name: 'Gold Twin', color: '#ffd166', shape: 'twin', cost: 150 },
  { id: 'ghost', name: 'Ghost Wing', color: '#cfe0ff', shape: 'delta', cost: 220 },
  { id: 'void', name: 'Void Runner', color: '#a06bff', shape: 'dart', cost: 280 },
  { id: 'phoenix', name: 'Phoenix', color: '#ff7a3d', shape: 'twin', cost: 360 }
];
const FRAMES = [{ id: 'none', name: 'No frame', cost: 0 }, { id: 'gold', name: 'Gold ring', cost: 80 }, { id: 'neon', name: 'Neon pulse', cost: 120 }, { id: 'ice', name: 'Frost ring', cost: 150 }, { id: 'fire', name: 'Flame ring', cost: 200 }, { id: 'galaxy', name: 'Galaxy', cost: 260 }, { id: 'glitch', name: 'Glitch', cost: 320 }, { id: 'rainbow', name: 'Rainbow', cost: 400 }, { id: 'royal', name: 'Royal crown', cost: 500 }];
const QUESTS = [
  { id: 'answer20', t: 'Answer 20 questions', ev: 'answer', n: 20, xp: 30, c: 15 }, { id: 'correct15', t: 'Get 15 correct answers', ev: 'correct', n: 15, xp: 35, c: 15 },
  { id: 'streak5', t: 'Reach a 5-answer streak', ev: 'streak', max: true, n: 5, xp: 40, c: 20 }, { id: 'quiz', t: 'Finish a quiz', ev: 'quiz', n: 1, xp: 25, c: 12 },
  { id: 'quiz80', t: 'Score 80%+ on a quiz of 10+ questions', ev: 'quiz80', n: 1, xp: 50, c: 25 }, { id: 'bossWin', t: 'Defeat a boss', ev: 'bossWin', n: 1, xp: 60, c: 30 },
  { id: 'race', t: 'Finish an online race', ev: 'race', n: 1, xp: 50, c: 25 }, { id: 'cards', t: 'Review 15 flashcards', ev: 'card', n: 15, xp: 30, c: 15 }
];
const getSet = () => store.get('qb_set', {});
const putSet = o => store.set('qb_set', { ...getSet(), ...o });
const eq = () => ({ ship: 'classic', frame: 'none', ...store.get('qb_eq', {}) });
const own = () => { const o = store.get('qb_own', {}); return { ship: ['classic', ...(o.ship || [])], frame: ['none', ...(o.frame || [])] }; };
const coins = () => store.get('qb_coins', 0);
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- avatar ---------- */
QB.me = () => { const a = getSet().avatar || { k: 'e', v: '🦊' }; return { ...a, f: eq().frame }; };
QB.myName = () => (getSet().name || '').trim() || 'Player';
QB.cleanAvatar = a => {
  if (!a || typeof a !== 'object') return { k: 'e', v: '🙂' };
  const f = ['none', 'gold', 'neon', 'fire', 'ice', 'galaxy', 'glitch', 'rainbow', 'royal'].includes(a.f) ? a.f : 'none';
  if (a.k === 'i' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.v || '') && a.v.length < 30000) return { k: 'i', v: a.v, f };
  return { k: 'e', v: String(a.v || '🙂').slice(0, 4), f };
};
QB.avatar = (a, px = 40) => {
  a = QB.cleanAvatar(a); const fr = a.f && a.f !== 'none' ? ' fr-' + a.f : '';
  return a.k === 'i' ? `<img class="av${fr}" src="${a.v}" alt="" width="${px}" height="${px}" style="width:${px}px;height:${px}px">`
    : `<span class="av${fr}" style="width:${px}px;height:${px}px;font-size:${Math.round(px * .58)}px">${esc(a.v)}</span>`;
};
const paintPf = () => { const b = $('#pf'); if (b) b.innerHTML = QB.avatar(QB.me(), 30); const h = $('#coinh b'); if (h) h.textContent = coins(); };
QB.paintPf = paintPf;
QB.heroUser = () => { const p = prog(); return `<div class="me">${QB.avatar(QB.me(), 54)}<div><b>${esc(QB.myName())}</b><small>Level ${lvl(p.xp)} · 🪙 <span data-count="${coins()}">${coins()}</span> coins</small></div><button class="btn ghost" id="pfb" style="margin-left:auto">Profile</button></div>`; };
function fromFile(file, cb) {
  const r = new FileReader();
  r.onload = () => { const img = new Image(); img.onload = () => { const S = 96, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), m = Math.min(img.width, img.height); x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, S, S); cb(c.toDataURL('image/jpeg', .8)); }; img.onerror = () => toast('Could not read that image.'); img.src = r.result; };
  r.readAsDataURL(file);
}
function openProfile() {
  const paint = () => {
    const a = getSet().avatar || { k: 'e', v: '🦊' }, o = own(), e = eq();
    modal.hidden = false;
    modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><h2>Your profile</h2><p class="sub">Shown in races, boss raids and on your score card.</p>
    <div class="me" style="margin-bottom:12px">${QB.avatar(QB.me(), 64)}<div><input class="search" id="pn" style="margin:0;width:190px" maxlength="14" placeholder="Display name" value="${esc(getSet().name || '')}"></div></div>
    <label class="sub" style="display:block;margin-bottom:6px">Pick an avatar</label>
    <div class="avgrid">${EMO.map(m => `<button class="avb ${a.k === 'e' && a.v === m ? 'on' : ''}" data-e="${m}">${m}</button>`).join('')}</div>
    <div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost" id="up">📷 Upload your own photo</button>${a.k === 'i' ? '<button class="btn ghost" id="rm">Remove photo</button>' : ''}<input type="file" id="uf" accept="image/*" hidden></div>
    <p class="sub" style="font-size:.8rem">Photos are cropped to a small square and stay on your device (they are only sent to people in a room you join).</p>
    <div class="row"><label>Avatar frame<small>Buy more in the Shop</small></label><div class="chips">${FRAMES.filter(f => o.frame.includes(f.id)).map(f => `<button class="chip ${e.frame === f.id ? 'on' : ''}" data-f="${f.id}">${f.name}</button>`).join('')}</div></div>
    <div class="acts"><button class="btn" id="ok">Done</button></div></div>`;
    modal.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { putSet({ avatar: { k: 'e', v: b.dataset.e } }); FX.sfx('equip'); paintPf(); paint(); });
    modal.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { store.set('qb_eq', { ...eq(), frame: b.dataset.f }); FX.sfx('equip'); paintPf(); paint(); });
    $('#pn').onchange = ev => { putSet({ name: ev.target.value.trim().slice(0, 14) }); };
    $('#up').onclick = () => $('#uf').click();
    $('#uf').onchange = ev => { const f = ev.target.files[0]; if (f) fromFile(f, d => { putSet({ avatar: { k: 'i', v: d } }); FX.sfx('equip'); paintPf(); paint(); }); };
    const rm = $('#rm'); if (rm) rm.onclick = () => { putSet({ avatar: { k: 'e', v: '🦊' } }); paintPf(); paint(); };
    $('#ok').onclick = () => { close(); const t = $('.hero .me'); if (t) QB.go('subjects'); };
  };
  paint();
}
document.addEventListener('click', e => { if (e.target.closest('#pf') || e.target.closest('#pfb')) openProfile(); });

/* ---------- coins + quests (daily + weekly) ---------- */
const WEEKLY = [
  { id: 'w_answer150', t: 'Answer 150 questions this week', ev: 'answer', n: 150, xp: 150, c: 80 }, { id: 'w_boss3', t: 'Defeat 3 bosses this week', ev: 'bossWin', n: 3, xp: 200, c: 120 },
  { id: 'w_quiz5', t: 'Finish 5 quizzes this week', ev: 'quiz', n: 5, xp: 120, c: 70 }, { id: 'w_race2', t: 'Finish 2 online games this week', ev: 'race', n: 2, xp: 160, c: 100 }, { id: 'w_cards40', t: 'Review 40 flashcards this week', ev: 'card', n: 40, xp: 100, c: 60 }
];
const weekKey = () => { const d = new Date(); const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return t.getUTCFullYear() + '-W' + Math.ceil(((t - y0) / 864e5 + 1) / 7); };
const seeded = key => { let seed = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11); return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; };
const pickIds = (list, key, n) => { const rnd = seeded(key); return list.map(q => [rnd(), q.id]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]); };
const COIN_FIX = n => { store.set('qb_coins', coins() + n); const c = $('#coinv'); if (c) c.textContent = coins(); const h = $('#coinh b'); if (h) { h.textContent = coins(); const p = h.parentElement; p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); } };
QB.addCoins = n => { if (n) COIN_FIX(n); };
function qstate(kind) {
  const key = kind === 'w' ? 'qb_wq' : 'qb_quest', stamp = kind === 'w' ? weekKey() : today(), list = kind === 'w' ? WEEKLY : QUESTS;
  let s = store.get(key, null);
  if (!s || (s.date || s.week) !== stamp) { s = { [kind === 'w' ? 'week' : 'date']: stamp, ids: pickIds(list, stamp, kind === 'w' ? 2 : 3), prog: {}, claimed: {} }; store.set(key, s); }
  return s;
}
QB.ev = (name, n = 1) => {
  if (name === 'correct') QB.addCoins(1);
  [['d', QUESTS, 'qb_quest'], ['w', WEEKLY, 'qb_wq']].forEach(([k, list, key]) => {
    const s = qstate(k); let ch = false;
    s.ids.forEach(id => {
      const q = list.find(x => x.id === id); if (!q || q.ev !== name) return;
      const b = s.prog[id] || 0, v = Math.min(q.max ? Math.max(b, n) : b + n, q.n);
      if (v !== b) { s.prog[id] = v; ch = true; if (b < q.n && v >= q.n) { toast('✅ ' + (k === 'w' ? 'Weekly' : 'Daily') + ' quest complete: ' + q.t); FX.sfx('level'); } }
    });
    if (ch) store.set(key, s);
  });
};
QB.arenaBar = () => `<div class="stats" style="margin:0 0 18px"><span class="pill">🪙 <b id="coinv">${coins()}</b> coins</span><button class="btn ghost" id="shopb">🛍️ Shop</button><button class="btn ghost" id="pfb">${QB.avatar(QB.me(), 22)} Profile</button></div>`;
const questBlock = (kind, title, sub) => {
  const s = qstate(kind), list = kind === 'w' ? WEEKLY : QUESTS;
  return `<div class="panel quests"><h2 style="font-size:1.3rem">${title}</h2><p class="sub" style="margin-bottom:12px">${sub}</p>${s.ids.map(id => {
    const q = list.find(x => x.id === id), p = s.prog[id] || 0, done = p >= q.n, got = s.claimed[id];
    return `<div class="qrow ${done ? 'done' : ''}"><div class="grow"><b>${esc(q.t)}</b><div class="mini"><i style="width:${p / q.n * 100}%"></i></div><small>${p}/${q.n} · reward ${q.xp} XP + ${q.c} 🪙</small></div>
    <button class="btn ${done && !got ? '' : 'ghost'}" data-claim="${kind}:${id}" ${done && !got ? '' : 'disabled'}>${got ? 'Claimed' : done ? 'Claim' : 'In progress'}</button></div>`;
  }).join('')}</div>`;
};
QB.questsHtml = () => `<div class="two">${questBlock('d', 'Daily quests', 'Fresh every day. Claim rewards for XP and coins.')}${questBlock('w', 'Weekly quests', 'Bigger goals, bigger rewards. Resets every Monday.')}</div>`;
QB.bindQuests = () => {
  const sb = $('#shopb'); if (sb) sb.onclick = openShop;
  app.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
    const [k, id] = b.dataset.claim.split(':'), s = qstate(k), q = (k === 'w' ? WEEKLY : QUESTS).find(x => x.id === id); if (!q || s.claimed[id] || (s.prog[id] || 0) < q.n) return;
    s.claimed[id] = 1; store.set(k === 'w' ? 'qb_wq' : 'qb_quest', s); QB.addXP(q.xp); QB.addCoins(q.c); FX.sfx('claim'); FX.confetti(); toast(`+${q.xp} XP, +${q.c} coins`); QB.go('arena');
  });
};
/* daily login bonus (grows with your streak) */
(() => {
  const dl = store.get('qb_login', { d: '', n: 0 }), t = today(); if (dl.d === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10), n = dl.d === y ? dl.n + 1 : 1, extra = { 3: 50, 7: 150, 14: 300, 30: 600 }[n] || 0, bonus = 10 + Math.min(n, 7) * 5 + extra;
  store.set('qb_login', { d: t, n }); setTimeout(() => { QB.addCoins(bonus); toast(`🎁 Daily bonus: +${bonus} coins (day ${n} in a row${extra ? ', milestone!' : ''})`); FX.sfx('coin'); }, 1200);
})();
QB.earnHtml = () => `<h3 style="margin:14px 0 6px">Ways to earn coins</h3><ul class="earn"><li>🎁 Daily login bonus, bigger every day in a row</li><li>✅ Claim daily and weekly quests</li><li>🎯 +1 per correct answer, +8 to +20 per finished quiz</li><li>💯 +30 for a perfect score, +20 for the daily challenge</li><li>👑 +40 for beating a boss, +60 the first time for each boss</li><li>🏅 +25 for every badge, +10 × level when you level up</li><li>🧠 +20 for every 10 questions mastered</li><li>📦 Mystery chest every 50 answers</li><li>🌐 +10 to +30 for online games</li></ul>`;

/* ---------- shop ---------- */
QB.skin = () => SHIPS.find(s => s.id === eq().ship) || SHIPS[0];
function openShop() {
  const paint = () => {
    const o = own(), e = eq();
    const row = (kind, it, label) => { const has = o[kind].includes(it.id), on = e[kind] === it.id; return `<div class="qrow"><div class="grow"><b>${it.name}</b><small>${has ? 'Owned' : it.cost + ' 🪙'}</small></div><button class="btn ${on ? 'ghost' : ''}" data-b="${kind}:${it.id}">${on ? 'Equipped' : has ? 'Equip' : 'Buy'}</button></div>`; };
    modal.hidden = false;
    modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><h2>🛍️ Shop</h2><p class="sub">You have 🪙 <b>${coins()}</b>. Earn coins by answering, finishing quizzes, claiming quests and beating bosses.</p>
    <h3 style="margin:10px 0 4px">Ship skins (Boss Arena)</h3>${SHIPS.map(s => row('ship', s)).join('')}
    <h3 style="margin:14px 0 4px">Avatar frames</h3>${FRAMES.map(f => row('frame', f)).join('')}
    ${QB.earnHtml()}<div class="acts"><button class="btn" id="ok">Done</button></div></div>`;
    modal.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
      const [kind, id] = b.dataset.b.split(':'), list = kind === 'ship' ? SHIPS : FRAMES, it = list.find(x => x.id === id), o2 = own();
      if (!o2[kind].includes(id)) { if (coins() < it.cost) { toast('Not enough coins yet.'); FX.sfx('bad'); return; } store.set('qb_coins', coins() - it.cost); const raw = store.get('qb_own', {}); raw[kind] = [...(raw[kind] || []), id]; store.set('qb_own', raw); FX.sfx('coin'); }
      store.set('qb_eq', { ...eq(), [kind]: id }); FX.sfx('equip'); paintPf(); paint();
    });
    $('#ok').onclick = () => { close(); if ($('#coinv')) $('#coinv').textContent = coins(); };
  };
  paint();
}
QB.openShop = openShop;

/* ---------- boss trophies ---------- */
QB.bossRecord = (boss, won, score) => {
  if (!boss) return; const r = store.get('qb_boss', {}), k = boss.name, c = r[k] || { w: 0, b: 0, p: 0 };
  c.p++; if (won) { c.w++; if (c.w === 1) { QB.addCoins(60); toast('👑 First victory over ' + boss.name + '! +60 coins'); } } c.b = Math.max(c.b, score || 0); r[k] = c; store.set('qb_boss', r);
};
paintPf();
})();
