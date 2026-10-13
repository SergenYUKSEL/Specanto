import { expect, test, type Page } from '@playwright/test';
const fixture = 'http://127.0.0.1:5192';
async function open(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${fixture}/?scenario=navigation`);
  await expect(page.getByRole('heading', { name: /Documenter une opération/ })).toBeVisible();
}
async function drag(page: Page, selector: string, delta: number) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error('Separator not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + delta, box.y + 100, { steps: 8 }); await page.mouse.up();
}
async function width(page: Page, selector: string) { return page.locator(selector).evaluate(el => el.getBoundingClientRect().width); }

test('long labels fit inside the navigation without horizontal scrolling', async ({ page }) => {
  await open(page);
  const result = await page.locator('.sp-nav-scroll').evaluate(el => {
    el.scrollLeft = 10000;
    const panel = el.getBoundingClientRect();
    const spans = [...el.querySelectorAll('.sp-operation-link > span:last-child, .sp-nav-group h2')];
    return { overflow: el.scrollWidth - el.clientWidth, scroll: el.scrollLeft, fits: spans.every(span => span.getBoundingClientRect().left >= panel.left && span.getBoundingClientRect().right <= panel.right + 1) };
  });
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.scroll).toBe(0); expect(result.fits).toBe(true);
});

test('both desktop separators resize actual panels without sending requests', async ({ page }) => {
  await open(page);
  const nav = await width(page, '.sp-navigation'); const request = await width(page, '.sp-request-column');
  await drag(page, '.sp-resize-navigation', 80);
  expect(await width(page, '.sp-navigation')).toBeCloseTo(nav + 80, 0);
  await drag(page, '.sp-resize-request', -100);
  expect(await width(page, '.sp-request-column')).toBeCloseTo(request + 100, 0);
  expect(await page.evaluate(() => window.fixtureRequests)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('.sp-resize-navigation').dblclick(); await page.locator('.sp-resize-request').dblclick();
  expect(await width(page, '.sp-navigation')).toBeCloseTo(nav, 0); expect(await width(page, '.sp-request-column')).toBeCloseTo(request, 0);
});

test('keyboard resizing respects limits and the available documentation width', async ({ page }) => {
  await open(page);
  const handle = page.getByRole('separator', { name: 'Largeur de la navigation' });
  await handle.focus(); await page.keyboard.press('ArrowRight');
  expect(await width(page, '.sp-navigation')).toBeCloseTo(264, 0);
  await page.keyboard.press('End'); expect(await width(page, '.sp-navigation')).toBeLessThanOrEqual(420);
  const request = page.getByRole('separator', { name: 'Largeur de la console' });
  await request.focus(); await page.keyboard.press('End');
  expect(await width(page, '.sp-documentation')).toBeGreaterThanOrEqual(320);
  await page.setViewportSize({ width: 1120, height: 900 });
  await expect.poll(() => width(page, '.sp-documentation')).toBeGreaterThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('widths survive navigation/theme changes and mobile retains its stacked layout', async ({ page }) => {
  await open(page);
  await drag(page, '.sp-resize-navigation', 60); const chosen = await width(page, '.sp-navigation');
  await page.getByRole('button', { name: 'Introduction', exact: true }).click();
  await page.getByRole('button', { name: 'Activer le thème sombre' }).click();
  expect(await width(page, '.sp-navigation')).toBeCloseTo(chosen, 0);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.getByRole('separator')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  const overflow = await page.locator('.sp-nav-scroll').evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => width(page, '.sp-navigation')).toBeCloseTo(chosen, 0);
});

test('Escape cancels an active drag and minimum widths still contain the brand', async ({ page }) => {
  await open(page);
  const original = await width(page, '.sp-navigation');
  const handle = page.locator('.sp-resize-navigation'); const box = await handle.boundingBox();
  if (!box) throw new Error('Missing separator');
  await page.mouse.move(box.x + 3, box.y + 100); await page.mouse.down(); await page.mouse.move(box.x + 93, box.y + 100);
  await expect.poll(() => width(page, '.sp-navigation')).toBeGreaterThan(original);
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect.poll(() => width(page, '.sp-navigation')).toBeCloseTo(original, 0);
  await expect(page.locator('.sp-resize[data-resizing]')).toHaveCount(0);
  await handle.focus(); await page.keyboard.press('Home');
  expect(await width(page, '.sp-navigation')).toBeCloseTo(220, 0);
  const fits = await page.locator('.sp-navigation').evaluate(el => el.querySelector('.sp-wordmark')!.getBoundingClientRect().right <= el.getBoundingClientRect().right);
  expect(fits).toBe(true);
});

test('resizing preserves credentials and does not cancel or repeat a pending request', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${fixture}/?scenario=profilesPending`);
  await page.getByPlaceholder('Votre clé API').fill('fictional-resize-test');
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeVisible();
  await drag(page, '.sp-resize-navigation', 60); await drag(page, '.sp-resize-request', -70);
  await expect(page.getByPlaceholder('Votre clé API')).toHaveValue('fictional-resize-test');
  expect(await page.evaluate(() => window.fixtureAborted)).toBe(0);
  expect(await page.evaluate(() => window.fixtureRequests.length)).toBe(1);
  await page.getByRole('button', { name: 'Terminer le transport de test' }).click();
  await expect(page.getByRole('region', { name: 'Résultat du transport personnalisé' })).toContainText('200');
});

test('an embedded reference stacks its console when its own container narrows', async ({ page }) => {
  await open(page);
  await page.locator('.sp-reference').evaluate(el => { (el as HTMLElement).style.maxWidth = '900px'; });
  await expect(page.locator('.sp-resize-request')).toHaveCount(0);
  await expect(page.locator('.sp-resize-navigation')).toBeVisible();
  const stacked = await page.locator('.sp-workspace').evaluate(el => {
    const doc = el.querySelector('.sp-documentation')!.getBoundingClientRect();
    const request = el.querySelector('.sp-request-column')!.getBoundingClientRect();
    return request.top >= doc.bottom - 1 && doc.width >= 320;
  });
  expect(stacked).toBe(true);
});
