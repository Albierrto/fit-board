// Builds gifts.html (the shareable gift list) from the catalog in index.html.
// Run from the repo root after any change to PR or the looks:  node tools/build-gifts.js
// Every buyable piece that appears in at least one look is listed, with its drawing, price, store and stock date.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// Hand-picked favorites, shown first in their section with a "Top pick" chip.
const PICKS = ['jwaFairIsle', 'tsRedCheck', 'marniHooded', 'thunderCardi', 'abCardi', 'carharttJ169', 'uqCordWine', 'afBomber', 'kenzoShirt', 'egDuffle'];

const SECTIONS = [
  ['sweaters', 'Sweaters and knits'],
  ['shirts', 'Shirts and tees'],
  ['cardigans', 'Cardigans and vests'],
  ['jackets', 'Jackets, overshirts and coats'],
  ['pants', 'Pants'],
  ['shoes', 'Shoes'],
];
const sectionOf = p => {
  const t = (p.draw && p.draw.t) || '';
  if (p.cat === 'bottom') return 'pants';
  if (p.cat === 'shoes') return 'shoes';
  if (p.cat === 'top') return ['crew', 'vneck', 'polo', 'qzip', 'knithen', 'hoodie'].includes(t) ? 'sweaters' : 'shirts';
  if (p.cat === 'layer' && ['cardigan', 'vest'].includes(t)) return 'cardigans';
  return 'jackets';
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(root, 'index.html'));
  await p.waitForTimeout(400);
  const data = await p.evaluate(() => {
    const zany = new Set(), used = new Set();
    LOOKS.forEach(l => l.pieces.forEach(k => { used.add(k); if (l.tags.includes('zany')) zany.add(k); }));
    const items = Object.values(PR).filter(x => !x.mine && x.url && used.has(x.id)).map(x => ({
      id: x.id, cat: x.cat, draw: x.draw, name: x.name, brand: x.brand, store: x.store, price: x.price, was: x.was,
      used: !!x.used, url: x.url, checked: x.checked || STOCK_DATE, size: x.size || (SIZE_NOTE[x.id] || 'XL'),
      zany: zany.has(x.id), svg: pieceSVG(x),
    }));
    return { defs: document.querySelector('svg[width="0"]').outerHTML, items };
  });
  await b.close();

  const dates = [...new Set(data.items.map(i => i.checked))];
  const groups = SECTIONS.map(([key, label]) => {
    const list = data.items.filter(i => sectionOf(i) === key)
      .sort((a, c) => (PICKS.includes(c.id) - PICKS.includes(a.id)) || a.price - c.price);
    if (!list.length) return '';
    const rows = list.map(i => {
      const pick = PICKS.includes(i.id);
      const tags = [i.used ? 'used' : 'new', i.zany ? 'zany' : '', i.price < 50 ? 'under50' : ''].filter(Boolean).join(' ');
      const meta = [i.store === i.brand || !i.brand ? i.store : `${i.brand} at ${i.store}`, i.used ? 'secondhand' : 'new',
        i.used ? '' : `size ${i.size}`, i.was ? `on sale from ${money(i.was)}` : ''].filter(Boolean).join(' · ');
      return `<li class="${pick ? 'pick' : ''}" data-tags="${tags}"><span class="thumb">${i.svg.replace('role="img"', 'role="img" focusable="false"')}</span>` +
        `<span class="name">${pick ? '<span class="tag">Top pick</span>' : ''}${i.zany ? '<span class="tag zany">Zany</span>' : ''}${esc(i.name)}</span>` +
        `<span class="price">${money(i.price)}</span><span class="meta">${esc(meta)}</span>` +
        `<a class="go" href="${esc(i.url)}" target="_blank" rel="noopener">See it at ${esc(i.store)}</a></li>`;
    }).join('\n');
    return `<section data-sec="${key}"><h2>${label} <span class="count"></span></h2><ul>\n${rows}\n</ul></section>`;
  }).join('\n');

  const html = fs.readFileSync(path.join(__dirname, 'gifts.template.html'), 'utf8')
    .replace('{{DEFS}}', data.defs)
    .replace('{{GROUPS}}', groups)
    .replace('{{TOTAL}}', String(data.items.length))
    .replace('{{DATES}}', dates.join(' and '));
  if (html.includes('—')) throw new Error('em dash in gifts.html');
  fs.writeFileSync(path.join(root, 'gifts.html'), html);
  console.log(`gifts.html: ${data.items.length} pieces`);
})();
