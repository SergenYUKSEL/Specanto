import { expect, test } from '@playwright/test';

const apiDocument = (version: '3.0.3' | '3.1.1') => ({
  openapi: version, info: { title: 'Compatible API', version: '1' }, servers: [{ url: 'https://api.example.test' }],
  paths: { '/items': { post: { operationId: 'create', summary: 'Create nullable item', requestBody: { required: true, content: { 'application/json': {
    schema: { type: 'object', required: ['label'], properties: { label: version === '3.0.3' ? { type: 'string', nullable: true } : { type: ['string', 'null'] } } }, example: { label: null },
  } } }, responses: { '201': { description: 'Created' } } } } },
});

test('imports a 3.0 document, displays its version and manually submits a nullable JSON body', async ({ page }) => {
  const bodies: string[] = [];
  await page.route('https://api.example.test/items', async route => {
    bodies.push(route.request().postData() ?? '');
    await route.fulfill({ status: 201, json: { accepted: true } });
  });
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Créer une commande', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Importer une API', exact: true }).click();
  await page.getByRole('dialog').locator('input[type=file]').setInputFiles({ name: 'api30.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(apiDocument('3.0.3'))) });
  await expect(page.getByRole('heading', { name: 'Create nullable item', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.locator('.sp-nav-footnote')).toContainText('OpenAPI 3.0.3');
  await page.keyboard.press('Control+k');
  // On mobile, close the drawer before interacting with the console.
  const close = page.getByRole('button', { name: 'Fermer la navigation', exact: true });
  if (await close.isVisible()) await close.click();
  await expect(page.locator('.sp-json-validation')).toContainText('contraintes prises en charge respectées');
  expect(bodies).toEqual([]);
  await page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Réponse HTTP réelle' }).locator('.sp-response-meta')).toContainText('201');
  expect(bodies).toHaveLength(1);
  expect(JSON.parse(bodies[0]!)).toEqual({ label: null });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('loads a 3.0 YAML document from the normal specification URL', async ({ page }) => {
  await page.route('**/openapi.json', route => route.fulfill({ contentType: 'application/yaml', body: 'openapi: 3.0.4\ninfo:\n  title: YAML API\n  version: "1"\npaths:\n  /ping:\n    get:\n      summary: Read YAML 3.0\n      responses:\n        "204":\n          description: Empty\n' }));
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Read YAML 3.0', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.locator('.sp-nav-footnote')).toContainText('OpenAPI 3.0.4');
});

test('compares equivalent 3.0 and 3.1 documents using normalized nullable schemas', async ({ page }) => {
  await page.goto('/compare');
  for (const [label, version] of [['Document avant', '3.0.3'], ['Document après', '3.1.1']] as const) {
    await page.getByLabel(label, { exact: true }).setInputFiles({ name: `${version}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(apiDocument(version))) });
  }
  await expect(page.getByRole('button', { name: 'Comparer', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Comparer', exact: true }).click();
  await expect(page.locator('.sp-comparison-results')).toContainText('Aucun changement détecté');
});
