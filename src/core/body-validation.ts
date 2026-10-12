import { exampleForSchema, validateSchema } from './schema';
import { hasBooleanSchema } from './schema-shape';
import type { Schema } from './types';

export type JsonBodyInspection = {
  state: 'empty' | 'valid' | 'syntax-error' | 'schema-error' | 'unsupported';
  valid: boolean;
  message?: string;
  path?: string;
};

type JsonBodyOptions = { schema?: Schema; rawSchema?: unknown; required?: boolean; locale?: 'fr' | 'en' };
type FormattedJsonBody = { ok: true; value: string } | { ok: false; value: string; message: string };

function syntaxMessage(cause: unknown, text: string, locale: 'fr' | 'en' = 'fr'): string {
  const message = cause instanceof Error ? cause.message : '';
  const location = message.match(/line (\d+) column (\d+)/i);
  const position = message.match(/position (\d+)/i);
  let coordinates = '';
  if (location) coordinates = locale === 'en' ? ` (line ${location[1]}, column ${location[2]})` : ` (ligne ${location[1]}, colonne ${location[2]})`;
  else if (position) {
    const preceding = text.slice(0, Number(position[1]));
    const line = preceding.split('\n').length;
    const column = preceding.length - preceding.lastIndexOf('\n');
    coordinates = locale === 'en' ? ` (line ${line}, column ${column})` : ` (ligne ${line}, colonne ${column})`;
  }
  return locale === 'en' ? `Invalid JSON${coordinates}. Check quotes, commas and braces.` : `JSON invalide${coordinates}. Vérifiez les guillemets, les virgules et les accolades.`;
}

function schemaMessage(cause: unknown, locale: 'fr' | 'en' = 'fr'): { message: string; path?: string } {
  const source = cause instanceof Error ? cause.message : String(cause);
  const missing = source.match(/^Required field (.+) is missing\.$/);
  if (missing) return { path: missing[1], message: locale === 'en' ? `${missing[1]} is a required field.` : `${missing[1]} est un champ requis.` };
  if (locale === 'en') {
    const path = source.match(/^(.+) (?:must be|is not an allowed|needs at least|allows at most)/)?.[1] ?? source.match(/^Unsupported schema reference or depth at (.+)\.$/)?.[1];
    return { message: source, ...(path ? { path } : {}) };
  }
  const type = source.match(/^(.+) must be (.+)\.$/);
  const labels: Record<string, string> = { string: 'texte', integer: 'entier', number: 'nombre', boolean: 'booléen', object: 'objet', array: 'tableau', null: 'nul' };
  if (type && type[2]!.split(' or ').every(item => Object.hasOwn(labels, item))) {
    const types = type[2]!.split(' or ').map(item => labels[item] ?? item).join(' ou ');
    return { path: type[1], message: `${type[1]} doit être de type ${types}.` };
  }
  const rules: [RegExp, (path: string, value?: string) => string][] = [
    [/^(.+) is not an allowed enum value\.$/, path => `${path} ne fait pas partie des valeurs autorisées.`],
    [/^(.+) must be at least (.+)\.$/, (path, value) => `${path} doit être supérieur ou égal à ${value}.`],
    [/^(.+) must be at most (.+)\.$/, (path, value) => `${path} doit être inférieur ou égal à ${value}.`],
    [/^(.+) needs at least (.+) items\.$/, (path, value) => `${path} doit contenir au moins ${value} élément${value === '1' ? '' : 's'}.`],
    [/^(.+) allows at most (.+) items\.$/, (path, value) => `${path} doit contenir au plus ${value} élément${value === '1' ? '' : 's'}.`],
    [/^Unsupported schema reference or depth at (.+)\.$/, path => `${path} contient une référence ou une profondeur de schéma non prise en charge.`],
  ];
  for (const [pattern, translate] of rules) {
    const match = source.match(pattern);
    if (match) return { path: match[1], message: translate(match[1]!, match[2]) };
  }
  return { message: `Le corps ne respecte pas les contraintes prises en charge : ${source}` };
}

/** Uses the request engine's supported constraints; this is not full JSON Schema validation. */
export function inspectJsonBody(text: string, options: JsonBodyOptions = {}): JsonBodyInspection {
  if (!text.trim()) return options.required ? { state: 'empty', valid: false, path: '$', message: options.locale === 'en' ? 'The JSON request body is required.' : 'Le corps JSON est requis.' } : { state: 'empty', valid: true };
  let value: unknown;
  try { value = JSON.parse(text); }
  catch (cause) { return { state: 'syntax-error', valid: false, message: syntaxMessage(cause, text, options.locale) }; }
  if (hasBooleanSchema(options.rawSchema ?? options.schema)) return { state: 'unsupported', valid: false, message: options.locale === 'en' ? 'This schema contains a boolean constraint unsupported for requests.' : 'Ce schéma contient une contrainte booléenne non prise en charge pour les requêtes.' };
  try { validateSchema(value, options.schema, '$'); }
  catch (cause) { return { state: 'schema-error', valid: false, ...schemaMessage(cause, options.locale) }; }
  return { state: 'valid', valid: true };
}

/** Adds whitespace without rewriting string escapes, number literals or duplicate keys. */
export function formatJsonBody(text: string, locale: 'fr' | 'en' = 'fr'): FormattedJsonBody {
  try { JSON.parse(text); }
  catch (cause) { return { ok: false, value: text, message: syntaxMessage(cause, text, locale) }; }
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}[\],:]|[^\s{}[\],:]+/g) ?? [];
  const pieces: string[] = [];
  let depth = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]!;
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    if (token === '{' || token === '[') {
      pieces.push(token);
      if (next !== (token === '{' ? '}' : ']')) {
        depth++;
        if (depth > 128) return { ok: false, value: text, message: locale === 'en' ? 'Formatting is limited to 128 levels. The body has been kept unchanged.' : 'Le formatage est limité à 128 niveaux. Le corps a été conservé.' };
        pieces.push('\n', '  '.repeat(depth));
      }
    } else if (token === '}' || token === ']') {
      if (previous !== (token === '}' ? '{' : '[')) { depth--; pieces.push('\n', '  '.repeat(depth)); }
      pieces.push(token);
    } else if (token === ',') pieces.push(',\n', '  '.repeat(depth));
    else if (token === ':') pieces.push(': ');
    else pieces.push(token);
  }
  return { ok: true, value: pieces.join('') };
}

export function jsonBodyExample(schema?: Schema, rawSchema?: unknown, authored?: unknown): string | undefined {
  if (hasBooleanSchema(rawSchema ?? schema)) return undefined;
  const value = authored !== undefined ? authored : exampleForSchema(schema);
  if (value === undefined) return undefined;
  return JSON.stringify(value, null, 2);
}
