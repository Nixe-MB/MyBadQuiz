/* MyBadQuiz – Online multiplayer (website-to-website, peer to peer via PeerJS, no backend needed).
   Modes:  🏁 Race  – everybody answers the same questions, fastest correct answers score more, sabotage each other with power-ups.
           👾 Boss Raid – co-op: the whole room fights ONE shared boss; every correct answer hurts it, every mistake costs the team a heart.
   The host chooses subjects, question count (5–100), power-up preset + which power-ups exist, timer and boss. */
(() => {
const { $, esc, shuf, app, modal, FX, sub, allQ, store, toast, close, subjChips, SUBJ } = QB;
const PEER_SRC = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const FALLBACK = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐯'];
const COUNTS = [5, 10, 15, 20, 30, 40, 50, 75, 100];
const PU = {
  double: ['⚡', 'Double', 'Your next correct answer counts double'],
  shield: ['🛡️', 'Shield', 'Blocks the next sabotage (Race) or absorbs your next mistake (Raid)'],
  freeze: ['❄️', 'Freeze', 'Freezes the player ahead of you for 3 seconds'],
  steal: ['💣', 'Steal', 'Steals up to 60 points from the player ahead of you'],
  fifty: ['½', '50/50', 'Removes two wrong answers'],
  heal: ['❤️', 'Heal', 'Restores one team heart']
};
const POOL = { race: ['double', 'shield', 'freeze', 'steal', 'fifty'], raid: ['double', 'shield', 'heal', 'fifty'] };
const KEYS = ['q', 'w', 'e'];
let R = null;
const code5 = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
const loadPeer = () => new Promise(res => {
  if (window.Peer) return res(true);
  const s = document.createElement('script'); s.src = PEER_SRC; s.onload = () => res(!!window.Peer); s.onerror = () => res(false); document.head.append(s); setTimeout(() => res(!!window.Peer), 7000);
});
/* transport: h = { ready(id, hostId), peer(id), msg(id,m), gone(id), fail(text) } */
async function link(code, host, h) {
  if (window.__mbqLink) return window.__mbqLink(code, host, h);
  if (!(await loadPeer())) { h.fail('Could not load the online library. Check your internet connection.'); return null; }
  const conns = {}; const peer = host ? new Peer('mbq-' + code) : new Peer();
  const wire = c => { conns[c.peer] = c; c.on('data', m => h.msg(c.peer, m)); c.on('close', () => { delete conns[c.peer]; h.gone(c.peer); }); c.on('error', () => {}); };
  peer.on('error', e => h.fail(e.type === 'unavailable-id' ? 'That room code is already taken. Try again.' : e.type === 'peer-unavailable' ? 'Room not found. Check the code.' : 'Connection problem (' + e.type + ').'));
  if (host) { peer.on('open', () => h.ready(peer.id)); peer.on('connection', c => c.on('open', () => { wire(c); h.peer(c.peer); })); }
  else peer.on('open', () => { const c = peer.connect('mbq-' + code, { reliable: true }); c.on('open', () => { wire(c); h.ready(peer.id, c.peer); }); });
  return { send: (id, m) => conns[id] && conns[id].open && conns[id].send(m), all: m => Object.values(conns).forEach(c => c.open && c.send(m)), close: () => { try { peer.destroy(); } catch (e) {} } };
}
QB.busy = () => !!(R && R.state === 'play');
const leave = () => { if (QB.wake) QB.wake(false); if (R) { clearInterval(R.g && R.g.tm); const l = R.link; R = null; l && l.close(); } FX.music(false); };
QB.onStop.push(() => { if (R) { clearInterval(R.g && R.g.tm); R.link && R.link.close(); R = null; } });
const myName = () => QB.myName ? QB.myName() : 'Player';
const myAv = () => QB.me ? QB.me() : { k: 'e', v: '🦊' };

QB.versus = function () {
  modal.hidden = false;
  modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><h2>🌐 Online Multiplayer</h2><p class="sub">Play with friends on other devices. One player creates a room and shares the 5-letter code.</p>
  <div class="me" style="margin-bottom:10px">${QB.avatar(myAv(), 44)}<div><b>${esc(myName())}</b><small>Change your name and avatar in your profile</small></div></div>
  <div class="acts" style="justify-content:flex-start"><button class="btn" id="mk">Create room</button></div>
  <div class="row"><label>Join with a code</label><span style="display:flex;gap:8px"><input class="search" id="jc" style="margin:0;width:120px;text-transform:uppercase" maxlength="5" placeholder="ABC12"><button class="btn ghost" id="jn">Join</button></span></div>
  <p class="sub" style="margin:12px 0 0;font-size:.85rem">Uses a free public connection service only to link players. No account. Your progress stays on your device.</p>
  <div class="acts"><button class="btn ghost" id="cx">Close</button></div></div>`;
  $('#cx').onclick = close;
  $('#mk').onclick = () => { close(); create(); };
  $('#jn').onclick = () => { const c = $('#jc').value.trim().toUpperCase(); if (c.length < 4) return toast('Enter the room code first.'); close(); join(c); };
};

/* ---------- state helpers ---------- */
const newPlayer = (id, name, av, k) => ({ id, name: String(name || 'Player').slice(0, 14), av: QB.cleanAvatar(av || { k: 'e', v: FALLBACK[k % 6] }), i: 0, score: 0, correct: 0, wrong: 0, dmg: 0, heal: 0, done: false, hold: 0 });
const rst = p => Object.assign(p, { i: 0, score: 0, correct: 0, wrong: 0, dmg: 0, heal: 0, done: false, hold: 0 });
const defCfg = () => ({ mode: 'race', sids: SUBJ.map(s => s.id), n: 10, pu: 'classic', puOn: { double: 1, shield: 1, freeze: 1, steal: 1, fifty: 1, heal: 1 }, timer: 0, speed: 1, boss: 0 });
const sendTo = (id, m) => { if (!R) return; if (R.host) { if (id === R.id) onFx(m); else R.link.send(id, m); } else R.link.send(R.hostId, { t: 'to', to: id, m }); };

/* ---------- host ---------- */
function create() {
  QB.stop(); QB.Q = null;
  R = { host: true, code: code5(), id: null, players: {}, cfg: defCfg(), g: null, state: 'lobby', link: null, order: [] };
  lobbyView('Creating room…');
  link(R.code, true, {
    ready: id => { R.id = id; R.players[id] = newPlayer(id, myName(), myAv(), 0); lobbyView(); },
    peer: () => {}, gone: id => { if (!R) return; delete R.players[id]; if (R.state === 'lobby') { lobbyView(); } else { checkEnd(); relay(); } broadcastLobby(); },
    msg: (id, m) => hostMsg(id, m), fail: t => failView(t)
  }).then(l => { if (R) R.link = l; });
}
function broadcastLobby() { if (R && R.link) R.link.all({ t: 'lobby', players: Object.values(R.players).map(p => ({ id: p.id, name: p.name, av: p.av })), cfg: R.cfg, host: R.id }); }
function hostMsg(id, m) {
  if (!R) return;
  if (m.t === 'hi') {
    const k = Object.keys(R.players).length;
    if (R.state !== 'lobby' || k >= 6) { R.link.send(id, { t: 'full' }); return; }
    R.players[id] = newPlayer(id, m.name, m.av, k); lobbyView(); broadcastLobby();
  } else if (m.t === 'p' && R.players[id]) {
    Object.assign(R.players[id], { i: m.i, score: m.score, correct: m.correct, wrong: m.wrong, dmg: m.dmg, heal: m.heal, done: !!m.done, hold: m.hold, ms: m.ms });
    if (m.done && !R.order.includes(id)) R.order.push(id);
    relay(); checkEnd();
  } else if (m.t === 'to') { if (m.to === R.id) onFx(m.m); else R.link.send(m.to, m.m); }
}
function team() {
  const ps = Object.values(R.players), dmg = ps.reduce((n, p) => n + (p.dmg || 0), 0), wrong = ps.reduce((n, p) => n + (p.wrong || 0), 0), heal = ps.reduce((n, p) => n + (p.heal || 0), 0);
  const max = R.bossMax || 1, H = R.hearts || 5;
  return { hp: Math.max(0, max - dmg), max, hearts: Math.max(0, Math.min(H, H - wrong + heal)), H };
}
function relay() {
  if (!R || !R.host) return;
  const ps = Object.values(R.players).map(p => ({ id: p.id, name: p.name, av: p.av, i: p.i, score: p.score, correct: p.correct, wrong: p.wrong, dmg: p.dmg, done: p.done, hold: p.hold }));
  const t = R.cfg.mode === 'raid' ? team() : null;
  R.link.all({ t: 'st', ps, team: t }); R.view = ps; R.team = t; boardUpdate();
}
function startGame() {
  const c = R.cfg, base = shuf(allQ().filter(q => c.sids.includes(q.sid))); let pool = [];
  while (pool.length < c.n) pool = pool.concat(shuf(base));
  const qs = pool.slice(0, c.n).map(q => ({ q: q.q, ord: shuf([0, 1, 2, 3]) }));
  const ps = Object.values(R.players), bl = QB.BOSS_LIST ? QB.BOSS_LIST() : [], b = bl[c.boss % Math.max(bl.length, 1)] || { name: 'Boss', icon: '👾' };
  R.bossMax = Math.max(8, Math.ceil(ps.length * c.n * .6)); R.hearts = Math.max(5, 3 + ps.length * 2);
  R.state = 'play'; R.order = []; ps.forEach(rst);
  const go = { t: 'go', qs, cfg: c, boss: { name: b.name, icon: b.icon, art: b.art, col: b.col }, bossMax: R.bossMax, hearts: R.hearts };
  R.link.all(go); begin(go);
}
function checkEnd() {
  if (!R || !R.host || R.state !== 'play') return;
  const ps = Object.values(R.players), c = R.cfg, t = c.mode === 'raid' ? team() : null;
  const over = c.mode === 'raid' ? (t.hp <= 0 || t.hearts <= 0 || ps.every(p => p.done)) : ps.every(p => p.done);
  if (!over) return;
  let res;
  if (c.mode === 'raid') res = { mode: 'raid', win: t.hp <= 0, team: t, rows: ps.map(p => ({ id: p.id, name: p.name, av: p.av, dmg: p.dmg, correct: p.correct, score: p.score })).sort((a, b) => b.dmg - a.dmg) };
  else res = { mode: 'race', rows: ps.map(p => ({ id: p.id, name: p.name, av: p.av, score: p.score + (R.order[0] === p.id ? 100 : 0), correct: p.correct, first: R.order[0] === p.id })).sort((a, b) => b.score - a.score) };
  R.link.all({ t: 'end', res }); R.state = 'end'; showResults(res);
}

/* ---------- guest ---------- */
function join(code) {
  QB.stop(); QB.Q = null;
  R = { host: false, code, id: null, hostId: null, players: {}, cfg: defCfg(), g: null, state: 'lobby', link: null };
  lobbyView('Connecting to room ' + code + '…');
  link(code, false, {
    ready: (id, hid) => { R.id = id; R.hostId = hid; R.link.send(hid, { t: 'hi', name: myName(), av: myAv() }); },
    peer: () => {}, gone: () => { if (R && R.state !== 'end') { toast('The host left the room.'); leave(); QB.go('arena'); } },
    msg: (id, m) => guestMsg(m), fail: t => failView(t)
  }).then(l => { if (R) R.link = l; });
}
function guestMsg(m) {
  if (!R) return;
  if (m.t === 'lobby') { R.players = {}; m.players.forEach(p => R.players[p.id] = { ...p, av: QB.cleanAvatar(p.av) }); R.cfg = m.cfg; R.hostId = m.host; if (R.state === 'end') { R.state = 'lobby'; R.g = null; R.view = null; R.team = null; } if (R.state === 'lobby') lobbyView(); }
  else if (m.t === 'full') failView('That room is full or already started.');
  else if (m.t === 'go') { R.state = 'play'; R.cfg = m.cfg; begin(m); }
  else if (m.t === 'st') { R.view = m.ps.map(p => ({ ...p, av: QB.cleanAvatar(p.av) })); R.team = m.team; boardUpdate(); }
  else if (m.t === 'fx') onFx(m);
  else if (m.t === 'end') { R.state = 'end'; showResults(m.res); }
}

/* ---------- lobby ---------- */
function failView(t) {
  leave();
  app.innerHTML = `<div class="panel" style="text-align:center"><h2>Could not connect</h2><p class="sub">${esc(t)}</p><button class="btn" id="bk">Back to the arena</button></div>`;
  $('#bk').onclick = () => QB.go('arena');
}
const puLabel = c => c.pu === 'off' ? 'Off' : (c.pu === 'chaos' ? 'Chaos' : 'Classic') + ' · ' + POOL[c.mode].filter(k => c.puOn[k]).map(k => PU[k][0]).join(' ');
function lobbyView(msg) {
  if (!R) return;
  const ps = Object.values(R.players), c = R.cfg, host = R.host && !msg, bl = QB.BOSS_LIST ? QB.BOSS_LIST() : [];
  const chips = (arr, cur, key, fmt) => `<div class="chips">${arr.map(v => `<button class="chip ${cur === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${fmt ? fmt(v) : v}</button>`).join('')}</div>`;
  app.innerHTML = `<div class="panel"><h2>${R.host ? 'Your room' : 'Room lobby'}</h2>
  ${msg ? `<p class="sub">${esc(msg)}</p>` : R.host ? `<p class="sub">Share this code. Friends open MyBadQuiz → Arena → Online Multiplayer → Join.</p><div class="rcode" id="rc" title="Click to copy">${R.code}</div>` : `<p class="sub">Connected to <b>${esc(R.code)}</b>. Waiting for the host to start.</p>`}
  <div class="plist">${ps.map((p, i) => `<div class="pl" style="animation-delay:${i * 60}ms">${QB.avatar(p.av, 36)}<b>${esc(p.name)}</b>${p.id === (R.host ? R.id : R.hostId) ? '<small>host</small>' : ''}</div>`).join('') || '<div class="empty">Waiting…</div>'}</div>
  ${host ? `<div class="row"><label>Mode</label>${chips(['race', 'raid'], c.mode, 'mode', v => v === 'race' ? '🏁 Race' : '👾 Boss Raid (co-op)')}</div>
  ${c.mode === 'raid' ? `<div class="row"><label>Raid boss</label><div class="chips">${bl.map((b, i) => `<button class="chip ${c.boss === i ? 'on' : ''}" data-k="boss" data-v="${i}">${b.icon} ${esc(b.name)}</button>`).join('')}</div></div>` : ''}
  <div class="row"><label>Subjects</label><div class="chips">${subjChips(new Set(c.sids))}</div></div>
  <div class="row"><label>Questions</label>${chips(COUNTS, c.n, 'n')}</div>
  <div class="row"><label>Power-ups<small>Earned by answering correctly</small></label>${chips(['off', 'classic', 'chaos'], c.pu, 'pu', v => v === 'off' ? 'Off' : v === 'classic' ? 'Classic (every 3 in a row)' : 'Chaos (random drops)')}</div>
  ${c.pu !== 'off' ? `<div class="row"><label>Allowed power-ups</label><div class="chips">${POOL[c.mode].map(k => `<button class="chip ${c.puOn[k] ? 'on' : ''}" data-k="pk" data-v="${k}" title="${PU[k][2]}">${PU[k][0]} ${PU[k][1]}</button>`).join('')}</div></div>` : ''}
  <div class="row"><label>Timer per question</label>${chips([0, 10, 20, 30], c.timer, 'timer', v => v ? v + 's' : 'Off')}</div>
  ${c.mode === 'race' ? `<div class="row"><label>Speed bonus<small>Faster answers score more</small></label><button class="sw ${c.speed ? 'on' : ''}" data-k="speed" data-v="${c.speed ? 0 : 1}"></button></div>` : ''}` :
  (!msg ? `<div class="sum"><span class="pill">${c.mode === 'raid' ? '👾 Boss Raid' : '🏁 Race'}</span><span class="pill"><b>${c.n}</b> questions</span><span class="pill">Power-ups: ${esc(puLabel(c))}</span><span class="pill">Timer: ${c.timer ? c.timer + 's' : 'off'}</span></div>` : '')}
  <div class="acts" style="justify-content:flex-start">${host ? `<button class="btn" id="go" ${c.sids.length ? '' : 'disabled'}>Start (${ps.length} player${ps.length > 1 ? 's' : ''})</button>` : ''}<button class="btn ghost" id="lv">Leave</button></div></div>`;
  $('#lv').onclick = () => { leave(); QB.go('arena'); };
  if (host) {
    const rc = $('#rc'); if (rc) rc.onclick = () => { try { navigator.clipboard.writeText(R.code); } catch (e) {} toast('Room code copied'); };
    app.querySelectorAll('.chip[data-id]').forEach(b => b.onclick = () => { const i = c.sids.indexOf(b.dataset.id); i < 0 ? c.sids.push(b.dataset.id) : c.sids.splice(i, 1); broadcastLobby(); lobbyView(); });
    app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k, v = b.dataset.v;
      if (k === 'pk') c.puOn[v] = c.puOn[v] ? 0 : 1; else if (k === 'mode' || k === 'pu') c[k] = v; else c[k] = +v;
      broadcastLobby(); lobbyView();
    });
    $('#go').onclick = startGame;
  }
}

/* ---------- gameplay ---------- */
function begin(m) {
  const map = new Map(allQ().map(q => [q.q, q])), c = m.cfg;
  const list = m.qs.map(x => { const q = map.get(x.q); return q ? { ...q, ord: x.ord } : null; }).filter(Boolean);
  if (!list.length) return failView('Your copy of the site is missing these questions. Everyone must use the same version.');
  R.c = c; R.boss = m.boss; R.bossMax = m.bossMax; R.hearts = m.hearts; R.state = 'play'; R.order = R.order || [];
  R.g = { list, i: 0, score: 0, correct: 0, wrong: 0, dmg: 0, heal: 0, streak: 0, inv: [], dbl: false, shield: false, frozen: 0, t0: Date.now(), qt: 0, picked: null, tm: null, gone: [], lastHp: m.bossMax };
  app.innerHTML = `<div class="quiz race"><div id="rh"></div><div class="rb" id="rb"></div><div id="rq"></div><div class="pus" id="ru"></div></div>`;
  if (QB.wake) QB.wake(true);
  FX.sfx('go'); FX.music(true); FX.intensity(1); headInit(); headUpdate(); boardUpdate(); question(); pusPaint();
  if (!R.host) R.view = null;
}
function headInit() {
  const el = $('#rh'); if (!el || !R || R.c.mode !== 'raid') return;
  el.innerHTML = `<div class="raidhud"><canvas id="rbc"></canvas><div class="rinfo"><b>${esc(R.boss.name)}</b> <small id="rhp"></small><div class="hpbar"><i id="rbar" style="width:100%"></i></div><div class="hearts" id="rhr"></div></div></div>`;
  R.art = window.BossArt ? BossArt.mount($('#rbc'), { art: R.boss.art || 'eye', col: R.boss.col || '#4fd1c5' }) : null; R.lastH = null;
}
function headUpdate() {
  if (!R || !R.c || R.c.mode !== 'raid' || !$('#rbar')) return;
  const t = R.team || { hp: R.bossMax, max: R.bossMax, hearts: R.hearts, H: R.hearts }, g = R.g;
  if (g && t.hp < g.lastHp && R.art) R.art.hit(); if (g) g.lastHp = t.hp;
  if (R.lastH != null && t.hearts < R.lastH && R.art) { R.art.atk(); FX.sfx('hurt'); }
  R.lastH = t.hearts; if (t.hp <= 0 && R.art) R.art.kill();
  $('#rbar').style.width = t.hp / t.max * 100 + '%'; $('#rhp').textContent = t.hp + '/' + t.max + ' HP';
  $('#rhr').innerHTML = Array.from({ length: t.H }, (_, i) => `<span class="hrt ${i < t.hearts ? '' : 'lost'}">❤</span>`).join('');
}
function boardUpdate() {
  headUpdate();
  const el = $('#rb'); if (!el || !R || !R.c) return;
  const raid = R.c.mode === 'raid', ps = (R.view || Object.values(R.players)).slice().sort((a, b) => raid ? (b.dmg || 0) - (a.dmg || 0) : b.score - a.score), n = R.g ? R.g.list.length : R.cfg.n;
  el.innerHTML = ps.map(p => `<div class="rp ${p.id === R.id ? 'me' : ''}">${QB.avatar(p.av, 30)}<div class="rg"><b>${esc(p.name)}${p.id === R.id ? ' (you)' : ''}</b><div class="mini"><i style="width:${(p.i || 0) / n * 100}%"></i></div></div><span class="hold">${'●'.repeat(Math.min(p.hold || 0, 3))}</span><span class="rs">${raid ? (p.dmg || 0) + ' ⚔' : p.score || 0}</span></div>`).join('');
}
function question() {
  const G = R.g, q = G.list[G.i]; G.qt = Date.now(); G.picked = null; G.gone = [];
  $('#rq').innerHTML = `<div class="qcard in ${Date.now() < G.frozen ? 'frozen' : ''}" id="qc"><span class="tag">Question ${G.i + 1} of ${G.list.length} · ${esc(sub(q.sid).code)}</span>${R.c.timer ? '<div class="qbar" style="margin:8px 0"><i id="tb" style="width:100%"></i></div>' : ''}<h2>${esc(q.q)}</h2><div class="opts fresh">${q.ord.map((oi, p) => `<button class="opt" data-p="${p}"><b>${'ABCD'[p]}</b><span>${esc(q.o[oi])}</span></button>`).join('')}</div><div class="fb" id="rf"></div><div class="frz">❄️ Frozen!</div></div>`;
  $('#rq').querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.p));
  clearInterval(G.tm);
  if (R.c.timer) { G.tm = setInterval(() => { const el = $('#tb'); const left = R.c.timer - (Date.now() - G.qt) / 1000; if (el) el.style.width = Math.max(left, 0) / R.c.timer * 100 + '%'; if (left <= 0 && G.picked == null) answer(-1); }, 200); }
  if (Date.now() < G.frozen) setTimeout(() => { const c = $('#qc'); if (c) c.classList.remove('frozen'); }, G.frozen - Date.now());
}
function grant() {
  const G = R.g, c = R.c; if (c.pu === 'off') return;
  const pool = POOL[c.mode].filter(k => c.puOn[k]); if (!pool.length || G.inv.length >= (c.pu === 'chaos' ? 3 : 2)) return;
  if (c.pu === 'classic' ? G.streak % 3 === 0 : Math.random() < .35) { const k = pool[Math.random() * pool.length | 0]; G.inv.push(k); toast(PU[k][0] + ' Power-up: ' + PU[k][1] + ' (press ' + KEYS[G.inv.length - 1].toUpperCase() + ')'); FX.sfx('coin'); pusPaint(); }
}
function answer(p) {
  const G = R.g, q = G.list[G.i], c = R.c, raid = c.mode === 'raid';
  if (!q || G.picked != null || G.done || Date.now() < G.frozen) return; G.picked = p; clearInterval(G.tm);
  const ok = p >= 0 && q.ord[p] === q.a, secs = (Date.now() - G.qt) / 1000; let pts = 0, dbl = false;
  QB.track(q.q, ok); QB.addXP(ok ? 10 : 2);
  if (ok) {
    G.correct++; G.streak++; dbl = G.dbl; G.dbl = false; G.dmg += dbl ? 2 : 1;
    pts = (100 + (c.speed ? Math.max(0, Math.round((15 - secs) * 4)) : 0)) * (dbl ? 2 : 1); G.score += pts; grant();
  } else {
    G.streak = 0; if (raid && G.shield) { G.shield = false; toast('🛡️ Shield absorbed your mistake'); } else G.wrong++;
  }
  FX.sfx(ok ? 'ok' : 'bad'); if (ok) FX.haptic(15);
  $('#rq').querySelectorAll('.opt').forEach((b, i) => { b.classList.add('lock'); if (q.ord[i] === q.a) b.classList.add('ok'); else if (i === p) b.classList.add('bad'); else b.classList.add('dim'); });
  $('#rf').className = 'fb ' + (ok ? 'ok' : 'bad'); $('#rf').textContent = ok ? (raid ? '✓ Hit! −' + (dbl ? 2 : 1) + ' boss HP' : '✓ +' + pts) : (p === -1 ? '⏱ Time up. ' : '✗ ') + 'Correct: ' + 'ABCD'[q.ord.indexOf(q.a)];
  G.i++; G.done = G.i >= G.list.length; sendProg(G.done); pusPaint();
  setTimeout(() => { if (!R || !R.g || R.state !== 'play') return; if (G.done) { const rq = $('#rq'); if (rq) rq.innerHTML = '<div class="panel" style="text-align:center"><h2>Finished!</h2><p class="sub">Waiting for the others…</p></div>'; } else question(); }, 900);
}
function sendProg(done) {
  const G = R.g, m = { t: 'p', i: G.i, score: G.score, correct: G.correct, wrong: G.wrong, dmg: G.dmg, heal: G.heal, done, hold: G.inv.length, ms: Date.now() - G.t0 };
  if (R.host) { Object.assign(R.players[R.id], m); if (done && !R.order.includes(R.id)) R.order.push(R.id); relay(); checkEnd(); } else R.link.send(R.hostId, m);
}
/* ---------- power-ups ---------- */
function pusPaint() {
  const el = $('#ru'); if (!el || !R || !R.g) return;
  const G = R.g; el.innerHTML = G.inv.length || G.dbl || G.shield ? `<div class="pubar">${G.inv.map((k, i) => `<button class="pu" data-i="${i}" title="${PU[k][2]}"><span>${PU[k][0]}</span><b>${PU[k][1]}</b><kbd>${KEYS[i].toUpperCase()}</kbd></button>`).join('')}${G.dbl ? '<span class="pill">⚡ x2 armed</span>' : ''}${G.shield ? '<span class="pill">🛡️ shield on</span>' : ''}</div>` : '';
  el.querySelectorAll('.pu').forEach(b => b.onclick = () => usePU(+b.dataset.i));
}
function rival() {
  const ps = (R.view || Object.values(R.players)).filter(p => p.id !== R.id).sort((a, b) => (b.score || 0) - (a.score || 0)); return ps[0] ? ps[0].id : null;
}
function usePU(i) {
  const G = R && R.g; if (!G || !G.inv[i] || R.state !== 'play') return; const k = G.inv[i];
  if ((k === 'freeze' || k === 'steal') && !rival()) return toast('No rival to target yet.');
  if (k === 'fifty') { if (G.picked != null) return; const q = G.list[G.i], wrong = q.ord.map((oi, p) => oi === q.a ? -1 : p).filter(p => p >= 0 && !G.gone.includes(p)); if (wrong.length < 2) return; G.gone = shuf(wrong).slice(0, 2); G.gone.forEach(p => { const b = $('#rq').querySelector(`.opt[data-p="${p}"]`); if (b) b.classList.add('gone'); }); }
  else if (k === 'double') { G.dbl = true; } else if (k === 'shield') { G.shield = true; } else if (k === 'heal') { G.heal++; }
  else if (k === 'freeze') sendTo(rival(), { t: 'fx', k: 'freeze', from: R.id });
  else if (k === 'steal') sendTo(rival(), { t: 'fx', k: 'steal', from: R.id });
  G.inv.splice(i, 1); FX.sfx('claim'); pusPaint(); sendProg(G.done);
}
function onFx(m) {
  const G = R && R.g; if (!G) return;
  if (m.k === 'freeze' || m.k === 'steal') {
    if (G.shield) { G.shield = false; toast('🛡️ Your shield blocked a ' + m.k + '!'); FX.sfx('equip'); sendTo(m.from, { t: 'fx', k: 'blocked', from: R.id }); pusPaint(); return; }
    if (m.k === 'freeze') { G.frozen = Date.now() + 3000; const c = $('#qc'); if (c) c.classList.add('frozen'); setTimeout(() => { const c2 = $('#qc'); if (c2) c2.classList.remove('frozen'); }, 3000); toast('❄️ You were frozen for 3 seconds!'); FX.sfx('freezeHit'); }
    else { const n = Math.min(60, G.score); G.score -= n; toast('💣 A rival stole ' + n + ' points!'); FX.sfx('hurt'); sendTo(m.from, { t: 'fx', k: 'loot', n, from: R.id }); sendProg(G.done); }
  } else if (m.k === 'loot') { G.score += m.n; toast('💣 You stole ' + m.n + ' points!'); FX.sfx('coin'); sendProg(G.done); }
  else if (m.k === 'blocked') toast('🛡️ Your sabotage was blocked.');
}
document.addEventListener('keydown', e => {
  if (!R || R.state !== 'play' || !R.g || /INPUT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey) return;
  const k = e.key.toLowerCase();
  if (/^[1-4]$/.test(k)) { const b = $('#rq .opt[data-p="' + (k - 1) + '"]'); if (b && !b.classList.contains('gone')) answer(+k - 1); }
  else if (KEYS.includes(k)) usePU(KEYS.indexOf(k));
});

/* ---------- results ---------- */
function showResults(res) {
  FX.music(false); const raid = res.mode === 'raid', me = res.rows.findIndex(r => r.id === R.id), rank = me + 1, G = R.g || { list: [], correct: 0 };
  const win = raid ? res.win : rank === 1 && res.rows.length > 1;
  FX.sfx(win ? 'win' : 'level'); if (win) FX.confetti();
  QB.award('rival'); if (win) QB.award('champion'); QB.addXP(win ? 60 : 25); QB.ev('race'); QB.addCoins(win ? 30 : 10);
  const h = store.get('qb_history', []); h.unshift({ sid: 'mix', title: (raid ? 'Boss raid · ' + (res.win ? 'victory' : 'defeat') : 'Online race · ' + (res.rows.length > 1 ? '#' + rank + ' of ' + res.rows.length : 'solo')), score: G.correct, total: G.list.length, pct: Math.round(G.correct / Math.max(G.list.length, 1) * 100), secs: Math.round((Date.now() - (G.t0 || Date.now())) / 1000), date: Date.now() }); store.set('qb_history', h.slice(0, 100));
  const medal = ['🥇', '🥈', '🥉'];
  app.innerHTML = `<div class="res"><h2>${raid ? (res.win ? '🏆 The raid won!' : '💀 The boss won') : (win ? 'You won the race!' : 'Race finished')}</h2>
  <p>${raid ? (res.win ? 'Your team defeated ' + esc(R.boss.name) + '.' : esc(R.boss.name) + ' survived with ' + res.team.hp + ' HP.') : (win ? 'First place. Nicely done.' : 'You placed #' + rank + ' of ' + res.rows.length + '.')}</p>
  <div class="podium">${res.rows.map((r, i) => `<div class="pdr ${r.id === R.id ? 'me' : ''}" style="animation-delay:${i * 120}ms"><span class="md">${medal[i] || i + 1}</span>${QB.avatar(r.av, 38)}<b>${esc(r.name)}</b><small>${r.correct} correct${r.first ? ' · finish bonus' : ''}${raid && i === 0 ? ' · MVP' : ''}</small><span class="rs">${raid ? r.dmg + ' ⚔' : r.score}</span></div>`).join('')}</div>
  <div class="acts">${R.host ? '<button class="btn" id="rm">Back to lobby</button>' : ''}<button class="btn ghost" id="lv">Leave</button></div></div>`;
  $('#lv').onclick = () => { leave(); QB.go('arena'); };
  const rm = $('#rm'); if (rm) rm.onclick = () => { R.state = 'lobby'; R.g = null; R.view = null; R.team = null; Object.values(R.players).forEach(rst); broadcastLobby(); lobbyView(); };
}
})();
