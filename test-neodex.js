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
  return 'canon, 30 tours, planeur posé, règle HighLife ok';
};
