import { expect, test, type Page } from '@playwright/test';

const fixtureUrl = 'http://127.0.0.1:5192';
const openFixture = async (page: Page, scenario = 'http') => {
  await page.goto(`${fixtureUrl}/?scenario=${scenario}`);
  await expect(page.getByRole('heading', { name: 'Opération de test', exact: true })).toBeVisible();
};
const send = (page: Page) => page.getByRole('button', { name: 'Envoyer la requête', exact: true }).click();

for (const status of [204, 400, 401, 500]) {
  test(`displays HTTP ${status} as a server response without retrying`, async ({ page }) => {
    let calls = 0;
    await page.route('**/api/probe', route => {
      calls++;
      return route.fulfill({ status, headers: { 'X-Fixture-Response': 'received' }, ...(status === 204 ? {} : { contentType: 'application/json', body: JSON.stringify({ error: `fixture-${status}` }) }) });
    });
    await openFixture(page);
    expect(calls).toBe(0);
    await send(page);
    const response = page.getByRole('region', { name: 'Réponse HTTP réelle' });
    await expect(response).toContainText(String(status));
    if (status === 204) await expect(response).toContainText('204 No Content : le serveur a répondu sans corps.');
    else await expect(response).toContainText(`fixture-${status}`);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await response.getByRole('button', { name: /En-têtes/ }).click();
    await expect(response).toContainText('x-fixture-response');
    await expect(response).toContainText('received');
    expect(calls).toBe(1);
  });
}

test('network failure restores the form and explains connection and CORS failures', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/probe', route => { calls++; return route.abort('failed'); });
  await openFixture(page);
  await send(page);
  await expect(page.getByRole('alert')).toContainText(/connexion.*CORS/);
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeEnabled();
  await expect(page.getByRole('region', { name: 'Réponse HTTP réelle' })).not.toContainText('200 OK');
  expect(calls).toBe(1);
});

test('cancels an active HTTP request without rendering a late response', async ({ page }) => {
  let calls = 0;
  let release: (() => void) | undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/probe', async route => {
    calls++;
    await pending;
    await route.fulfill({ status: 200, body: 'late-response' }).catch(() => undefined);
  });
  await openFixture(page);
  await send(page);
  await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeVisible();
  await expect.poll(() => calls).toBe(1);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('La requête a été annulée.');
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeEnabled();
  release?.();
  await expect(page.getByRole('region', { name: 'Réponse HTTP réelle' })).not.toContainText('late-response');
  expect(calls).toBe(1);
});

test('cancels a custom transport even when it ignores the abort signal', async ({ page }) => {
  await openFixture(page, 'pending');
  await send(page);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('La requête a été annulée.');
  expect(await page.evaluate(() => window.fixtureAborted)).toBe(1);
  await page.getByRole('button', { name: 'Terminer le transport de test' }).click();
  await expect(page.getByRole('region', { name: 'Résultat du transport personnalisé' })).not.toContainText('provided-transport');
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeEnabled();
});

test('applies the configured timeout, aborts the transport and ignores late completion', async ({ page }) => {
  await openFixture(page, 'timeout');
  await send(page);
  await expect(page.getByRole('alert')).toContainText('Le serveur n’a pas répondu sous 0,1 seconde.');
  expect(await page.evaluate(() => window.fixtureAborted)).toBe(1);
  expect(await page.evaluate(() => window.fixtureRequests.length)).toBe(1);
  await page.getByRole('button', { name: 'Terminer le transport de test' }).click();
  await expect(page.getByRole('region', { name: 'Résultat du transport personnalisé' })).not.toContainText('provided-transport');
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeEnabled();
});

test('rejects an invalid timeout before sending a request', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/probe') calls.push(request.url()); });
  await openFixture(page, 'invalidTimeout');
  await expect(page.getByRole('alert')).toContainText('requestTimeoutMs doit être un entier compris entre 100 et 300000 ms.');
  await expect(page.getByRole('button', { name: 'Envoyer la requête', exact: true })).toBeDisabled();
  expect(calls).toEqual([]);
});

