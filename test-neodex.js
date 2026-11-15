// lancé par le test « local » de NeoDex : le canon à planeurs de départ, des tours un par un, un planeur posé à la souris, une autre règle
module.exports = async ({ pj, sleep }) => {
  const stat = () => pj(`document.getElementById('jv_stat').textContent`);
  const num = async k => { const s = await stat(), m = new RegExp(k + ' ([0-9]+)').exec(s); if (!m) throw new Error('pas de « ' + k + ' » dans ' + JSON.stringify(s)); return +m[1]; };
  const steps = n => pj(`(() => { for (let i = 0; i < ${n}; i++) document.getElementById('jv_step').click(); })(), 0`);
  const btn = t => pj(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(t)} || b.textContent.trim().endsWith(${JSON.stringify(t)})).click(), 0`);
  await sleep(500);
  const s0 = await stat(); if (!/Population 36/.test(s0)) throw new Error('au départ : ' + JSON.stringify(s0));
  await steps(30); await sleep(200);
  if (await num('Génération') !== 30 || await num('Population') < 40) throw new Error('après 30 tours : ' + await stat());
  await btn('Effacer'); await sleep(100); await btn('Planeur'); await sleep(100);
  await pj(`(() => { const c = document.getElementById('jv_canvas'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', {clientX: r.left + r.width * .3, clientY: r.top + r.height * .3, button: 0, bubbles: true})); })(), 0`); await sleep(100);
  await steps(8); await sleep(100);
  if (await num('Population') !== 5) throw new Error('le planeur ne vit pas : ' + await stat());
  await pj(`(() => { const f = document.getElementById('jv_rule'); f.value = 'B36/S23'; f.dispatchEvent(new Event('input')); })(), 0`); await sleep(100);
  if (!/B36\/S23/.test(await stat())) throw new Error('règle : ' + await stat());
  await btn('Conway'); await btn('Effacer'); await btn('Canon à planeurs');
  await pj(`(() => { const c = document.getElementById('jv_canvas'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', {clientX: r.left + r.width * .06, clientY: r.top + r.height * .06, button: 0, bubbles: true})); })(), 0`);
  await pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})), 0`); await steps(150); await sleep(300);
  // la grille glisse : en mode Déplacer, glisser de 100 px vers la gauche décale la vue de 100 / taille d'une cellule
  const v0 = await pj(`({...document.getElementById('jv_canvas').__vw})`);
  await pj(`document.getElementById('jv_pan').click(), 0`);
  await pj(`(() => { const c = document.getElementById('jv_canvas'), r = c.getBoundingClientRect(), o = x => ({clientX: r.left + x, clientY: r.top + 100, button: 0, pointerId: 1, bubbles: true}); c.dispatchEvent(new PointerEvent('pointerdown', o(300))); c.dispatchEvent(new PointerEvent('pointermove', o(200))); c.dispatchEvent(new PointerEvent('pointerup', o(200))); })(), 0`);
  const v1 = await pj(`({...document.getElementById('jv_canvas').__vw})`);
  if (Math.abs(v1.ox - v0.ox - 100 / v0.cs) > .01 || v1.oy !== v0.oy) throw new Error('glisser : ' + JSON.stringify([v0, v1]));
  await pj(`document.getElementById('jv_pan').click(), 0`);
  // la grille est infinie : les planeurs du canon partent au loin et la population grandit toujours
  const p1 = await num('Population'); await steps(600); await sleep(200); const p2 = await num('Population');
  if (p2 <= p1 + 60) throw new Error('les planeurs se perdent : ' + p1 + ' → ' + p2);
  await pj(`document.getElementById('jv_fit').click(), 0`); await sleep(200);
  const v2 = await pj(`document.getElementById('jv_canvas').__vw`);
  const onAfterEsc = await pj(`document.querySelectorAll('.jvPat button.on').length`); if (onAfterEsc) throw new Error('Échap ne lâche pas le motif');
  await btn('Effacer'); await btn('Canon à planeurs');
  await pj(`(() => { const c = document.getElementById('jv_canvas'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', {clientX: r.left + r.width * .08, clientY: r.top + r.height * .1, button: 0, bubbles: true})); })(), 0`);
  await pj(`document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})), 0`); await pj(`document.getElementById('jv_fit').click(), 0`); await steps(160); await sleep(300);
  return 'canon, 30 tours, planeur posé, règle HighLife, grille qui glisse, ' + p2 + ' cellules après 600 tours de plus, recadrage à ' + v2.cs + ' px ok';
};
