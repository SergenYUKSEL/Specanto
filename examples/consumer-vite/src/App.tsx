import { ApiReference } from '@specanto/react';
import type { ServerProfile, Transport } from '@specanto/react';
import '@specanto/react/styles.css';
import { spec } from './spec';

const serverProfiles: ServerProfile[] = [
  { id: 'development', label: 'Development · simulation', url: 'https://api.example.com/v1' },
  { id: 'staging', label: 'Staging · simulation', url: 'https://staging.example.com/v1' },
];

const simulate: Transport = async (request, signal) => {
  if (signal?.aborted) throw new DOMException('Requête annulée', 'AbortError');
  return {
    status: 200,
    statusText: 'OK',
    duration: 0,
    headers: { 'content-type': 'application/json', 'x-simulation-method': request.method },
    body: JSON.stringify([{ id: 'prd_01', name: 'Lampe Halo' }], null, 2),
  };
};

function AtelierLogo() {
  return <span className="consumer-logo">
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 20 9-16 9 16M7 13h10" />
    </svg>
    atelier
  </span>;
}

export function App() {
  return <ApiReference
    spec={spec}
    locale="en"
    logo={<AtelierLogo />}
    colorMode="system"
    accentColor="#c54422"
    fontFamily="Arial, sans-serif"
    monoFontFamily="Menlo, Consolas, monospace"
    requestTimeoutMs={5000}
    serverProfiles={serverProfiles}
    transport={simulate}
    transportMode="simulation"
  />;
}
