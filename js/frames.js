/* MyBadQuiz – avatar frames: hand-built vector art drawn AROUND the avatar (SMIL-animated SVG, no images).
   Coordinates: the avatar circle is centre (50,50) radius 50; the overlay SVG uses viewBox "-20 -20 140 140".
   Frames.list  -> [{ id, name, cost }]    Frames.svg(id) -> '<svg class="fr">…</svg>' (or '' for none) */
window.Frames = (() => {
  const TAU = Math.PI * 2, f = n => +n.toFixed(1);
  const pt = (a, r) => [f(50 + r * Math.cos(a)), f(50 + r * Math.sin(a))];
  const P = (a, r) => pt(a, r).join(',');
  const ring = (r, stroke, w, extra = '') => `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
  const around = (n, fn, off = 0) => Array.from({ length: n }, (_, i) => fn(off + i / n * TAU, i)).join('');
  const rnd = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const spin = (dur, inner, rev) => `<g>${inner}<animateTransform attributeName="transform" type="rotate" from="${rev ? 360 : 0} 50 50" to="${rev ? 0 : 360} 50 50" dur="${dur}s" repeatCount="indefinite"/></g>`;
  const blink = (dur, delay, lo = .25) => `<animate attributeName="opacity" values="${lo};1;${lo}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>`;
  const star4 = (x, y, s, fill, anim = '') => `<path d="M${f(x)},${f(y - s)} L${f(x + s * .28)},${f(y - s * .28)} L${f(x + s)},${f(y)} L${f(x + s * .28)},${f(y + s * .28)} L${f(x)},${f(y + s)} L${f(x - s * .28)},${f(y + s * .28)} L${f(x - s)},${f(y)} L${f(x - s * .28)},${f(y - s * .28)}Z" fill="${fill}">${anim}</path>`;
  const grad = (id, stops, x2 = 1, y2 = 1, x1 = 0, y1 = 0) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const rgrad = (id, stops) => `<radialGradient id="${id}">${stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join('')}</radialGradient>`;
  const glow = (id, sd = 1.6) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sd}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  const mirror = inner => `<g transform="translate(100,0) scale(-1,1)">${inner}</g>`;

  const ART = {
    /* ---- a literal spiral galaxy wrapped around the avatar ---- */
    galaxy() {
      const r = rnd(11); let s = `<defs>${rgrad('gxp', [[0, '#ff7ad9', .85], [1, '#ff7ad9', 0]])}${rgrad('gxc', [[0, '#4fd1ff', .8], [1, '#4fd1ff', 0]])}${rgrad('gxv', [[0, '#9b6bff', .8], [1, '#9b6bff', 0]])}${rgrad('gxs', [[0, '#fff'], [.4, '#ffd6f5'], [1, '#7a4fd0']])}${grad('gxe', [[0, '#c9b0ff'], [1, '#6c3fe0']])}</defs>`;
      s += ring(57, '#0b0422', 15) + ring(57, '#1a0a45', 15, 'opacity=".7"');
      s += spin(90, around(7, (a, i) => { const [x, y] = pt(a, 57); return `<circle cx="${x}" cy="${y}" r="${8 + r() * 6}" fill="url(#${['gxp', 'gxc', 'gxv'][i % 3]})" opacity=".7"/>`; }, .3));
      let dots = ''; for (let arm = 0; arm < 3; arm++) for (let k = 0; k < 40; k++) { const t = k / 39, a = arm * 2.094 + t * 3.8, rr = 50.8 + t * 12 + (r() - .5) * 2.8, [x, y] = pt(a, rr); dots += `<circle cx="${x}" cy="${y}" r="${f((.45 + r() * 1.1) * (1.35 - t * .55))}" fill="${['#fff', '#ffd6f5', '#bde7ff', '#ffe9a8'][k % 4]}"/>`; }
      s += spin(55, dots);
      s += around(12, (a, i) => { const [x, y] = pt(a + .17, 51.5 + r() * 12); return star4(x, y, 1.6 + r() * 1.7, '#fff', blink(1.6 + r() * 1.6, r() * 2, .15)); });
      s += spin(26, `<circle cx="50" cy="-7.5" r="3.2" fill="url(#gxs)"/><circle cx="48.4" cy="-8.8" r="1" fill="#fff" opacity=".8"/>`) + spin(17, `<circle cx="50" cy="-1" r="2" fill="#7fe8ff"/>`, true);
      s += ring(50.6, 'url(#gxe)', 1.4) + ring(64.3, '#9b6bff', .8, 'opacity=".6"');
      s += `<path d="M96,-4 L112,-12" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;.6;.7;1" dur="5s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;-26 14;-26 14" keyTimes="0;.7;1" dur="5s" repeatCount="indefinite"/></path>`;
      return s;
    },
    /* ---- ornate gold ring with gems ---- */
    gold() {
      let s = `<defs>${grad('gdg', [[0, '#fff2b0'], [.45, '#e6a817'], [1, '#8a5a00']])}</defs>`;
      s += ring(55, '#5a3a00', 10.5, 'opacity=".55"') + ring(55, 'url(#gdg)', 8) + ring(50.8, '#fff2b0', 1) + ring(60, 'url(#gdg)', 1.8) + ring(59.2, '#5a3a00', .6);
      s += around(12, a => { const [x, y] = pt(a, 60.8); return `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff2b0"/>`; }, .13);
      s += around(8, (a, i) => { const [x, y] = pt(a, 55), c = ['#ff3b5c', '#3ddc97', '#5fb4ff', '#c78bff'][i % 4]; return `<circle cx="${x}" cy="${y}" r="3.9" fill="#fff3c4"/><circle cx="${x}" cy="${y}" r="2.9" fill="${c}"/><circle cx="${f(x - 1)}" cy="${f(y - 1.1)}" r=".9" fill="#fff" opacity=".85"/>`; });
      s += spin(7, `<path d="M${P(-1.1, 55)} A55 55 0 0 1 ${P(-.55, 55)}" stroke="#fff" stroke-width="3" fill="none" opacity=".75" stroke-linecap="round"/>`);
      return s;
    },
    /* ---- double neon tube with orbiting sparks ---- */
    neon() {
      let s = `<defs>${glow('ngl', 1.7)}</defs><g filter="url(#ngl)">${ring(53.5, '#22e6ff', 3)}${ring(59, '#ff2bd6', 2.2)}</g>`;
      s += ring(53.5, '#e8ffff', 1) + ring(59, '#ffe8fb', .8);
      s += around(24, (a, i) => { const [x1, y1] = pt(a, 62.5), [x2, y2] = pt(a, i % 2 ? 65 : 67); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#22e6ff" stroke-width="1.2" stroke-linecap="round"><animate attributeName="opacity" values=".2;1;.2" dur="1.6s" begin="${i * .07}s" repeatCount="indefinite"/></line>`; });
      s += spin(5, `<circle cx="50" cy="-3.5" r="3" fill="#fff" filter="url(#ngl)"/><circle cx="50" cy="103.5" r="2.4" fill="#22e6ff" filter="url(#ngl)"/>`) + spin(7, `<circle cx="50" cy="-9" r="3" fill="#fff" filter="url(#ngl)"/><circle cx="109" cy="50" r="2.4" fill="#ff2bd6" filter="url(#ngl)"/>`, true);
      return s;
    },
    /* ---- frozen crystal ring ---- */
    ice() {
      let s = `<defs>${grad('icg', [[0, '#ffffff'], [.5, '#8fe3ff'], [1, '#3a8fd9']], 0, 1)}${glow('igl', 1.2)}</defs>`;
      s += `<g filter="url(#igl)">` + around(18, (a, i) => { const L = i % 3 === 0 ? 17 : i % 2 ? 9 : 13, [x1, y1] = pt(a - .11, 53), [x2, y2] = pt(a, 53 + L), [x3, y3] = pt(a + .11, 53); return `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3}Z" fill="url(#icg)" stroke="#e9fbff" stroke-width=".7"/>`; }) + `</g>`;
      s += ring(53, 'url(#icg)', 5) + ring(50.8, '#fff', 1, 'opacity=".9"') + ring(55.4, '#e9fbff', .8, 'opacity=".8"');
      s += around(7, (a, i) => { const [x, y] = pt(a + .4, 66 + (i % 2) * 3); return star4(x, y, 2.6, '#fff', blink(2 + i * .3, i * .4, .1)); });
      return s;
    },
    /* ---- living flames ---- */
    fire() {
      let s = `<defs>${grad('fig', [[0, '#fff3a0'], [.4, '#ffb21e'], [.75, '#ff4a12'], [1, '#a80d00']], 0, 0, 0, 1)}${glow('fgl', 1.6)}</defs>`;
      s += ring(52, '#3a0d00', 7) + ring(52, '#ff6a00', 2, 'opacity=".9"');
      const fl = (h, w) => `M${50 - w},1 C${50 - w - .6},${-h * .35} ${49},${-h * .3} 50,${-h} C51,${-h * .3} ${50 + w + .6},${-h * .35} ${50 + w},1 Z`;
      s += `<g filter="url(#fgl)">` + around(22, (a, i) => { const h = 11 + (i * 7 % 5) * 2.6, deg = f(a * 180 / Math.PI + 90); return `<g transform="rotate(${deg} 50 50)"><path d="${fl(h, 3.6)}" fill="url(#fig)"><animate attributeName="d" values="${fl(h, 3.6)};${fl(h * .7, 3.1)};${fl(h * 1.1, 3.9)};${fl(h, 3.6)}" dur="${(.55 + (i % 4) * .12).toFixed(2)}s" begin="${(i * .09).toFixed(2)}s" repeatCount="indefinite"/></path><path d="${fl(h * .55, 1.9)}" fill="#fff3a0" opacity=".85"/></g>`; }, -Math.PI / 2) + `</g>`;
      s += around(6, (a, i) => { const [x, y] = pt(a + .3, 60); return `<circle cx="${x}" cy="${y}" r="1" fill="#ffd166"><animate attributeName="cy" values="${y};${y - 12}" dur="${1.2 + i * .2}s" begin="${i * .3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${1.2 + i * .2}s" begin="${i * .3}s" repeatCount="indefinite"/></circle>`; });
      return s;
    },
    /* ---- glitchy RGB-split ring ---- */
    glitch() {
      const r = rnd(5); let s = `<g><g>${ring(54, '#ff2d55', 3.2, 'opacity=".9"')}<animateTransform attributeName="transform" type="translate" values="0 0;-3 0;2 1;0 0;3 -1;0 0" dur="1.1s" calcMode="discrete" repeatCount="indefinite"/></g><g>${ring(54, '#22e6ff', 3.2, 'opacity=".9"')}<animateTransform attributeName="transform" type="translate" values="0 0;3 0;-2 -1;0 0;-3 1;0 0" dur="1.1s" calcMode="discrete" repeatCount="indefinite"/></g></g>`;
      s += ring(54, '#fff', 1.6);
      s += around(14, (a, i) => { const [x, y] = pt(a, 58 + r() * 6), w = 5 + r() * 9; return `<rect x="${f(x - w / 2)}" y="${f(y - 1)}" width="${f(w)}" height="2.2" fill="${['#ff2d55', '#22e6ff', '#fff'][i % 3]}" opacity=".45"><animate attributeName="opacity" values=".45;1;.2;1;.45" keyTimes="0;.1;.2;.3;1" dur="${(1.1 + r()).toFixed(2)}s" begin="${(r() * 2).toFixed(2)}s" repeatCount="indefinite"/></rect>`; });
      s += around(10, (a, i) => { const [x, y] = pt(a + .2, 50 + r() * 15); return `<rect x="${f(x)}" y="${f(y)}" width="3" height="3" fill="${['#fff', '#22e6ff', '#ff2d55'][i % 3]}" opacity=".9"><animate attributeName="opacity" values="1;0;1" dur=".6s" begin="${(i * .13).toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"/></rect>`; });
      return s;
    },
    /* ---- rotating rainbow ---- */
    rainbow() {
      let seg = ''; for (let i = 0; i < 48; i++) { const a0 = i / 48 * TAU, a1 = (i + 1.15) / 48 * TAU; seg += `<path d="M${P(a0, 55)} A55 55 0 0 1 ${P(a1, 55)}" stroke="hsl(${i * 7.5},95%,60%)" stroke-width="8.5" fill="none"/>`; }
      let s = `<defs>${glow('rgl', 1.2)}</defs><g filter="url(#rgl)">${spin(9, seg)}</g>` + ring(50.6, '#fff', 1, 'opacity=".8"') + ring(59.6, '#fff', .8, 'opacity=".55"');
      s += around(7, (a, i) => { const [x, y] = pt(a + .2, 55 + (i % 2) * 6); return star4(x, y, 3, '#fff', blink(1.2 + i * .25, i * .3, 0)); });
      return s;
    },
    /* ---- crown and laurel ---- */
    royal() {
      let s = `<defs>${grad('ryg', [[0, '#fff0a6'], [.5, '#e0a419'], [1, '#7d5200']])}${grad('ryp', [[0, '#b46bff'], [1, '#3a0f86']], 1, 1)}</defs>`;
      s += ring(54, 'url(#ryp)', 7) + ring(50.6, '#ffe28a', 1.1) + ring(57.8, 'url(#ryg)', 1.6);
      const leaf = (a, i, c) => { const [x, y] = pt(a, 55.5), deg = f(a * 180 / Math.PI + 90 + (i % 2 ? 38 : -38)); return `<ellipse cx="${x}" cy="${y}" rx="5.6" ry="2.2" fill="${c}" stroke="#14532d" stroke-width=".5" transform="rotate(${deg} ${x} ${y})"/>`; };
      s += Array.from({ length: 9 }, (_, i) => leaf(.3 + i * .33, i, ['#43e08a', '#2fbf6c', '#ffd166'][i % 3])).join('') + Array.from({ length: 9 }, (_, i) => leaf(Math.PI - .3 - i * .33, i + 1, ['#43e08a', '#2fbf6c', '#ffd166'][i % 3])).join('');
      s += `<path d="M31,3 L32,-15 L41,-6 L50,-20 L59,-6 L68,-15 L69,3 Z" fill="url(#ryg)" stroke="#5a3a00" stroke-width="1.2" stroke-linejoin="round"/><path d="M31,3 L69,3 L69,-1 L31,-1Z" fill="#7d5200" opacity=".5"/>`;
      s += `<circle cx="32" cy="-15" r="2.6" fill="#ff3b5c"/><circle cx="50" cy="-20" r="3.2" fill="#5fb4ff"/><circle cx="68" cy="-15" r="2.6" fill="#3ddc97"/><circle cx="50" cy="-4" r="2.2" fill="#c78bff"/>` + star4(50, -26, 3.2, '#fff', blink(1.6, 0, .2));
      return s;
    },
    /* ---- vine with leaves and flowers ---- */
    nature() {
      const r = rnd(21); let d = ''; for (let i = 0; i <= 120; i++) { const t = i / 120 * TAU, rr = 54 + 2.8 * Math.sin(t * 14); d += (i ? 'L' : 'M') + P(t, rr); }
      let s = `<path d="${d}Z" fill="none" stroke="#2c6b2f" stroke-width="4.2" stroke-linecap="round"/><path d="${d}Z" fill="none" stroke="#5fc45a" stroke-width="1.8"/>`;
      s += around(26, (a, i) => { const [x, y] = pt(a, 56 + (i % 2) * 2), out = i % 2 ? 40 : -40, deg = f(a * 180 / Math.PI + 90 + out); return `<ellipse cx="${x}" cy="${y}" rx="4.8" ry="2.1" fill="${['#3fa84a', '#6cd05f', '#2e8b3a'][i % 3]}" stroke="#1d5a28" stroke-width=".4" transform="rotate(${deg} ${x} ${y})"/>`; });
      s += around(5, (a, i) => { const [x, y] = pt(a + .2, 61); const col = ['#ff7ab6', '#ffd166', '#ff9ecf', '#fff', '#ffb36b'][i]; return Array.from({ length: 5 }, (_, k) => { const [px, py] = [x + 3 * Math.cos(k * 1.2566), y + 3 * Math.sin(k * 1.2566)]; return `<circle cx="${f(px)}" cy="${f(py)}" r="2.4" fill="${col}" stroke="#fff" stroke-width=".3"/>`; }).join('') + `<circle cx="${x}" cy="${y}" r="1.7" fill="#ffe066"/>`; });
      s += around(7, (a, i) => { const [x, y] = pt(a, 64 + r() * 4); return `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff59a">${blink(1.8 + r(), r() * 2, 0)}</circle>`; });
      return s;
    },
    /* ---- circuit board traces ---- */
    cyber() {
      let s = `<defs>${glow('cgl', 1.2)}</defs>` + ring(54, '#06202e', 7) + ring(54, '#22e6ff', 1.3, 'opacity=".95"') + ring(50.8, '#22e6ff', .8, 'opacity=".7"');
      s += `<g filter="url(#cgl)">` + around(16, (a, i) => { const c = i % 2 ? '#22e6ff' : '#ff2bd6', r1 = 63 + (i % 3) * 3, d = `M${P(a, 57)} L${P(a, 59.5)} L${P(a + .085, 61.5)} L${P(a + .085, r1)}`, [nx, ny] = pt(a + .085, r1 + 1.6); return `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.1"/><circle cx="${nx}" cy="${ny}" r="1.7" fill="${c}"/>`; }) + `</g>`;
      s += around(8, (a, i) => { const [x, y] = pt(a, 54); return `<rect x="${f(x - 2.2)}" y="${f(y - 2.2)}" width="4.4" height="4.4" fill="#22e6ff" transform="rotate(${f(a * 57.3 + 45)} ${x} ${y})"/>`; }, .2);
      s += spin(2.6, `<circle cx="50" cy="-4" r="2.2" fill="#fff" filter="url(#cgl)"/>`) + spin(4.1, `<circle cx="50" cy="-4" r="1.8" fill="#ff2bd6" filter="url(#cgl)"/>`, true);
      return s;
    },
    /* ---- halo and feathered wings ---- */
    angel() {
      let s = `<defs>${glow('agl', 2)}${grad('awg', [[0, '#ffffff'], [1, '#cfe8ff']], 0, 1)}</defs>`;
      const wing = `<g>` + Array.from({ length: 6 }, (_, i) => `<ellipse cx="-2" cy="55" rx="${17 - i * .6}" ry="4.8" transform="rotate(${-62 + i * 20} 14 55)" fill="url(#awg)" stroke="#bcd8ff" stroke-width=".8"/>`).join('') + `<ellipse cx="10" cy="53" rx="9" ry="6" fill="#fff" stroke="#bcd8ff" stroke-width=".8"/></g>`;
      s += `<g filter="url(#agl)" opacity=".95">${wing}${mirror(wing)}</g>`;
      s += ring(54, '#fff', 2.6, 'opacity=".9"') + ring(54, '#cfe8ff', 6, 'opacity=".35"');
      s += `<g filter="url(#agl)"><ellipse cx="50" cy="-8" rx="23" ry="6" fill="none" stroke="#ffe27a" stroke-width="3"/><ellipse cx="50" cy="-8" rx="23" ry="6" fill="none" stroke="#fff6c2" stroke-width="1"/></g>`;
      s += around(6, (a, i) => { const [x, y] = pt(a + .4, 66); return star4(x, y, 2.4, '#fff', blink(1.6 + i * .3, i * .4, 0)); });
      return s;
    },
    /* ---- horns and embers ---- */
    demon() {
      let s = `<defs>${grad('dmg', [[0, '#ff3a1f'], [1, '#2a0008']], 0, 0, 0, 1)}${glow('dgl', 1.8)}${grad('dhg', [[0, '#3a0a14'], [.6, '#a3122a'], [1, '#e8344e']], 0, 1, 1, 0)}</defs>`;
      s += `<g filter="url(#dgl)">` + ring(52, '#140409', 8) + ring(50.6, '#ff1f3d', 1.8) + `</g>`;
      s += around(16, (a, i) => { const L = i % 2 ? 9 : 14, [x1, y1] = pt(a - .09, 54), [x2, y2] = pt(a, 54 + L), [x3, y3] = pt(a + .09, 54); return `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3}Z" fill="url(#dmg)" stroke="#ff1f3d" stroke-width=".5"/>`; }, .1);
      const horn = `<path d="M33,4 C24,-4 21,-16 29,-27 C30,-16 36,-9 44,-4 Z" fill="url(#dhg)" stroke="#12020a" stroke-width="1"/><path d="M30,-18 C31,-12 35,-8 39,-6" fill="none" stroke="#ff7d8e" stroke-width=".9" opacity=".7"/>`;
      s += horn + mirror(horn);
      s += around(8, (a, i) => { const [x, y] = pt(a + .1, 58 + (i % 3) * 3); return `<circle cx="${x}" cy="${y}" r="1.1" fill="#ffb347"><animate attributeName="cy" values="${y};${y - 13}" dur="${1.3 + i * .15}s" begin="${i * .2}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${1.3 + i * .15}s" begin="${i * .2}s" repeatCount="indefinite"/></circle>`; });
      return s;
    },
    /* ---- ocean waves and bubbles ---- */
    ocean() {
      const wave = (amp, ph, r0) => { let d = ''; for (let i = 0; i <= 160; i++) { const t = i / 160 * TAU; d += (i ? 'L' : 'M') + P(t, r0 + amp * Math.sin(t * 18 + ph)); } return d + 'Z'; };
      let s = `<defs>${grad('ocg', [[0, '#bff3ff'], [.5, '#3aa7ff'], [1, '#0b4fb0']], 0, 1)}</defs>`;
      s += `<path d="${wave(3.4, 0, 54)}" fill="none" stroke="#0b3f8f" stroke-width="7" opacity=".75"/>` + spin(40, `<path d="${wave(3.4, 0, 54)}" fill="none" stroke="url(#ocg)" stroke-width="4.8"/>`, true) + spin(28, `<path d="${wave(2.4, 2, 58.6)}" fill="none" stroke="#bff3ff" stroke-width="1.6" opacity=".75"/>`);
      s += around(18, (a, i) => { const [x, y] = pt(a, 57.6); return i % 2 ? '' : `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" opacity=".9"/>`; });
      s += around(7, (a, i) => { const [x, y] = pt(a + .3, 62); return `<circle cx="${x}" cy="${y}" r="${(1.3 + i % 3 * .6).toFixed(1)}" fill="none" stroke="#e8fbff" stroke-width=".7"><animate attributeName="cy" values="${y};${y - 14}" dur="${2 + i * .25}s" begin="${i * .35}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${2 + i * .25}s" begin="${i * .35}s" repeatCount="indefinite"/></circle>`; });
      return s;
    },
    /* ---- cherry blossom branch ---- */
    sakura() {
      const r = rnd(9); let d = ''; for (let i = 0; i <= 120; i++) { const t = i / 120 * TAU, rr = 54 + 1.8 * Math.sin(t * 9) + 1.2 * Math.sin(t * 23); d += (i ? 'L' : 'M') + P(t, rr); }
      let s = `<path d="${d}Z" fill="none" stroke="#4a2a1d" stroke-width="3.6" stroke-linecap="round"/><path d="${d}Z" fill="none" stroke="#8a5a43" stroke-width="1.2"/>`;
      const flower = (x, y, sc) => Array.from({ length: 5 }, (_, k) => { const a = k * 1.2566 - 1.57; return `<ellipse cx="${f(x + 3.4 * sc * Math.cos(a))}" cy="${f(y + 3.4 * sc * Math.sin(a))}" rx="${f(3.2 * sc)}" ry="${f(2.3 * sc)}" fill="#ffc2dc" stroke="#ff8fb8" stroke-width=".4" transform="rotate(${f(a * 57.3)} ${f(x + 3.4 * sc * Math.cos(a))} ${f(y + 3.4 * sc * Math.sin(a))})"/>`; }).join('') + `<circle cx="${x}" cy="${y}" r="${f(1.6 * sc)}" fill="#ffe066"/>`;
      s += around(11, (a, i) => { const [x, y] = pt(a, 55.5 + (i % 2) * 3); return flower(x, y, .75 + (i % 3) * .2); });
      s += around(6, (a, i) => { const [x, y] = pt(a + .2, 64); return `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.2" fill="#ffc2dc"><animate attributeName="cy" values="${y};${y + 16}" dur="${3 + i * .4}s" begin="${i * .6}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${3 + i * .4}s" begin="${i * .6}s" repeatCount="indefinite"/></ellipse>`; });
      return s;
    },
    /* ---- crackling lightning ---- */
    lightning() {
      const r = rnd(33); let s = `<defs>${glow('lgl', 1.8)}</defs>` + `<g filter="url(#lgl)">${ring(53.5, '#b9d9ff', 2.4)}${ring(53.5, '#fff', 1)}</g>`;
      s += around(9, (a, i) => { let pts = [P(a, 55)]; let rr = 55; for (let k = 1; k <= 5; k++) { rr += 2.2 + r() * 2.6; pts.push(P(a + (r() - .5) * .22, rr)); } const d = 'M' + pts.join(' L'); return `<g opacity=".28"><path d="${d}" fill="none" stroke="#ffe36b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".55" filter="url(#lgl)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><animate attributeName="opacity" values=".28;1;.3;1;.28;.28" keyTimes="0;.05;.1;.15;.25;1" dur="${(1.4 + r() * 1.2).toFixed(2)}s" begin="${(r() * 2).toFixed(2)}s" repeatCount="indefinite"/></g>`; });
      s += spin(3, `<circle cx="50" cy="-3.5" r="2.4" fill="#fff" filter="url(#lgl)"/>`);
      return s;
    },
    /* ---- 8-bit pixel ring with sprites ---- */
    pixel() {
      const seen = new Set(); let s = ''; for (let i = 0; i < 160; i++) { const a = i / 160 * TAU, x = Math.round((50 + 55 * Math.cos(a)) / 4) * 4 - 2, y = Math.round((50 + 55 * Math.sin(a)) / 4) * 4 - 2, k = x + ',' + y; if (seen.has(k)) continue; seen.add(k); s += `<rect x="${x}" y="${y}" width="4" height="4" fill="${(x + y) / 4 % 2 ? '#35e07a' : '#1aa653'}" stroke="#0a3d1f" stroke-width=".5"/>`; }
      const sprite = (rows, px, py, pal, sc = 2.2) => rows.map((row, ry) => [...row].map((c, cx) => c !== '.' ? `<rect x="${f(px + cx * sc)}" y="${f(py + ry * sc)}" width="${sc}" height="${sc}" fill="${pal[c]}"/>` : '').join('')).join('');
      s += sprite(['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], 0, -8, { r: '#ff4d6d' }, 2.2);
      s += `<g>${sprite(['.yyy.', 'yyoyy', 'yoooy', 'yyoyy', '.yyy.'], 84, -6, { y: '#ffd23a', o: '#e08a00' }, 2.4)}<animate attributeName="opacity" values="1;.35;1" dur=".8s" repeatCount="indefinite" calcMode="discrete"/></g>`;
      s += sprite(['..w..', '.www.', 'wwwww', '.www.', '..w..'], 2, 96, { w: '#8ff3ff' }, 2.4) + sprite(['.ggg.', 'ggggg', 'g.g.g', 'ggggg', '.g.g.'], 86, 94, { g: '#b0ff6b' }, 2.2);
      return s;
    },
    /* ---- exclusive developer frame ---- */
    nixe() {
      let seg = ''; for (let i = 0; i < 48; i++) { const a0 = i / 48 * TAU, a1 = (i + 1.15) / 48 * TAU; seg += `<path d="M${P(a0, 56)} A56 56 0 0 1 ${P(a1, 56)}" stroke="hsl(${i * 7.5},100%,62%)" stroke-width="7" fill="none"/>`; }
      let s = `<defs>${glow('xgl', 2)}${grad('xgg', [[0, '#fff6b0'], [.5, '#ffbf1f'], [1, '#a86a00']])}</defs><g filter="url(#xgl)">${spin(6, seg)}</g>` + ring(50.6, '#fff', 1.2) + ring(51.5, 'url(#xgg)', 1.6) + ring(60.4, '#fff', .8, 'opacity=".7"');
      s += `<g filter="url(#xgl)"><path d="M28,4 L29,-16 L39,-6 L50,-24 L61,-6 L71,-16 L72,4 Z" fill="url(#xgg)" stroke="#6b4300" stroke-width="1.2" stroke-linejoin="round"/></g>`;
      s += [['29', '-16', '#ff3b5c'], ['50', '-24', '#22e6ff'], ['71', '-16', '#3ddc97']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${c}" stroke="#fff" stroke-width=".7"/>`).join('');
      s += around(10, (a, i) => { const [x, y] = pt(a + .1, 63 + (i % 2) * 5); return star4(x, y, 3, '#fff', blink(1 + i * .15, i * .2, 0)); });
      s += `<text x="50" y="119" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" stroke="#6b4300" stroke-width=".6" font-family="system-ui,sans-serif">∞<animate attributeName="opacity" values="1;.5;1" dur="1.4s" repeatCount="indefinite"/></text>`;
      return s;
    }
  };
  const META = [
    ['gold', 'Gold crown ring', 80], ['neon', 'Neon tubes', 120], ['nature', 'Enchanted vine', 130], ['pixel', '8-bit pixels', 160], ['ice', 'Frost crystals', 150], ['cyber', 'Circuit board', 180],
    ['fire', 'Inferno', 200], ['ocean', 'Ocean waves', 220], ['sakura', 'Sakura branch', 240], ['galaxy', 'Spiral galaxy', 260], ['lightning', 'Thunder storm', 300], ['glitch', 'Glitch', 320],
    ['angel', 'Angel wings', 350], ['demon', 'Demon horns', 350], ['rainbow', 'Rainbow', 400], ['royal', 'Royal crown', 500], ['nixe', 'MyBadNixe (exclusive)', -1]
  ];
  const cache = {};
  return {
    list: [{ id: 'none', name: 'No frame', cost: 0 }, ...META.map(([id, name, cost]) => ({ id, name, cost }))],
    ids: ['none', ...META.map(m => m[0])],
    svg(id) { if (!ART[id]) return ''; return cache[id] || (cache[id] = `<svg class="fr fr-${id}" viewBox="-20 -20 140 140" aria-hidden="true">${ART[id]()}</svg>`); }
  };
})();
