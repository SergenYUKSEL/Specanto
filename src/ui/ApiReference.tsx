import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import { Icon } from './Icon';
import { localizeError, messages, ReferenceLocaleProvider, useReferenceLocale, useReferenceMessages, type ReferenceLocale } from './i18n';
import { JsonBodyEditor } from './JsonBodyEditor';
import { SessionPanel } from './SessionPanel';
import { appendHistory, createHistoryEntry, toggleFavorite, type HistoryEntry } from '../core/session';
import { describeRequestTimeout, resolveRequestTimeout } from './request-timeout';
import { buildRequest, exampleForSchema, httpTransport, loadSpec, normalizeServerProfiles, parseSpec, searchOperations, toCurl, toFetch, toPython } from '../core';
import type { ApiResponse, NormalizedSpec, Operation, Parameter, PreparedRequest, RequestResult, Schema, ServerProfile, Transport } from '../core/types';

type SpecSource = { spec: object | string; specUrl?: never } | { spec?: never; specUrl: string };
export type ApiReferenceProps = SpecSource & {
  title?: string;
  /** UI language. OpenAPI content is rendered as authored. Default: French. */
  locale?: ReferenceLocale;
  theme?: 'editorial';
  colorMode?: 'light' | 'dark' | 'system';
  accentColor?: string;
  fontFamily?: string;
  monoFontFamily?: string;
  logo?: ReactNode;
  /** Maximum request duration in milliseconds. Integer from 100 to 300000; default 45000. */
  requestTimeoutMs?: number;
  serverProfiles?: ServerProfile[];
  transport?: Transport;
  transportMode?: 'http' | 'simulation';
};

type Credentials = { origin: string; values: Record<string, string> };
const initialCredentials: Credentials = { origin: '', values: {} };
const operationHash = (id: string) => `#operation/${encodeURIComponent(id)}`;
const readOperationHash = () => {
  if (!window.location.hash.startsWith('#operation/')) return '';
  try { return decodeURIComponent(window.location.hash.slice(11)); } catch { return ''; }
};
const json = (value: unknown) => {
  try { return JSON.stringify(value, null, 2) ?? ''; } catch { return messages.fr.exampleUnavailable; }
};
const message = (error: unknown, locale: ReferenceLocale = 'fr') => localizeError(error, locale);
const example = (schema?: Schema, authored?: unknown) => authored !== undefined ? authored : exampleForSchema(schema);
const parameterKey = (parameter: Parameter) => `${parameter.in}:${parameter.name}`;
const parameterDefaults = (operation: Operation) => Object.fromEntries(operation.parameters.map((parameter) => {
  const value = parameter.example ?? parameter.schema?.default ?? '';
  return [parameterKey(parameter), typeof value === 'object' ? JSON.stringify(value) : String(value)];
}));
const schemaType = (schema?: Schema | boolean, t = messages.fr): string => {
  if (typeof schema === 'boolean') return schema ? t.anyValue : t.noValue;
  if (!schema) return 'any';
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (schema.$ref) return schema.$ref.split('/').at(-1) ?? t.reference;
  if (schema.oneOf || schema.anyOf || schema.allOf) return t.composition;
  const type = Array.isArray(schema.type) ? schema.type.join(' | ') : schema.type ?? (schema.properties ? 'object' : 'any');
  return type === 'array' ? `${schemaType(schema.items, t)}[]` : schema.format ? `${type} · ${schema.format}` : type;
};
const hasAdvancedSchema = (schema?: Schema) => Boolean(schema && (schema.$ref || schema.oneOf || schema.anyOf || schema.allOf || schema.not || schema.if));

