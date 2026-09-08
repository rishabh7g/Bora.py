// Screen-height audit at 360px — the numbers in docs/SIMPLIFY.md. Run against npm run dev:
//   PLAYWRIGHT_BROWSERS_PATH=... node scripts/measure-screens.mjs
import { chromium } from 'playwright';
const base = 'http://localhost:5173/Bora.py/';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
const rows = [];
async function measure(name, opts = {}) {
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const m = document.querySelector('.app-screen');
    const cel = document.querySelector('.celebrate-field');
    const el = cel ?? m;
    const text = (m?.innerText ?? '').replace(/\s+/g, ' ').trim();
    const firstBtn = m?.querySelector('.btn-primary, .home-row--current, .celebrate-continue');
    const y = firstBtn ? Math.round(firstBtn.getBoundingClientRect().top) : null;
    return {
      scroll: el.scrollHeight,
      client: m.clientHeight,
      y,
      words: text.split(' ').length,
      text: text.slice(0, 220),
    };
  });
  rows.push({ name, screens: (r.scroll / r.client).toFixed(2), primaryY: r.y, words: r.words });
  if (opts.shot) await page.screenshot({ path: `shot-${name}.png`, fullPage: true });
  console.log(name, JSON.stringify(rows.at(-1)), '\n   ', r.text);
}
async function go(hash) {
  await page.goto(base + hash);
  await page.waitForSelector(
    '.home-screen, .mod-screen, .ex-screen, .set-screen, .shelf-screen, .setup-screen',
    { timeout: 8000 },
  );
}

await go('#/');
await measure('home-fresh', { shot: true });
await go('#/setup');
await measure('setup', { shot: true });
await page.click('text=My output matches');
await page.waitForTimeout(300);
await measure('celebration', { shot: true });
await page.click('.celebrate-continue');
await page.waitForTimeout(300);
await measure('home-after-m0');
await go('#/module/m1');
await measure('module-m1', { shot: true });
const ex1 = await page.$eval('.mod-exrow', (a) => a.getAttribute('href'));
await go(ex1);
await measure('exercise-fresh', { shot: true });
await page.click('text=I tried and got stuck');
await page.waitForTimeout(200);
await measure('exercise-hint1-avail');
await page.click('text=Reveal hint 1');
await page.waitForTimeout(200);
await page.click('text=I tried and got stuck');
await page.click('text=Reveal hint 2');
await page.waitForTimeout(200);
await page.click('text=I tried and got stuck');
await page.click('text=Reveal solution');
await page.waitForTimeout(200);
await measure('exercise-solution', { shot: true });
await page.click('text=My output matches');
await page.waitForTimeout(200);
await measure('exercise-matched', { shot: true });
// match the other two, then exit
await go('#/module/m1');
for (const href of (
  await page.$$eval('.mod-exrow', (as) => as.map((a) => a.getAttribute('href')))
).slice(1)) {
  await go(href);
  await page.click('text=My output matches');
  await page.waitForTimeout(150);
}
await go('#/module/m1');
await measure('module-m1-exit-open');
await go('#/module/m1/exit');
await measure('exit-checkpoint', { shot: true });
await page.click('text=My output matches');
await page.waitForTimeout(300);
await measure('celebration-m1');
await page.click('.celebrate-continue');
await page.waitForTimeout(300);
await measure('home-mid', { shot: true });
await go('#/shelf');
await measure('shelf', { shot: true });
await go('#/settings');
await measure('settings', { shot: true });
console.log('\nSUMMARY');
for (const r of rows)
  console.log(
    r.name.padEnd(24),
    r.screens,
    'screens; primary CTA y=',
    r.primaryY,
    '; words',
    r.words,
  );
await browser.close();
