/* MyBadQuiz – BossArt: procedurally drawn, animated 2D bosses (no images, no emoji).
   BossArt.draw(ctx, type, o)  o = { x, y, s, t, col, look:{x,y}, hit, rage, charge, dead }
   Types: eye, kraken, golem, drake, robot, ghost, skull, hive.
   BossArt.mount(canvas, boss) animates one boss in a small canvas (used by the co-op raid banner). */
window.BossArt = (() => {
  const TAU = Math.PI * 2, clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
  const rgb = hex => { const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const shade = (hex, k) => { const [r, g, b] = rgb(hex); return `rgb(${clamp(r * k, 0, 255) | 0},${clamp(g * k, 0, 255) | 0},${clamp(b * k, 0, 255) | 0})`; };
  const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const rad = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const glowEye = (c, x, y, rx, ry, col) => { c.fillStyle = rad(c, x, y, 0, rx * 1.8, [[0, '#fff'], [.35, col], [1, rgba(col, 0)]]); c.beginPath(); c.ellipse(x, y, rx * 1.8, ry * 1.8, 0, 0, TAU); c.fill(); };

  const T = {
    /* floating eyeball with tentacles */
    eye(c, o) {
      const { t, col } = o, lk = o.look || { x: 0, y: 1 };
      for (let i = 0; i < 7; i++) {
        const a = (i / 6 - .5) * 2.3; c.beginPath(); c.moveTo(Math.sin(a) * 38, 40);
        for (let k = 1; k <= 9; k++) c.lineTo(Math.sin(a) * (38 + k * 9) + Math.sin(t * 2.4 + i * 1.3 + k * .55) * (4 + k * 1.6), 40 + k * 13);
        c.lineWidth = 12 - (i % 2) * 3; c.lineCap = 'round'; c.strokeStyle = shade(col, .5); c.stroke(); c.lineWidth = 4; c.strokeStyle = shade(col, .9); c.stroke();
      }
      for (let i = -2; i <= 2; i++) { c.fillStyle = shade(col, .45); c.beginPath(); c.moveTo(i * 26 - 8, -62 + Math.abs(i) * 8); c.lineTo(i * 26, -92 + Math.abs(i) * 14); c.lineTo(i * 26 + 8, -62 + Math.abs(i) * 8); c.fill(); }
      c.fillStyle = rad(c, -22, -30, 8, 90, [[0, shade(col, 1.4)], [.6, shade(col, .8)], [1, shade(col, .4)]]); c.beginPath(); c.arc(0, 0, 78, 0, TAU); c.fill();
      c.fillStyle = rad(c, 0, -8, 6, 60, [[0, '#fffaf0'], [1, '#e2d6c6']]); c.beginPath(); c.ellipse(0, 0, 58, 50, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(200,40,40,.35)'; c.lineWidth = 1.5; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + .3; c.beginPath(); c.moveTo(Math.cos(a) * 56, Math.sin(a) * 48); c.lineTo(Math.cos(a) * 34, Math.sin(a) * 28); c.stroke(); }
      const ix = clamp(lk.x) * 16, iy = clamp(lk.y) * 12 + 4;
      c.fillStyle = rad(c, ix, iy, 2, 28, [[0, '#fff'], [.18, shade(col, 1.5)], [.75, shade(col, .7)], [1, '#111']]); c.beginPath(); c.arc(ix, iy, 27 + o.charge * 4, 0, TAU); c.fill();
      c.fillStyle = '#05060a'; c.beginPath(); c.ellipse(ix, iy, 8 - o.charge * 3, 17 + o.rage * 4, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(ix - 9, iy - 10, 4.5, 0, TAU); c.fill();
      const bl = Math.pow(Math.max(0, Math.sin(t * .9)), 40) * 52 + o.dead * 30; if (bl > 1) { c.fillStyle = shade(col, .6); c.beginPath(); c.ellipse(0, -52 + bl / 2, 62, bl / 2 + 2, 0, 0, TAU); c.fill(); }
    },
    /* tentacled kraken */
    kraken(c, o) {
      const { t, col } = o;
      for (let i = 0; i < 8; i++) {
        const a = (i / 7 - .5) * 2.8, bx = Math.sin(a) * 34; c.beginPath(); c.moveTo(bx, 28); const pts = [];
        for (let k = 1; k <= 10; k++) { const x = bx + Math.sin(a) * k * 11 + Math.sin(t * 2 + i * .9 + k * .5) * (5 + k * 1.8), y = 28 + k * 14 - Math.abs(Math.sin(a)) * k * 3; c.lineTo(x, y); pts.push([x, y, k]); }
        c.lineWidth = 15; c.lineCap = 'round'; c.strokeStyle = shade(col, .55); c.stroke(); c.lineWidth = 6; c.strokeStyle = shade(col, .95); c.stroke();
        c.fillStyle = 'rgba(255,230,230,.75)'; pts.forEach(([x, y, k]) => { if (k % 2 === 0) { c.beginPath(); c.arc(x, y + 3, 3.2 - k * .15, 0, TAU); c.fill(); } });
      }
      c.fillStyle = rad(c, -20, -50, 10, 110, [[0, shade(col, 1.45)], [.55, shade(col, .85)], [1, shade(col, .4)]]); c.beginPath(); c.ellipse(0, -12, 72, 78, 0, 0, TAU); c.fill();
      c.fillStyle = shade(col, .55); [[-34, -52, 10], [24, -60, 8], [40, -36, 7], [-12, -76, 6], [-48, -24, 6]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
      [-1, 1].forEach(s => { const ex = s * 28, ey = -2; c.fillStyle = '#fff4c8'; c.beginPath(); c.ellipse(ex, ey, 19, 15, 0, 0, TAU); c.fill(); c.fillStyle = '#121212'; c.beginPath(); c.ellipse(ex + (o.look ? clamp(o.look.x) * 5 : 0), ey + 2, 6, 12, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(ex - 20, ey - 17, 40, 8 - o.charge * 3); });
      c.strokeStyle = '#201015'; c.lineWidth = 5; c.beginPath(); c.arc(0, 34, 18 + o.charge * 6, .15 * Math.PI, .85 * Math.PI); c.stroke();
    },
    /* rune golem */
    golem(c, o) {
      const { t, col } = o, fl = Math.sin(t * 2) * 6;
      c.fillStyle = rgba(col, .35); c.beginPath(); c.moveTo(-28, 70); c.lineTo(0, 120 + Math.sin(t * 9) * 10); c.lineTo(28, 70); c.fill();
      [-1, 1].forEach(s => {
        const x = s * 98, y = 8 + (s > 0 ? -fl : fl); c.fillStyle = lin(c, x - 24, y - 24, x + 24, y + 24, [[0, shade(col, .95)], [1, shade(col, .35)]]); rrect(c, x - 24, y - 26, 48, 52, 12); c.fill();
        c.fillStyle = rgba('#000000', .25); c.fillRect(x - 24, y + 2, 48, 3); c.fillStyle = col; c.fillRect(x - 6, y - 10, 12, 4);
        c.strokeStyle = shade(col, .5); c.lineWidth = 8; c.beginPath(); c.moveTo(s * 62, -26); c.lineTo(x - s * 18, y - 20); c.stroke();
      });
      c.fillStyle = lin(c, -58, -50, 58, 80, [[0, shade(col, .85)], [.5, shade(col, .5)], [1, shade(col, .28)]]); rrect(c, -58, -54, 116, 132, 18); c.fill();
      c.strokeStyle = rgba(col, .9); c.lineWidth = 2; c.beginPath(); c.moveTo(-40, -30); c.lineTo(-18, -8); c.lineTo(-30, 18); c.moveTo(38, -34); c.lineTo(20, -6); c.lineTo(34, 24); c.stroke();
      const pulse = .6 + Math.sin(t * 4) * .25 + o.charge * .6; c.fillStyle = rad(c, 0, 18, 2, 46, [[0, '#fff'], [.3, col], [1, rgba(col, 0)]]); c.globalAlpha = Math.min(1, pulse); c.beginPath(); c.arc(0, 18, 46, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 4); c.lineTo(-11, 26); c.lineTo(11, 26); c.closePath(); c.stroke();
      c.fillStyle = lin(c, -32, -102, 32, -58, [[0, shade(col, .8)], [1, shade(col, .35)]]); rrect(c, -32, -100, 64, 50, 12); c.fill();
      glowEye(c, -12, -78, 6, 4, col); glowEye(c, 12, -78, 6, 4, col); c.fillStyle = rgba('#000', .5); c.fillRect(-26, -70, 52, 4);
      c.fillStyle = shade(col, .4); c.beginPath(); c.moveTo(-26, -100); c.lineTo(-18, -122); c.lineTo(-8, -100); c.moveTo(8, -100); c.lineTo(18, -122); c.lineTo(26, -100); c.fill();
    },
    /* winged drake */
    drake(c, o) {
      const { t, col } = o, flap = Math.sin(t * 3.2);
      [-1, 1].forEach(s => {
        c.save(); c.scale(s, 1); c.translate(26, -18); c.rotate(-.35 - flap * .28);
        c.fillStyle = lin(c, 0, 0, 150, -40, [[0, shade(col, .75)], [1, rgba(col, .25)]]); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(70, -110, 168, -70); c.quadraticCurveTo(136, -38, 150, 4); c.quadraticCurveTo(108, -14, 112, 46); c.quadraticCurveTo(70, 8, 64, 62); c.quadraticCurveTo(34, 24, 0, 34); c.closePath(); c.fill();
        c.strokeStyle = shade(col, .45); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(70, -110, 168, -70); c.moveTo(0, 0); c.lineTo(150, 4); c.moveTo(0, 0); c.lineTo(112, 46); c.stroke(); c.restore();
      });
      c.fillStyle = lin(c, 0, -20, 0, 100, [[0, shade(col, 1)], [1, shade(col, .35)]]); c.beginPath(); c.ellipse(0, 30, 40, 66, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,230,170,.75)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(0, 4 + i * 14, 24 - i * 1.5, 5, 0, 0, TAU); c.fill(); }
      c.fillStyle = shade(col, .4); for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-6, -18 + i * 20); c.lineTo(0, -34 + i * 20); c.lineTo(6, -18 + i * 20); c.fill(); }
      const jaw = o.charge * 18 + o.hit * 8;
      c.fillStyle = shade(col, .85); c.beginPath(); c.moveTo(-34, -34); c.quadraticCurveTo(0, -112, 34, -34); c.quadraticCurveTo(14, -12, 0, -14 + jaw * .1); c.quadraticCurveTo(-14, -12, -34, -34); c.fill();
      c.fillStyle = shade(col, .55); c.beginPath(); c.moveTo(-20, -34); c.lineTo(0, -8 + jaw); c.lineTo(20, -34); c.closePath(); c.fill();
      c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 7 - 3, -30); c.lineTo(i * 7, -22 + jaw * .4); c.lineTo(i * 7 + 3, -30); c.fill(); }
      c.fillStyle = shade(col, .35); [-1, 1].forEach(s => { c.beginPath(); c.moveTo(s * 18, -78); c.quadraticCurveTo(s * 50, -112, s * 40, -140); c.quadraticCurveTo(s * 34, -108, s * 8, -86); c.fill(); });
      glowEye(c, -13, -62, 5, 3, '#ffd23a'); glowEye(c, 13, -62, 5, 3, '#ffd23a');
      if (o.charge > .55) { c.fillStyle = rad(c, 0, 0, 2, 40, [[0, '#fff'], [.4, '#ffb347'], [1, 'rgba(255,90,20,0)']]); c.beginPath(); c.arc(0, -10 + jaw, 12 + o.charge * 26, 0, TAU); c.fill(); }
    },
    /* hovering mech */
    robot(c, o) {
      const { t, col } = o;
      c.fillStyle = rad(c, 0, 100, 2, 50, [[0, '#fff'], [.3, '#7ad7ff'], [1, 'rgba(60,160,255,0)']]); c.beginPath(); c.ellipse(0, 96, 34 + Math.sin(t * 20) * 3, 54 + Math.sin(t * 17) * 6, 0, 0, TAU); c.fill();
      [-1, 1].forEach(s => {
        const x = s * 92, y = 22 + Math.sin(t * 2 + s) * 6; c.fillStyle = lin(c, x - 26, y - 30, x + 26, y + 30, [[0, shade(col, .9)], [1, shade(col, .3)]]); rrect(c, x - 26, y - 30, 52, 60, 14); c.fill();
        c.fillStyle = '#10161c'; rrect(c, x - 10, y + 6, 20, 54, 6); c.fill(); c.fillStyle = col; c.fillRect(x - 5, y + 54, 10, 8 + o.charge * 14);
        c.strokeStyle = shade(col, .4); c.lineWidth = 9; c.beginPath(); c.moveTo(s * 54, -10); c.lineTo(x - s * 16, y - 18); c.stroke();
      });
      c.fillStyle = lin(c, -60, -30, 60, 84, [[0, shade(col, .9)], [1, shade(col, .3)]]); c.beginPath(); c.moveTo(-62, -30); c.lineTo(62, -30); c.lineTo(42, 84); c.lineTo(-42, 84); c.closePath(); c.fill();
      c.fillStyle = '#0b1218'; rrect(c, -30, 6, 60, 40, 8); c.fill(); c.fillStyle = col; for (let i = 0; i < 4; i++) c.fillRect(-22 + i * 12, 14 + (Math.sin(t * 3 + i) > 0 ? 0 : 8), 8, 22);
      c.fillStyle = lin(c, -42, -102, 42, -34, [[0, shade(col, 1)], [1, shade(col, .4)]]); rrect(c, -42, -98, 84, 66, 18); c.fill();
      c.fillStyle = '#060a10'; rrect(c, -34, -80, 68, 26, 12); c.fill();
      const sx = Math.sin(t * 2.2) * 24; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 14; rrect(c, sx - 10, -76, 20, 18, 8); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = shade(col, .6); c.lineWidth = 4; c.beginPath(); c.moveTo(22, -98); c.lineTo(34, -126); c.stroke(); c.fillStyle = Math.sin(t * 6) > 0 ? '#ff5a5a' : '#661111'; c.beginPath(); c.arc(34, -128, 6, 0, TAU); c.fill();
    },
    /* cloaked phantom */
    ghost(c, o) {
      const { t, col } = o;
      c.fillStyle = lin(c, 0, -100, 0, 110, [[0, rgba(shade(col, 1.2).replace('rgb', 'rgb'), 1)], [1, rgba('#000000', 0)]]);
      c.fillStyle = lin(c, 0, -100, 0, 120, [[0, shade(col, 1.1)], [.7, shade(col, .55)], [1, rgba(col, 0)]]);
      c.beginPath(); c.moveTo(-70, 40); c.bezierCurveTo(-84, -70, -40, -108, 0, -108); c.bezierCurveTo(40, -108, 84, -70, 70, 40);
      for (let i = 6; i >= 0; i--) { const x = -70 + i * (140 / 6), y = 96 + Math.sin(t * 3 + i * 1.2) * 12 + (i % 2) * 20; c.lineTo(x, y); }
      c.closePath(); c.fill();
      c.fillStyle = rad(c, 0, -52, 4, 52, [[0, '#02050a'], [1, '#0a1620']]); c.beginPath(); c.ellipse(0, -48, 40, 46, 0, 0, TAU); c.fill();
      glowEye(c, -16, -52, 7, 11, '#aef'); glowEye(c, 16, -52, 7, 11, '#aef');
      c.fillStyle = '#02050a'; c.beginPath(); c.ellipse(0, -22, 8, 10 + o.charge * 12, 0, 0, TAU); c.fill();
      [-1, 1].forEach(s => { const x = s * 96, y = 18 + Math.sin(t * 2.6 + s) * 12; c.fillStyle = rgba(col, .9); c.beginPath(); c.ellipse(x, y, 20, 15, s * .5, 0, TAU); c.fill(); for (let f = 0; f < 4; f++) { c.fillRect(x + s * 10 - 2 + f * s * 4, y + 8, 4, 16 + f % 2 * 4); } });
      c.fillStyle = rgba('#ffffff', .7); for (let i = 0; i < 6; i++) { const a = t * .9 + i * 1.05, r = 100 + Math.sin(t * 2 + i) * 14; c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r * .62 + 10, 3, 0, TAU); c.fill(); }
    },
    /* lich skull */
    skull(c, o) {
      const { t, col } = o;
      for (let k = 0; k < 2; k++) { c.save(); c.rotate(t * (k ? -.5 : .4)); c.scale(1, .34 + k * .1); c.strokeStyle = rgba(col, .55); c.lineWidth = 3; c.setLineDash([12, 9]); c.beginPath(); c.arc(0, 0, 112 + k * 22, 0, TAU); c.stroke(); c.restore(); }
      c.setLineDash([]);
      const jaw = o.charge * 14 + o.hit * 8 + o.dead * 20;
      c.fillStyle = lin(c, 0, 20, 0, 80, [[0, '#d8d2c0'], [1, '#8d8774']]); rrect(c, -34, 36 + jaw, 68, 36, 10); c.fill();
      c.fillStyle = '#2a251c'; for (let i = -3; i <= 3; i++) c.fillRect(i * 9 - 1, 38 + jaw, 2, 30);
      c.fillStyle = rad(c, -14, -34, 6, 78, [[0, '#fbf6e6'], [.7, '#d2cbb4'], [1, '#8a8470']]); c.beginPath(); c.arc(0, -10, 66, 0, TAU); c.fill(); rrect(c, -40, 10, 80, 38, 12); c.fill();
      [-1, 1].forEach(s => { c.fillStyle = '#07080c'; c.beginPath(); c.ellipse(s * 26, -8, 20, 24, s * .2, 0, TAU); c.fill(); glowEye(c, s * 26, -6, 7 + o.charge * 3, 9 + o.charge * 3, col); });
      c.fillStyle = '#0a0a10'; c.beginPath(); c.moveTo(0, 14); c.lineTo(-8, 32); c.lineTo(8, 32); c.fill();
      c.fillStyle = '#e8d9ff'; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 9 - 4, 36 + jaw * .1); c.lineTo(i * 9, 46 + jaw * .1); c.lineTo(i * 9 + 4, 36 + jaw * .1); c.fill(); }
      c.fillStyle = shade(col, .75); for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 26 - 10, -62 + Math.abs(i) * 8); c.lineTo(i * 26, -112 + Math.abs(i) * 18 + Math.sin(t * 3 + i) * 3); c.lineTo(i * 26 + 10, -62 + Math.abs(i) * 8); c.fill(); }
    },
    /* hive queen */
    hive(c, o) {
      const { t, col } = o, w = Math.sin(t * 34) * .22;
      [-1, 1].forEach(s => [0, 1].forEach(k => { c.save(); c.scale(s, 1); c.translate(18, -22 + k * 18); c.rotate(-.5 + k * .7 + w * (k ? -1 : 1)); c.fillStyle = 'rgba(180,235,255,.38)'; c.strokeStyle = 'rgba(210,245,255,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(70, 0, 76 - k * 18, 30 - k * 6, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }));
      c.fillStyle = lin(c, 0, 20, 0, 150, [[0, col], [1, shade(col, .5)]]); c.beginPath(); c.ellipse(0, 78, 42, 66, 0, 0, TAU); c.fill();
      c.fillStyle = '#17120a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(0, 52 + i * 24, 42 - i * 3, 8, 0, 0, Math.PI); c.fill(); }
      c.fillStyle = '#17120a'; c.beginPath(); c.moveTo(-9, 134); c.lineTo(0, 168 + o.charge * 16); c.lineTo(9, 134); c.fill();
      c.fillStyle = lin(c, 0, -40, 0, 50, [[0, shade(col, 1.2)], [1, shade(col, .55)]]); c.beginPath(); c.ellipse(0, 10, 44, 48, 0, 0, TAU); c.fill();
      c.fillStyle = '#2a2010'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(Math.cos(i) * 30, 8 + Math.sin(i) * 32, 4, 0, TAU); c.fill(); }
      c.fillStyle = shade(col, .8); c.beginPath(); c.arc(0, -48, 36, 0, TAU); c.fill();
      [-1, 1].forEach(s => { c.fillStyle = '#d63b2a'; c.beginPath(); c.ellipse(s * 20, -52, 14, 18, s * .3, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(s * 20 + (k % 2 - .5) * 9, -58 + (k >> 1) * 12, 3, 0, TAU); c.fill(); } c.strokeStyle = '#17120a'; c.lineWidth = 4; c.beginPath(); c.moveTo(s * 10, -78); c.quadraticCurveTo(s * 34, -110, s * 56, -100 + Math.sin(t * 3) * 6); c.stroke(); c.beginPath(); c.moveTo(s * 8, -20); c.lineTo(s * 24 + s * o.charge * 8, -6); c.stroke(); });
      glowEye(c, 0, -62, 5, 4, '#ffe38a');
    }
  };

  function draw(c, type, o) {
    const fn = T[type] || T.eye; o = { look: { x: 0, y: 1 }, hit: 0, rage: 0, charge: 0, dead: 0, s: 1, t: 0, col: '#4fd1c5', ...o };
    c.save(); c.translate(o.x, o.y); const sc = o.s * (1 + Math.sin(o.t * 1.6) * .015 + o.charge * .05); c.scale(sc, sc);
    if (o.dead) { c.globalAlpha = Math.max(0, 1 - o.dead * .9); c.rotate(Math.sin(o.t * 40) * .05 * o.dead); }
    c.shadowColor = o.rage > .3 ? '#ff3030' : o.col; c.shadowBlur = 26 + o.rage * 26 + o.charge * 36;
    fn(c, o); c.shadowBlur = 0;
    if (o.rage > .01) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 0, 0, 10, 150, [[0, `rgba(255,40,40,${.16 * o.rage})`], [1, 'rgba(255,40,40,0)']]); c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
    if (o.hit > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 0, 0, 4, 130, [[0, `rgba(255,255,255,${Math.min(1, o.hit * 1.6)})`], [1, 'rgba(255,255,255,0)']]); c.beginPath(); c.arc(0, 0, 130, 0, TAU); c.fill(); c.globalCompositeOperation = 'source-over'; }
    if (o.charge > .05) { c.strokeStyle = rgba('#ffffff', o.charge * .8); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 150 - o.charge * 60, 0, TAU); c.stroke(); }
    c.restore();
  }
  /* small animated canvas for the co-op raid banner */
  function mount(canvas, boss) {
    const ctx = canvas.getContext('2d'); let on = true, hit = 0, charge = 0, shake = 0, atk = 0, last = performance.now(), clock = 0, dead = 0;
    const api = {
      hit() { hit = .5; shake = 8; }, atk() { atk = 1; }, kill() { dead = .001; }, stop() { on = false; },
      set(boss2) { boss = boss2; }
    };
    (function loop(now) {
      if (!on || !canvas.isConnected) return; requestAnimationFrame(loop);
      if (document.hidden) { last = now; return; }
      const dt = Math.min((now - last) / 1000, .05); last = now; clock += dt; hit = Math.max(0, hit - dt); shake = Math.max(0, shake - dt * 30);
      if (atk > 0) { atk -= dt * .8; charge = Math.sin(Math.min(1, (1 - atk)) * Math.PI); } else charge = 0;
      if (dead > 0) dead = Math.min(1, dead + dt * .6);
      const w = canvas.clientWidth || 300, h = canvas.clientHeight || 190, d = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== w * d) { canvas.width = w * d; canvas.height = h * d; }
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h * .5, 10, w / 2, h * .5, w * .6); g.addColorStop(0, rgba(boss.col || '#4fd1c5', .22)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      draw(ctx, boss.art || 'eye', { x: w / 2 + (shake ? (Math.random() - .5) * shake : 0), y: h * .52 + Math.sin(clock * 1.7) * 5, s: Math.min(h / 250, w / 330, 1.1), t: clock, col: boss.col || '#4fd1c5', hit, charge, dead, rage: boss.rage || 0, look: { x: Math.sin(clock * .8), y: .8 } });
    })(performance.now());
    return api;
  }
  return { draw, mount, TYPES: Object.keys(T), rgba, shade };
})();
