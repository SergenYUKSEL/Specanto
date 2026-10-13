import { expect, test, type Page } from '@playwright/test';

function document(summary: string, path: string) {
  return { openapi: '3.1.1', info: { title: `${summary} API`, version: '1' }, servers: [{ url: 'https://api.example.test' }], paths: { [path]: { get: { operationId: path.slice(1), summary, responses: { '200': { description: 'OK' } } } } } };
}

async function holdInitialDocument(page: Page) {
  let release!: () => void;
  let started!: () => void;
  let complete!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requestStarted = new Promise<void>(resolve => { started = resolve; });
  const handled = new Promise<void>(resolve => { complete = resolve; });
  await page.route('**/openapi.json', async route => {
    started();
    await gate;
    try { await route.fulfill({ json: document('Deferred URL operation', '/deferred') }); }
    catch { /* A successful local import intentionally aborts this request. */ }
    finally { complete(); }
  });
  await page.goto('/demo');
  await requestStarted;
  await expect(page.getByRole('heading', { name: 'Chargement de la spécification', exact: true })).toBeVisible();
  return async () => { release(); await handled; };
}

test('an invalid import diagnostic survives the initial URL result and a locale change', async ({ page }) => {
  const release = await holdInitialDocument(page);
  try {
    await page.keyboard.press('Control+k');
    await page.locator('.sp-reference input[type=file]').setInputFiles({ name: 'unsupported.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ openapi: '3.2.0', info: { title: 'Old', version: '1' }, paths: {} })) });
    const error = page.locator('.sp-import-error');
    await expect(error).toContainText('Seuls les documents OpenAPI 3.0.x et 3.1.x');
    await release();
    await expect(page.getByRole('heading', { name: 'Deferred URL operation', exact: true })).toBeVisible();
    await expect(error).toContainText('Seuls les documents OpenAPI 3.0.x et 3.1.x');
    await page.getByLabel('Langue de l’interface', { exact: true }).selectOption('en');
    await expect(error).toContainText('Only OpenAPI 3.0.x and 3.1.x documents are supported');
    await expect(error).not.toContainText('Seuls les documents');
  } finally { await release(); }
});

test('a valid local import wins over a deferred initial URL document', async ({ page }) => {
  const release = await holdInitialDocument(page);
  try {
    await page.keyboard.press('Control+k');
    await page.locator('.sp-reference input[type=file]').setInputFiles({ name: 'local.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document('Local imported operation', '/local'))) });
    await expect(page.getByRole('heading', { name: 'Local imported operation', exact: true })).toBeVisible();
    await release();
    await expect(page.getByRole('heading', { name: 'Local imported operation', exact: true })).toBeVisible();
    await expect(page.locator('.sp-reference')).not.toContainText('Deferred URL operation');
    await expect(page.locator('.sp-import-error')).toHaveCount(0);
  } finally { await release(); }
});

test('a slower earlier file cannot overwrite the latest selected import', async ({ page }) => {
  await page.route('**/openapi.json', route => route.fulfill({ json: document('Initial operation', '/initial') }));
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Initial operation', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = File.prototype.text;
    const control = window as Window & { releaseSlowImport?: () => Promise<void> };
    File.prototype.text = function () {
      if (this.name !== 'slow.json') return original.call(this);
      return new Promise<string>(resolve => { control.releaseSlowImport = async () => { resolve(await original.call(this)); }; });
    };
  });
  await page.keyboard.press('Control+k');
  const input = page.locator('.sp-reference input[type=file]');
  await input.setInputFiles({ name: 'slow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document('Obsolete slow operation', '/slow'))) });
  await input.setInputFiles({ name: 'latest.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document('Latest imported operation', '/latest'))) });
  await expect(page.getByRole('heading', { name: 'Latest imported operation', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await (window as Window & { releaseSlowImport?: () => Promise<void> }).releaseSlowImport?.();
    // Allow the file continuation and its resulting React render to finish.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(page.getByRole('heading', { name: 'Latest imported operation', exact: true })).toBeVisible();
  await expect(page.locator('.sp-reference')).not.toContainText('Obsolete slow operation');
});
