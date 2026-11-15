// Jeu de la vie : l'automate cellulaire de Conway et ses cousins. Dessine des cellules, lance la simulation, pose des motifs célèbres,
// change la règle (B3/S23, HighLife, Seeds…), suis la population, et échange tes créations au format RLE.
const CSS = `
.jvGrid{display:grid;grid-template-columns:minmax(0,1fr) clamp(290px,23vw,400px);gap:16px}
@media (max-width:900px){.jvGrid{grid-template-columns:minmax(0,1fr)}}
.jvCan{width:100%;height:clamp(300px,calc(100vh - 330px),940px);box-sizing:border-box;display:block;image-rendering:pixelated;background:#0b0816;border:2px solid var(--line);cursor:crosshair;touch-action:none}
.jvCan.pan{cursor:grab}.jvCan.panning{cursor:grabbing}
.jvRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.jvStat{font:16px monospace;color:var(--lilac)}
.jvStat b{color:#fff}
.jvPop{width:100%;height:46px;display:block;image-rendering:pixelated;background:var(--bg0);border:2px solid var(--line);margin-top:6px}
.jvPat{display:grid;grid-template-columns:repeat(auto-fill,minmax(98px,1fr));gap:5px;margin-bottom:6px}
.jvKind{display:block;font-size:13px;color:var(--muted);margin:8px 0 4px;letter-spacing:1px}
.jvSide{max-height:calc(100vh - 150px);overflow:auto}
.jvPat button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 3px;border:2px solid var(--line);background:var(--bg0);color:var(--lilac);font:13px var(--text,monospace);text-align:center;line-height:1.15;cursor:var(--cp,pointer)}
.jvPat button.on{border-color:var(--magenta);color:#fff}
.jvPat canvas{image-rendering:pixelated;width:72px;height:48px}
.jvRange{-webkit-appearance:none;appearance:none;height:10px;background:var(--bg0);border:2px solid var(--line);outline:none;flex:1;min-width:80px}
.jvRange::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:22px;background:var(--magenta);border:2px solid #000;cursor:var(--cp,pointer)}
.jvRle{width:100%;min-height:80px;box-sizing:border-box;font:14px monospace}
.jvHelp{font-size:14px;color:var(--muted);line-height:1.5}
`;
// les motifs, en RLE (le format de tous les sites de motifs du jeu de la vie)
const PATTERNS = [  // [nom, RLE, ce qu'il fait, famille]
  ['Planeur', 'bob$2bo$3o!', 'le plus petit vaisseau : il traverse la grille en diagonale, tous les 4 tours', 'Vaisseaux'],
  ['Vaisseau léger', 'bo2bo$o4b$o3bo$4o!', 'LWSS : il file à l\'horizontale, 2 cases tous les 4 tours', 'Vaisseaux'],
  ['Vaisseau moyen', '3bo$bo3bo$o$o4bo$5o!', 'MWSS : le grand frère du vaisseau léger', 'Vaisseaux'],
  ['Vaisseau lourd', '3b2o$bo4bo$o$o5bo$6o!', 'HWSS : le plus gros des trois vaisseaux classiques', 'Vaisseaux'],
  ['Copperhead', 'b2o2b2o$3b2o$3b2o$obo2bobo$o6bo2$o6bo$b2o2b2o$2b4o2$3b2o$3b2o!', 'vaisseau lent découvert en 2016 : une case tous les 10 tours', 'Vaisseaux'],
  ['Clignotant', '3o!', 'oscillateur de période 2', 'Oscillateurs'],
  ['Crapaud', 'b3o$3o!', 'oscillateur de période 2', 'Oscillateurs'],
  ['Phare', '2o2b$2o2b$2b2o$2b2o!', 'oscillateur de période 2', 'Oscillateurs'],
  ['Horloge', '2bo$obo$bobo$bo!', 'oscillateur de période 2 qui tourne comme une aiguille', 'Oscillateurs'],
  ['Pulsar', '2b3o3b3o2b2$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b2$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo2$2b3o3b3o!', 'oscillateur de période 3', 'Oscillateurs'],
  ['Octogone', '3b2o$2bo2bo$bo4bo$o6bo$o6bo$bo4bo$2bo2bo$3b2o!', 'oscillateur de période 5', 'Oscillateurs'],
  ['Huit', '3o$3o$3o$3b3o$3b3o$3b3o!', 'deux carrés qui se touchent : période 8', 'Oscillateurs'],
  ['Galaxie de Kok', '6ob2o$6ob2o$7b2o$2o5b2o$2o5b2o$2o5b2o$2o$2ob6o$2ob6o!', 'une spirale qui tourne : période 8', 'Oscillateurs'],
  ['Culbuteur', 'bo5bo$obo3bobo$o2bobo2bo$2bo3bo$2b2ob2o!', 'il se retourne et revient : période 14', 'Oscillateurs'],
  ['Pentadécathlon', '2bo4bo2b$2ob4ob2o$2bo4bo!', 'oscillateur de période 15', 'Oscillateurs'],
  ['Bloc', '2o$2o!', 'nature morte : ne bouge jamais', 'Natures mortes'],
  ['Ruche', 'b2o$o2bo$b2o!', 'nature morte de 6 cellules', 'Natures mortes'],
  ['Pain', 'b2o$o2bo$bobo$2bo!', 'nature morte de 7 cellules', 'Natures mortes'],
  ['Bateau', '2o$obo$bo!', 'nature morte de 5 cellules', 'Natures mortes'],
  ['Mare', 'b2o$o2bo$o2bo$b2o!', 'nature morte de 8 cellules', 'Natures mortes'],
  ['R-pentomino', 'b2o$2o$bo!', '5 cellules qui s\'agitent pendant 1103 tours', 'Mathusalems'],
  ['Gland', 'bo5b$3bo3b$2o2b3o!', '7 cellules, 5206 tours de chaos', 'Mathusalems'],
  ['Increvable', '6bob$2o6b$bo3b3o!', 'disparaît complètement au bout de 130 tours', 'Mathusalems'],
  ['Canon à planeurs', '24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!', 'Gosper (1970) : un nouveau planeur tous les 30 tours, la population grandit sans fin', 'Canons'],
  ['Canon de Simkin', '2o5b2o$2o5b2o2$4b2o$4b2o5$22b2ob2o$21bo5bo$21bo6bo2b2o$21b3o3bo3b2o$26bo4$20b2o$20bo$21b3o$23bo!', 'Simkin (2015) : le plus petit canon connu, un planeur tous les 120 tours', 'Canons'],
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
const parseRule = s => { const m = /^B([1-8]*)\/S([0-8]*)$/i.exec(s.trim().replace(/\s/g, '')); if (!m) return null;  // pas de B0 : sur une grille infinie, tout le vide naîtrait d'un coup
  const b = Array(9).fill(0), sv = Array(9).fill(0); for (const d of m[1]) b[d] = 1; for (const d of m[2]) sv[d] = 1; return {b, s: sv, txt: 'B' + m[1] + '/S' + m[2]}; };
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast } = ctx.host;
  ctx.host.addStyle(CSS);
  // la grille est infinie : on ne garde que les cellules vivantes (clé = x et y rangés dans un seul nombre, valeur = âge)
  const O = 2097152, M = 4194304, K = (x, y) => (x + O) * M + (y + O), KX = k => Math.floor(k / M) - O, KY = k => k % M - O;
  let live = new Map();
  let data = null; try { data = await ctx.folder.read('vie'); } catch {}
  const st = {rule: parseRule(data?.rule || '') ? data.rule : 'B3/S23', speed: data?.speed ?? 12, rle: data?.rle || null, at: data?.at, view: data?.view || null};
  let rule = parseRule(st.rule), gen = 0, running = false, pat = null, rot = 0, hover = null, pops = [];
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { const cs = cellsOf(); st.rle = toRle(cs, rule.txt); st.at = cs.length ? [Math.min(...cs.map(c => c[0])), Math.min(...cs.map(c => c[1]))] : [0, 0]; st.view = {ox: vw.ox, oy: vw.oy, cs: vw.cs}; ctx.folder.write('vie', st).catch(() => {}); }, 600); };
  const cellsOf = () => [...live.keys()].map(k => [KX(k), KY(k)]);
  const setCell = (x, y, on) => { if (on) live.set(K(x, y), 0); else live.delete(K(x, y)); };
  function step() {  // chaque cellule vivante ajoute 1 à ses 8 voisines ; puis naissances et survies selon la règle
    const cnt = new Map();
    for (const k of live.keys()) { const x = KX(k), y = KY(k); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const q = K(x + dx, y + dy); cnt.set(q, (cnt.get(q) || 0) + 1); } }
    const nx = new Map();
    for (const [k, a] of live) if (rule.s[cnt.get(k) || 0]) nx.set(k, Math.min(65535, a + 1));
    for (const [q, n] of cnt) if (rule.b[n] && !live.has(q)) nx.set(q, 0);
    live = nx; gen++;
    pops.push(live.size); if (pops.length > 300) pops.shift();
  }
  // vérification : le clignotant revient à lui-même en 2 tours, le planeur se retrouve décalé de (1, 1) en 4 tours, chaque oscillateur à sa période, chaque vaisseau à sa vitesse
  { const put = cs => { live = new Map(cs.map(([x, y]) => [K(x, y), 0])); }, norm = () => { const c = cellsOf(), mx = Math.min(...c.map(q => q[0])), my = Math.min(...c.map(q => q[1])); return {k: c.map(([x, y]) => (x - mx) + ',' + (y - my)).sort().join(';'), mx, my}; };
    const back = (name, per, dx, dy) => { put(parseRle(PATTERNS.find(q => q[0] === name)[1])); const a = norm(); for (let i = 0; i < per; i++) step(); const z = norm(); return z.k === a.k && z.mx - a.mx === dx && z.my - a.my === dy; };
    console.assert(back('Clignotant', 2, 0, 0) && back('Planeur', 4, 1, 1) && back('Vaisseau moyen', 4, -2, 0) && back('Vaisseau lourd', 4, -2, 0) && back('Copperhead', 10, 0, -1) && back('Octogone', 5, 0, 0) && back('Galaxie de Kok', 8, 0, 0) && back('Culbuteur', 14, 0, 0) && back('Ruche', 1, 0, 0) && back('Mare', 1, 0, 0)
      && parseRle(toRle(parseRle(PATTERNS.find(q => q[0] === 'Canon à planeurs')[1]), 'B3/S23')).length === 36 && KX(K(-5, 7)) === -5 && KY(K(-5, 7)) === 7, 'vie : motifs, RLE, clés');
    live = new Map(); gen = 0; pops = []; }
  const vw = {ox: st.view?.ox ?? 0, oy: st.view?.oy ?? 0, cs: st.view?.cs ?? 0};  // la vue : le coin haut gauche (en cellules) et la taille d'une cellule (en pixels) ; cs = 0 : à régler à la première image

  view.innerHTML = '';
  const wrap = el('div', 'appWrap wide'), head = el('div', 'agHead'), lay = el('div', 'jvGrid'), main = el('div'), side = el('div', 'sysCard px jvSide');
  head.append(el('span', 'label', 'Jeu de la vie · automates cellulaires')); lay.append(main, side); wrap.append(head, lay); view.append(wrap);
  const can = el('canvas', 'jvCan'), g = can.getContext('2d'); can.id = 'jv_canvas';
  const bar = el('div', 'jvRow'), stat = el('div', 'jvStat'), popC = el('canvas', 'jvPop'), pg = popC.getContext('2d'); popC.width = 300; popC.height = 46; stat.id = 'jv_stat';
  const play = el('button', 'btn px main', '▶ Lancer'), one = el('button', 'btn px', 'Un tour'), clear = el('button', 'btn px', 'Effacer'), rnd = el('button', 'btn px', 'Au hasard'), speed = el('input', 'jvRange'), panB = el('button', 'btn px', '✋ Déplacer'), fitB = el('button', 'btn px', 'Recentrer');
  play.id = 'jv_play'; one.id = 'jv_step'; speed.type = 'range'; speed.min = 1; speed.max = 60; speed.value = st.speed; speed.title = 'Vitesse (tours par seconde)';
  panB.title = 'Glisser fait bouger la grille au lieu de dessiner (aussi : clic molette, ou Maj + glisser)'; fitB.title = 'Cadrer toutes les cellules vivantes'; panB.id = 'jv_pan'; fitB.id = 'jv_fit';
  bar.append(play, one, el('span', 'hint', 'Vitesse'), speed, clear, rnd, panB, fitB);
  main.append(can, bar, stat, popC, el('p', 'jvHelp', 'La grille est infinie. Clic ou glisser : dessiner. Clic droit : effacer. Clic molette, Maj + glisser ou « Déplacer » : faire glisser la grille ; molette : zoomer. Avec un motif choisi : clic pour le poser, R pour le tourner, Échap pour le lâcher. Espace : lancer ou arrêter.'));
  const setRun = on => { running = on; play.textContent = on ? '❚❚ Arrêter' : '▶ Lancer'; if (on) loop(); else save(); };
  play.onclick = () => setRun(!running);
  one.onclick = () => { setRun(false); step(); draw(); };
  clear.onclick = () => { setRun(false); live = new Map(); gen = 0; pops = []; draw(); save(); };
  rnd.onclick = () => {  // au hasard dans ce qu'on voit (au plus 240 × 160 cellules, au centre)
    const vwW = Math.min(240, Math.ceil(can.width / vw.cs)), vwH = Math.min(160, Math.ceil(can.height / vw.cs)), x0 = Math.floor(vw.ox + (can.width / vw.cs - vwW) / 2), y0 = Math.floor(vw.oy + (can.height / vw.cs - vwH) / 2);
    live = new Map(); for (let y = 0; y < vwH; y++) for (let x = 0; x < vwW; x++) if (Math.random() < .28) live.set(K(x0 + x, y0 + y), 0); gen = 0; pops = []; draw(); save(); };
  let panMode = false; panB.onclick = () => { panMode = !panMode; panB.classList.toggle('main', panMode); can.classList.toggle('pan', panMode); };
  function fit() {  // toutes les cellules vivantes dans la vue, avec une marge
    const c = cellsOf(); if (!c.length) { vw.cs = Math.max(4, Math.round(can.width / 160)); vw.ox = vw.oy = 0; draw(); return; }
    const x0 = Math.min(...c.map(q => q[0])) - 4, x1 = Math.max(...c.map(q => q[0])) + 5, y0 = Math.min(...c.map(q => q[1])) - 4, y1 = Math.max(...c.map(q => q[1])) + 5;
    vw.cs = Math.max(1, Math.min(32, Math.floor(Math.min(can.width / (x1 - x0), can.height / (y1 - y0))))); vw.ox = (x0 + x1) / 2 - can.width / vw.cs / 2; vw.oy = (y0 + y1) / 2 - can.height / vw.cs / 2; draw(); save();
  }
  fitB.onclick = fit;
  speed.oninput = () => { st.speed = +speed.value; save(); };
  let acc = 0, lastT = 0;
  function loop(t) { if (!running) return; if (t && lastT) { acc += (t - lastT) / 1000 * st.speed; let n = 0; while (acc >= 1 && n < 8) { step(); acc--; n++; } if (acc > 8) acc = 0; } lastT = t || 0; draw(); requestAnimationFrame(loop); }
  const AGE = ['#ffe9a8', '#ffd34f', '#ff9f4f', '#ff4fb0', '#c04fd8', '#7a4fd8', '#4a4fb0'];  // jeune = clair, vieux = sombre
  function stamp() { if (!pat) return []; let cs = parseRle(pat[1]); for (let r = 0; r < rot; r++) cs = cs.map(([x, y]) => [-y, x]); const mx = Math.min(...cs.map(c => c[0])), my = Math.min(...cs.map(c => c[1])); return cs.map(([x, y]) => [x - mx, y - my]); }
  function draw() {
    const r = can.getBoundingClientRect(), cw = Math.max(1, Math.round(r.width)), ch = Math.max(1, Math.round(r.height));
    if (can.width !== cw || can.height !== ch) { can.width = cw; can.height = ch; }
    if (!vw.cs) vw.cs = Math.max(3, Math.floor(cw / 160));
    const cs = vw.cs, gap = cs >= 4 ? 1 : 0, x0 = Math.floor(vw.ox), y0 = Math.floor(vw.oy), sx = x => Math.round((x - vw.ox) * cs), sy = y => Math.round((y - vw.oy) * cs);
    g.fillStyle = '#0b0816'; g.fillRect(0, 0, cw, ch);
    if (cs >= 12) { g.fillStyle = '#120e22'; for (let x = x0; x <= x0 + cw / cs + 1; x++) g.fillRect(sx(x), 0, 1, ch); for (let y = y0; y <= y0 + ch / cs + 1; y++) g.fillRect(0, sy(y), cw, 1); }
    const L = cs >= 3 ? 10 : 50; g.fillStyle = '#1c1636';
    for (let x = Math.ceil(vw.ox / L) * L; x <= vw.ox + cw / cs; x += L) g.fillRect(sx(x), 0, 1, ch); for (let y = Math.ceil(vw.oy / L) * L; y <= vw.oy + ch / cs; y += L) g.fillRect(0, sy(y), cw, 1);
    g.fillStyle = '#3a2f66'; g.fillRect(sx(0), 0, 1, ch); g.fillRect(0, sy(0), cw, 1);  // l'origine, pour se repérer
    for (const [k, a] of live) { const px = sx(KX(k)), py = sy(KY(k)); if (px < -cs || py < -cs || px > cw || py > ch) continue; g.fillStyle = AGE[a < 2 ? 0 : a < 5 ? 1 : a < 12 ? 2 : a < 30 ? 3 : a < 80 ? 4 : a < 200 ? 5 : 6]; g.fillRect(px, py, Math.max(1, cs - gap), Math.max(1, cs - gap)); }
    if (pat && hover) { g.fillStyle = 'rgba(127,224,255,.55)'; for (const [x, y] of stamp()) g.fillRect(sx(hover[0] + x), sy(hover[1] + y), Math.max(1, cs - gap), Math.max(1, cs - gap)); }
    const pop = live.size;
    stat.innerHTML = ''; for (const [k, v] of [['Génération', gen], ['Population', pop], ['Règle', rule.txt]]) { const s = el('span', '', k + ' '); s.append(el('b', '', String(v)), '   '); stat.append(s); }
    pg.fillStyle = '#0b0816'; pg.fillRect(0, 0, 300, 46);
    if (pops.length > 1) { const mx = Math.max(...pops, 1); pg.fillStyle = '#ff4fb0'; pops.forEach((p, i) => { const h = Math.max(1, Math.round(p / mx * 42)); pg.fillRect(i, 46 - h, 1, h); }); }
  }
  // la souris : dessiner, effacer, poser un motif
  let painting = null, panning = null;
  const cellAt = e => { const r = can.getBoundingClientRect(); return [Math.floor(vw.ox + (e.clientX - r.left) / vw.cs), Math.floor(vw.oy + (e.clientY - r.top) / vw.cs)]; };
  can.oncontextmenu = e => e.preventDefault();
  can.onpointerdown = e => {
    try { can.setPointerCapture(e.pointerId); } catch {}  // un pointeur déjà relâché n'a rien à capturer
    if (e.button === 1 || panMode || e.shiftKey) { e.preventDefault(); panning = {x: e.clientX, y: e.clientY, ox: vw.ox, oy: vw.oy}; can.classList.add('panning'); return; }
    const [x, y] = cellAt(e);
    if (pat && e.button === 0) { for (const [dx, dy] of stamp()) setCell(x + dx, y + dy, 1); draw(); save(); return; }
    painting = e.button === 2 ? 0 : live.has(K(x, y)) ? 0 : 1; setCell(x, y, painting); draw();
  };
  can.onpointermove = e => {
    if (panning) { vw.ox = panning.ox - (e.clientX - panning.x) / vw.cs; vw.oy = panning.oy - (e.clientY - panning.y) / vw.cs; if (!running) draw(); return; }
    const c = cellAt(e); hover = c; if (painting !== null) setCell(c[0], c[1], painting); if (!running) draw();
  };
  can.onpointerup = () => { if (panning) { panning = null; can.classList.remove('panning'); save(); } if (painting !== null) { painting = null; save(); } };
  can.onpointerleave = () => { hover = null; if (!running) draw(); };
  can.addEventListener('wheel', e => {  // zoomer autour de la souris
    e.preventDefault(); const r = can.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, wx = vw.ox + mx / vw.cs, wy = vw.oy + my / vw.cs;
    vw.cs = Math.max(1, Math.min(40, e.deltaY < 0 ? Math.ceil(vw.cs * 1.25) : Math.floor(vw.cs / 1.25))); vw.ox = wx - mx / vw.cs; vw.oy = wy - my / vw.cs; if (!running) draw(); save();
  }, {passive: false});
  new ResizeObserver(() => { if (!running) draw(); }).observe(can);
  const onKey = e => {
    if (!view.isConnected || !view.classList.contains('on') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;  // seulement quand l'onglet est affiché
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
    side.append(el('span', 'label', 'Motifs (' + PATTERNS.length + ')'));
    for (const kind of [...new Set(PATTERNS.map(q => q[3]))]) {
      const pl = el('div', 'jvPat');
      for (const p of PATTERNS.filter(q => q[3] === kind)) { const b = el('button', pat === p ? 'on' : ''); b.title = p[2]; b.append(thumb(p[1]), p[0]); b.onclick = () => { pat = pat === p ? null : p; rot = 0; drawSide(); draw(); }; pl.append(b); }
      side.append(el('span', 'jvKind', kind.toUpperCase()), pl);
    }
    side.append( el('p', 'jvHelp', pat ? pat[0] + ' : ' + pat[2] + '. Clic sur la grille pour le poser, R pour le tourner.' : 'Choisis un motif, puis clique sur la grille pour le poser.'));
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
  if (st.rle) { const [ox, oy] = st.at || [0, 0]; for (const [x, y] of parseRle(st.rle)) setCell(x + ox, y + oy, 1); }  // la grille d'avant, à sa place
  else for (const [x, y] of parseRle(PATTERNS.find(q => q[0] === 'Canon à planeurs')[1])) setCell(x + 10, y + 10, 1);  // la première fois : le canon à planeurs
  can.__vw = vw;  // pour le test
  drawSide(); draw();
}
