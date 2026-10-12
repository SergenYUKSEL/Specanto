type Product = {
  id: string;
  name: string;
  description: string;
  priceEUR: number;
  category: 'luminaire' | 'mobilier' | 'accessoire';
  inStock: boolean;
};
type Detail = { path: string; message: string };
type OrderInput = { customer: { email: string }; items: { productId: string; quantity: number }[]; currency?: 'EUR' };

const products: Product[] = [
  { id: 'prd_01', name: 'Lampe Halo', description: 'Une lampe en aluminium brossé à la lumière douce.', priceEUR: 89, category: 'luminaire', inStock: true },
  { id: 'prd_02', name: 'Tabouret Pli', description: 'Un tabouret compact en chêne, assemblé sans détour.', priceEUR: 145, category: 'mobilier', inStock: true },
  { id: 'prd_03', name: 'Carnet Ligne', description: 'Un carnet à couverture textile pour les idées de tous les jours.', priceEUR: 18, category: 'accessoire', inStock: true },
  { id: 'prd_04', name: 'Vase Onde', description: 'Un vase en céramique dont les courbes accueillent une seule fleur.', priceEUR: 42.5, category: 'accessoire', inStock: true },
];
const maxBodyBytes = 16 * 1024;
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

function respond(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...headers } });
}

function failure(status: number, code: string, message: string, details?: Detail[], headers?: Record<string, string>): Response {
  return respond({ error: { code, message, ...(details ? { details } : {}) } }, status, headers);
}

function invalid(details: Detail[]): Response {
  return failure(400, 'validation_error', 'La requête contient des données invalides.', details);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extraFields(value: Record<string, unknown>, allowed: string[], prefix: string, details: Detail[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) details.push({ path: prefix ? `${prefix}.${key}` : key, message: 'Ce champ n’est pas pris en charge.' });
  }
}

function validateOrder(value: unknown): Detail[] {
  const details: Detail[] = [];
  if (!isObject(value)) return [{ path: 'body', message: 'Le corps doit être un objet JSON.' }];
  extraFields(value, ['customer', 'items', 'currency'], '', details);

  const customer = value.customer;
  if (!isObject(customer)) {
    details.push({ path: 'customer', message: 'Le client doit être un objet contenant une adresse email fictive.' });
  } else {
    extraFields(customer, ['email'], 'customer', details);
    if (typeof customer.email !== 'string' || customer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      details.push({ path: 'customer.email', message: 'Utilisez une adresse email fictive valide.' });
    }
  }

  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 20) {
    details.push({ path: 'items', message: 'La commande doit contenir de 1 à 20 lignes.' });
  } else {
    for (const [index, item] of value.items.entries()) {
      const path = `items[${index}]`;
      if (!isObject(item)) {
        details.push({ path, message: 'La ligne doit être un objet contenant productId et quantity.' });
        continue;
      }
      extraFields(item, ['productId', 'quantity'], path, details);
      if (typeof item.productId !== 'string' || !products.some((product) => product.id === item.productId)) {
        details.push({ path: `${path}.productId`, message: 'Choisissez un identifiant du catalogue Atelier.' });
      }
      if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        details.push({ path: `${path}.quantity`, message: 'La quantité doit être un entier de 1 à 99.' });
      }
    }
  }
  if (value.currency !== undefined && value.currency !== 'EUR') details.push({ path: 'currency', message: 'Seule la devise EUR est prise en charge.' });
  return details;
}

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      bytesRead += chunk.value.byteLength;
      if (bytesRead > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

async function createOrder(request: Request): Promise<Response> {
  if (request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    return failure(415, 'unsupported_media_type', 'Utilisez le type application/json.');
  }

  const text = await readBody(request);
  if (text === null) return failure(413, 'payload_too_large', 'Le corps JSON est limité à 16 Kio.');
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return invalid([{ path: 'body', message: 'Le corps n’est pas un document JSON valide.' }]);
  }
  const details = validateOrder(value);
  if (details.length) return invalid(details);

  const order = value as OrderInput;
  const items = order.items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)!;
    return {
      productId: product.id, name: product.name, quantity: item.quantity,
      unitPriceEUR: product.priceEUR, lineTotalEUR: Math.round(product.priceEUR * 100) * item.quantity / 100,
    };
  });
  const total = items.reduce((sum, item) => sum + Math.round(item.lineTotalEUR * 100), 0) / 100;
  return respond({ id: 'ord_demo_01', status: 'confirmed', customer: { email: order.customer.email }, items, total, currency: 'EUR' }, 201);
}

function listProducts(url: URL): Response {
  const details: Detail[] = [];
  const limitValue = url.searchParams.get('limit');
  const limit = limitValue === null ? products.length : Number(limitValue);
  if (limitValue !== null && (!/^\d+$/.test(limitValue) || !Number.isInteger(limit) || limit < 1 || limit > 100)) {
    details.push({ path: 'limit', message: 'La limite doit être un entier de 1 à 100.' });
  }
  const category = url.searchParams.get('category');
  if (category !== null && !['luminaire', 'mobilier', 'accessoire'].includes(category)) {
    details.push({ path: 'category', message: 'Choisissez luminaire, mobilier ou accessoire.' });
  }
  if (details.length) return invalid(details);
  const filtered = products.filter((product) => category === null || product.category === category);
  return respond({ data: filtered.slice(0, limit), meta: { total: filtered.length, currency: 'EUR' } });
}

/** A controlled, stateless demo: neither order bodies nor Authorization headers are logged or stored. */
export async function handleApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (path !== '/health' && path !== '/api' && !path.startsWith('/api/')) return null;

  const isHealth = path === '/health';
  const isCatalog = path === '/api/products';
  const productMatch = /^\/api\/products\/([^/]+)$/.exec(path);
  const isOrders = path === '/api/orders';
  if (!isHealth && !isCatalog && !productMatch && !isOrders) {
    return failure(404, 'not_found', 'Cette route de démonstration n’existe pas.');
  }

  const allow = isOrders ? 'POST, OPTIONS' : 'GET, HEAD, OPTIONS';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: allow, 'Cache-Control': 'no-store' } });
  if (!(isOrders ? ['POST'] : ['GET', 'HEAD']).includes(request.method)) {
    return failure(405, 'method_not_allowed', 'Cette méthode n’est pas prise en charge.', undefined, { Allow: allow });
  }

  let response: Response;
  if (isHealth) response = respond({ status: 'ok', service: 'specanto-demo' });
  else if (isCatalog) response = listProducts(url);
  else if (productMatch) {
    let id: string;
    try {
      id = decodeURIComponent(productMatch[1]!);
    } catch {
      response = invalid([{ path: 'id', message: 'L’identifiant contient un encodage URL invalide.' }]);
      return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
    }
    const product = products.find((candidate) => candidate.id === id);
    response = product ? respond({ data: product }) : failure(404, 'not_found', 'Le produit demandé n’existe pas.');
  } else response = await createOrder(request);

  return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
}
