import { expect, test } from '@playwright/test';

test('opens an operation without sending a business request automatically', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url()); });
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Créer une commande', exact: true })).toBeVisible();
  expect(calls).toEqual([]);
});

test('imports YAML and searches the actual operations', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Importer une API', exact: true }).click();
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'custom.yaml', mimeType: 'text/yaml', buffer: Buffer.from('openapi: 3.1.1\ninfo:\n  title: Imported fixture\n  version: "1"\npaths:\n  /widgets:\n    get:\n      summary: Liste des widgets\n      responses:\n        "200":\n          description: OK\n') });
  await expect(page.getByRole('heading', { name: 'Liste des widgets', exact: true })).toBeVisible();
  await expect(page.locator('.sp-reference')).not.toContainText('Créer une commande');
});

test('shows an actionable parsing error for an unsupported version', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Importer une API', exact: true }).click();
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from('{"openapi":"3.0.0","info":{"title":"Old","version":"1"},"paths":{}}') });
  await expect(page.locator('.sp-reference')).toContainText(/3\.1/);
  await expect(page.locator('.sp-reference')).not.toContainText('Créer une commande');
});

for (const width of [390, 768, 1440]) {
  test(`reference is readable without global overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: 'Créer une commande', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 1440) {
      const navigation = await page.getByRole('navigation', { name: 'Navigation de l’API' }).boundingBox();
      const documentation = await page.locator('.sp-documentation').boundingBox();
      const consolePanel = await page.getByRole('complementary', { name: 'Console de requête' }).boundingBox();
      expect(documentation!.x).toBeGreaterThanOrEqual(navigation!.x + navigation!.width - 1);
      expect(consolePanel!.x).toBeGreaterThanOrEqual(documentation!.x + documentation!.width - 1);
    }
    await page.screenshot({ path: `test-results/reference-${width}.png`, fullPage: true });
  });
}

test('showcase links to the usable demo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Explorer la démo' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole('heading', { name: 'Créer une commande', exact: true })).toBeVisible();
});

test('sends a real POST and renders the received 201 response', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  const response = page.getByRole('region', { name: 'Réponse HTTP réelle' });
  await expect(response).toContainText('201');
  await expect(response).toContainText('ord_demo_');
  await expect(response).toContainText('125');
});

test('blocks invalid JSON before a request reaches the API', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url()); });
  await page.goto('/demo');
  await page.getByRole('textbox', { name: 'Corps JSON de la requête' }).fill('{ invalid');
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/JSON/);
  expect(calls).toEqual([]);
});

test('mobile keyboard shortcut opens and focuses search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Créer une commande', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('searchbox', { name: 'Rechercher une route' });
  await expect(search).toBeFocused();
  await page.keyboard.type('products');
  await expect(page.getByRole('navigation', { name: 'Navigation de l’API' })).not.toContainText('Créer une commande');
});

test('redacts credentials in cURL and lets the user erase them', async ({ page }) => {
  await page.goto('/demo');
  await page.locator('.sp-auth-group > summary').click();
  await page.getByLabel('Méthode d’authentification').selectOption('0');
  const secret = page.getByPlaceholder('Votre token Bearer');
  await secret.fill('demo-only-token');
  await page.locator('.sp-curl > summary').click();
  await expect(page.locator('.sp-curl')).toContainText('<redacted>');
  await expect(page.locator('.sp-curl')).not.toContainText('demo-only-token');
  await page.getByRole('button', { name: 'Effacer les identifiants', exact: true }).click();
  await expect(secret).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('demo-only-token');
});

test('clears credentials when the server origin changes', async ({ page }) => {
  await page.goto('/demo');
  await page.locator('.sp-auth-group > summary').click();
  await page.getByLabel('Méthode d’authentification').selectOption('0');
  const secret = page.getByPlaceholder('Votre token Bearer');
  await secret.fill('demo-only-token');
  await page.getByRole('button', { name: 'Autre serveur', exact: true }).click();
  await page.getByRole('textbox', { name: 'Serveur', exact: true }).fill('https://different.example/api');
  await expect(secret).toHaveValue('');
});

test('navigates to a product, preserves its deep link and sends a GET', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('link', { name: /Consulter un produit/ }).click();
  await expect(page).toHaveURL(/#operation\/getProduct$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Consulter un produit', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  const response = page.getByRole('region', { name: 'Réponse HTTP réelle' });
  await expect(response).toContainText('200');
  await expect(response).toContainText('Lampe Halo');
});

test('renders a dark theme with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Activer le mode sombre', exact: true }).click();
  await expect(page.locator('.sp-reference')).toHaveAttribute('data-color-mode', 'dark');
  await page.screenshot({ path: 'test-results/reference-dark.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('keeps the app usable when an imported schema has malformed fields', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Importer une API', exact: true }).click();
  const invalid = { openapi: '3.1.1', info: { title: 'Invalid schema', version: '1' }, paths: { '/bad': { get: { summary: 'Bad schema', responses: { '200': { description: 'bad', content: { 'application/json': { schema: { type: 'string', enum: 'open' } } } } } } } } };
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(page.locator('.sp-reference').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importer une API', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('preserves a boolean response schema as its actual source', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Importer une API', exact: true }).click();
  const fixture = { openapi: '3.1.1', info: { title: 'Boolean schema', version: '1' }, paths: { '/never': { get: { summary: 'Boolean response', responses: { '200': { description: 'No JSON matches', content: { 'application/json': { schema: false } } } } } } } };
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'boolean.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture)) });
  await page.locator('.sp-response-schema > summary').click();
  await page.locator('.sp-response-schema .sp-schema-source > summary').click();
  await expect(page.locator('.sp-response-schema pre')).toHaveText('false');
  await expect(page.locator('.sp-documentation')).not.toContainText('Exemple généré');
});

test('shows an HTML response as text rather than executable content', async ({ page }) => {
  await page.route('**/api/products/prd_01', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<img src=x onerror="window.attacked=true"><script>window.attacked=true</script>' }));
  await page.goto('/demo#operation/getProduct');
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  const response = page.getByRole('region', { name: 'Réponse HTTP réelle' });
  await expect(response).toContainText('<script>');
  await expect(response.locator('script, img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).attacked)).toBeUndefined();
});