test('requires an API key, sends it only on manual submit and redacts its cURL header', async ({ page }) => {
  let calls = 0;
  let receivedKey: string | undefined;
  await page.route('**/api/probe', async route => {
    calls++;
    receivedKey = await route.request().headerValue('x-fixture-key') ?? undefined;
    await route.fulfill({ status: 200, body: 'key-accepted' });
  });
  await openFixture(page, 'apikey');
  await send(page);
  await expect(page.getByRole('alert')).toContainText(/FixtureKey/);
  expect(calls).toBe(0);
  const key = page.getByPlaceholder('Votre clé API');
  await key.fill('fixture-secret-key');
  await page.locator('.sp-curl > summary').click();
  await expect(page.locator('.sp-curl')).toContainText('X-Fixture-Key: <redacted>');
  await expect(page.locator('.sp-curl')).not.toContainText('fixture-secret-key');
  expect(calls).toBe(0);
  await send(page);
  await expect(page.getByRole('region', { name: 'Réponse HTTP réelle' })).toContainText('key-accepted');
  expect(receivedKey).toBe('fixture-secret-key');
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Effacer les identifiants', exact: true }).click();
  await expect(key).toHaveValue('');
  expect(await page.evaluate(() => JSON.stringify({ local: localStorage, session: sessionStorage }))).not.toContain('fixture-secret-key');
});

for (const scenario of ['simulation', 'custom']) {
  test(`${scenario} transport is manual and labels its response correctly`, async ({ page }) => {
    const businessCalls: string[] = [];
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) businessCalls.push(request.url()); });
    await openFixture(page, scenario);
    expect(await page.evaluate(() => window.fixtureRequests.length)).toBe(0);
    await send(page);
    const response = page.getByRole('region', { name: scenario === 'simulation' ? 'Réponse simulée' : 'Résultat du transport personnalisé' });
    await expect(response).toContainText('provided-transport');
    await expect(response).toContainText('200 OK');
    expect(await page.evaluate(() => window.fixtureRequests.map(request => ({ method: request.method, url: request.url })))).toEqual([{ method: 'GET', url: `${fixtureUrl}/api/probe` }]);
    expect(businessCalls).toEqual([]);
    await expect(page.getByRole('region', { name: 'Réponse HTTP réelle' })).toHaveCount(0);
  });
}

test('drops raw HTML, unsafe Markdown links and third-party images from descriptions', async ({ page }) => {
  const trackingCalls: string[] = [];
  page.on('request', request => { if (request.url().includes('tracker.example.test')) trackingCalls.push(request.url()); });
  await openFixture(page, 'unsafe');
  const description = page.locator('.sp-operation-description');
  await expect(description).toContainText('Safe documentation.');
  await expect(description.locator('script, img')).toHaveCount(0);
  await expect(description.locator('[href^="javascript:"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).attacked)).toBeUndefined();
  expect(trackingCalls).toEqual([]);
});

test('empty search results can be cleared without losing the current operation', async ({ page }) => {
  await openFixture(page);
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox', { name: 'Rechercher une route' }).fill('no-such-operation');
  const navigation = page.getByRole('navigation', { name: 'Navigation de l’API' });
  await expect(navigation).toContainText('Aucune route pour « no-such-operation ».');
  await expect(navigation.locator('.sp-operation-link')).toHaveCount(0);
  await navigation.getByRole('button', { name: 'Effacer la recherche' }).click();
  await expect(page.getByRole('searchbox', { name: 'Rechercher une route' })).toHaveValue('');
  await expect(navigation.locator('.sp-operation-link')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Opération de test', exact: true })).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`long paths stay within the reference layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'longpath');
    await expect(page.locator('.sp-route > code')).toContainText('very-long-unbroken-route-segment-');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const routeBox = await page.locator('.sp-route').boundingBox();
    expect(routeBox!.x + routeBox!.width).toBeLessThanOrEqual(width + 1);
  });
}

test('bounds large HTTP responses and displays the truncation notice', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route('**/api/probe', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'a'.repeat(160_000) }));
  await openFixture(page);
  await send(page);
  const response = page.getByRole('region', { name: 'Réponse HTTP réelle' });
  await expect(response).toContainText('La réponse est tronquée car elle dépasse la limite d’affichage.');
  expect((await response.locator('.sp-response-content').textContent())?.length).toBe(100 * 1024);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const width of [390, 1440]) {
  test(`custom branding and both font families are applied at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openFixture(page, 'branding');
    const brand = page.locator(width < 700 ? '.sp-mobile-bar' : '.sp-brand');
    await expect(brand.getByLabel('Marque de test')).toBeVisible();
    await expect(brand).not.toContainText('specanto');
    const style = await page.locator('.sp-reference').evaluate(element => {
      const computed = getComputedStyle(element);
      return { accent: computed.getPropertyValue('--sp-accent').trim(), font: computed.fontFamily, mono: getComputedStyle(element.querySelector('.sp-route code')!).fontFamily };
    });
    expect(style.accent).toBe('#0a7652');
    expect(style.font).toContain('Georgia');
    expect(style.mono).toContain('Courier New');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
