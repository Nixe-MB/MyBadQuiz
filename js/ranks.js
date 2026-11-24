/* MyBadQuiz – Ranks: leaderboards.
   • "This device": players you have met in online games (works everywhere, no server).
   • "Global": needs a free Firebase Realtime Database URL in config.js (see README). Sharing your stats is OFF by default (Settings → Online & privacy). */
(() => {
const { $, esc, store, toast, app, FX } = QB;
const baseUrl = () => ((window.MBQ_CONFIG && MBQ_CONFIG.firebaseUrl) || '').trim().replace(/\/$/, '');
const uid = () => { let u = store.get('qb_uid', null); if (!u) { u = Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.random() * 36 | 0]).join(''); store.set('qb_uid', u); } return u; };
const share = () => !!(store.get('qb_set', {}).lb);
const num = v => Math.max(0, Math.min(1e9, Number(v) || 0));
const mastered = () => Object.values(QB.mas()).filter(r => QB.mlevel(r) === 3).length;
QB.lbStats = () => {
  const p = QB.prog(), st = QB.stats(), boss = store.get('qb_boss', {}), me = QB.me();
  return { n: QB.myName().slice(0, 14), l: QB.lvl(p.xp), x: p.xp, b: Object.values(boss).reduce((n, r) => n + (r.w || 0), 0), r: store.get('qb_rw', 0), m: mastered(), a: st.t >= 30 ? Math.round(st.c / st.t * 100) : 0, e: me.k === 'e' ? me.v : '', f: me.f || 'none', u: Date.now() };
};
let last = 0;
QB.lbPush = async force => {
  if (!baseUrl() || !share()) return; if (!force && Date.now() - last < 30000) return; last = Date.now();
  try { await fetch(`${baseUrl()}/lb/${uid()}.json`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(QB.lbStats()) }); } catch (e) {}
};
QB.lbToggle = async on => { if (on) { QB.lbPush(true); toast('Your stats are now visible on the leaderboard.'); } else if (baseUrl()) { try { await fetch(`${baseUrl()}/lb/${uid()}.json`, { method: 'DELETE' }); } catch (e) {} toast('Your stats were removed from the leaderboard.'); } };

const CATS = [['x', 'XP & level', r => num(r.x) + ' XP · Lv ' + num(r.l)], ['b', 'Boss wins', r => num(r.b) + ' 👑'], ['r', 'Online wins', r => num(r.r) + ' 🏁'], ['m', 'Mastered', r => num(r.m) + ' 🧠'], ['a', 'Accuracy', r => num(r.a) + '%']];
const S = { cat: 'x', scope: 'global' };
const hofRows = () => {
  const m = {}; store.get('qb_hof', []).forEach(g => g.rows.forEach((r, i) => { const k = r.n; const o = m[k] || (m[k] = { n: k, e: r.e || '', f: r.f || 'none', games: 0, wins: 0, best: 0, x: 0, b: 0, r: 0, m: 0, a: 0, l: 0 }); o.games++; if (i === 0 && g.rows.length > 1) o.wins++; o.best = Math.max(o.best, r.s || 0); o.x = o.wins * 100 + o.games * 10; }));
  return Object.values(m).map(o => ({ ...o, r: o.wins, b: o.best, l: Math.floor(o.x / 200) + 1 }));
};
QB.hofAdd = (mode, rows) => { const h = store.get('qb_hof', []); h.unshift({ d: Date.now(), mode, rows: rows.map(r => ({ n: String(r.name).slice(0, 14), e: r.av && r.av.k === 'e' ? r.av.v : '', f: (r.av && r.av.f) || 'none', s: r.score != null ? r.score : r.dmg || 0 })) }); store.set('qb_hof', h.slice(0, 60)); };

