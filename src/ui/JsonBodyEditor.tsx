import { useMemo, useState } from 'react';
import { formatJsonBody, inspectJsonBody, jsonBodyExample } from '../core/body-validation';
import type { Schema } from '../core/types';
import { Icon } from './Icon';
import { useReferenceLocale, useReferenceMessages } from './i18n';

export type JsonBodyEditorProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  schema?: Schema;
  rawSchema?: unknown;
  required?: boolean;
  example?: unknown;
  mediaType?: string;
  onReset?: () => void;
  onNotice?: (notice: string) => void;
};

export function JsonBodyEditor({ id, value, onChange, schema, rawSchema, required, example, mediaType = 'application/json', onReset, onNotice }: JsonBodyEditorProps) {
  const t = useReferenceMessages();
  const locale = useReferenceLocale();
  const [action, setAction] = useState<'formatted' | 'example' | 'format-error' | null>(null);
  const inspection = useMemo(() => inspectJsonBody(value, { schema, rawSchema, required, locale }), [value, schema, rawSchema, required, locale]);
  const generatedExample = useMemo(() => jsonBodyExample(schema, rawSchema, example), [schema, rawSchema, example]);
  const actionMessage = action === 'formatted' ? t.jsonFormatted : action === 'example' ? example !== undefined ? t.documentedExampleInserted : t.generatedExampleInserted : action === 'format-error' ? (() => { const result = formatJsonBody(value, locale); return result.ok ? '' : result.message; })() : '';
  const publish = (notice: string, nextAction: typeof action) => { setAction(nextAction); onNotice?.(notice); };
  const format = () => {
    const formatted = formatJsonBody(value, locale);
    if (!formatted.ok) { publish(formatted.message, 'format-error'); return; }
    onChange(formatted.value);
    publish(t.jsonFormatted, 'formatted');
  };
  const generate = () => {
    if (generatedExample === undefined) return;
    onChange(generatedExample);
    publish(example !== undefined ? t.documentedExampleInserted : t.generatedExampleInserted, 'example');
  };
  const status = inspection.message ?? (inspection.state === 'empty' ? t.emptyJsonBody : schema ? t.jsonConstraintsValid : t.jsonSyntaxValid);
  return <div className="sp-request-body sp-guided-body">
    <div className="sp-editor-heading"><label htmlFor={id}>{t.body}{required && <span className="sp-required"> {t.required}</span>}</label><span>{mediaType}</span></div>
    <div className="sp-json-actions" role="group" aria-label={t.jsonActions}>
      <button type="button" onClick={format}><Icon name="braces" size={14} />{t.formatJson}</button>
      <button type="button" onClick={generate} disabled={generatedExample === undefined}><Icon name="plus" size={14} />{t.generateExample}</button>
      {onReset && <button type="button" className="sp-json-reset" onClick={() => { onReset(); setAction(null); onNotice?.(t.bodyReset); }}>{t.reset}</button>}
    </div>
    <textarea id={id} className="sp-json-editor" value={value} onChange={(event) => { setAction(null); onChange(event.target.value); }} spellCheck={false} autoComplete="off" aria-label={t.jsonBodyLabel} aria-invalid={!inspection.valid} aria-describedby={`${id}-validation ${id}-scope`} />
    <div id={`${id}-validation`} className={`sp-json-validation${inspection.valid ? '' : ' sp-json-validation-error'}`} role="status" aria-live="polite" aria-atomic="true">{status}{actionMessage && actionMessage !== status && <span className="sp-json-action-notice">{actionMessage}</span>}</div>
    <p id={`${id}-scope`} className="sp-json-validation-scope">{t.partialValidation}</p>
    {generatedExample === undefined && <p className="sp-json-example-hint">{t.noSchemaExample}</p>}
  </div>;
}
