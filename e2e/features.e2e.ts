import { expect, test } from '@playwright/test';

const fixtures = 'http://127.0.0.1:5192';

test('copies Fetch and Python snippets with current parameters and redacted secrets', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { window.fixtureCopied = value; } } }));
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url()); });
  await page.goto(`${fixtures}/?scenario=snippets`);
  await page.getByPlaceholder('Votre clé API').fill('fixture-private-key');
  await page.locator('.sp-curl > summary').click();
  const snippets = page.locator('.sp-curl');
  await snippets.getByRole('button', { name: 'Fetch', exact: true }).click();
  await expect(snippets.locator('pre')).toContainText('fetch(');
  await expect(snippets.locator('pre')).toContainText(`${fixtures}/api/probe`);
  await expect(snippets.locator('pre')).toContainText('<redacted>');
  await expect(snippets).not.toContainText('fixture-private-key');
  await snippets.getByRole('button', { name: 'Python', exact: true }).click();
  await expect(snippets.locator('pre')).toContainText('import requests');
  await expect(snippets.locator('pre')).toContainText('trust_env = False');
  await expect(snippets).not.toContainText('fixture-private-key');
  await expect(snippets.getByRole('button', { name: /Copier/ })).toBeVisible();
  const code = await snippets.locator('pre').innerText();
  await snippets.getByRole('button', { name: /Copier/ }).click();
  expect(await page.evaluate(() => window.fixtureCopied)).toBe(code);
  expect(calls).toEqual([]);
});

test('changing the profile aborts an active request and ignores its late result', async ({ page }) => {
  await page.goto(`${fixtures}/?scenario=profilesPending`);
  await page.getByPlaceholder('Votre clé API').fill('fixture-private-key');
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  expect(await page.evaluate(() => window.fixtureRequests.length)).toBe(1);
  await page.getByLabel('Profil de serveur', { exact: true }).selectOption('staging');
  await expect(page.getByPlaceholder('Votre clé API')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.fixtureAborted)).toBe(1);
  await page.getByRole('button', { name: 'Terminer le transport de test' }).click();
  await expect(page.getByRole('region', { name: 'Résultat du transport personnalisé' })).not.toContainText('provided-transport');
  expect(await page.evaluate(() => window.fixtureRequests.length)).toBe(1);
});

test('selects server profiles across operations and clears credentials on an origin change', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (request.url().includes('/local/') || request.url().includes('staging.example.test')) calls.push(request.url()); });
  await page.goto(`${fixtures}/?scenario=profiles`);
  const profile = page.getByLabel('Profil de serveur', { exact: true });
  await expect(profile).toHaveValue('local');
  await expect(page.locator('.sp-destination')).toContainText(`${fixtures}/local/`);
  await page.getByPlaceholder('Votre clé API').fill('fixture-private-key');
  await profile.selectOption('staging');
  await expect(page.getByPlaceholder('Votre clé API')).toHaveValue('');
  await expect(page.locator('.sp-destination')).toContainText('https://staging.example.test/api/');
  await page.keyboard.press('Control+k');
  await page.getByRole('link', { name: /Opération de test/ }).click();
  await expect(profile).toHaveValue('staging');
  await page.keyboard.press('Control+k');
  await page.getByRole('link', { name: /Autre opération/ }).click();
  await expect(profile).toHaveValue('staging');
  await expect(page.locator('.sp-destination')).toContainText('https://staging.example.test/api/next');
  await profile.selectOption('local');
  await expect(page.getByPlaceholder('Votre clé API')).toHaveValue('');
  await profile.selectOption('');
  await expect(page.locator('.sp-destination')).toContainText(`${fixtures}/api/next`);
  expect(calls).toEqual([]);
});

test('invalid server profiles block execution instead of falling back silently', async ({ page }) => {
  await page.goto(`${fixtures}/?scenario=invalidProfiles`);
  await expect(page.getByRole('alert')).toContainText(/profil/i);
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeDisabled();
});

test('importing a local document selects its own server instead of the demo profile', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByLabel('Profil de serveur', { exact: true })).toHaveValue('atelier');
  const imported = { openapi: '3.1.1', info: { title: 'Imported API', version: '1' }, servers: [{ url: 'https://imported.example.test/v1' }], paths: { '/echo': { get: { summary: 'Imported echo', operationId: 'echo', responses: { '200': { description: 'OK' } } } } } };
  await page.getByLabel('Importer un fichier OpenAPI JSON ou YAML').setInputFiles({ name: 'imported.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.getByRole('heading', { name: 'Imported echo' })).toBeVisible();
  await expect(page.getByLabel('Profil de serveur', { exact: true })).toHaveValue('');
  await expect(page.locator('.sp-destination')).toContainText('https://imported.example.test/v1/echo');
});

test('formats JSON manually and retains malformed input with an actionable diagnostic', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/orders') calls.push(request.url()); });
  await page.goto('/demo');
  const body = page.getByRole('textbox', { name: 'Corps JSON de la requête' });
  const value = '{"customer":{"email":"camille@example.com"},"items":[{"productId":"prd_01","quantity":1}]}';
  await body.fill(value);
  await page.getByRole('button', { name: 'Formater JSON', exact: true }).click();
  await expect(body).toHaveValue(JSON.stringify(JSON.parse(value), null, 2));
  await body.fill('{"customer":');
  await page.getByRole('button', { name: 'Formater JSON', exact: true }).click();
  await expect(body).toHaveValue('{"customer":');
  await expect(page.locator('.sp-json-validation')).toContainText(/JSON/i);
  expect(calls).toEqual([]);
});

test('guides nested JSON validation and generates an example only after a click', async ({ page }) => {
  await page.goto('/demo');
  const body = page.getByRole('textbox', { name: 'Corps JSON de la requête' });
  await body.fill('{"customer":{},"items":[]}');
  await expect(page.locator('.sp-json-validation')).toContainText('email');
  await expect(body).toHaveValue('{"customer":{},"items":[]}');
  await page.getByRole('button', { name: 'Générer un exemple', exact: true }).click();
  const generated = JSON.parse(await body.inputValue());
  expect(generated.customer.email).toBeDefined();
  expect(generated.items.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await expect(body).toHaveValue(/camille@example.com/);
});
