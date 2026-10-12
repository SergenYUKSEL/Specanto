import { useMemo, useState } from 'react';
import { formatJsonBody, inspectJsonBody, jsonBodyExample } from '../core/body-validation';
import type { Schema } from '../core/types';
import { Icon } from './Icon';

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
  const [actionMessage, setActionMessage] = useState('');
  const inspection = useMemo(() => inspectJsonBody(value, { schema, rawSchema, required }), [value, schema, rawSchema, required]);
  const generatedExample = useMemo(() => jsonBodyExample(schema, rawSchema, example), [schema, rawSchema, example]);
  const publish = (notice: string) => { setActionMessage(notice); onNotice?.(notice); };
  const format = () => {
    const formatted = formatJsonBody(value);
    if (!formatted.ok) { publish(formatted.message); return; }
    onChange(formatted.value);
    publish('Le JSON a été formaté.');
  };
  const generate = () => {
    if (generatedExample === undefined) return;
    onChange(generatedExample);
    publish(example !== undefined ? 'L’exemple documenté a été inséré.' : 'Un exemple a été généré à partir du schéma. Vérifiez les contraintes propres à votre API.');
  };
  const status = inspection.message ?? (inspection.state === 'empty' ? 'Corps vide : aucune valeur JSON ajoutée.' : schema ? 'JSON lisible ; contraintes prises en charge respectées.' : 'Syntaxe JSON valide. Aucun schéma de validation fourni.');
  return <div className="sp-request-body sp-guided-body">
    <div className="sp-editor-heading"><label htmlFor={id}>Corps{required && <span className="sp-required"> requis</span>}</label><span>{mediaType}</span></div>
    <div className="sp-json-actions" role="group" aria-label="Actions sur le corps JSON">
      <button type="button" onClick={format}><Icon name="braces" size={14} />Formater JSON</button>
      <button type="button" onClick={generate} disabled={generatedExample === undefined}><Icon name="plus" size={14} />Générer un exemple</button>
      {onReset && <button type="button" className="sp-json-reset" onClick={() => { onReset(); setActionMessage(''); onNotice?.('Le corps de la requête a été réinitialisé.'); }}>Réinitialiser</button>}
    </div>
    <textarea id={id} className="sp-json-editor" value={value} onChange={(event) => { setActionMessage(''); onChange(event.target.value); }} spellCheck={false} autoComplete="off" aria-label="Corps JSON de la requête" aria-invalid={!inspection.valid} aria-describedby={`${id}-validation ${id}-scope`} />
    <div id={`${id}-validation`} className={`sp-json-validation${inspection.valid ? '' : ' sp-json-validation-error'}`} role="status" aria-live="polite" aria-atomic="true">{status}{actionMessage && actionMessage !== status && <span className="sp-json-action-notice">{actionMessage}</span>}</div>
    <p id={`${id}-scope`} className="sp-json-validation-scope">Validation partielle : types, champs requis, valeurs autorisées, bornes numériques et nombre d’éléments. Les autres contraintes restent à vérifier.</p>
    {generatedExample === undefined && <p className="sp-json-example-hint">Aucun exemple disponible pour ce schéma.</p>}
  </div>;
}
