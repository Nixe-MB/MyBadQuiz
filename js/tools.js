/* MyBadQuiz – browser APIs that make studying nicer:
   Web Speech (read aloud) · Wikipedia REST/Action API (learn more) · Screen Wake Lock · Fullscreen · Web Share (in app.js) · PWA install. */
(() => {
const { $, esc, modal, close, toast } = QB;

/* ---- read aloud (Web Speech API) ---- */
QB.say = text => {
  if (!('speechSynthesis' in window)) return toast('Read-aloud is not supported in this browser.');
  const s = window.speechSynthesis; if (s.speaking) { s.cancel(); return; }
  const u = new SpeechSynthesisUtterance(String(text)); u.rate = .95; u.lang = 'en-US'; s.speak(u);
};

/* ---- keep the screen awake during quizzes and boss fights (Screen Wake Lock API) ---- */
let lock = null;
QB.wake = async on => {
  try {
    if (on) { if (!lock && navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } }
    else if (lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden && QB.Q && !QB.Q.done) QB.wake(true); });

/* ---- fullscreen ---- */
QB.fullscreen = el => {
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (el && el.requestFullscreen) el.requestFullscreen().catch(() => toast('Fullscreen is not available here.')); else toast('Fullscreen is not supported in this browser.');
};

/* ---- Wikipedia "Learn more" ---- */
const SEARCH = 'https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=5&search=';
const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const guess = (term, ctx) => {
  term = String(term || '').replace(/[()]/g, '').trim();
  if (term && term.length <= 50 && !/^[\d.,\s%₱$/+\-−=×²]+$/.test(term)) return term;
  return String(ctx || term).replace(/_+/g, ' ').replace(/\b(which|what|the|is|are|of|a|an|in|to|for|its|this|that)\b/gi, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 5).join(' ');
};
QB.wiki = (term0, ctx) => {
  modal.hidden = false;
  modal.innerHTML = `<div class="sheet wide" role="dialog" aria-modal="true"><h2>📚 Learn more</h2><p class="sub">Looks the topic up on Wikipedia. Edit the search if the result is not what you need.</p>
  <div style="display:flex;gap:8px"><input class="search" id="wq" style="margin:0" value="${esc(guess(term0, ctx))}" aria-label="Search Wikipedia"><button class="btn" id="wg">Search</button></div><div id="wr"></div><div class="acts"><button class="btn ghost" id="wc">Close</button></div></div>`;
  const out = $('#wr');
  const run = async (t, pick) => {
    out.innerHTML = '<div class="empty">Searching…</div>';
    try {
      const r = await (await fetch(SEARCH + encodeURIComponent(t))).json(), titles = r[1] || [];
      if (!titles.length) { out.innerHTML = '<div class="empty">No article found. Try different words.</div>'; return; }
      const title = pick || titles[0], sm = await (await fetch(SUMMARY + encodeURIComponent(title.replace(/ /g, '_')))).json();
      const url = sm.content_urls && sm.content_urls.desktop && sm.content_urls.desktop.page, img = sm.thumbnail && /^https:\/\//.test(sm.thumbnail.source) ? sm.thumbnail.source : '';
      out.innerHTML = `<div class="wcard">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<div><h3>${esc(sm.title || title)}</h3><p>${esc(sm.extract || 'No summary available.')}</p>${url && /^https:\/\//.test(url) ? `<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${esc(url)}">Open on Wikipedia ↗</a>` : ''}</div></div>
      <div class="chips" style="margin-top:12px">${titles.map(x => `<button class="chip ${x === title ? 'on' : ''}" data-t="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
      out.querySelectorAll('[data-t]').forEach(b => b.onclick = () => run(t, b.dataset.t));
    } catch (e) { out.innerHTML = '<div class="empty">Could not reach Wikipedia. Check your internet connection.</div>'; }
  };
  $('#wg').onclick = () => run($('#wq').value.trim() || term0);
  $('#wq').onkeydown = e => { if (e.key === 'Enter') $('#wg').click(); };
  $('#wc').onclick = close; run($('#wq').value);
};

/* ---- install as an app (PWA) ---- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); QB.installEvt = e; });
QB.install = async () => {
  if (QB.installEvt) { QB.installEvt.prompt(); try { await QB.installEvt.userChoice; } catch (e) {} QB.installEvt = null; }
  else toast('Use your browser menu: "Install app" or "Add to Home screen".');
};

/* ---- delegated buttons ---- */
document.addEventListener('click', e => {
  const w = e.target.closest && e.target.closest('[data-wiki]'); if (w) { QB.wiki(w.dataset.wiki, w.dataset.ctx); return; }
  const s = e.target.closest && e.target.closest('[data-say]'); if (s) QB.say(s.dataset.say);
});
})();
