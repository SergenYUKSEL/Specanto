import { useId, useRef, useState } from 'react';
import { parseSpec, SPEC_BYTE_LIMIT } from '../core/parser';
import { compareSpecs } from '../core/spec-diff';
import type { SpecDiffCode, SpecDiffReport, SpecDiffSeverity } from '../core/spec-diff';
import type { NormalizedSpec } from '../core/types';
import { Icon } from './Icon';
import '../styles/comparison.css';

export type SpecComparisonProps = { locale?: 'fr' | 'en'; colorMode?: 'light' | 'dark' };
type Source = { name: string; spec?: NormalizedSpec; loading?: boolean; error?: 'large' | 'invalid' | 'unreadable' };
type Filter = 'all' | SpecDiffSeverity;

const COPY = {
  en: {
    title: 'Compare two APIs', eyebrow: 'OpenAPI comparison', introduction: 'Load an earlier and a newer OpenAPI 3.1 document to review changes before integrating a new version.',
    before: 'Before', after: 'After', documentBefore: 'Before document', documentAfter: 'After document', select: 'Choose a JSON or YAML file · 2 MiB maximum', loading: 'Reading document…',
    compare: 'Compare', clear: 'Clear files', empty: 'Choose both documents, then run the comparison.', result: 'Comparison results', filter: 'Show changes', all: 'All changes',
    added: 'Added', removed: 'Removed', 'potentially-breaking': 'Potentially breaking', changed: 'Changed',
    becameRequired: 'Field became required', becameOptional: 'Field became optional',
    partial: 'This review covers operations, parameters, the primary request and response media types, supported schema constraints and authentication. It cannot certify full API compatibility. Servers, descriptions and examples are excluded.',
    memory: 'Files are read locally and kept in memory. No API request is sent.', noChanges: 'No changes detected in the compared subset.', noFilteredChanges: 'No changes in this category.',
    truncated: 'Report incomplete: the change, work or depth limit was reached. Counts describe the changes shown.', warnings: 'Review notes',
    large: 'This file exceeds the 2 MiB limit.', invalid: 'This file is not a valid supported OpenAPI 3.1 JSON or YAML document.', unreadable: 'This file could not be read.',
    normalized: 'The documents contain normalization warnings. Some OpenAPI features may not be represented.', unsupported: 'Some operations contain unsupported or partially supported features. Review the original documents.',
    boolean: 'Boolean schemas are compared conservatively and need manual review.', reference: 'Unresolved, external or cyclic references prevent a complete comparison.',
    advanced: 'Additional JSON Schema keywords are compared conservatively. Their full semantics are not evaluated.', limit: 'The comparison reached a depth, cycle or work limit. Some changes may be omitted.', changesLimit: 'The report shows at most 500 changes.',
  },
  fr: {
    title: 'Comparer deux API', eyebrow: 'Comparaison OpenAPI', introduction: 'Chargez une ancienne et une nouvelle version OpenAPI 3.1 pour examiner les changements avant une intégration.',
    before: 'Avant', after: 'Après', documentBefore: 'Document avant', documentAfter: 'Document après', select: 'Choisissez un fichier JSON ou YAML · 2 Mio maximum', loading: 'Lecture du document…',
    compare: 'Comparer', clear: 'Effacer les fichiers', empty: 'Choisissez les deux documents, puis lancez la comparaison.', result: 'Résultat de la comparaison', filter: 'Afficher les changements', all: 'Tous les changements',
    added: 'Ajouts', removed: 'Suppressions', 'potentially-breaking': 'Ruptures potentielles', changed: 'Modifications',
    becameRequired: 'Champ devenu obligatoire', becameOptional: 'Champ devenu facultatif',
    partial: 'Cette revue compare les opérations, paramètres, types de contenu principaux, contraintes de schéma prises en charge et authentification. Elle ne certifie pas la compatibilité complète des API. Serveurs, descriptions et exemples sont exclus.',
    memory: 'Les fichiers sont lus localement et conservés en mémoire. Aucune requête API n’est envoyée.', noChanges: 'Aucun changement détecté dans le périmètre comparé.', noFilteredChanges: 'Aucun changement dans cette catégorie.',
    truncated: 'Rapport incomplet : une limite de changements, de parcours ou de profondeur a été atteinte. Les compteurs portent sur les changements affichés.', warnings: 'Points à vérifier',
    large: 'Ce fichier dépasse la limite de 2 Mio.', invalid: 'Ce fichier n’est pas un document OpenAPI 3.1 JSON ou YAML valide pris en charge.', unreadable: 'Impossible de lire ce fichier.',
    normalized: 'Les documents comportent des avertissements de normalisation. Certaines fonctions OpenAPI peuvent être absentes du rapport.', unsupported: 'Certaines opérations utilisent des fonctions partiellement prises en charge. Vérifiez les documents originaux.',
    boolean: 'Les schémas booléens sont comparés avec prudence et demandent une vérification manuelle.', reference: 'Des références non résolues, externes ou cycliques empêchent une comparaison complète.',
    advanced: 'Les mots-clés JSON Schema supplémentaires sont comparés avec prudence, sans évaluer toute leur sémantique.', limit: 'Le parcours a atteint une limite de profondeur, de cycle ou de volume. Certains changements peuvent être omis.', changesLimit: 'Le rapport affiche au maximum 500 changements.',
  },
} as const;