function Prose({ children }: { children: string }) {
  return <div className="sp-prose"><Markdown skipHtml disallowedElements={['img']} components={{ a: ({ children: text, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{text}</a> }}>{children}</Markdown></div>;
}

function Method({ method }: { method: string }) {
  return <span className={`sp-method sp-method-${method.toLowerCase()}`}>{method}</span>;
}

function CopyButton({ value, label, onNotice }: { value: string; label?: string; onNotice: (notice: string) => void }) {
  const t = useReferenceMessages();
  const copyLabel = label ?? t.copy;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onNotice(t.copyNotice(copyLabel));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch { onNotice(t.copyUnavailable); }
  };
  return <button type="button" className="sp-copy" aria-label={copied ? t.copiedClipboard : copyLabel} onClick={() => { void copy(); }}><Icon name="copy" size={14} /><span>{copied ? t.copied : t.copy}</span></button>;
}

function JsonCode({ value }: { value: string }) {
  try { JSON.parse(value); } catch { return <>{value}</>; }
  const tokens: ReactNode[] = [];
  const pattern = /"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;
  let previous = 0;
  for (const match of value.matchAll(pattern)) {
    const offset = match.index;
    tokens.push(value.slice(previous, offset));
    const token = match[0];
    const kind = token.startsWith('"') ? /^\s*:/.test(value.slice(offset + token.length)) ? 'key' : 'string' : /^-?\d/.test(token) ? 'number' : 'literal';
    tokens.push(<span className={`sp-code-${kind}`} key={offset}>{token}</span>);
    previous = offset + token.length;
  }
  tokens.push(value.slice(previous));
  return <>{tokens}</>;
}

function CodeBlock({ value, label, onNotice }: { value: string; label: string; onNotice: (notice: string) => void }) {
  const t = useReferenceMessages();
  return <div className="sp-code-block"><div className="sp-code-heading"><span>{label}</span><CopyButton value={value} label={t.copyLabel(label)} onNotice={onNotice} /></div><pre tabIndex={0} aria-label={label}><code><JsonCode value={value} /></code></pre></div>;
}

function SchemaView({ schema, rawSchema }: { schema?: Schema; rawSchema?: unknown }) {
  const t = useReferenceMessages();
  const source = rawSchema !== undefined ? rawSchema : schema;
  if (typeof source === 'boolean') return <><p className="sp-notice">{source ? t.booleanAccept : t.booleanReject}</p><details className="sp-schema-source"><summary>{t.schemaSource}</summary><pre tabIndex={0}><code>{json(source)}</code></pre></details></>;
  if (!schema) return <p className="sp-muted">{t.noSchema}</p>;
  const properties = Object.entries(schema.properties ?? {});
  return <>
    {properties.length > 0 ? <div className="sp-schema-list">{properties.map(([name, property]) => <div className="sp-schema-property" key={name}>
      <div className="sp-property-title"><code>{name}</code><span className="sp-type">{schemaType(property, t)}</span>{schema.required?.includes(name) && <span className="sp-required">{t.required}</span>}</div>
      {property.description && <Prose>{property.description}</Prose>}
      {property.items?.properties && <details className="sp-nested-schema"><summary>{t.itemProperties}</summary><SchemaView schema={property.items} /></details>}
      {property.properties && <details className="sp-nested-schema"><summary>{t.objectProperties}</summary><SchemaView schema={property} /></details>}
    </div>)}</div> : <p className="sp-type sp-root-type">{schemaType(schema, t)}</p>}
    {hasAdvancedSchema(schema) && <p className="sp-notice">{t.advancedSchema}</p>}
    <details className="sp-schema-source"><summary>{t.schemaSource}</summary><pre tabIndex={0}><code>{json(source)}</code></pre></details>
  </>;
}

function ParameterDocs({ parameters }: { parameters: Parameter[] }) {
  const t = useReferenceMessages();
  const labels: Record<Parameter['in'], string> = { path: t.path, query: t.query, header: t.header, cookie: t.cookie };
  return <div className="sp-parameters">{parameters.map((parameter) => <div className="sp-parameter" key={parameterKey(parameter)}>
    <div className="sp-property-title"><code>{parameter.name}</code><span className="sp-type">{schemaType(typeof parameter.rawSchema === 'boolean' ? parameter.rawSchema : parameter.schema, t)}</span>{parameter.required && <span className="sp-required">{t.required}</span>}</div>
    <div className="sp-parameter-location">{labels[parameter.in]}{!parameter.supported && <span> · {t.unsupportedSerialization}</span>}</div>
    {parameter.description && <Prose>{parameter.description}</Prose>}
    {(parameter.schema || parameter.rawSchema !== undefined) && <details className="sp-parameter-schema"><summary>{t.parameterSchema}</summary><SchemaView schema={parameter.schema} rawSchema={parameter.rawSchema} /></details>}
  </div>)}</div>;
}

function ResponseDocs({ responses, onNotice }: { responses: ApiResponse[]; onNotice: (notice: string) => void }) {
  const t = useReferenceMessages();
  const [selected, setSelected] = useState(responses[0]?.status ?? '');
  const response = responses.find((item) => item.status === selected) ?? responses[0];
  if (!response) return <p className="sp-muted">{t.noDocumentedResponse}</p>;
  const responseExample = example(response.schema, response.example);
  return <>
    <div className="sp-response-tabs" role="group" aria-label={t.documentedResponses}>{responses.map((item) => <button type="button" key={item.status} aria-pressed={response.status === item.status} onClick={() => setSelected(item.status)}><span className={`sp-status-dot ${item.status.startsWith('2') ? 'sp-status-success' : ''}`} />{item.status}</button>)}</div>
    <Prose>{response.description}</Prose>
    {responseExample !== undefined ? <CodeBlock value={json(responseExample)} label={response.example !== undefined ? t.documentedExample : t.schemaExample} onNotice={onNotice} /> : <p className="sp-muted">{response.rawSchema !== undefined ? t.noResponseExample : t.noDocumentedBody}</p>}
    {(response.schema || response.rawSchema !== undefined) && <details className="sp-response-schema"><summary>{t.responseSchema} <span>{response.contentType}</span></summary><SchemaView schema={response.schema} rawSchema={response.rawSchema} /></details>}
  </>;
}

function OperationDocs({ operation, apiTitle, idPrefix, onNotice }: { operation: Operation; apiTitle: string; idPrefix: string; onNotice: (notice: string) => void }) {
  const t = useReferenceMessages();
  const locale = useReferenceLocale();
  const body = operation.requestBody;
  const bodyExample = body ? example(body.schema, body.example) : undefined;
  return <article className="sp-documentation" aria-labelledby={`${idPrefix}-operation-title`}>
    <div className="sp-breadcrumb"><span>{apiTitle}</span><span aria-hidden="true">/</span><span>{operation.tags[0] ?? t.operations}</span></div>
    <div className="sp-operation-heading"><h1 id={`${idPrefix}-operation-title`}>{operation.summary}</h1><span className="sp-operation-id">{operation.id}</span></div>
    <div className="sp-route"><Method method={operation.method} /><code>{operation.path}</code><CopyButton value={operation.path} label={t.copyPath} onNotice={onNotice} /></div>
    <button type="button" className="sp-jump-to-request" onClick={() => {
      const panel = document.getElementById(`${idPrefix}-request-panel`);
      panel?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      panel?.focus({ preventScroll: true });
    }}>{t.tryRoute}<Icon name="arrow" size={15} /></button>
    {operation.description && <div className="sp-operation-description"><Prose>{operation.description}</Prose></div>}
    {operation.unsupported.length > 0 && <div className="sp-notice sp-warning"><strong>{t.unavailableTry}</strong><ul>{operation.unsupported.map((item) => <li key={item}>{localizeError(item, locale)}</li>)}</ul></div>}
    {operation.warnings.length > 0 && <details className="sp-warnings"><summary>{t.specNotes(operation.warnings.length)}</summary><ul>{operation.warnings.map((item) => <li key={item}>{localizeError(item, locale)}</li>)}</ul></details>}
    {operation.parameters.length > 0 && <section className="sp-doc-section"><div className="sp-section-heading"><h2>{t.parameters}</h2><span>{t.fieldCount(operation.parameters.length)}</span></div><ParameterDocs parameters={operation.parameters} /></section>}
    {body && <section className="sp-doc-section"><div className="sp-section-heading"><h2>{t.requestBody}</h2><span>{body.mediaType}</span></div>
      <div className="sp-body-meta">{body.required ? <span className="sp-required">{t.required}</span> : <span className="sp-muted">{t.optional}</span>}<span>{schemaType(typeof body.rawSchema === 'boolean' ? body.rawSchema : body.schema, t)}</span></div>
      {body.description && <Prose>{body.description}</Prose>}
      <SchemaView schema={body.schema} rawSchema={body.rawSchema} />
      {bodyExample !== undefined && <CodeBlock value={json(bodyExample)} label={body.example !== undefined ? t.documentedRequestExample : t.generatedRequestExample} onNotice={onNotice} />}
    </section>}
    <section className="sp-doc-section"><div className="sp-section-heading"><h2>{t.responses}</h2><span>{t.specificationExamples}</span></div><ResponseDocs responses={operation.responses} onNotice={onNotice} /></section>
    <footer className="sp-doc-footer">{t.documentedWith} <span>specanto</span><Icon name="arrowUpRight" size={16} className="sp-footer-mark" /></footer>
  </article>;
}

function RequestPanel({ operation, sourceUrl, transport, transportKind, credentials, setCredentials, idPrefix, onNotice, requestTimeoutMs, serverProfiles, selectedProfileId, onSelectProfile, onRecord }: {
  operation: Operation; sourceUrl?: string; transport: Transport; transportKind: 'http' | 'simulation' | 'custom'; credentials: Credentials; idPrefix: string;
  requestTimeoutMs?: number;
  serverProfiles?: ServerProfile[]; selectedProfileId?: string | null; onSelectProfile: (id: string | null) => void;
  setCredentials: (credentials: Credentials) => void; onNotice: (notice: string) => void;
  onRecord: (entry: HistoryEntry) => void;
}) {
  const t = useReferenceMessages();
  const locale = useReferenceLocale();
  const [specServerUrl, setSpecServerUrl] = useState(operation.servers[0]?.url ?? '/');
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [parameterValues, setParameterValues] = useState<Record<string, string>>(() => parameterDefaults(operation));
  const [body, setBody] = useState(() => operation.requestBody ? json(example(operation.requestBody.schema, operation.requestBody.example)) : '');
  const [customServer, setCustomServer] = useState(false);
  const [authAlternative, setAuthAlternative] = useState(() => Math.max(0, operation.security.findIndex((alternative) => Object.keys(alternative).length === 0)));
  const [result, setResult] = useState<RequestResult | null>(null);
  const [requestIssue, setRequestIssue] = useState<{ kind: 'validation' | 'timeout' | 'cancelled' | 'transport'; cause?: unknown } | null>(null);
  const [pending, setPending] = useState(false);
  const [responseView, setResponseView] = useState<'body' | 'headers'>('body');
  const [snippetLanguage, setSnippetLanguage] = useState<'cURL' | 'Fetch' | 'Python'>('cURL');
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  let timeoutMs = resolveRequestTimeout(undefined);
  let timeoutError = '';
  try { timeoutMs = resolveRequestTimeout(requestTimeoutMs); } catch (cause) { timeoutError = message(cause, locale); }
  let profiles: ServerProfile[] = [];
  let profileError = '';
  try { profiles = normalizeServerProfiles(serverProfiles, sourceUrl); } catch (cause) { profileError = t.invalidProfiles(message(cause, locale)); }
  const activeProfile = selectedProfileId === null ? undefined : profiles.find(profile => profile.id === selectedProfileId) ?? profiles[0];
  const serverUrl = customServer ? customServerUrl : activeProfile?.url ?? specServerUrl;
  const configurationError = timeoutError || profileError;
  const error = requestIssue ? requestIssue.kind === 'validation' ? message(requestIssue.cause, locale) : requestIssue.kind === 'timeout' ? t.requestTimedOut(describeRequestTimeout(timeoutMs, locale)) : requestIssue.kind === 'cancelled' ? t.requestCancelled : transportKind === 'http' ? t.requestFailed(message(requestIssue.cause, locale)) : t.transportFailed(message(requestIssue.cause, locale)) : '';
  const baseUrl = sourceUrl;
  let origin = '';
  let destination: string;
  try {
    const server = new URL(serverUrl, baseUrl);
    origin = server.origin;
    const path = operation.path.replace(/\{([^}]+)\}/g, (match, name: string) => parameterValues[`path:${name}`] ? encodeURIComponent(parameterValues[`path:${name}`]!) : match);
    server.pathname = `${server.pathname.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    server.hash = '';
    destination = server.href;
  } catch { destination = serverUrl; }
  useEffect(() => {
    if (credentials.origin !== origin) setCredentials({ origin, values: {} });
  }, [origin, credentials.origin, setCredentials]);
  useEffect(() => { controller.current?.abort(); setResult(null); setRequestIssue(null); }, [serverUrl]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const credentialOrigins = Object.fromEntries(Object.keys(credentials.values).map((name) => [name, credentials.origin]));
  const requestInput = { serverUrl, parameterValues, body: operation.requestBody ? body : undefined, credentials: credentials.values, credentialOrigins, authAlternative, baseUrl };
  let prepared: PreparedRequest | undefined;
  try { if (!configurationError) prepared = buildRequest(operation, requestInput); } catch { /* Incomplete forms are validated on manual submission. */ }
  const requirement = operation.security[authAlternative] ?? {};
  const authNames = Object.keys(requirement);
  const send = async () => {
    if (controller.current) return;
    if (configurationError) return;
    let request: PreparedRequest;
    try { request = buildRequest(operation, requestInput); } catch (cause) { setRequestIssue({ kind: 'validation', cause }); return; }
    const abort = new AbortController();
    controller.current = abort;
    const started = performance.now();
    setPending(true); setRequestIssue(null); setResult(null);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, timeoutMs);
    const aborted = new Promise<never>((_, reject) => abort.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    try {
      const response = await Promise.race([transport(request, abort.signal), aborted]);
      if (mounted.current && !abort.signal.aborted) { setResult(response); setResponseView('body'); }
      if (!abort.signal.aborted) onRecord(createHistoryEntry(operation, request, { outcome: 'response', result: response }));
    } catch (cause) {
      onRecord(createHistoryEntry(operation, request, { outcome: abort.signal.aborted ? timedOut ? 'timeout' : 'cancelled' : transportKind === 'http' ? 'network-error' : 'transport-error', duration: performance.now() - started }));
      if (mounted.current) setRequestIssue({ kind: abort.signal.aborted ? timedOut ? 'timeout' : 'cancelled' : 'transport', cause });
    } finally { clearTimeout(timer); if (mounted.current) setPending(false); controller.current = null; }
  };
  const displayBody = result ? (() => { try { return json(JSON.parse(result.body)); } catch { return result.body; } })() : '';
  return <aside id={`${idPrefix}-request-panel`} className="sp-request-column" aria-label={t.requestConsole} tabIndex={-1}><div className="sp-request-panel">
    <div className="sp-panel-heading"><div><span className="sp-panel-indicator" aria-hidden="true" /><h2>{t.tryRoute}</h2></div><span className="sp-live-label">{transportKind === 'http' ? t.realHttp : transportKind === 'simulation' ? t.simulation : t.customTransport}</span></div>
    <p className="sp-panel-help">{transportKind === 'simulation' ? t.simulationHelp : transportKind === 'custom' ? t.customTransportHelp : t.httpHelp}</p>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
      {profiles.length > 0 && <div className="sp-profile-field"><label htmlFor={`${idPrefix}-profile`}>{t.serverProfile}</label><select id={`${idPrefix}-profile`} value={activeProfile?.id ?? ''} onChange={event => { onSelectProfile(event.target.value || null); setCustomServer(false); }}><option value="">{t.openApiSpecification}</option>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select>{activeProfile?.description && !customServer && <p className="sp-field-hint">{activeProfile.description}</p>}</div>}
      <div className="sp-server-field"><div className="sp-server-heading"><label htmlFor={`${idPrefix}-server`}>{t.server}</label><button type="button" className="sp-text-button" onClick={() => { if (!customServer) setCustomServerUrl(serverUrl); setCustomServer(!customServer); }}>{customServer ? activeProfile ? t.backToProfile : t.specificationServers : t.otherServer}</button></div>{customServer ? <input id={`${idPrefix}-server`} value={customServerUrl} onChange={(event) => setCustomServerUrl(event.target.value)} placeholder={t.serverPlaceholder} spellCheck={false} autoComplete="off" /> : activeProfile ? <input id={`${idPrefix}-server`} value={activeProfile.url} readOnly /> : <select id={`${idPrefix}-server`} value={specServerUrl} onChange={(event) => setSpecServerUrl(event.target.value)}>{(operation.servers.length ? operation.servers : [{ url: '/' }]).map((server, index) => <option value={server.url} key={`${server.url}:${index}`}>{server.description ?? server.url}</option>)}</select>}{!sourceUrl && !/^[a-z][a-z\d+.-]*:/i.test(serverUrl) && <p className="sp-field-hint sp-relative-server-hint">{t.relativeServerHelp}</p>}</div>
      <div className="sp-destination"><Method method={operation.method} /><code title={prepared?.url ?? destination}>{prepared?.url ?? destination}</code></div>
      {operation.security.length > 0 && <details className="sp-form-group sp-auth-group" open={authNames.length > 0}><summary>{t.authentication} <span>{authNames.length ? authNames.join(' + ') : t.public}</span><span className="sp-disclosure-icons"><Icon name="plus" size={14} /><Icon name="minus" size={14} /></span></summary>
        {operation.security.length > 1 && <label className="sp-input-field">{t.authenticationMethod}<select value={authAlternative} onChange={(event) => setAuthAlternative(Number(event.target.value))}>{operation.security.map((alternative, index) => <option value={index} key={index}>{Object.keys(alternative).join(' + ') || t.publicAccess}</option>)}</select></label>}
        {authNames.length > 1 && <p className="sp-field-hint">{t.allKeysRequired}</p>}
        {authNames.map((name) => {
          const scheme = operation.securitySchemes[name];
          return <label key={name} className="sp-input-field"><span>{name}<span className="sp-required">{t.required}</span></span>{scheme?.supported ? <input type="password" autoComplete="off" spellCheck={false} value={credentials.origin === origin ? credentials.values[name] ?? '' : ''} placeholder={scheme.type === 'http' ? t.bearerPlaceholder : t.apiKeyPlaceholder} onChange={(event) => setCredentials({ origin, values: { ...(credentials.origin === origin ? credentials.values : {}), [name]: event.target.value } })} /> : <span className="sp-notice">{t.unsupportedAuth}</span>}</label>;
        })}
        {authNames.length > 0 && <p className="sp-field-hint">{t.credentialMemory(origin || t.thisServer)}</p>}
        {(authNames.length > 0 || Object.keys(credentials.values).length > 0) && <button type="button" className="sp-clear-credentials" onClick={() => { setCredentials({ origin, values: {} }); onNotice(t.credentialsCleared); }}>{t.clearCredentials}</button>}
      </details>}
      {(['path', 'query', 'header'] as const).map((location) => {
        const parameters = operation.parameters.filter((parameter) => parameter.in === location);
        if (!parameters.length) return null;
        return <details className="sp-form-group" open key={location}><summary>{location === 'path' ? t.pathParameters : location === 'query' ? t.queryParameters : t.headers}<span>{parameters.length}</span><span className="sp-disclosure-icons"><Icon name="plus" size={14} /><Icon name="minus" size={14} /></span></summary>{parameters.map((parameter) => <label className="sp-input-field" key={parameterKey(parameter)}><span><code>{parameter.name}</code>{parameter.required ? <span className="sp-required">{t.required}</span> : <span className="sp-optional">{t.optional}</span>}</span><input value={parameterValues[parameterKey(parameter)] ?? ''} onChange={(event) => setParameterValues({ ...parameterValues, [parameterKey(parameter)]: event.target.value })} placeholder={schemaType(parameter.schema, t)} spellCheck={false} autoComplete="off" aria-describedby={parameter.description ? `${idPrefix}-hint-${location}-${parameter.name}` : undefined} />{parameter.description && <span id={`${idPrefix}-hint-${location}-${parameter.name}`} className="sp-field-hint">{parameter.description}</span>}</label>)}</details>;
      })}
      {operation.requestBody && <JsonBodyEditor id={`${idPrefix}-json-body`} value={body} onChange={value => { setBody(value); setRequestIssue(null); }} schema={operation.requestBody.schema} rawSchema={operation.requestBody.rawSchema} required={operation.requestBody.required} example={operation.requestBody.example} mediaType={operation.requestBody.mediaType} onNotice={onNotice} onReset={() => { setBody(json(example(operation.requestBody?.schema, operation.requestBody?.example))); setRequestIssue(null); }} />}
      {operation.unsupported.length > 0 && <p className="sp-notice">{t.unsupportedRoute}</p>}
      <div className="sp-send-row"><button type="submit" className="sp-send" disabled={pending || Boolean(configurationError) || operation.unsupported.length > 0}>{pending ? <><span className="sp-spinner" aria-hidden="true" />{t.sending}</> : <>{t.sendRequest}<Icon name="arrow" /></>}</button>{pending && <button type="button" className="sp-cancel" onClick={() => controller.current?.abort()}>{t.cancel}</button>}</div>
      {(configurationError || error) && <div className="sp-request-error" role="alert">{configurationError || error}</div>}
    </form>
    {prepared && <details className="sp-curl"><summary>{t.codeExamples}<span>{t.withoutSecrets}</span></summary><div className="sp-snippet-tabs" role="group" aria-label={t.exampleLanguage}>{(['cURL', 'Fetch', 'Python'] as const).map(language => <button type="button" key={language} aria-pressed={snippetLanguage === language} onClick={() => setSnippetLanguage(language)}>{language}</button>)}</div><CodeBlock value={snippetLanguage === 'Fetch' ? toFetch(prepared) : snippetLanguage === 'Python' ? toPython(prepared) : toCurl(prepared)} label={t.secretFreeExample(snippetLanguage)} onNotice={onNotice} /><p className="sp-snippet-hint">{snippetLanguage === 'Python' ? t.pythonHint : t.snippetHint} {t.snippetBodyHint}</p></details>}
    <section className="sp-real-response" aria-label={transportKind === 'http' ? t.realResponse : transportKind === 'simulation' ? t.simulatedResponse : t.customResponse} aria-live="polite"><div className="sp-real-response-heading"><h3>{t.response}</h3>{result && <div className="sp-response-meta"><span className={result.status < 400 ? 'sp-response-ok' : 'sp-response-failed'}>{result.status} {result.statusText}</span><span>{Math.round(result.duration)} ms</span></div>}</div>
      {result ? <><div className="sp-result-tabs" role="group" aria-label={t.responseView}><button type="button" aria-pressed={responseView === 'body'} onClick={() => setResponseView('body')}>{t.body}</button><button type="button" aria-pressed={responseView === 'headers'} onClick={() => setResponseView('headers')}>{t.headers} <span>{Object.keys(result.headers).length}</span></button><CopyButton value={responseView === 'body' ? displayBody : json(result.headers)} label={t.copyResponse} onNotice={onNotice} /></div>{responseView === 'body' ? result.body ? <pre className="sp-response-content" tabIndex={0}><code><JsonCode value={displayBody} /></code></pre> : <p className="sp-empty-response">{result.status === 204 ? t.noContent204 : t.noContent}</p> : <dl className="sp-response-headers">{Object.entries(result.headers).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>}{result.truncated && <p className="sp-notice">{t.truncatedResponse}</p>}</> : <div className="sp-response-placeholder"><Icon name={pending ? 'ellipsis' : 'braces'} size={24} className="sp-response-placeholder-icon" /><p>{pending ? t.waitingServer : t.responsePlaceholder}</p><span>{pending ? t.cancelHelp : t.noRequest}</span></div>}
    </section>
  </div></aside>;
}

export function ApiReference(props: ApiReferenceProps) {
  return <ReferenceLocaleProvider locale={props.locale}><ApiReferenceContent {...props} /></ReferenceLocaleProvider>;
}

function ApiReferenceContent(props: ApiReferenceProps) {
  const t = useReferenceMessages();
  const locale = useReferenceLocale();
  const idPrefix = useId();
  const [spec, setSpec] = useState<NormalizedSpec | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [overview, setOverview] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>(initialCredentials);
  const [notice, setNotice] = useState('');
  const [importError, setImportError] = useState<unknown>(null);
  const [specRevision, setSpecRevision] = useState(0);
  const [mode, setMode] = useState(props.colorMode ?? 'light');
  const [systemDark, setSystemDark] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const sessionScope = useRef(0);
  const sessionMounted = useRef(true);
  const activeScope = sessionScope.current;
  const record = (entry: HistoryEntry) => { if (sessionMounted.current && sessionScope.current === activeScope) setHistory(previous => appendHistory(previous, entry)); };
  const search = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const applySpec = (next: NormalizedSpec) => {
    sessionScope.current++; setHistory([]); setFavoriteIds([]);
    setSpec(next); setLoadError(null); setLoading(false); setQuery(''); setOverview(false); setCredentials(initialCredentials); setSpecRevision((revision) => revision + 1); setImportError(null);
    const hashId = readOperationHash();
    setSelectedId(next.operations.some((item) => item.id === hashId) ? hashId : (next.operations.find((item) => item.method === 'POST' && item.path === '/orders') ?? next.operations[0])?.id ?? '');
  };
  useEffect(() => {
    const abort = new AbortController();
    sessionScope.current++; setHistory([]); setFavoriteIds([]);
    setLoading(true); setLoadError(null); setSpec(null); setCredentials(initialCredentials);
    if (props.specUrl !== undefined) {
      void loadSpec(props.specUrl, abort.signal).then((next) => { if (!abort.signal.aborted) applySpec(next); }).catch((cause: unknown) => { if (!abort.signal.aborted) { setLoadError(cause); setLoading(false); } });
    } else {
      try { applySpec(parseSpec(props.spec)); } catch (cause) { setLoadError(cause); setLoading(false); }
    }
    return () => abort.abort();
  }, [props.spec, props.specUrl]);
  useEffect(() => { setMode(props.colorMode ?? 'light'); }, [props.colorMode]);
  useEffect(() => { sessionMounted.current = true; return () => { sessionMounted.current = false; }; }, []);
  useEffect(() => { if (navOpen) search.current?.focus(); }, [navOpen]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(media.matches);
    const listener = () => setSystemDark(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);
  useEffect(() => {
    const hash = () => { const id = readOperationHash(); if (spec?.operations.some((item) => item.id === id)) { setSelectedId(id); setOverview(false); } };
    const keyboard = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setNavOpen(true); search.current?.focus(); } };
    window.addEventListener('hashchange', hash); window.addEventListener('keydown', keyboard);
    return () => { window.removeEventListener('hashchange', hash); window.removeEventListener('keydown', keyboard); };
  }, [spec]);
  const operations = useMemo(() => spec ? searchOperations(spec.operations, query) : [], [spec, query]);
  const groups = useMemo(() => Array.from(new Set(operations.map((operation) => operation.tags[0] ?? t.operations))).map((tag) => ({ tag, operations: operations.filter((operation) => (operation.tags[0] ?? t.operations) === tag) })), [operations, t.operations]);
  const operation = spec?.operations.find((item) => item.id === selectedId) ?? spec?.operations[0];
  const dark = mode === 'dark' || mode === 'system' && systemDark;
  const styles = { ...(props.accentColor ? { '--sp-accent': props.accentColor } : {}), ...(props.fontFamily ? { '--sp-font': props.fontFamily } : {}), ...(props.monoFontFamily ? { '--sp-mono': props.monoFontFamily } : {}) } as CSSProperties;
  const navigate = (id: string) => { setSelectedId(id); setOverview(false); setNavOpen(false); window.history.replaceState(null, '', operationHash(id)); };
  const importFile = async (file?: File) => {
    if (!file) return;
    try { applySpec(parseSpec(await file.text())); setSelectedProfileId(null); setNotice(t.fileImported(file.name)); } catch (cause) { setImportError(cause); }
    if (fileInput.current) fileInput.current.value = '';
  };
  return <div className="sp-reference" lang={locale} data-color-mode={dark ? 'dark' : 'light'} data-theme={props.theme ?? 'editorial'} style={styles}>
    <div className="sp-mobile-bar"><span className={`sp-mobile-wordmark ${props.logo !== undefined ? 'sp-custom-logo' : ''}`}>{props.logo !== undefined ? props.logo : <>specanto<Icon name="asterisk" size={19} /></>}</span><button type="button" onClick={() => setNavOpen(!navOpen)} aria-expanded={navOpen} aria-controls={`${idPrefix}-navigation`} aria-label={navOpen ? t.closeNavigation : t.openNavigation}><Icon name={navOpen ? 'close' : 'menu'} /><span>{t.navigation}</span></button></div>
    <nav id={`${idPrefix}-navigation`} className={`sp-navigation ${navOpen ? 'sp-navigation-open' : ''}`} aria-label={t.apiNavigation}>
      <div className="sp-brand">{props.logo !== undefined ? <div className="sp-wordmark sp-custom-logo">{props.logo}</div> : <a href="/" className="sp-wordmark" aria-label={t.home}>specanto<Icon name="asterisk" size={27} /></a>}<div className="sp-api-name"><span>{props.title ?? spec?.title ?? t.apiReference}</span>{spec && <span className="sp-version">v{spec.version}</span>}</div></div>
      <div className="sp-search"><Icon name="search" size={16} /><input ref={search} type="search" placeholder={t.searchRoute} aria-label={t.searchRoute} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd aria-label={t.commandK}><Icon name="command" size={10} /> K</kbd></div>
      <div className="sp-nav-scroll"><button type="button" className={`sp-overview-link ${overview ? 'sp-nav-active' : ''}`} onClick={() => { setOverview(true); setNavOpen(false); }}>{t.introduction}<Icon name="arrow" size={15} /></button>
        {groups.map((group) => <div className="sp-nav-group" key={group.tag}><h2>{group.tag}</h2>{group.operations.map((item) => <div className="sp-operation-row" key={item.id}><a href={operationHash(item.id)} onClick={(event) => { event.preventDefault(); navigate(item.id); }} className={`sp-operation-link ${selectedId === item.id && !overview ? 'sp-nav-active' : ''}`} aria-current={selectedId === item.id && !overview ? 'page' : undefined}><Method method={item.method} /><span>{item.summary}</span></a><button type="button" className="sp-favorite-toggle" aria-pressed={favoriteIds.includes(item.id)} aria-label={favoriteIds.includes(item.id) ? t.removeFavorite(item.summary) : t.addFavorite(item.summary)} onClick={() => setFavoriteIds(previous => toggleFavorite(previous, item.id, spec?.operations ?? []))}><Icon name="star" size={14} /></button></div>)}</div>)}
        {!loading && !loadError && query && operations.length === 0 && <div className="sp-no-search"><p>{t.noSearchResults(query)}</p><button type="button" onClick={() => { setQuery(''); search.current?.focus(); }}>{t.clearSearch}</button></div>}
        {spec && <SessionPanel history={history} favorites={spec.operations.filter(item => favoriteIds.includes(item.id))} onNavigate={id => { setQuery(''); navigate(id); }} onClearHistory={() => setHistory([])} onClearFavorites={() => setFavoriteIds([])} locale={locale} />}
      </div>
      <div className="sp-nav-bottom"><button type="button" className="sp-import-button" onClick={() => fileInput.current?.click()}><Icon name="upload" size={16} />{t.importSpecification}</button><input className="sp-sr-only" ref={fileInput} type="file" accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml" aria-label={t.importFile} onChange={(event) => { void importFile(event.target.files?.[0]); }} />{Boolean(importError) && <p className="sp-import-error" role="alert">{t.importFailed(message(importError, locale))}</p>}<div className="sp-nav-footnote"><span>OpenAPI {spec ? '3.1.x' : ''}</span><button type="button" className="sp-theme-toggle" onClick={() => setMode(dark ? 'light' : 'dark')} aria-label={dark ? t.enableLight : t.enableDark} title={dark ? t.lightTheme : t.darkTheme}><Icon name={dark ? 'sun' : 'moon'} size={17} /></button></div></div>
    </nav>
    {loading ? <main className="sp-state"><span className="sp-spinner" aria-hidden="true" /><h1>{t.loadingSpec}</h1><p>{t.preparingDocs}</p></main> : loadError ? <main className="sp-state sp-state-error" role="alert"><h1>{t.cannotOpenSpec}</h1><p>{message(loadError, locale)}</p><button type="button" onClick={() => fileInput.current?.click()}>{t.importOpenApi}</button></main> : !spec?.operations.length ? <main className="sp-state"><h1>{t.noDocumentedRoute}</h1><p>{t.addOperations}</p><button type="button" onClick={() => fileInput.current?.click()}>{t.importAnother}</button></main> : overview ? <main className="sp-overview sp-documentation"><div className="sp-breadcrumb">{t.apiReference} <span aria-hidden="true">/</span> {t.introduction}</div><h1>{props.title ?? spec.title}</h1><p className="sp-overview-version">{t.version(spec.version)}</p><Prose>{spec.description || t.overviewDescription}</Prose><section className="sp-doc-section"><div className="sp-section-heading"><h2>{t.exploreApi}</h2><span>{t.routeCount(spec.operations.length)}</span></div>{spec.operations.map((item) => <button className="sp-overview-operation" type="button" key={item.id} onClick={() => navigate(item.id)}><Method method={item.method} /><code>{item.path}</code><span>{item.summary}</span><Icon name="arrow" size={18} /></button>)}</section>{spec.warnings.length > 0 && <details className="sp-warnings"><summary>{t.specNotes(spec.warnings.length)}</summary><ul>{spec.warnings.map((warning) => <li key={warning}>{localizeError(warning, locale)}</li>)}</ul></details>}</main> : operation ? <main className="sp-workspace"><OperationDocs key={`docs:${specRevision}:${operation.id}`} operation={operation} apiTitle={props.title ?? spec.title} idPrefix={idPrefix} onNotice={setNotice} /><RequestPanel key={`request:${specRevision}:${operation.id}`} operation={operation} sourceUrl={spec.sourceUrl} transport={props.transport ?? httpTransport} transportKind={props.transportMode === 'simulation' ? 'simulation' : props.transportMode === 'http' || !props.transport || props.transport === httpTransport ? 'http' : 'custom'} credentials={credentials} setCredentials={setCredentials} idPrefix={idPrefix} onNotice={setNotice} requestTimeoutMs={props.requestTimeoutMs} serverProfiles={props.serverProfiles} selectedProfileId={selectedProfileId} onSelectProfile={setSelectedProfileId} onRecord={record} /></main> : null}
    <div className="sp-sr-only" role="status" aria-live="polite" aria-atomic="true">{notice}</div>
  </div>;
}
