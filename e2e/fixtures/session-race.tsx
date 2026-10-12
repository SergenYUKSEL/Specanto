import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiReference, type RequestResult, type Transport } from '../../src';
import '../../src/styles/reference.css';

declare global {
  interface Window {
    sessionRaceCalls: number;
    sessionRaceAborts: number;
  }
}
window.sessionRaceCalls = 0;
window.sessionRaceAborts = 0;
const resolvers: ((result: RequestResult) => void)[] = [];
const response: RequestResult = { status: 200, statusText: 'OK', duration: 10, headers: { 'x-private': 'response-header-secret' }, body: '{"private":"response-body-secret"}' };
const transport: Transport = (_, signal) => {
  window.sessionRaceCalls++;
  signal?.addEventListener('abort', () => { window.sessionRaceAborts++; }, { once: true });
  // Intentionally ignore cancellation. The component must race and ignore a late settlement.
  return new Promise(resolve => { resolvers.push(resolve); });
};

function makeSpec(version: number) {
  return {
    openapi: '3.1.1', info: { title: 'Session race API', version: String(version) }, servers: [{ url: `${location.origin}/api` }],
    paths: {
      '/probe/{id}': { post: {
        operationId: 'raceOperation', summary: 'Race operation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', default: 'submitted-path-secret' } },
          { name: 'q', in: 'query', schema: { type: 'string', default: 'query-secret' } },
          { name: 'X-Private', in: 'header', schema: { type: 'string', default: 'request-header-secret' } },
        ],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' }, example: { private: 'request-body-secret' } } } },
        responses: { '200': { description: 'OK' } },
      } },
      '/next': { get: { operationId: 'nextOperation', summary: 'Next operation', responses: { '200': { description: 'OK' } } } },
    },
  };
}

function Fixture() {
  const [version, setVersion] = useState(1);
  const [locale, setLocale] = useState<'en' | 'fr'>('en');
  const [shown, setShown] = useState(true);
  const spec = useMemo(() => makeSpec(version), [version]);
  return <>
    <div>
      <button type="button" onClick={() => resolvers[0]?.(response)}>Resolve first request</button>
      <button type="button" onClick={() => resolvers[1]?.(response)}>Resolve second request</button>
      <button type="button" onClick={() => setVersion(value => value + 1)}>Change specification prop</button>
      <button type="button" onClick={() => setLocale(value => value === 'en' ? 'fr' : 'en')}>Change locale prop</button>
      <button type="button" onClick={() => setShown(value => !value)}>Toggle reference mount</button>
    </div>
    {shown && <ApiReference spec={spec} transport={transport} locale={locale} />}
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>);
