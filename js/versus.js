/* MyBadQuiz – Online Race (website-to-website). Peer-to-peer via PeerJS (public signaling server, loaded from a CDN).
   No account and no backend: one player creates a room code, friends join with it, everyone answers the same questions.
   Works on GitHub Pages. Needs internet. Needs QB (js/app.js) and FX (js/fx.js). */
(() => {
const { $, esc, shuf, app, modal, FX, sub, allQ, store, toast, fmt, close, subjChips, SUBJ } = QB;
const PEER_SRC = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const AV = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐯'];
let R = null;
const code5 = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
const loadPeer = () => new Promise(res => {
  if (window.Peer) return res(true);
  const s = document.createElement('script'); s.src = PEER_SRC; s.onload = () => res(!!window.Peer); s.onerror = () => res(false); document.head.append(s); setTimeout(() => res(!!window.Peer), 7000);
});
/* link: tiny transport layer. h = { ready, peer(id), msg(id,m), gone(id), fail(text) } */
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
QB.onStop.push(() => { if (R && R.link) { R.link.close(); } R = null; });
const myName = () => (store.get('qb_set', {}).name || '').trim() || 'Player' + (Math.random() * 90 + 10 | 0);

QB.versus = function () {
  const name = myName();
  modal.hidden = false;
  modal.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><h2>🏁 Online Race</h2><p class="sub">Race friends on another device or browser. Everyone gets the same questions. Faster correct answers score more.</p>
  <div class="row" style="border:0"><label>Your name</label><input class="search" id="nm" style="margin:0;width:180px" maxlength="14" value="${esc(name)}"></div>
  <div class="acts" style="justify-content:flex-start"><button class="btn" id="mk">Create room</button></div>
  <div class="row"><label>Join with a code</label><span style="display:flex;gap:8px"><input class="search" id="jc" style="margin:0;width:120px;text-transform:uppercase" maxlength="5" placeholder="ABC12"><button class="btn ghost" id="jn">Join</button></span></div>
  <p class="sub" style="margin:12px 0 0;font-size:.85rem">Uses a free public connection service only to link players. No account, and your scores stay on your device.</p>
  <div class="acts"><button class="btn ghost" id="cx">Close</button></div></div>`;
  $('#cx').onclick = close;
  $('#mk').onclick = () => { const nm = $('#nm').value.trim() || name; close(); create(nm); };
  $('#jn').onclick = () => { const c = $('#jc').value.trim().toUpperCase(); if (c.length < 4) return toast('Enter the room code first.'); const nm = $('#nm').value.trim() || name; close(); join(c, nm); };
};

/* ---------- host ---------- */
function create(nm) {
  QB.stop(); QB.Q = null;
  const code = code5();
  R = { host: true, code, name: nm, id: null, players: {}, sids: SUBJ.map(s => s.id), n: 10, g: null, state: 'lobby', link: null };
  lobbyView('Creating room…');
  link(code, true, {
    ready: id => { R.id = id; R.players[id] = { id, name: nm, av: AV[0], i: 0, score: 0, correct: 0, done: false }; lobbyView(); },
    peer: id => {}, gone: id => { if (!R) return; delete R.players[id]; if (R.state === 'lobby') lobbyView(); else { checkDone(); boardUpdate(); } broadcastLobby(); },
    msg: (id, m) => hostMsg(id, m), fail: t => failView(t)
  }).then(l => { if (R) R.link = l; });
}
function broadcastLobby() { if (!R || !R.link) return; R.link.all({ t: 'lobby', players: Object.values(R.players).map(p => ({ id: p.id, name: p.name, av: p.av })), n: R.n, sids: R.sids, host: R.id }); }
function hostMsg(id, m) {
  if (!R) return;
  if (m.t === 'hi') { const k = Object.keys(R.players).length; if (R.state !== 'lobby' || k >= 6) { R.link.send(id, { t: 'full' }); return; } R.players[id] = { id, name: String(m.name || 'Player').slice(0, 14), av: AV[k % AV.length], i: 0, score: 0, correct: 0, done: false }; lobbyView(); broadcastLobby(); }
  else if (m.t === 'p' && R.players[id]) { Object.assign(R.players[id], { i: m.i, score: m.score, correct: m.correct, done: !!m.done, ms: m.ms }); if (m.done && !R.order.includes(id)) R.order.push(id); relay(); checkDone(); }
}
function relay() { if (!R || !R.host) return; const ps = Object.values(R.players).map(p => ({ id: p.id, name: p.name, av: p.av, i: p.i, score: p.score, correct: p.correct, done: p.done })); R.link.all({ t: 'st', ps }); R.view = ps; boardUpdate(); }
function startRace() {
  const pool = shuf(allQ().filter(q => R.sids.includes(q.sid))).slice(0, R.n);
  const qs = pool.map(q => ({ q: q.q, ord: shuf([0, 1, 2, 3]) }));
  R.state = 'play'; R.order = []; Object.values(R.players).forEach(p => Object.assign(p, { i: 0, score: 0, correct: 0, done: false }));
  R.link.all({ t: 'go', qs }); begin(qs);
}
function checkDone() {
  if (!R || !R.host || R.state !== 'play') return;
  const ps = Object.values(R.players); if (!ps.every(p => p.done)) return;
  const res = ps.map(p => ({ id: p.id, name: p.name, av: p.av, score: p.score + (R.order[0] === p.id ? 100 : 0), correct: p.correct, first: R.order[0] === p.id })).sort((a, b) => b.score - a.score);
  R.link.all({ t: 'end', res }); R.state = 'end'; showResults(res);
}

/* ---------- guest ---------- */
function join(code, nm) {
  QB.stop(); QB.Q = null;
  R = { host: false, code, name: nm, id: null, hostId: null, players: {}, n: 10, state: 'lobby', link: null };
  lobbyView('Connecting to room ' + code + '…');
  link(code, false, {
    ready: (id, hid) => { R.id = id; R.hostId = hid; R.link.send(hid, { t: 'hi', name: nm }); },
    peer: () => {}, gone: () => { if (R && R.state !== 'end') { toast('The host left the room.'); const l = R.link; R = null; l && l.close(); QB.go('arena'); } },
    msg: (id, m) => guestMsg(m), fail: t => failView(t)
  }).then(l => { if (R) { R.link = l; if (l && l.ready) {} } });
}
function guestMsg(m) {
  if (!R) return;
  if (m.t === 'lobby') { R.players = {}; m.players.forEach(p => R.players[p.id] = p); R.n = m.n; R.sids = m.sids; R.hostId = m.host; if (R.state === 'end') { R.state = 'lobby'; R.g = null; R.view = null; } if (R.state === 'lobby') lobbyView(); }
  else if (m.t === 'full') failView('That room is full or already started.');
  else if (m.t === 'go') { R.state = 'play'; begin(m.qs); }
  else if (m.t === 'st') { R.view = m.ps; boardUpdate(); }
  else if (m.t === 'end') { R.state = 'end'; showResults(m.res); }
}

/* ---------- views ---------- */
function failView(t) {
  const l = R && R.link; R = null; l && l.close();
  app.innerHTML = `<div class="panel" style="text-align:center"><h2>Could not connect</h2><p class="sub">${esc(t)}</p><button class="btn" id="bk">Back to the arena</button></div>`;
  $('#bk').onclick = () => QB.go('arena');
}
function lobbyView(msg) {
  if (!R) return;
  const ps = Object.values(R.players);
  app.innerHTML = `<div class="panel"><h2>${R.host ? 'Your race room' : 'Race lobby'}</h2>
  ${msg ? `<p class="sub">${esc(msg)}</p>` : R.host ? `<p class="sub">Share this code. Friends open MyBadQuiz, go to Arena, Online Race, Join.</p><div class="rcode" id="rc" title="Click to copy">${R.code}</div>` : `<p class="sub">Connected to room <b>${esc(R.code)}</b>. Waiting for the host to start.</p>`}
  <div class="plist">${ps.map((p, i) => `<div class="pl" style="animation-delay:${i * 60}ms"><span class="av">${p.av}</span><b>${esc(p.name)}</b>${p.id === (R.host ? R.id : R.hostId) ? '<small>host</small>' : ''}</div>`).join('') || '<div class="empty">Waiting…</div>'}</div>
  ${R.host && !msg ? `<div class="row"><label>Subjects</label><div class="chips">${subjChips(new Set(R.sids))}</div></div>
  <div class="row"><label>Questions</label><div class="chips">${[5, 10, 15, 20].map(n => `<button class="chip ${R.n === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div></div>` : ''}
  <div class="acts" style="justify-content:flex-start">${R.host && !msg ? `<button class="btn" id="go" ${R.sids.length ? '' : 'disabled'}>Start race (${ps.length} player${ps.length > 1 ? 's' : ''})</button>` : ''}<button class="btn ghost" id="lv">Leave</button></div></div>`;
  $('#lv').onclick = () => { const l = R && R.link; R = null; l && l.close(); QB.go('arena'); };
  if (R.host && !msg) {
    const rc = $('#rc'); if (rc) rc.onclick = () => { try { navigator.clipboard.writeText(R.code); } catch (e) {} toast('Room code copied'); };
    app.querySelectorAll('.chip[data-id]').forEach(c => c.onclick = () => { const i = R.sids.indexOf(c.dataset.id); i < 0 ? R.sids.push(c.dataset.id) : R.sids.splice(i, 1); broadcastLobby(); lobbyView(); });
    app.querySelectorAll('.chip[data-n]').forEach(c => c.onclick = () => { R.n = +c.dataset.n; broadcastLobby(); lobbyView(); });
    $('#go').onclick = startRace;
  }
}
function begin(qs) {
  const map = new Map(allQ().map(q => [q.q, q]));
  const list = qs.map(x => { const q = map.get(x.q); return q ? { ...q, ord: x.ord } : null; }).filter(Boolean);
  R.g = { list, i: 0, score: 0, correct: 0, t0: Date.now(), qt: Date.now(), done: false, picked: null };
  if (!list.length) return failView('Your copy of the site is missing these questions. Make sure everyone uses the same version.');
  app.innerHTML = `<div class="quiz race"><div class="rb" id="rb"></div><div id="rq"></div></div>`;
  FX.sfx('go'); FX.music(true); FX.intensity(1); boardUpdate(); question();
}
function boardUpdate() {
  const el = $('#rb'); if (!el || !R) return;
  const ps = (R.view || Object.values(R.players)).slice().sort((a, b) => b.score - a.score), n = R.g ? R.g.list.length : R.n;
  el.innerHTML = ps.map((p, k) => `<div class="rp ${p.id === R.id ? 'me' : ''}"><span class="av">${p.av}</span><div class="rg"><b>${esc(p.name)}${p.id === R.id ? ' (you)' : ''}</b><div class="mini"><i style="width:${(p.i || 0) / n * 100}%"></i></div></div><span class="rs">${p.score || 0}</span></div>`).join('');
}
function question() {
  const G = R.g, q = G.list[G.i]; G.qt = Date.now(); G.picked = null;
  $('#rq').innerHTML = `<div class="qcard in"><span class="tag">Question ${G.i + 1} of ${G.list.length} · ${esc(sub(q.sid).code)}</span><h2>${esc(q.q)}</h2><div class="opts fresh">${q.ord.map((oi, p) => `<button class="opt" data-p="${p}"><b>${'ABCD'[p]}</b><span>${esc(q.o[oi])}</span></button>`).join('')}</div><div class="fb" id="rf"></div></div>`;
  $('#rq').querySelectorAll('.opt').forEach(b => b.onclick = () => answer(+b.dataset.p));
}
function answer(p) {
  const G = R.g, q = G.list[G.i]; if (G.picked != null || G.done) return; G.picked = p;
  const ok = q.ord[p] === q.a, secs = (Date.now() - G.qt) / 1000;
  QB.track(q.q, ok); QB.addXP(ok ? 10 : 2);
  if (ok) { G.correct++; G.score += 100 + Math.max(0, Math.round((15 - secs) * 4)); }
  FX.sfx(ok ? 'ok' : 'bad');
  $('#rq').querySelectorAll('.opt').forEach((b, i) => { b.classList.add('lock'); if (q.ord[i] === q.a) b.classList.add('ok'); else if (i === p) b.classList.add('bad'); else b.classList.add('dim'); });
  $('#rf').className = 'fb ' + (ok ? 'ok' : 'bad'); $('#rf').textContent = ok ? '✓ +' + (100 + Math.max(0, Math.round((15 - secs) * 4))) : '✗ Correct: ' + 'ABCD'[q.ord.indexOf(q.a)];
  G.i++; const done = G.i >= G.list.length; G.done = done;
  sendProg(done);
  setTimeout(() => { if (!R || !R.g || !$('#rq')) return; if (done) { $('#rq').innerHTML = '<div class="panel" style="text-align:center"><h2>Finished!</h2><p class="sub">Waiting for the other players…</p></div>'; } else question(); }, 900);
}
function sendProg(done) {
  const G = R.g, m = { t: 'p', i: G.i, score: G.score, correct: G.correct, done, ms: Date.now() - G.t0 };
  if (R.host) { Object.assign(R.players[R.id], m); if (done && !R.order.includes(R.id)) R.order.push(R.id); relay(); checkDone(); } else R.link.send(R.hostId, m);
}
function showResults(res) {
  FX.music(false); const me = res.find(r => r.id === R.id), rank = res.findIndex(r => r.id === R.id) + 1, G = R.g || { list: [], correct: 0 };
  FX.sfx(rank === 1 ? 'win' : 'level'); if (rank === 1 && res.length > 1) FX.confetti();
  QB.award('rival'); if (rank === 1 && res.length > 1) QB.award('champion'); QB.addXP(rank === 1 ? 60 : 25);
  const h = store.get('qb_history', []); h.unshift({ sid: 'mix', title: 'Online race · ' + (res.length > 1 ? '#' + rank + ' of ' + res.length : 'solo'), score: G.correct, total: G.list.length, pct: Math.round(G.correct / Math.max(G.list.length, 1) * 100), secs: Math.round((Date.now() - (G.t0 || Date.now())) / 1000), date: Date.now() }); store.set('qb_history', h.slice(0, 100));
  const medal = ['🥇', '🥈', '🥉'];
  app.innerHTML = `<div class="res"><h2>${rank === 1 ? 'You won the race!' : 'Race finished'}</h2><p>${rank === 1 && res.length > 1 ? 'First place. Nicely done.' : 'You placed #' + rank + ' of ' + res.length + '.'}</p>
  <div class="podium">${res.map((r, i) => `<div class="pdr ${r.id === R.id ? 'me' : ''}" style="animation-delay:${i * 120}ms"><span class="md">${medal[i] || i + 1}</span><span class="av">${r.av}</span><b>${esc(r.name)}</b><small>${r.correct} correct${r.first ? ' · finish bonus' : ''}</small><span class="rs">${r.score}</span></div>`).join('')}</div>
  <div class="acts">${R.host ? '<button class="btn" id="rm">Back to lobby</button>' : ''}<button class="btn ghost" id="lv">Leave</button></div></div>`;
  $('#lv').onclick = () => { const l = R && R.link; R = null; l && l.close(); QB.go('arena'); };
  const rm = $('#rm'); if (rm) rm.onclick = () => { R.state = 'lobby'; R.g = null; R.view = null; Object.values(R.players).forEach(p => Object.assign(p, { i: 0, score: 0, correct: 0, done: false })); broadcastLobby(); lobbyView(); };
}
})();
