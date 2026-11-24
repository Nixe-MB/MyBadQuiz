/* MyBadQuiz – Chaos engine: wobbling screen, flashbangs (sometimes with players' faces), funny pop-up ads and full-screen jumpscares.
   Used by the online "Super Chaos" mode and by the sabotage power-ups. Respects Safe mode (Settings → Online & privacy). */
window.Chaos = (() => {
  const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safe = () => !!(window.QB && QB.safeMode && QB.safeMode());
  const sfx = n => { if (window.FX) FX.sfx(n); };
  const say = m => { if (window.QB && QB.toast) QB.toast(m); };
  let timers = [], on = false, cfg = {}, faces = [], ads = 0, wobT = 0;
  const ADS = [
    ['YOU ARE THE 1,000,000TH VISITOR!', 'Claim your FREE RAM download!', '🎉', '#ff4d6d,#ffb347'], ['Hot singles in your area', '(they are all unanswered quiz questions)', '🔥', '#ff5fd2,#7b2cff'],
    ['Your PC is SLOW!', 'Download MORE RAM now (100% real, trust me)', '💾', '#22e6ff,#2a6bff'], ['Doctors hate him!', 'Learn Mason\'s gain rule with this ONE weird trick', '🩺', '#3ddc97,#0a7a52'],
    ['Congratulations!!!', 'You won a lifetime supply of semicolons;;;;', '🏆', '#ffd166,#ff8a3d'], ['VIRUS DETECTED', 'Just kidding. Please close this ad.', '🦠', '#ff2d55,#5a0016'],
    ['Limited time offer', 'Buy 1 brain cell, get 1 free', '🧠', '#b08cff,#4a2bd0'], ['FREE iPhone 47', 'Just answer ONE question (the one you are already trying to answer)', '📱', '#5fb4ff,#1a2a6c'],
    ['Local professor hates this', 'Get an A+ without studying', '🎓', '#ffb347,#c2410c'], ['Tired of thinking?', 'Try NOT thinking! Works 50% of the time', '💭', '#6fe3d4,#0b6b7a'],
    ['Quiz Premium+ expiring', 'Renew for 0 coins per month', '💳', '#ff9ecf,#a21caf'], ['Click here to NOT click here', 'You clicked it anyway, didn\'t you', '🖱️', '#9be564,#2f7d1a']
  ];
  const rand = a => a[Math.random() * a.length | 0];

  /* ---------- flashbang ---------- */
  function flashbang(face) {
    if (safe()) { const d = document.createElement('div'); d.className = 'softflash'; document.body.append(d); setTimeout(() => d.remove(), 700); return; }
    const d = document.createElement('div'); d.className = 'flashbang';
    const fc = face || (Math.random() < (cfg.facesP == null ? .5 : cfg.facesP) && faces.length ? rand(faces) : null);
    if (fc) d.innerHTML = fc.k === 'i' && /^data:image\//.test(fc.v || '') ? `<img src="${fc.v}" alt="">` : `<span>${esc(fc.v || '🙂')}</span>`;
    document.body.append(d); sfx('flashbang'); if (navigator.vibrate) { try { navigator.vibrate([80, 40, 120]); } catch (e) {} }
    setTimeout(() => d.remove(), 2300);
  }
  /* ---------- wobble ---------- */
  function wobble(ms = 4000, lvl = 2) {
    if (safe()) return; const el = $('#app'); if (!el) return; el.classList.remove('wob1', 'wob2', 'wob3'); void el.offsetWidth; el.classList.add('wob' + lvl); clearTimeout(wobT); wobT = setTimeout(() => el.classList.remove('wob1', 'wob2', 'wob3'), ms);
  }
  /* ---------- ads ---------- */
  function ad() {
    if (ads >= 3) return; const [t, b, e, bg] = rand(ADS), el = document.createElement('div'); ads++;
    el.className = 'ad'; el.style.cssText = `left:${6 + Math.random() * 58}%;top:${14 + Math.random() * 52}%;background:linear-gradient(135deg,${bg});--r:${(Math.random() * 6 - 3).toFixed(1)}deg`;
    const decoy = Math.random() < .4;
    el.innerHTML = `<div class="adh"><small>AD</small><button class="adx" aria-label="Close ad">✕</button></div><div class="adb"><span class="ade">${e}</span><b>${esc(t)}</b><p>${esc(b)}</p><button class="adc">CLAIM NOW</button>${decoy ? '<button class="adf" aria-label="Close">✕</button>' : ''}</div>`;
    const kill = () => { if (el.isConnected) { el.remove(); ads = Math.max(0, ads - 1); sfx('pop'); } };
    el.querySelector('.adx').onclick = kill;
    el.querySelector('.adc').onclick = () => { say('You clicked the ad! 🎉 Here is another one.'); sfx('ad'); setTimeout(ad, 250); };
    const f = el.querySelector('.adf'); if (f) f.onclick = () => { say('That X was FAKE 😈'); sfx('ad'); setTimeout(ad, 150); };
    document.body.append(el); sfx('ad');
  }
  const adStorm = n => { for (let i = 0; i < (n || 3); i++) setTimeout(ad, i * 350); };
  /* ---------- jumpscare (stretches over the whole screen) ---------- */
  let fallback = null;
  function drawFace() {
    if (fallback) return fallback; const c = document.createElement('canvas'); c.width = 540; c.height = 960; const x = c.getContext('2d');
    const g = x.createRadialGradient(270, 430, 20, 270, 480, 720); g.addColorStop(0, '#3a0000'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, 540, 960);
    x.fillStyle = '#d8d2c2'; x.beginPath(); x.ellipse(270, 470, 230, 330, 0, 0, 6.3); x.fill(); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(270, 560, 230, 250, 0, 0, 6.3); x.fill();
    [-1, 1].forEach(s => { x.fillStyle = '#050000'; x.beginPath(); x.ellipse(270 + s * 95, 380, 70, 105, s * .15, 0, 6.3); x.fill(); const eg = x.createRadialGradient(270 + s * 95, 390, 2, 270 + s * 95, 390, 40); eg.addColorStop(0, '#fff'); eg.addColorStop(.3, '#ff2a2a'); eg.addColorStop(1, 'rgba(255,0,0,0)'); x.fillStyle = eg; x.beginPath(); x.arc(270 + s * 95, 390, 40, 0, 6.3); x.fill(); });
    x.fillStyle = '#050000'; x.beginPath(); x.moveTo(270, 470); x.lineTo(240, 540); x.lineTo(300, 540); x.fill();
    x.beginPath(); x.moveTo(110, 650); for (let i = 0; i <= 14; i++) x.lineTo(110 + i * 22, 650 + (i % 2 ? 150 : 40) + Math.sin(i) * 20); x.lineTo(430, 650); x.closePath(); x.fill();
    x.fillStyle = '#fff'; for (let i = 0; i < 13; i++) { x.beginPath(); x.moveTo(125 + i * 22, 655); x.lineTo(136 + i * 22, i % 2 ? 735 : 700); x.lineTo(147 + i * 22, 655); x.fill(); }
    return (fallback = c.toDataURL('image/jpeg', .85));
  }
  const onlineImg = () => `https://picsum.photos/seed/mbq${Math.random().toString(36).slice(2, 8)}/1080/1920?grayscale`;
  function jumpscare(src) {
    if (safe()) { say('😱 A jumpscare was blocked by your safe mode.'); return; }
    if (window.QB && QB.settings && QB.settings().scareOK === false) { say('😱 A jumpscare was blocked (you turned them off).'); return; }
    const show = url => {
      const d = document.createElement('div'); d.className = 'scare'; d.innerHTML = `<img src="${url}" alt="">`; document.body.append(d);
      sfx('scare'); if (navigator.vibrate) { try { navigator.vibrate([200, 60, 300]); } catch (e) {} }
      setTimeout(() => d.classList.add('out'), 1700); setTimeout(() => d.remove(), 2200);
    };
    if (src && /^data:image\//.test(src)) return show(src);
    const url = src && /^https:\/\//.test(src) ? src : onlineImg(), im = new Image(); let done = false;
    const go = u => { if (!done) { done = true; show(u); } };
    im.onload = () => go(url); im.onerror = () => go(drawFace()); setTimeout(() => go(drawFace()), 1300); im.src = url;
  }
  /* ---------- scheduler ---------- */
  const K = { mild: 1.8, normal: 1, insane: .5 };
  function loop(base, fn) { const k = K[cfg.lvl] || 1, tick = () => { if (!on) return; fn(); timers.push(setTimeout(tick, base * k * (.6 + Math.random() * .8) * 1000)); }; timers.push(setTimeout(tick, base * k * .7 * 1000 + 2500)); }
  function start(c, people) {
    stop(); on = true; cfg = c || {}; faces = (people || []).map(p => p.av).filter(Boolean);
    if (cfg.flash) loop(26, () => flashbang());
    if (cfg.ads) loop(17, ad);
    if (cfg.wobble) loop(15, () => wobble(3600 + Math.random() * 2500, cfg.lvl === 'insane' ? 3 : cfg.lvl === 'mild' ? 1 : 2));
  }
  function stop() { on = false; timers.forEach(clearTimeout); timers = []; ads = 0; document.querySelectorAll('.ad,.flashbang,.scare,.softflash').forEach(e => e.remove()); const el = $('#app'); if (el) el.classList.remove('wob1', 'wob2', 'wob3'); }
  return { start, stop, flashbang, wobble, ad, adStorm, jumpscare, drawFace, onlineImg, setFaces(p) { faces = (p || []).map(x => x.av).filter(Boolean); } };
})();