const CHANGE_LABELS: Record<SpecDiffCode, { en: string; fr: string }> = {
  'operation-added': { en: 'Operation added', fr: 'Opération ajoutée' }, 'operation-removed': { en: 'Operation removed', fr: 'Opération supprimée' },
  'parameter-added': { en: 'Parameter added', fr: 'Paramètre ajouté' }, 'parameter-removed': { en: 'Parameter removed', fr: 'Paramètre supprimé' },
  'parameter-location-changed': { en: 'Parameter location changed', fr: 'Emplacement du paramètre modifié' },
  'parameter-required-changed': { en: 'Parameter requirement changed', fr: 'Obligation du paramètre modifiée' },
  'parameter-serialization-changed': { en: 'Parameter serialization changed', fr: 'Sérialisation du paramètre modifiée' },
  'request-body-added': { en: 'Request body added', fr: 'Corps de requête ajouté' }, 'request-body-removed': { en: 'Request body removed', fr: 'Corps de requête supprimé' },
  'request-body-required-changed': { en: 'Request body requirement changed', fr: 'Obligation du corps de requête modifiée' },
  'request-body-media-changed': { en: 'Request media type changed', fr: 'Type de contenu de la requête modifié' },
  'response-added': { en: 'Response status added', fr: 'Statut de réponse ajouté' }, 'response-removed': { en: 'Response status removed', fr: 'Statut de réponse supprimé' },
  'response-media-changed': { en: 'Response media type changed', fr: 'Type de contenu de la réponse modifié' },
  'schema-added': { en: 'Schema added', fr: 'Schéma ajouté' }, 'schema-removed': { en: 'Schema removed', fr: 'Schéma supprimé' },
  'schema-boolean-changed': { en: 'Boolean schema changed', fr: 'Schéma booléen modifié' },
  'schema-type-changed': { en: 'Allowed types changed', fr: 'Types autorisés modifiés' }, 'schema-enum-changed': { en: 'Allowed enum values changed', fr: 'Valeurs d’énumération autorisées modifiées' },
  'schema-required-changed': { en: 'Required fields changed', fr: 'Champs obligatoires modifiés' },
  'schema-property-added': { en: 'Field added', fr: 'Champ ajouté' }, 'schema-property-removed': { en: 'Field removed', fr: 'Champ supprimé' },
  'schema-bound-changed': { en: 'Schema bound changed', fr: 'Limite du schéma modifiée' },
  'schema-constraint-changed': { en: 'Additional constraint changed', fr: 'Contrainte supplémentaire modifiée' },
  'security-requirements-changed': { en: 'Authentication requirements changed', fr: 'Exigences d’authentification modifiées' },
  'security-scheme-changed': { en: 'Authentication scheme changed', fr: 'Mécanisme d’authentification modifié' },
};
const SEVERITIES: SpecDiffSeverity[] = ['added', 'removed', 'potentially-breaking', 'changed'];