QB.viewRanks = async () => {
  const url = baseUrl(), mine = QB.lbStats();
  app.innerHTML = `<section class="hero"><h1>Leaderboards</h1><p>See how you stack up. Your stats are private unless you choose to share them.</p></section>
  <div class="toolbar"><div class="subtabs">${[['global', '🌍 Global'], ['local', '📱 This device']].map(([k, t]) => `<button class="${S.scope === k ? 'on' : ''}" data-sc="${k}">${t}</button>`).join('')}</div>
  ${S.scope === 'global' ? `<div class="subtabs">${CATS.map(([k, t]) => `<button class="${S.cat === k ? 'on' : ''}" data-ct="${k}">${t}</button>`).join('')}</div>` : ''}
  <label class="shr"><button class="sw ${share() ? 'on' : ''}" id="shsw" role="switch" aria-checked="${share()}"></button> Share my stats</label></div>
  <div id="lbb"><div class="empty">Loading…</div></div>`;
  app.querySelectorAll('[data-sc]').forEach(b => b.onclick = () => { S.scope = b.dataset.sc; QB.viewRanks(); });
  app.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { S.cat = b.dataset.ct; QB.viewRanks(); });
  $('#shsw').onclick = () => { const s = store.get('qb_set', {}); store.set('qb_set', { ...s, lb: !s.lb }); QB.lbToggle(!s.lb); QB.viewRanks(); };
  const box = $('#lbb'); let rows = [], note = '';
  if (S.scope === 'local') { rows = hofRows(); note = rows.length ? '' : 'Play an online game with friends and everyone you meet shows up here.'; }
  else if (!url) note = 'The global board is not set up yet. The person hosting this site can enable it with a free Firebase database (see README → Global leaderboard). Until then, use the "This device" board.';
  else { QB.lbPush(true); try { const d = await (await fetch(`${url}/lb.json`)).json(); rows = Object.entries(d || {}).map(([id, v]) => ({ ...v, _id: id })); if (!rows.length) note = 'Nobody has shared their stats yet. Be the first!'; } catch (e) { note = 'Could not load the global leaderboard. Check your connection.'; } }
  const cat = S.scope === 'local' ? [['r', 'Online wins', r => num(r.wins) + ' wins · ' + num(r.games) + ' games · best ' + num(r.best)]] : CATS, c = (cat.find(x => x[0] === S.cat) || cat[0]);
  if (S.scope === 'global' && c[0] === 'a') rows = rows.filter(r => num(r.a) > 0);
  rows = rows.filter(r => r && r.n).sort((a, b) => S.scope === 'local' ? (b.wins - a.wins) || (b.best - a.best) : num(b[c[0]]) - num(a[c[0]]) || num(b.x) - num(a.x)).slice(0, 50);
  const medal = ['🥇', '🥈', '🥉'];
  box.innerHTML = (rows.length ? `<div class="lb">${rows.map((r, i) => `<div class="lbr ${r.n === mine.n && S.scope === 'local' || r._id === uid() ? 'me' : ''}" style="animation-delay:${Math.min(i, 14) * 35}ms"><span class="rk">${medal[i] || i + 1}</span>${QB.avatar({ k: 'e', v: r.e || '🙂', f: r.f }, 34)}<b>${esc(String(r.n).slice(0, 14))}${r.n === 'MyBadNixe' ? ' ✨' : ''}</b><span class="rs">${esc(c[2](r))}</span></div>`).join('')}</div>` : '') + (note ? `<div class="empty">${esc(note)}</div>` : '') +
    `<div class="panel" style="margin-top:16px"><h3 style="font-size:1.1rem">Your stats ${share() ? '' : '<small style="color:var(--mut)">(private)</small>'}</h3><div class="stats"><span class="pill">Lv <b>${mine.l}</b></span><span class="pill"><b>${mine.x}</b> XP</span><span class="pill">Boss wins <b>${mine.b}</b></span><span class="pill">Online wins <b>${mine.r}</b></span><span class="pill">Mastered <b>${mine.m}</b></span><span class="pill">Accuracy <b>${mine.a}%</b></span></div></div>`;
};
})();
