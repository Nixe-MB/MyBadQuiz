/* QuizBus FX – synthesized sound effects (no audio files), confetti, particle bursts and 3D card tilt. */
window.FX = (() => {
  let ctx, mute = localStorage.getItem('qb_mute') === '1';
  let calm = matchMedia('(prefers-reduced-motion: reduce)').matches, vol = 1;
  const ac = () => { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, t0, d, type = 'sine', v = .12, f2) {
    const c = ac(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(Math.max(v * vol, .0001), t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
  }
  const S = {
    click: () => tone(540, 0, .06, 'triangle', .07),
    ok: () => { tone(660, 0, .12); tone(880, .09, .22); },
    bad: () => tone(230, 0, .3, 'sawtooth', .07, 110),
    hint: () => tone(700, 0, .18, 'sine', .08, 1000),
    star: () => { tone(988, 0, .08, 'triangle', .08); tone(1318, .07, .16, 'triangle', .08); },
    flip: () => tone(300, 0, .12, 'triangle', .08, 600),
    tick: () => tone(950, 0, .04, 'square', .035),
    level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * .08, .25, 'triangle', .09)),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .13, .35, 'sine', .11)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * .15, .3, 'sine', .08))
  };
  /* particles */
  let P = [], raf = 0;
  const cols = ['#4fd1c5', '#ffb347', '#ff6b6b', '#b08cff', '#3ddc97', '#ffffff'];
  function spawn(x, y, n, pw, g) {
    if (calm) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = pw * (.4 + Math.random());
      P.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - pw * .7, r: 3 + Math.random() * 4, c: cols[i % 6], life: 1, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, g });
    }
    run();
  }
  function run() {
    if (raf) return;
    let c = document.getElementById('fx');
    if (!c) { c = document.createElement('canvas'); c.id = 'fx'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:99'; document.body.append(c); }
    c.width = innerWidth; c.height = innerHeight;
    const x = c.getContext('2d');
    const step = () => {
      x.clearRect(0, 0, c.width, c.height);
      P = P.filter(p => p.life > 0 && p.y < c.height + 30);
      for (const p of P) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .009;
        x.globalAlpha = Math.max(p.life, 0); x.fillStyle = p.c;
        x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore();
      }
      if (P.length) raf = requestAnimationFrame(step); else { raf = 0; x.clearRect(0, 0, c.width, c.height); }
    };
    step();
  }
  /* 3D tilt + glow on .tilt elements */
  document.addEventListener('mousemove', e => {
    const c = e.target.closest && e.target.closest('.tilt'); if (!c || calm) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.transform = `perspective(700px) rotateX(${(.5 - y) * 8}deg) rotateY(${(x - .5) * 10}deg) translateY(-6px)`;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
  });
  document.addEventListener('mouseout', e => {
    const c = e.target.closest && e.target.closest('.tilt');
    if (c && !c.contains(e.relatedTarget)) c.style.transform = '';
  });
  /* generic click sound + mute button */
  document.addEventListener('click', e => { if (e.target.closest('.btn,.chip,nav button,.sw,.card,#theme,.dots i')) FX.sfx('click'); });
  const mb = document.getElementById('mute');
  const paint = () => { if (mb) mb.textContent = mute ? '🔇' : '🔊'; };
  if (mb) mb.onclick = () => { mute = !mute; localStorage.setItem('qb_mute', mute ? '1' : '0'); paint(); if (!mute) S.click(); };
  paint();
  /* ambient circuit packets travelling along the background grid */
  const amb = document.createElement('canvas'); amb.id = 'amb';
  amb.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0';
  document.body.prepend(amb);
  const ax = amb.getContext('2d'), G = 44; let W = 0, H = 0, acc = '#4fd1c5', fr = 0;
  const size = () => { W = amb.width = innerWidth; H = amb.height = innerHeight; }; size(); addEventListener('resize', size);
  const mk = () => { const h = Math.random() < .5, sg = Math.random() < .5 ? 1 : -1; return { x: Math.round(Math.random() * W / G) * G, y: Math.round(Math.random() * H / G) * G, dx: h ? sg : 0, dy: h ? 0 : sg, v: .7 + Math.random() * 1.3, l: 50 + Math.random() * 70 }; };
  const pk = Array.from({ length: 14 }, mk);
  (function loop() {
    requestAnimationFrame(loop);
    if (calm || !ax) return;
    if (fr++ % 90 === 0) acc = getComputedStyle(document.documentElement).getPropertyValue('--c').trim() || acc;
    ax.clearRect(0, 0, W, H); ax.lineWidth = 2; ax.lineCap = 'round';
    pk.forEach((p, i) => {
      const px = p.x, py = p.y; p.x += p.dx * p.v; p.y += p.dy * p.v;
      const cross = p.dx ? Math.floor(px / G) !== Math.floor(p.x / G) : Math.floor(py / G) !== Math.floor(p.y / G);
      if (cross && Math.random() < .3) { p.x = Math.round(p.x / G) * G; p.y = Math.round(p.y / G) * G; const sg = Math.random() < .5 ? 1 : -1; if (p.dx) { p.dx = 0; p.dy = sg; } else { p.dy = 0; p.dx = sg; } }
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { pk[i] = mk(); return; }
      const g = ax.createLinearGradient(p.x - p.dx * p.l, p.y - p.dy * p.l, p.x, p.y);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, acc);
      ax.globalAlpha = .55; ax.strokeStyle = g; ax.beginPath(); ax.moveTo(p.x - p.dx * p.l, p.y - p.dy * p.l); ax.lineTo(p.x, p.y); ax.stroke();
      ax.globalAlpha = .9; ax.fillStyle = acc; ax.beginPath(); ax.arc(p.x, p.y, 2.6, 0, 6.3); ax.fill();
    });
  })();
  return {
    setVol(v) { vol = v; }, setCalm(c) { calm = c || matchMedia('(prefers-reduced-motion: reduce)').matches; },
    sfx(n) { if (!mute && S[n]) { try { S[n](); } catch (e) {} } },
    confetti() { for (let i = 0; i < 5; i++) setTimeout(() => spawn(innerWidth * (.15 + .175 * i), innerHeight * .4, 45, 9, .28), i * 170); },
    burst(x, y) { spawn(x, y, 20, 5, .2); }
  };
})();