export function SpecComparison({ locale = 'fr', colorMode = 'light' }: SpecComparisonProps) {
  const copy = COPY[locale];
  const id = useId();
  const [sources, setSources] = useState<[Source | undefined, Source | undefined]>([undefined, undefined]);
  const [report, setReport] = useState<SpecDiffReport>();
  const [filter, setFilter] = useState<Filter>('all');
  const revisions = useRef([0, 0]);
  const inputs = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null]);

  async function readFile(index: 0 | 1, file: File | undefined) {
    if (!file) return;
    const revision = ++revisions.current[index]!;
    setReport(undefined);
    setFilter('all');
    const update = (source: Source) => {
      if (revision !== revisions.current[index]) return;
      setSources(current => index === 0 ? [source, current[1]] : [current[0], source]);
    };
    if (file.size > SPEC_BYTE_LIMIT) { update({ name: file.name, error: 'large' }); return; }
    update({ name: file.name, loading: true });
    let text: string;
    try { text = await file.text(); } catch { update({ name: file.name, error: 'unreadable' }); return; }
    try { update({ name: file.name, spec: parseSpec(text) }); } catch { update({ name: file.name, error: 'invalid' }); }
  }
  function clear() {
    revisions.current = revisions.current.map(revision => revision + 1);
    for (const input of inputs.current) if (input) input.value = '';
    setSources([undefined, undefined]); setReport(undefined); setFilter('all');
  }
  function compare() {
    const before = sources[0]?.spec, after = sources[1]?.spec;
    if (before && after) { setReport(compareSpecs(before, after)); setFilter('all'); }
  }
  function warningLabel(warning: string): string {
    if (warning.startsWith('The imported documents')) return copy.normalized;
    if (warning.startsWith('Some operations')) return copy.unsupported;
    if (warning.startsWith('Boolean schemas')) return copy.boolean;
    if (warning.startsWith('Unresolved')) return copy.reference;
    if (warning.startsWith('Additional JSON Schema')) return copy.advanced;
    if (warning.startsWith('Comparison reached')) return copy.limit;
    return copy.changesLimit;
  }
  const changes = report?.changes.filter(change => filter === 'all' || change.severity === filter) ?? [];

  return <section className="sp-comparison" data-color-mode={colorMode} lang={locale} aria-labelledby={`${id}-heading`}>
    <header className="sp-comparison-header">
      <p className="sp-comparison-eyebrow">{copy.eyebrow}</p>
      <h1 id={`${id}-heading`}>{copy.title}</h1>
      <p>{copy.introduction}</p>
    </header>
    <div className="sp-comparison-sources">
      {([0, 1] as const).map(index => {
        const source = sources[index];
        const label = index === 0 ? copy.documentBefore : copy.documentAfter;
        return <div className="sp-comparison-source" key={index}>
          <span className="sp-comparison-number">0{index + 1}</span>
          <h2>{index === 0 ? copy.before : copy.after}</h2>
          <label htmlFor={`${id}-file-${index}`}>{label}</label>
          <input ref={input => { inputs.current[index] = input; }} id={`${id}-file-${index}`} type="file" accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml" aria-describedby={`${id}-hint-${index}`} onChange={event => { void readFile(index, event.currentTarget.files?.[0]); }} />
          <p className="sp-comparison-hint" id={`${id}-hint-${index}`}>{copy.select}</p>
          <div className="sp-comparison-source-state" aria-live="polite">
            {source?.loading && <p>{copy.loading}</p>}
            {source?.error && <p className="sp-comparison-error" role="alert">{copy[source.error]}</p>}
            {source?.spec && <p><strong>{source.spec.title}</strong><span>{source.spec.version}</span><small>{source.name}</small></p>}
          </div>
        </div>;
      })}
    </div>
    <div className="sp-comparison-actions">
      <button className="sp-comparison-primary" type="button" onClick={compare} disabled={!sources[0]?.spec || !sources[1]?.spec || sources.some(source => source?.loading)}>{copy.compare}<Icon name="arrow" /></button>
      <button type="button" onClick={clear} disabled={!sources.some(Boolean)}><Icon name="close" />{copy.clear}</button>
      <p>{copy.memory}</p>
    </div>
    <p className="sp-comparison-scope">{copy.partial}</p>
    <div className="sp-comparison-results" role="region" aria-label={copy.result} aria-live="polite">
      {!report ? <p className="sp-comparison-empty">{copy.empty}</p> : <>
        <div className="sp-comparison-summary">
          {SEVERITIES.map(severity => <div key={severity} data-severity={severity}><strong>{report.summary[severity]}</strong><span>{copy[severity]}</span></div>)}
        </div>
        {report.truncated && <p className="sp-comparison-error" role="alert">{copy.truncated}</p>}
        {report.warnings.length > 0 && <aside className="sp-comparison-warnings"><h2>{copy.warnings}</h2><ul>{report.warnings.map(warning => <li key={warning}>{warningLabel(warning)}</li>)}</ul></aside>}
        <div className="sp-comparison-filter"><label htmlFor={`${id}-filter`}>{copy.filter}</label><select id={`${id}-filter`} value={filter} onChange={event => setFilter(event.target.value as Filter)}><option value="all">{copy.all}</option>{SEVERITIES.map(severity => <option key={severity} value={severity}>{copy[severity]}</option>)}</select></div>
        {changes.length === 0 ? <p className="sp-comparison-empty">{report.changes.length ? copy.noFilteredChanges : copy.noChanges}</p> : <ol className="sp-comparison-changes">
          {changes.map(change => <li key={`${change.method}:${change.path}:${change.location}:${change.code}`}>
            <div className="sp-comparison-operation"><span className="sp-comparison-method">{change.method}</span><code>{change.path}</code></div>
            <div className="sp-comparison-change"><strong>{change.code === 'schema-required-changed' && change.afterRequired !== undefined ? change.afterRequired ? copy.becameRequired : copy.becameOptional : CHANGE_LABELS[change.code][locale]}</strong><code>{change.location}</code></div>
            <span className="sp-comparison-severity" data-severity={change.severity}>{copy[change.severity]}</span>
          </li>)}
        </ol>}
      </>}
    </div>
  </section>;
}
