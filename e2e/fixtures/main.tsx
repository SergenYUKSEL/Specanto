import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiReference, type ApiReferenceProps, type PreparedRequest, type RequestResult, type Transport } from '../../src';
import '../../src/styles/reference.css';

const scenario = new URLSearchParams(location.search).get('scenario') ?? 'http';
const longPath = `/catalogue/${'very-long-unbroken-route-segment-'.repeat(25)}`;
const operationPath = scenario === 'longpath' ? longPath : '/probe';
const spec = {
  openapi: '3.1.1',
  info: { title: 'Fixture API', version: '1.0.0' },
  servers: [{ url: `${location.origin}/api` }],
  ...(scenario === 'apikey' ? {
    security: [{ FixtureKey: [] }],
    components: { securitySchemes: { FixtureKey: { type: 'apiKey', in: 'header', name: 'X-Fixture-Key' } } },
  } : {}),
  paths: {
    [operationPath]: {
      get: {
        operationId: 'fixtureOperation', summary: 'Opération de test',
        description: scenario === 'unsafe' ? '<script>window.attacked=true</script>\n\n<img src=x onerror="window.attacked=true">\n\n[dangerous](javascript:window.attacked=true)\n\n![Tracking image](https://tracker.example.test/pixel)\n\nSafe documentation.' : 'Une opération réservée aux tests de la bibliothèque.',
        responses: { '200': { description: 'OK' }, '204': { description: 'Empty' }, '400': { description: 'Bad request' }, '401': { description: 'Unauthorized' }, '500': { description: 'Server error' } },
      },
    },
  },
};

declare global {
  interface Window {
    fixtureRequests: PreparedRequest[];
    fixtureAborted: number;
  }
}
window.fixtureRequests = [];
window.fixtureAborted = 0;
let resolvePending: ((result: RequestResult) => void) | undefined;
const response: RequestResult = { status: 200, statusText: 'OK', duration: 1, headers: { 'x-fixture': 'custom' }, body: '{"source":"provided-transport"}', truncated: false };
const transport: Transport = (request, signal) => {
  window.fixtureRequests.push(request);
  signal?.addEventListener('abort', () => { window.fixtureAborted++; }, { once: true });
  if (scenario === 'pending' || scenario === 'timeout') return new Promise(resolve => { resolvePending = resolve; });
  return Promise.resolve(response);
};
const props: ApiReferenceProps = {
  spec,
  ...(scenario === 'custom' || scenario === 'simulation' || scenario === 'pending' || scenario === 'timeout' ? { transport } : {}),
  ...(scenario === 'simulation' ? { transportMode: 'simulation' as const } : {}),
  ...(scenario === 'timeout' ? { requestTimeoutMs: 100 } : {}),
  ...(scenario === 'invalidTimeout' ? { requestTimeoutMs: 0 } : {}),
  ...(scenario === 'branding' ? { logo: <span aria-label="Marque de test">Fixture brand</span>, fontFamily: 'Georgia, serif', monoFontFamily: 'Courier New, monospace', accentColor: '#0a7652' } : {}),
};

createRoot(document.getElementById('root')!).render(<StrictMode>
  {(scenario === 'pending' || scenario === 'timeout') && <button type="button" onClick={() => resolvePending?.(response)}>Terminer le transport de test</button>}
  <ApiReference {...props} />
</StrictMode>);
