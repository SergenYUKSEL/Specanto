import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiReference } from '../src/ui/ApiReference';
import { JsonBodyEditor } from '../src/ui/JsonBodyEditor';
import { localizeError, messages, ReferenceLocaleProvider, type ReferenceLocale } from '../src/ui/i18n';
import { formatJsonBody, inspectJsonBody } from '../src/core/body-validation';
import { describeRequestTimeout, resolveRequestTimeout } from '../src/ui/request-timeout';

const renderEditor = (locale: ReferenceLocale, value: string) => renderToStaticMarkup(createElement(ReferenceLocaleProvider, { locale, children: createElement(JsonBodyEditor, { id: 'body', value, onChange: () => {}, schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } }) }));

describe('reference interface language', () => {
  test('provides the same nonempty message keys in each language', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    for (const dictionary of Object.values(messages)) for (const value of Object.values(dictionary)) if (typeof value === 'string') expect(value.trim()).not.toBe('');
    expect(messages.fr.sendRequest).toBe('Envoyer la requête');
    expect(messages.en.sendRequest).toBe('Send request');
    expect(messages.en.secretFreeExample('Fetch')).toBe('Fetch example without secrets');
    expect(messages.fr.noSearchResults('My GET')).toBe('Aucune route pour « My GET ».');
    expect(messages.en.fieldCount(1)).toBe('1 field');
    expect(messages.en.fieldCount(2)).toBe('2 fields');
  });

  test('uses French by default and sets the local element language', () => {
    const html = renderToStaticMarkup(createElement(ApiReference, { spec: { openapi: '3.1.1', info: { title: 'My API', version: '1' }, paths: {} } }));
    expect(html).toContain('lang="fr"');
    expect(html).toContain('Chargement de la spécification');
    expect(html).toContain('Rechercher une route');
  });

  test('renders English navigation, accessibility labels and loading state', () => {
    const html = renderToStaticMarkup(createElement(ApiReference, { locale: 'en', title: 'Ma propre API', spec: { openapi: '3.1.1', info: { title: 'My API', version: '1' }, paths: {} } }));
    expect(html).toContain('lang="en"');
    expect(html).toContain('Loading specification');
    expect(html).toContain('aria-label="Search routes"');
    expect(html).toContain('Ma propre API');
    expect(html).not.toContain('Rechercher une route');
  });

  test('localizes the guided editor and its validation using the same provider', () => {
    const french = renderEditor('fr', '{}');
    const english = renderEditor('en', '{}');
    expect(french).toContain('Formater JSON');
    expect(french).toContain('$.name est un champ requis.');
    expect(english).toContain('Format JSON');
    expect(english).toContain('$.name is a required field.');
    expect(english).toContain('aria-label="JSON request body"');
    expect(english).toContain('Partial validation:');
    expect(english).not.toContain('champ requis');
  });
});

describe('localized diagnostics preserve engine data', () => {
  test.each([
    ['Only OpenAPI 3.1.x documents are supported.', 'Seuls les documents OpenAPI 3.1.x sont pris en charge.'],
    ['Only OpenAPI 3.0.x and 3.1.x documents are supported.', 'Seuls les documents OpenAPI 3.0.x et 3.1.x sont pris en charge.'],
    ['Could not load the OpenAPI document: HTTP 401.', 'Impossible de charger le document OpenAPI : HTTP 401.'],
    ['Required parameter product_id is missing.', 'Le paramètre product_id est requis.'],
    ['$.items[0].quantity must be integer or null.', '$.items[0].quantity doit être de type entier ou nul.'],
    ['$.quantity must be at least 1.', '$.quantity doit être supérieur ou égal à 1.'],
    ['$.items allows at most 20 items.', '$.items doit contenir au plus 20 éléments.'],
    ['Invalid request body schema.enum: expected an array.', 'request body schema.enum invalide : un tableau est attendu.'],
    ['Remote or external reference is display-only: https://api.example.com/types#Thing', 'La référence distante ou externe est disponible en lecture seule : https://api.example.com/types#Thing'],
    ['Credential token is not bound to the final destination origin https://api.example.com.', 'L’identifiant token n’est pas associé à l’origine de destination https://api.example.com.'],
    ['Duplicate server profile id: production', 'Identifiant de profil de serveur en double : production'],
  ])('translates known error %s and keeps stable English engine text', (original, french) => {
    expect(localizeError(new Error(original), 'fr')).toBe(french);
    expect(localizeError(new Error(original), 'en')).toBe(original);
  });

  test('preserves unknown diagnostics, parser details and user field names', () => {
    expect(localizeError(new Error('Upstream custom diagnostic <detail>'), 'fr')).toBe('Upstream custom diagnostic <detail>');
    expect(localizeError(new Error('Invalid JSON or YAML document: parser line 12'), 'fr')).toBe('Document JSON ou YAML invalide : parser line 12');
    expect(localizeError('$.numberOfBooleanObjects must be string.', 'fr')).toBe('$.numberOfBooleanObjects doit être de type texte.');
    expect(localizeError(null, 'en')).toBe('An unexpected error occurred.');
    expect(localizeError(null, 'fr')).toBe('Une erreur inattendue est survenue.');
  });

  test('translates timeout validation and duration without changing configured bounds', () => {
    expect(describeRequestTimeout(100, 'en')).toBe('0.1 seconds');
    expect(describeRequestTimeout(1000, 'en')).toBe('1 second');
    expect(describeRequestTimeout(1234, 'en')).toBe('1.234 seconds');
    expect(describeRequestTimeout(45_000, 'en')).toBe('45 seconds');
    expect(describeRequestTimeout(1234)).toBe('1,234 seconde');
    let error: unknown;
    try { resolveRequestTimeout(99); } catch (cause) { error = cause; }
    expect(localizeError(error, 'en')).toBe('requestTimeoutMs must be an integer between 100 and 300000 ms.');
  });

  test('reports JSON syntax and required bodies in the configured language', () => {
    expect(inspectJsonBody('', { required: true, locale: 'en' })).toMatchObject({ valid: false, path: '$', message: 'The JSON request body is required.' });
    expect(inspectJsonBody('{"x":', { locale: 'en' }).message).toStartWith('Invalid JSON');
    expect(inspectJsonBody('1', { rawSchema: false, locale: 'en' }).message).toContain('boolean constraint unsupported');
    const formatted = formatJsonBody('{"x":', 'en');
    expect(formatted.ok).toBe(false);
    if (!formatted.ok) expect(formatted.message).toStartWith('Invalid JSON');
  });

  test('keeps precise English validation paths and constraint values', () => {
    expect(inspectJsonBody('{"items":[{"quantity":0}]}', { locale: 'en', schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { quantity: { type: 'integer', minimum: 1 } } } } } } })).toMatchObject({ valid: false, path: '$.items[0].quantity', message: '$.items[0].quantity must be at least 1.' });
    expect(inspectJsonBody('{"name":3}', { locale: 'en', schema: { type: 'object', properties: { name: { type: 'string' } } } })).toMatchObject({ path: '$.name', message: '$.name must be string.' });
  });
});
