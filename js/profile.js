/* MyBadQuiz – profile: avatar (emoji or your own photo), coins, daily quests, shop (ship skins + avatar frames), boss trophies. */
(() => {
const { $, esc, store, toast, modal, close, FX, app, lvl, prog } = QB;
const EMO = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐯', '🐵', '🐶', '🐱', '🦁', '🐨', '🐰', '🐻', '🦉', '🐧', '🦖', '🐲', '🤖', '👾', '👽', '🥷', '🧙', '🦸', '🎃', '🔥', '⚡', '🌟', '💎', '🚀', '🎮', '🧠', '🎧'];
const SHIPS = [
  { id: 'classic', name: 'Classic', color: null, shape: 'delta', cost: 0 },
  { id: 'dart', name: 'Neon Dart', color: '#ff5fd2', shape: 'dart', cost: 80 },
  { id: 'twin', name: 'Gold Twin', color: '#ffd166', shape: 'twin', cost: 150 },
  { id: 'ghost', name: 'Ghost Wing', color: '#cfe0ff', shape: 'delta', cost: 220 }
];
const FRAMES = [{ id: 'none', name: 'No frame', cost: 0 }, { id: 'gold', name: 'Gold ring', cost: 80 }, { id: 'neon', name: 'Neon pulse', cost: 120 }, { id: 'fire', name: 'Flame ring', cost: 200 }];
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
  const f = ['none', 'gold', 'neon', 'fire'].includes(a.f) ? a.f : 'none';
  if (a.k === 'i' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.v || '') && a.v.length < 30000) return { k: 'i', v: a.v, f };
  return { k: 'e', v: String(a.v || '🙂').slice(0, 4), f };
};
QB.avatar = (a, px = 40) => {
  a = QB.cleanAvatar(a); const fr = a.f && a.f !== 'none' ? ' fr-' + a.f : '';
  return a.k === 'i' ? `<img class="av${fr}" src="${a.v}" alt="" width="${px}" height="${px}" style="width:${px}px;height:${px}px">`
    : `<span class="av${fr}" style="width:${px}px;height:${px}px;font-size:${Math.round(px * .58)}px">${esc(a.v)}</span>`;
};
const paintPf = () => { const b = $('#pf'); if (b) b.innerHTML = QB.avatar(QB.me(), 30); };
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

/* ---------- coins + quests ---------- */
QB.addCoins = n => { store.set('qb_coins', coins() + n); const c = $('#coinv'); if (c) c.textContent = coins(); };
function qstate() {
  let s = store.get('qb_quest', null);
  if (!s || s.date !== today()) {
    let seed = [...today()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11); const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    s = { date: today(), ids: QUESTS.map(q => [rnd(), q.id]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]), prog: {}, claimed: {} }; store.set('qb_quest', s);
  }
  return s;
}
QB.ev = (name, n = 1) => {
  if (name === 'correct') QB.addCoins(1);
  const s = qstate(); let ch = false;
  s.ids.forEach(id => {
    const q = QUESTS.find(x => x.id === id); if (q.ev !== name) return;
    const b = s.prog[id] || 0, v = Math.min(q.max ? Math.max(b, n) : b + n, q.n);
    if (v !== b) { s.prog[id] = v; ch = true; if (b < q.n && v >= q.n) { toast('✅ Quest complete: ' + q.t); FX.sfx('level'); } }
  });
  if (ch) store.set('qb_quest', s);
};
QB.arenaBar = () => `<div class="stats" style="margin:0 0 18px"><span class="pill">🪙 <b id="coinv">${coins()}</b> coins</span><button class="btn ghost" id="shopb">🛍️ Shop</button><button class="btn ghost" id="pfb">${QB.avatar(QB.me(), 22)} Profile</button></div>`;
QB.questsHtml = () => {
  const s = qstate();
  return `<div class="panel quests"><h2 style="font-size:1.3rem">Daily quests</h2><p class="sub" style="margin-bottom:12px">Fresh every day. Claim rewards for XP and coins.</p>${s.ids.map(id => {
    const q = QUESTS.find(x => x.id === id), p = s.prog[id] || 0, done = p >= q.n, got = s.claimed[id];
    return `<div class="qrow ${done ? 'done' : ''}"><div class="grow"><b>${esc(q.t)}</b><div class="mini"><i style="width:${p / q.n * 100}%"></i></div><small>${p}/${q.n} · reward ${q.xp} XP + ${q.c} 🪙</small></div>
    <button class="btn ${done && !got ? '' : 'ghost'}" data-claim="${id}" ${done && !got ? '' : 'disabled'}>${got ? 'Claimed' : done ? 'Claim' : 'In progress'}</button></div>`;
  }).join('')}</div>`;
};
QB.bindQuests = () => {
  const sb = $('#shopb'); if (sb) sb.onclick = openShop;
  app.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
    const s = qstate(), q = QUESTS.find(x => x.id === b.dataset.claim); if (s.claimed[q.id] || (s.prog[q.id] || 0) < q.n) return;
    s.claimed[q.id] = 1; store.set('qb_quest', s); QB.addXP(q.xp); QB.addCoins(q.c); FX.sfx('claim'); FX.confetti(); toast(`+${q.xp} XP, +${q.c} coins`); QB.go('arena');
  });
};

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
    <div class="acts"><button class="btn" id="ok">Done</button></div></div>`;
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
  c.p++; if (won) c.w++; c.b = Math.max(c.b, score || 0); r[k] = c; store.set('qb_boss', r);
};
paintPf();
})();
