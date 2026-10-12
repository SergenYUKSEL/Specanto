import { expect, test, type Page } from '@playwright/test';

const host = 'http://127.0.0.1:5192/session-race.html';

async function openSession(page: Page) {
  await page.keyboard.press('Control+k');
  const panel = page.locator('.sp-session-panel');
  if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
  return panel;
}

async function send(page: Page) {
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
}

test('StrictMode records metadata once and locale changes keep the pending request', async ({ page }) => {
  await page.goto(host);
  await send(page);
  await page.getByRole('button', { name: 'Change locale prop', exact: true }).click();
  await page.getByRole('button', { name: 'Resolve first request', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Résultat du transport personnalisé', exact: true })).toContainText('200 OK');
  const panel = await openSession(page);
  await expect(panel.locator('ol > li')).toHaveCount(1);
  await expect(panel).toContainText('/probe/{id}');
  await expect(panel).not.toContainText('secret');
  expect(await page.evaluate(() => window.sessionRaceCalls)).toBe(1);
  expect(await page.evaluate(() => window.sessionRaceAborts)).toBe(0);
});

test('navigation cancels the request and ignores a late transport result', async ({ page }) => {
  await page.goto(host);
  await send(page);
  await page.keyboard.press('Control+k');
  await page.locator('.sp-operation-link').filter({ hasText: 'Next operation' }).click();
  await expect(page.getByRole('heading', { name: 'Next operation', exact: true })).toBeVisible();
  const panel = await openSession(page);
  await expect(panel.locator('ol > li')).toHaveCount(1);
  await expect(panel).toContainText('Cancelled');
  await page.getByRole('button', { name: 'Resolve first request', exact: true }).click();
  await expect(panel.locator('ol > li')).toHaveCount(1);
  await expect(panel).not.toContainText('200');
  expect(await page.evaluate(() => window.sessionRaceCalls)).toBe(1);
  expect(await page.evaluate(() => window.sessionRaceAborts)).toBe(1);
});

test('a specification prop change clears the session and ignores a late result', async ({ page }) => {
  await page.goto(host);
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Add Race operation to favorites', exact: true }).click();
  await send(page);
  await page.getByRole('button', { name: 'Change specification prop', exact: true }).click();
  await expect(page.locator('.sp-version')).toContainText('v2');
  const panel = await openSession(page);
  await expect(panel.locator('ol > li')).toHaveCount(0);
  await expect(panel.locator('ul > li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resolve first request', exact: true }).click();
  await expect(panel.locator('ol > li')).toHaveCount(0);
  expect(await page.evaluate(() => window.sessionRaceAborts)).toBe(1);
  await page.locator('.sp-operation-link').filter({ hasText: 'Race operation' }).click();
  await send(page);
  await page.getByRole('button', { name: 'Resolve second request', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Custom transport result', exact: true })).toContainText('200 OK');
  await openSession(page);
  await expect(panel.locator('ol > li')).toHaveCount(1);
  expect(await page.evaluate(() => window.sessionRaceCalls)).toBe(2);
});

test('file import clears the old pending request and its eventual result', async ({ page }) => {
  await page.goto(host);
  await send(page);
  await page.keyboard.press('Control+k');
  await page.locator('input[type=file]').setInputFiles({ name: 'next.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({
    openapi: '3.1.1', info: { title: 'Imported race API', version: '3' }, servers: [{ url: 'https://example.test/api' }],
    paths: { '/imported': { get: { operationId: 'imported', summary: 'Imported operation', responses: { '200': { description: 'OK' } } } } },
  })) });
  await expect(page.getByRole('heading', { name: 'Imported operation', exact: true })).toBeVisible();
  const panel = await openSession(page);
  await expect(panel.locator('ol > li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resolve first request', exact: true }).click();
  await expect(panel.locator('ol > li')).toHaveCount(0);
  await expect(panel).not.toContainText('/probe/{id}');
  expect(await page.evaluate(() => window.sessionRaceAborts)).toBe(1);
});

test('unmounting clears the session and prevents a late result from entering a new mount', async ({ page }) => {
  await page.goto(host);
  await send(page);
  await page.getByRole('button', { name: 'Toggle reference mount', exact: true }).click();
  await expect(page.locator('.sp-reference')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resolve first request', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle reference mount', exact: true }).click();
  const panel = await openSession(page);
  await expect(panel.locator('ol > li')).toHaveCount(0);
  expect(await page.evaluate(() => window.sessionRaceAborts)).toBe(1);
});
