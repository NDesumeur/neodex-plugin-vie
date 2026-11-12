// Jeu de la vie : l'automate cellulaire de Conway et ses cousins. Dessine des cellules, lance la simulation, pose des motifs célèbres,
// change la règle (B3/S23, HighLife, Seeds…), suis la population, et échange tes créations au format RLE.
const CSS = `
.jvGrid{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:14px}
@media (max-width:900px){.jvGrid{grid-template-columns:minmax(0,1fr)}}
.jvCan{width:100%;display:block;image-rendering:pixelated;background:#0b0816;border:2px solid var(--line);cursor:crosshair;touch-action:none}
.jvRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.jvStat{font:13px monospace;color:var(--lilac)}
.jvStat b{color:#fff}
.jvPop{width:100%;height:46px;display:block;image-rendering:pixelated;background:var(--bg0);border:2px solid var(--line);margin-top:6px}
.jvPat{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.jvPat button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;border:2px solid var(--line);background:var(--bg0);color:var(--lilac);font:11px var(--text,monospace);cursor:var(--cp,pointer)}
.jvPat button.on{border-color:var(--magenta);color:#fff}
.jvPat canvas{image-rendering:pixelated;width:48px;height:32px}
.jvRange{-webkit-appearance:none;appearance:none;height:10px;background:var(--bg0);border:2px solid var(--line);outline:none;flex:1;min-width:80px}
.jvRange::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:22px;background:var(--magenta);border:2px solid #000;cursor:var(--cp,pointer)}
.jvRle{width:100%;min-height:80px;box-sizing:border-box;font:12px monospace}
.jvHelp{font-size:12px;color:var(--muted);line-height:1.5}
`;
// les motifs, en RLE (le format de tous les sites de motifs du jeu de la vie)
const PATTERNS = [
  ['Planeur', 'bob$2bo$3o!', 'le plus petit vaisseau : il traverse la grille en diagonale, tous les 4 tours'],
  ['Vaisseau léger', 'bo2bo$o4b$o3bo$4o!', 'LWSS : il file à l\'horizontale'],
  ['Clignotant', '3o!', 'oscillateur de période 2'],
  ['Crapaud', 'b3o$3o!', 'oscillateur de période 2'],
  ['Phare', '2o2b$2o2b$2b2o$2b2o!', 'oscillateur de période 2'],
  ['Pulsar', '2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!', 'oscillateur de période 3'],
  ['Pentadécathlon', '2bo4bo2b$2ob4ob2o$2bo4bo!', 'oscillateur de période 15'],
  ['Canon à planeurs', '24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!', 'Gosper (1970) : un nouveau planeur tous les 30 tours, la population grandit sans fin'],
  ['R-pentomino', 'b2o$2o$bo!', '5 cellules qui s\'agitent pendant 1103 tours'],
  ['Gland', 'bo5b$3bo3b$2o2b3o!', '7 cellules, 5206 tours de chaos'],
  ['Increvable', '6bob$2o6b$bo3b3o!', 'disparaît complètement au bout de 130 tours'],
  ['Bloc', '2o$2o!', 'nature morte : ne bouge jamais'],
];
const RULES = [['B3/S23', 'Conway'], ['B36/S23', 'HighLife'], ['B2/S', 'Seeds'], ['B3678/S34678', 'Jour et nuit'], ['B3/S12345', 'Labyrinthe'], ['B3/S012345678', 'Vie sans mort'], ['B1357/S1357', 'Réplicateur'], ['B368/S245', 'Morley']];
function parseRle(s) {  // -> [[x, y], ...]
  const body = s.split('\n').filter(l => !/^\s*(#|x\s*=)/.test(l)).join('').replace(/\s/g, ''), cells = []; let x = 0, y = 0, n = '';
  for (const c of body) {
    if (/\d/.test(c)) { n += c; continue; }
    const k = n ? +n : 1; n = '';
    if (c === 'b' || c === '.') x += k; else if (c === 'o' || c === 'A') { for (let i = 0; i < k; i++) cells.push([x++, y]); } else if (c === '$') { y += k; x = 0; } else if (c === '!') break;
  }
  return cells;
}
function toRle(cells, rule) {
  if (!cells.length) return 'x = 0, y = 0, rule = ' + rule + '\n!';
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 + 1, h = Math.max(...ys) - y0 + 1, set = new Set(cells.map(([x, y]) => (x - x0) + ',' + (y - y0)));
  let out = '', run = (k, c) => (k > 1 ? k : '') + c;
  for (let y = 0; y < h; y++) {
    let line = '', cur = null, k = 0;
    for (let x = 0; x < w; x++) { const c = set.has(x + ',' + y) ? 'o' : 'b'; if (c === cur) k++; else { if (cur) line += run(k, cur); cur = c; k = 1; } }
    if (cur === 'o') line += run(k, cur);
    out += line + (y < h - 1 ? '$' : '!');
  }
  return 'x = ' + w + ', y = ' + h + ', rule = ' + rule + '\n' + out.replace(/(.{1,70})/g, '$1\n').trim();
}
const parseRule = s => { const m = /^B([0-8]*)\/S([0-8]*)$/i.exec(s.trim().replace(/\s/g, '')); if (!m) return null; const b = Array(9).fill(0), sv = Array(9).fill(0); for (const d of m[1]) b[d] = 1; for (const d of m[2]) sv[d] = 1; return {b, s: sv, txt: 'B' + m[1] + '/S' + m[2]}; };
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast } = ctx.host;
  ctx.host.addStyle(CSS);
  const W = 160, H = 100;
  let grid = new Uint8Array(W * H), age = new Uint16Array(W * H), next = new Uint8Array(W * H);
  let data = null; try { data = await ctx.folder.read('vie'); } catch {}
  const st = {rule: parseRule(data?.rule || '') ? data.rule : 'B3/S23', speed: data?.speed ?? 12, wrap: data?.wrap ?? true, rle: data?.rle || null};
  let rule = parseRule(st.rule), gen = 0, running = false, pat = null, rot = 0, hover = null, pops = [];
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { const cs = cellsOf(); st.rle = toRle(cs, rule.txt); st.at = cs.length ? [Math.min(...cs.map(c => c[0])), Math.min(...cs.map(c => c[1]))] : [0, 0]; ctx.folder.write('vie', st).catch(() => {}); }, 600); };
  const cellsOf = () => { const c = []; for (let i = 0; i < W * H; i++) if (grid[i]) c.push([i % W, (i / W) | 0]); return c; };
  function step() {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; let xx = x + dx, yy = y + dy;
        if (st.wrap) { xx = (xx + W) % W; yy = (yy + H) % H; } else if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        n += grid[yy * W + xx];
      }
      const i = y * W + x; next[i] = grid[i] ? rule.s[n] : rule.b[n]; age[i] = next[i] ? (grid[i] ? Math.min(65535, age[i] + 1) : 0) : 0;
    }
    [grid, next] = [next, grid]; gen++;
    pops.push(grid.reduce((a, v) => a + v, 0)); if (pops.length > 300) pops.shift();
  }
  // vérification : le clignotant revient à lui-même en 2 tours, le planeur se retrouve décalé de (1, 1) en 4 tours
  { const put = cs => { grid.fill(0); for (const [x, y] of cs) grid[y * W + x] = 1; }, key = () => cellsOf().map(c => c.join(',')).join(';');
    put(parseRle('3o!').map(([x, y]) => [x + 10, y + 10])); const a = key(); step(); const mid = key(); step();
    put(parseRle('bob$2bo$3o!').map(([x, y]) => [x + 20, y + 20])); const g0 = cellsOf().map(([x, y]) => (x + 1) + ',' + (y + 1)).join(';'); step(); step(); step(); step();
    console.assert(a !== mid && key() === g0 && parseRle(toRle(parseRle(PATTERNS[7][1]), 'B3/S23')).length === 36, 'vie : clignotant, planeur, RLE');
    grid.fill(0); gen = 0; pops = []; }

  view.innerHTML = '';
  const wrap = el('div', 'appWrap'), head = el('div', 'agHead'), lay = el('div', 'jvGrid'), main = el('div'), side = el('div', 'sysCard px');
  head.append(el('span', 'label', 'Jeu de la vie · automates cellulaires')); lay.append(main, side); wrap.append(head, lay); view.append(wrap);
  const can = el('canvas', 'jvCan'), g = can.getContext('2d'), CELL = 6; can.width = W * CELL; can.height = H * CELL; can.id = 'jv_canvas';
  const bar = el('div', 'jvRow'), stat = el('div', 'jvStat'), popC = el('canvas', 'jvPop'), pg = popC.getContext('2d'); popC.width = 300; popC.height = 46; stat.id = 'jv_stat';
  const play = el('button', 'btn px main', '▶ Lancer'), one = el('button', 'btn px', 'Un tour'), clear = el('button', 'btn px', 'Effacer'), rnd = el('button', 'btn px', 'Au hasard'), speed = el('input', 'jvRange'), wrapB = el('button', 'btn px' + (st.wrap ? ' main' : ''), 'Bords reliés');
  play.id = 'jv_play'; one.id = 'jv_step'; speed.type = 'range'; speed.min = 1; speed.max = 60; speed.value = st.speed; speed.title = 'Vitesse (tours par seconde)';
  wrapB.title = 'Ce qui sort d\'un côté revient de l\'autre (un tore)';
  bar.append(play, one, el('span', 'hint', 'Vitesse'), speed, clear, rnd, wrapB);
  main.append(can, bar, stat, popC, el('p', 'jvHelp', 'Clic ou glisser : dessiner. Clic droit : effacer. Avec un motif choisi : clic pour le poser, R pour le tourner, Échap pour le lâcher. Espace : lancer ou arrêter.'));
  const setRun = on => { running = on; play.textContent = on ? '❚❚ Arrêter' : '▶ Lancer'; if (on) loop(); else save(); };
  play.onclick = () => setRun(!running);
  one.onclick = () => { setRun(false); step(); draw(); };
  clear.onclick = () => { setRun(false); grid.fill(0); age.fill(0); gen = 0; pops = []; draw(); save(); };
  rnd.onclick = () => { for (let i = 0; i < W * H; i++) { grid[i] = Math.random() < .28 ? 1 : 0; age[i] = 0; } gen = 0; pops = []; draw(); save(); };
  speed.oninput = () => { st.speed = +speed.value; save(); };
  wrapB.onclick = () => { st.wrap = !st.wrap; wrapB.classList.toggle('main', st.wrap); save(); };
  let acc = 0, lastT = 0;
  function loop(t) { if (!running) return; if (t && lastT) { acc += (t - lastT) / 1000 * st.speed; let n = 0; while (acc >= 1 && n < 8) { step(); acc--; n++; } if (acc > 8) acc = 0; } lastT = t || 0; draw(); requestAnimationFrame(loop); }
  const AGE = ['#ffe9a8', '#ffd34f', '#ff9f4f', '#ff4fb0', '#c04fd8', '#7a4fd8', '#4a4fb0'];  // jeune = clair, vieux = sombre
  function stamp() { if (!pat) return []; let cs = parseRle(pat[1]); for (let r = 0; r < rot; r++) cs = cs.map(([x, y]) => [-y, x]); const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(([x, y]) => [x - mx, y - my]); }
  function draw() {
    g.fillStyle = '#0b0816'; g.fillRect(0, 0, can.width, can.height);
    g.fillStyle = '#16122a'; for (let x = 0; x <= W; x += 10) g.fillRect(x * CELL, 0, 1, can.height); for (let y = 0; y <= H; y += 10) g.fillRect(0, y * CELL, can.width, 1);
    for (let i = 0; i < W * H; i++) if (grid[i]) { const a = age[i], c = AGE[a < 2 ? 0 : a < 5 ? 1 : a < 12 ? 2 : a < 30 ? 3 : a < 80 ? 4 : a < 200 ? 5 : 6]; g.fillStyle = c; g.fillRect((i % W) * CELL, ((i / W) | 0) * CELL, CELL - 1, CELL - 1); }
    if (pat && hover) { g.fillStyle = 'rgba(127,224,255,.55)'; for (const [x, y] of stamp()) { const xx = hover[0] + x, yy = hover[1] + y; if (xx < W && yy < H) g.fillRect(xx * CELL, yy * CELL, CELL - 1, CELL - 1); } }
    const pop = grid.reduce((a, v) => a + v, 0);
    stat.innerHTML = ''; for (const [k, v] of [['Génération', gen], ['Population', pop], ['Règle', rule.txt]]) { const s = el('span', '', k + ' '); s.append(el('b', '', String(v)), '   '); stat.append(s); }
    pg.fillStyle = '#0b0816'; pg.fillRect(0, 0, 300, 46);
    if (pops.length > 1) { const mx = Math.max(...pops, 1); pg.fillStyle = '#ff4fb0'; pops.forEach((p, i) => { const h = Math.max(1, Math.round(p / mx * 42)); pg.fillRect(i, 46 - h, 1, h); }); }
  }
  // la souris : dessiner, effacer, poser un motif
  let painting = null;
  const cellAt = e => { const r = can.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)]; };
  can.oncontextmenu = e => e.preventDefault();
  can.onpointerdown = e => {
    const [x, y] = cellAt(e); if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (pat && e.button === 0) { for (const [dx, dy] of stamp()) { const xx = x + dx, yy = y + dy; if (xx < W && yy < H) { grid[yy * W + xx] = 1; age[yy * W + xx] = 0; } } draw(); save(); return; }
    painting = e.button === 2 ? 0 : grid[y * W + x] ? 0 : 1; can.setPointerCapture(e.pointerId); grid[y * W + x] = painting; age[y * W + x] = 0; draw();
  };
  can.onpointermove = e => { const c = cellAt(e); hover = c; if (painting !== null && c[0] >= 0 && c[1] >= 0 && c[0] < W && c[1] < H) { grid[c[1] * W + c[0]] = painting; age[c[1] * W + c[0]] = 0; } if (!running) draw(); };
  can.onpointerup = () => { if (painting !== null) { painting = null; save(); } };
  can.onpointerleave = () => { hover = null; if (!running) draw(); };
  const onKey = e => {
    if (!view.isConnected || !view.offsetParent || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === ' ') { e.preventDefault(); setRun(!running); }
    else if ((e.key === 'r' || e.key === 'R') && pat) { rot = (rot + 1) % 4; draw(); }
    else if (e.key === 'Escape' && pat) { pat = null; drawSide(); draw(); }
  };
  document.addEventListener('keydown', onKey);
  ctx.onClose?.(() => { setRun(false); });
  // le côté : motifs, règles, RLE
  function thumb(rle) { const cs = parseRle(rle), w = Math.max(...cs.map(c => c[0])) + 1, h = Math.max(...cs.map(c => c[1])) + 1, k = Math.max(1, Math.floor(Math.min(48 / w, 32 / h))), c = el('canvas'), t = c.getContext('2d'); c.width = 48; c.height = 32; t.fillStyle = '#0b0816'; t.fillRect(0, 0, 48, 32); t.fillStyle = '#ffd34f'; const ox = Math.floor((48 - w * k) / 2), oy = Math.floor((32 - h * k) / 2); for (const [x, y] of cs) t.fillRect(ox + x * k, oy + y * k, Math.max(1, k - (k > 2 ? 1 : 0)), Math.max(1, k - (k > 2 ? 1 : 0))); return c; }
  const ruleIn = el('input', 'f'), rle = el('textarea', 'f jvRle');
  function drawSide() {
    side.replaceChildren();
    const pl = el('div', 'jvPat');
    for (const p of PATTERNS) { const b = el('button', pat === p ? 'on' : ''); b.title = p[2]; b.append(thumb(p[1]), p[0]); b.onclick = () => { pat = pat === p ? null : p; rot = 0; drawSide(); draw(); }; pl.append(b); }
    side.append(el('span', 'label', 'Motifs'), pl, el('p', 'jvHelp', pat ? pat[0] + ' : ' + pat[2] + '. Clic sur la grille pour le poser, R pour le tourner.' : 'Choisis un motif, puis clique sur la grille pour le poser.'));
    const rl = el('div', 'jvRow'); for (const [r, n] of RULES) { const b = el('button', 'btn px' + (rule.txt === r ? ' main' : ''), n); b.title = r; b.onclick = () => setRule(r); rl.append(b); }
    ruleIn.value = rule.txt; ruleIn.id = 'jv_rule'; ruleIn.spellcheck = false; ruleIn.oninput = () => { const r = parseRule(ruleIn.value); ruleIn.style.outline = r ? '' : '2px solid #e05a5a'; if (r) { rule = r; st.rule = r.txt; save(); draw(); } };
    side.append(el('span', 'label', 'Règle'), rl, ruleIn, el('p', 'jvHelp', 'B = les nombres de voisines qui font naître une cellule, S = ceux qui la gardent en vie. Conway : B3/S23.'));
    const imp = el('button', 'btn px', 'Poser ce RLE'), exp = el('button', 'btn px', 'Copier la grille en RLE'); rle.placeholder = 'colle un motif au format RLE (bob$2bo$3o!)'; rle.id = 'jv_rle';
    imp.onclick = () => { const cs = parseRle(rle.value); if (!cs.length) return toast('Aucune cellule dans ce RLE', true); const m = /rule\s*=\s*(B\d*\/S\d*)/i.exec(rle.value); if (m && parseRule(m[1])) setRule(m[1]); pat = ['Motif collé', rle.value.split('\n').filter(l => !/^\s*(#|x\s*=)/.test(l)).join(''), cs.length + ' cellules']; rot = 0; drawSide(); draw(); };
    exp.onclick = () => { const t = toRle(cellsOf(), rule.txt); rle.value = t; navigator.clipboard.writeText(t).then(() => toast('Copié'), () => {}); };
    const rr = el('div', 'jvRow'); rr.append(imp, exp);
    side.append(el('span', 'label', 'Format RLE'), rle, rr);
  }
  function setRule(r) { rule = parseRule(r); st.rule = rule.txt; save(); drawSide(); draw(); }
  if (st.rle) { const [ox, oy] = st.at || [0, 0]; for (const [x, y] of parseRle(st.rle)) if (x + ox < W && y + oy < H) grid[(y + oy) * W + x + ox] = 1; }  // la grille d'avant, à sa place
  else for (const [x, y] of parseRle(PATTERNS[7][1])) grid[(y + 10) * W + x + 10] = 1;  // la première fois : le canon à planeurs
  drawSide(); draw();
}
