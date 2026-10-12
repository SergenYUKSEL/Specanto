import { expect, test } from '@playwright/test';

const spec = (next: boolean) => ({
  openapi: '3.1.1', info: { title: 'Versioned API', version: next ? '2' : '1' },
  paths: {
    ...(next ? {} : { '/legacy': { get: { operationId: 'legacy', responses: { '200': { description: 'OK' } } } } }),
    '/orders': { post: { operationId: 'order', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: next ? ['email'] : [], properties: { email: { type: 'string' } } } } } }, responses: { '201': { description: 'Created' } } } },
    ...(next ? { '/new': { get: { operationId: 'new', responses: { '200': { description: 'OK' } } } } } : {}),
  },
});

test('compares two local specifications without making API requests', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url()); });
  await page.goto('/compare');
  await page.getByLabel('Document avant', { exact: true }).setInputFiles({ name: 'v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(spec(false))) });
  await page.getByLabel('Document après', { exact: true }).setInputFiles({ name: 'v2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(spec(true))) });
  await page.getByRole('button', { name: 'Comparer', exact: true }).click();
  await expect(page.locator('.sp-comparison')).toContainText('/legacy');
  await expect(page.locator('.sp-comparison')).toContainText('/new');
  await expect(page.locator('.sp-comparison')).toContainText('email');
  await expect(page.locator('.sp-comparison')).toContainText(/Ruptures potentielles/i);
  await page.getByLabel('Afficher les changements').selectOption('potentially-breaking');
  await expect(page.locator('.sp-comparison-changes')).toContainText('email');
  await expect(page.locator('.sp-comparison-changes')).not.toContainText('/legacy');
  await page.getByLabel('Langue de l’interface', { exact: true }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Compare two APIs' })).toBeVisible();
  await expect(page.locator('.sp-comparison-changes')).toContainText('Field became required');
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Clear files', exact: true }).click();
  await expect(page.locator('.sp-comparison')).not.toContainText('/legacy');
});

test('translates a visible import diagnostic after changing the interface language', async ({ page }) => {
  await page.goto('/demo');
  await page.keyboard.press('Control+k');
  await page.getByLabel('Importer un fichier OpenAPI JSON ou YAML').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByRole('alert')).toContainText('Import impossible');
  await page.getByLabel('Langue de l’interface', { exact: true }).selectOption('en');
  await expect(page.getByRole('alert')).toContainText('Import failed');
});

test('changes the reference language while leaving the OpenAPI content intact', async ({ page }) => {
  await page.goto('/demo');
  await page.getByLabel('Langue de l’interface', { exact: true }).selectOption('en');
  await expect(page.getByRole('heading', { name: 'Créer une commande', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send request', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Format JSON', exact: true })).toBeVisible();
  await expect(page.locator('.sp-reference')).toHaveAttribute('lang', 'en');
  const body = page.getByRole('textbox', { name: 'JSON request body', exact: true });
  await body.fill('{"customer":{},"items":[]}');
  await expect(page.locator('.sp-json-validation')).toContainText(/required/);
  await page.getByLabel('Interface language', { exact: true }).selectOption('fr');
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeVisible();
});

test('keeps favorites for the session and clears them on reload', async ({ page }) => {
  await page.goto('/demo');
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Ajouter Créer une commande aux favoris', exact: true }).click();
  await page.locator('.sp-session-panel > summary').click();
  await expect(page.locator('.sp-session-panel')).toContainText('Créer une commande');
  await page.reload();
  await page.keyboard.press('Control+k');
  await page.locator('.sp-session-panel > summary').click();
  await expect(page.locator('.sp-session-panel')).toContainText(/Aucun favori/);
});

test('records only request metadata and opens history without sending a request again', async ({ page }) => {
  let calls = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/orders') calls++; });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Réponse HTTP réelle' })).toContainText('201 Created');
  await page.keyboard.press('Control+k');
  await page.locator('.sp-session-panel > summary').click();
  const panel = page.locator('.sp-session-panel');
  await expect(panel).toContainText('/orders');
  await expect(panel).toContainText('201');
  await expect(panel).not.toContainText('camille@example.com');
  await panel.getByRole('button', { name: /Ouvrir.*orders/ }).click();
  expect(calls).toBe(1);
  await page.keyboard.press('Control+k');
  await panel.getByRole('button', { name: 'Effacer l’historique des requêtes', exact: true }).click();
  await expect(panel).toContainText(/Aucune requête/);
});
