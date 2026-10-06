import { chromium } from 'playwright';
import fs from 'fs';
const S = process.argv[2], base = 'https://human-optimization-lab.vercel.app/app';
const DATA = JSON.parse(fs.readFileSync(S + '/markers.json', 'utf8'));
const inject = (DATA) => {
  const nbsp = s => s.replace(/ /g, ' ');
  let n = 0;
  for (const el of document.querySelectorAll('div')) {
    if (el.children.length) continue;
    const m = DATA[nbsp(el.textContent || '')]; if (!m) continue;
    const row = el.closest('[role=button]'); if (!row || row.dataset.spark) continue;
    const side = row.lastElementChild; const bar = side && side.lastElementChild;
    if (!bar || side.children.length < 2) continue;
    row.dataset.spark = 1;
    const v = m.pts, w = 104, h = 30, last = v.at(-1);
    const st = (m.hi != null && last > m.hi) || (m.lo != null && last < m.lo) ? 'out' : 'ok';
    const col = st === 'out' ? '#C72B32' : '#2F7F4D';
    const all = [...v, m.lo, m.hi].filter(x => x != null);
    let mn = Math.min(...all), mx = Math.max(...all); const pad = (mx - mn) * .2 || 1; mn -= pad; mx += pad;
    const y = x => h - 4 - (x - mn) / (mx - mn) * (h - 8), X = i => v.length === 1 ? w - 6 : 5 + i * (w - 11) / (v.length - 1);
    const bt = m.hi != null ? y(m.hi) : 0, bb = m.lo != null ? y(m.lo) : h;
    const top = Math.max(0, bt), bot = Math.min(h, bb);
    bar.outerHTML = `<svg width="${w}" height="${h}" style="margin-top:6px;align-self:flex-end;display:block"><rect x="0" y="${top}" width="${w}" height="${Math.max(0, bot - top)}" rx="4" fill="#E9FAEF"/>
      ${v.length > 1 ? `<polyline points="${v.map((p, i) => `${X(i)},${y(p)}`).join(' ')}" fill="none" stroke="#81C6C1" stroke-width="1.8" stroke-linejoin="round"/>` : ''}
      ${v.map((p, i) => i < v.length - 1 ? `<circle cx="${X(i)}" cy="${y(p)}" r="2.6" fill="#fff" stroke="#81C6C1" stroke-width="1.5"/>` : '').join('')}
      <circle cx="${X(v.length - 1)}" cy="${y(last)}" r="4.5" fill="${col}" stroke="#fff" stroke-width="1.5"/></svg>`;
    n++;
  }
  return n;
};
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto(base + '/demo/free', { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(8000); console.log('landed', p.url());
await p.getByText('Record', { exact: true }).last().click(); await p.waitForTimeout(3000);
console.log('record', p.url(), await p.evaluate(inject, DATA));
await p.screenshot({ path: S + '/shots/after-record.png' });
await p.getByText('See all').first().click(); await p.waitForTimeout(3000);
console.log('all', p.url(), await p.evaluate(inject, DATA));
await p.screenshot({ path: S + '/shots/after-all-results.png' });
await b.close();
