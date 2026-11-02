import { test } from '../fixtures';
test.use({ viewport: { width: 320, height: 760 }, sessionAccount: null });
test('probe', async ({ page }) => {
  await page.goto('/#recorrido');
  await page.waitForSelector('.access-page');
  const out = await page.evaluate(() => [...document.querySelectorAll('.access-page *')].map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName}.${e.className} right=${Math.round(r.right)} w=${Math.round(r.width)}`; }).filter((s) => /right=(3[2-9]\d|[4-9]\d\d)/.test(s)));
  console.log(out.join('\n'));
});
