// Fit Board self-check. Run from the repo root:  node tools/check.js [screenshot-dir]
// Loads index.html at phone and desktop sizes and checks data, layout and wording.
// Exits 1 if anything is wrong. Screenshots of every tab land in the screenshot dir (default /tmp/fitboard-shots).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shots = process.argv[2] || '/tmp/fitboard-shots';
fs.mkdirSync(shots, { recursive: true });
const problems = [];

// Wording rules for the public page
if (html.includes('—')) problems.push('em dash found in index.html');
for (const w of ['bigger', 'fuller', 'chubby', '200 lb', "5'10", 'overweight', 'heavyset', 'husky'])
  if (html.toLowerCase().includes(w.toLowerCase())) problems.push(`body word "${w}" found in index.html`);

(async () => {
  const b = await chromium.launch();
  const url = 'file://' + path.join(root, 'index.html');

  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(600);

  const data = await p.evaluate(() => {
    const out = { looks: LOOKS.length, issues: [], wearable: 0, groups: {} };
    const names = new Set();
    for (const l of LOOKS) {
      if (names.has(l.name)) out.issues.push(`duplicate look name "${l.name}"`);
      names.add(l.name);
      for (const k of [l.layer, l.top, l.bottom, l.shoes].filter(Boolean))
        if (!PR[k]) out.issues.push(`look "${l.name}" uses missing piece "${k}"`);
      if (!l.why || !Array.isArray(l.tags) || !l.tags.length) out.issues.push(`look "${l.name}" needs why and tags`);
    }
    for (const [k, v] of Object.entries(PR)) {
      if (v.mine) continue;
      if (!/^https:\/\//.test(v.url || '')) out.issues.push(`${k} has no https url`);
      if (typeof v.price !== 'number' || !(v.price > 0)) out.issues.push(`${k} has a bad price`);
      if (!v.store) out.issues.push(`${k} has no store`);
      if (!v.draw) out.issues.push(`${k} has no draw`);
      const tex = v.draw && v.draw.tex;
      if (tex && tex.startsWith('x-') && !document.getElementById(tex)) out.issues.push(`${k} uses pattern ${tex} that is not in the defs`);
    }
    out.wearable = LOOKS.filter(l => l.pieces.every(k => PR[k].mine)).length;
    for (const g of ['deal', 'zany', 'cool']) out.groups[g] = LOOKS.filter(l => l.tags.includes(g)).length;
    return out;
  });
  problems.push(...data.issues);

  for (const v of ['wear', 'buy', 'ideas', 'closet']) {
    await p.goto(url + '#' + v); await p.waitForTimeout(400);
    if (v === 'ideas') {
      for (const g of ['new', 'zany', 'cool']) {
        const btn = p.locator(`#ideaSeg button[data-i="${g}"]`);
        if (await btn.count()) { await btn.click(); await p.waitForTimeout(250); await p.screenshot({ path: `${shots}/phone_ideas_${g}.png`, fullPage: true }); }
      }
    } else await p.screenshot({ path: `${shots}/phone_${v}.png` });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sw > 0) problems.push(`phone ${v} tab scrolls sideways by ${sw}px`);
  }
  const svgs = await p.evaluate(() => document.querySelectorAll('svg').length);
  if (svgs < 10) problems.push('outfit drawings did not render');

  const d = await b.newPage({ viewport: { width: 1280, height: 900 } });
  d.on('pageerror', e => errs.push(e.message));
  await d.goto(url + '#ideas'); await d.waitForTimeout(500);
  await d.screenshot({ path: `${shots}/desktop_ideas.png` });

  problems.push(...errs.map(e => 'JS error: ' + e));
  await b.close();

  console.log(`looks ${data.looks}, wearable from closet ${data.wearable}, zany ${data.groups.zany}, cool ${data.groups.cool}, deal ${data.groups.deal}`);
  console.log(`screenshots in ${shots}`);
  if (problems.length) { console.log('PROBLEMS:\n- ' + problems.join('\n- ')); process.exit(1); }
  console.log('OK');
})();
