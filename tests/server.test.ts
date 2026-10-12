import { describe, expect, test } from 'bun:test';
import { handleApi } from '../server/api';

const exampleOrder = {
  customer: { email: 'camille@example.com' },
  items: [{ productId: 'prd_01', quantity: 1 }, { productId: 'prd_03', quantity: 2 }],
};

function request(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

function orderRequest(value: unknown, headers: Record<string, string> = {}) {
  return request('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(value),
  });
}

async function json(response: Response | null) {
  expect(response).not.toBeNull();
  return response!.json();
}

describe('controlled demo API', () => {
  test('serves a catalog whose price and currency can be used to build an order', async () => {
    const response = await handleApi(request('/api/products'));
    expect(response?.status).toBe(200);
    const body = await json(response);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
    expect(body.data).toContainEqual({
      id: 'prd_01', name: 'Lampe Halo', description: 'Une lampe en aluminium brossé à la lumière douce.',
      priceEUR: 89, category: 'luminaire', inStock: true,
    });
    expect(body.meta).toEqual({ total: 4, currency: 'EUR' });
    expect(response?.headers.get('Content-Type')).toContain('application/json');
  });

  test('applies the category filter before the limit and keeps the matching total', async () => {
    const response = await handleApi(request('/api/products?category=accessoire&limit=1'));
    const body = await json(response);
    expect(response?.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].category).toBe('accessoire');
    expect(body.meta.total).toBe(2);
  });

  test.each(['0', '101', '1.5', 'abc', ''])('rejects an invalid limit %j', async (limit) => {
    const response = await handleApi(request(`/api/products?limit=${limit}`));
    expect(response?.status).toBe(400);
    expect((await json(response)).error.code).toBe('validation_error');
  });

  test('rejects an unknown category instead of silently returning an empty catalog', async () => {
    const response = await handleApi(request('/api/products?category=electronics'));
    expect(response?.status).toBe(400);
  });

  test('looks up a product by its id', async () => {
    const response = await handleApi(request('/api/products/prd_03'));
    expect(response?.status).toBe(200);
    expect((await json(response)).data).toMatchObject({ id: 'prd_03', name: 'Carnet Ligne', priceEUR: 18 });
  });

  test('returns a useful 404 for an unknown product', async () => {
    const response = await handleApi(request('/api/products/unknown'));
    expect(response?.status).toBe(404);
    expect((await json(response)).error.code).toBe('not_found');
  });

  test('confirms a fictitious order without requiring credentials and defaults to EUR', async () => {
    const response = await handleApi(orderRequest(exampleOrder));
    expect(response?.status).toBe(201);
    expect(await json(response)).toEqual({
      id: 'ord_demo_01', status: 'confirmed', customer: { email: 'camille@example.com' },
      items: [
        { productId: 'prd_01', name: 'Lampe Halo', quantity: 1, unitPriceEUR: 89, lineTotalEUR: 89 },
        { productId: 'prd_03', name: 'Carnet Ligne', quantity: 2, unitPriceEUR: 18, lineTotalEUR: 36 },
      ],
      total: 125, currency: 'EUR',
    });
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
  });

  test('accepts a fictitious optional Bearer token without echoing it', async () => {
    const response = await handleApi(orderRequest(exampleOrder, { Authorization: 'Bearer demo_token_for_test' }));
    expect(response?.status).toBe(201);
    expect(await response!.text()).not.toContain('demo_token_for_test');
  });

  test('does not retain an order across later requests', async () => {
    await handleApi(orderRequest(exampleOrder));
    const response = await handleApi(request('/api/orders/ord_demo_01'));
    expect(response?.status).toBe(404);
  });

  test('reports malformed JSON as a validation error', async () => {
    const response = await handleApi(request('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"customer":' }));
    expect(response?.status).toBe(400);
    expect((await json(response)).error).toMatchObject({ code: 'validation_error', details: [{ path: 'body', message: expect.any(String) }] });
  });

  test.each([{ value: null }, { value: [] }, { value: 'an order' }])('rejects a non-object JSON body %j', async ({ value }) => {
    const response = await handleApi(orderRequest(value));
    expect(response?.status).toBe(400);
  });

  test.each(['', 'camille', 'camille@', 'camille @example.com'])('rejects an invalid customer email %j', async (email) => {
    const response = await handleApi(orderRequest({ ...exampleOrder, customer: { email } }));
    expect(response?.status).toBe(400);
    expect((await json(response)).error.details).toContainEqual({ path: 'customer.email', message: expect.any(String) });
  });

  test.each([0, -1, 1.5, 100, '2'])('rejects an invalid quantity %j', async (quantity) => {
    const response = await handleApi(orderRequest({ ...exampleOrder, items: [{ productId: 'prd_01', quantity }] }));
    expect(response?.status).toBe(400);
    expect((await json(response)).error.details).toContainEqual({ path: 'items[0].quantity', message: expect.any(String) });
  });

  test('rejects unknown product ids before calculating the total', async () => {
    const response = await handleApi(orderRequest({ ...exampleOrder, items: [{ productId: 'unknown', quantity: 1 }] }));
    expect(response?.status).toBe(400);
    expect((await json(response)).error.details).toContainEqual({ path: 'items[0].productId', message: expect.any(String) });
  });

  test.each([{ items: [] }, { items: [{ productId: 'prd_01' }] }, { items: null }])('rejects invalid items %j', async ({ items }) => {
    const response = await handleApi(orderRequest({ ...exampleOrder, items }));
    expect(response?.status).toBe(400);
  });

  test('rejects unsupported currency and fields outside the documented contract', async () => {
    const response = await handleApi(orderRequest({ ...exampleOrder, currency: 'USD', paid: true }));
    expect(response?.status).toBe(400);
    const body = await json(response);
    expect(body.error.details).toContainEqual({ path: 'currency', message: expect.any(String) });
    expect(body.error.details).toContainEqual({ path: 'paid', message: expect.any(String) });
  });

  test('requires JSON content instead of trying to execute a form or plain text body', async () => {
    const response = await handleApi(request('/api/orders', { method: 'POST', body: 'email=camille@example.com' }));
    expect(response?.status).toBe(415);
  });

  test('limits body bytes to 16 KiB even without a content-length header', async () => {
    const response = await handleApi(orderRequest({ ...exampleOrder, customer: { email: 'é'.repeat(9000) } }));
    expect(response?.status).toBe(413);
    expect((await json(response)).error.code).toBe('payload_too_large');
  });

  test('leaves non-API URLs to the static server', async () => {
    expect(await handleApi(request('/'))).toBeNull();
    expect(await handleApi(request('/assets/demo.js'))).toBeNull();
    expect(await handleApi(request('/api-guide'))).toBeNull();
  });

  test('returns JSON 404 for an unknown API route', async () => {
    const response = await handleApi(request('/api/unknown'));
    expect(response?.status).toBe(404);
    expect((await json(response)).error.code).toBe('not_found');
  });

  test('reports allowed methods for a known resource', async () => {
    const response = await handleApi(request('/api/products', { method: 'DELETE' }));
    expect(response?.status).toBe(405);
    expect(response?.headers.get('Allow')).toBe('GET, HEAD, OPTIONS');
  });

  test('answers HEAD without sending a JSON body', async () => {
    const response = await handleApi(request('/api/products/prd_01', { method: 'HEAD' }));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe('');
  });

  test('provides health status and OPTIONS for deployment checks', async () => {
    const health = await handleApi(request('/health'));
    expect(health?.status).toBe(200);
    expect((await json(health)).status).toBe('ok');
    const options = await handleApi(request('/api/orders', { method: 'OPTIONS' }));
    expect(options?.status).toBe(204);
    expect(options?.headers.get('Allow')).toBe('POST, OPTIONS');
  });
});
