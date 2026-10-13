import { createContext, useContext, type ReactNode } from 'react';

export type ReferenceLocale = 'fr' | 'en';

const fr = {
  navigationWidth: 'Largeur de la navigation', requestWidth: 'Largeur de la console', resizePanels: 'Glisser ou utiliser les flèches pour ajuster. Double-clic ou Entrée pour réinitialiser.',
  exampleUnavailable: 'Exemple indisponible.', unexpectedError: 'Une erreur inattendue est survenue.',
  anyValue: 'toute valeur acceptée', noValue: 'aucune valeur acceptée', reference: 'référence', composition: 'composition',
  addFavorite: (name: string) => `Ajouter ${name} aux favoris`, removeFavorite: (name: string) => `Retirer ${name} des favoris`,
  copy: 'Copier', copied: 'Copié', copiedClipboard: 'Copié dans le presse-papiers',
  copyLabel: (label: string) => `Copier ${label}`, copyNotice: (label: string) => `${label} : copié dans le presse-papiers.`,
  copyUnavailable: 'La copie est indisponible. Sélectionnez le texte pour le copier.',
  booleanAccept: 'Ce schéma booléen accepte toute valeur JSON. Aucun exemple n’est généré.',
  booleanReject: 'Ce schéma booléen interdit toute valeur JSON. Aucun exemple n’est généré.',
  schemaSource: 'Voir le schéma source', noSchema: 'Aucun schéma défini dans la spécification.', required: 'requis', optional: 'facultatif',
  itemProperties: 'Propriétés de chaque élément', objectProperties: 'Propriétés de cet objet',
  advancedSchema: 'Ce schéma utilise une composition avancée. Consultez le schéma source pour connaître ses contraintes.',
  path: 'Chemin', query: 'Query', header: 'En-tête', cookie: 'Cookie', unsupportedSerialization: 'sérialisation non prise en charge', parameterSchema: 'Schéma du paramètre',
  noDocumentedResponse: 'Aucune réponse documentée.', documentedResponses: 'Réponses documentées', documentedExample: 'Exemple documenté', schemaExample: 'Exemple généré à partir du schéma',
  noResponseExample: 'Aucun exemple de réponse défini pour ce schéma.', noDocumentedBody: 'Cette réponse ne contient pas de corps documenté.', responseSchema: 'Schéma de la réponse',
  operations: 'Opérations', copyPath: 'Copier le chemin', tryRoute: 'Essayer cette route', unavailableTry: 'Lecture disponible, essai indisponible',
  specNotes: (count: number) => `Notes de la spécification (${count})`, parameters: 'Paramètres', fieldCount: (count: number) => `${count} ${count > 1 ? 'champs' : 'champ'}`,
  requestBody: 'Corps de la requête', documentedRequestExample: 'Exemple de requête documenté', generatedRequestExample: 'Exemple de requête généré', responses: 'Réponses', specificationExamples: 'Exemples de la spécification', documentedWith: 'Documenté avec',
  invalidProfiles: (reason: string) => `Configuration des profils invalide : ${reason}`,
  requestTimedOut: (duration: string) => `Le serveur n’a pas répondu sous ${duration}. Réessayez ou vérifiez votre connexion.`,
  requestCancelled: 'La requête a été annulée. Une annulation ne garantit pas l’absence d’effet côté serveur.',
  requestFailed: (reason: string) => `La requête n’a pas abouti. ${reason} Vérifiez le serveur, votre connexion et les règles CORS de l’API.`,
  transportFailed: (reason: string) => `Le transport n’a pas renvoyé de réponse. ${reason}`,
  requestConsole: 'Console de requête', realHttp: 'HTTP réel', simulation: 'Simulation', customTransport: 'Transport personnalisé',
  simulationHelp: 'Les requêtes utilisent une simulation. Les réponses ne proviennent pas d’un serveur HTTP.',
  customTransportHelp: 'Le transport fourni par votre application exécute la requête et renvoie la réponse.', httpHelp: 'Envoyez une requête et inspectez la réponse de votre API.',
  serverProfile: 'Profil de serveur', openApiSpecification: 'Spécification OpenAPI', server: 'Serveur', backToProfile: 'Revenir au profil', specificationServers: 'Serveurs de la spécification', otherServer: 'Autre serveur',
  serverPlaceholder: 'https://api.exemple.fr', relativeServerHelp: 'Ce fichier local utilise un serveur relatif. Choisissez « Autre serveur » et saisissez son URL absolue.',
  authentication: 'Authentification', public: 'publique', authenticationMethod: 'Méthode d’authentification', publicAccess: 'Accès public', allKeysRequired: 'Toutes les clés ci-dessous sont nécessaires.', bearerPlaceholder: 'Votre token Bearer', apiKeyPlaceholder: 'Votre clé API',
  unsupportedAuth: 'Ce mécanisme d’authentification ne peut pas être testé ici.', thisServer: 'ce serveur', credentialMemory: (origin: string) => `Conservé en mémoire pour ${origin}. Effacé au changement de destination.`,
  credentialsCleared: 'Les identifiants ont été effacés de la mémoire.', clearCredentials: 'Effacer les identifiants', pathParameters: 'Paramètres du chemin', queryParameters: 'Paramètres de recherche', headers: 'En-têtes',
  unsupportedRoute: 'Cette route utilise des paramètres non pris en charge. Consultez les notes dans la documentation.', sending: 'Envoi en cours…', sendRequest: 'Envoyer la requête', cancel: 'Annuler',
  codeExamples: 'Exemples de code', withoutSecrets: 'sans secrets', exampleLanguage: 'Langage de l’exemple', secretFreeExample: (language: string) => `Exemple ${language} sans secrets`,
  pythonHint: 'Python requiert le package requests. Son délai de 45 s porte sur la connexion et la lecture, pas sur la durée totale.', snippetHint: 'Cet exemple reflète le formulaire. Il n’est exécuté qu’après copie dans votre application.', snippetBodyHint: 'Les corps et paramètres restent inclus.',
  realResponse: 'Réponse HTTP réelle', simulatedResponse: 'Réponse simulée', customResponse: 'Résultat du transport personnalisé', response: 'Réponse', responseView: 'Vue de la réponse', body: 'Corps', copyResponse: 'Copier la réponse',
  noContent204: '204 No Content : le serveur a répondu sans corps.', noContent: 'Le serveur a répondu sans corps.', truncatedResponse: 'La réponse est tronquée car elle dépasse la limite d’affichage.', waitingServer: 'En attente du serveur…', responsePlaceholder: 'La réponse apparaîtra ici.', cancelHelp: 'Vous pouvez annuler la requête.', noRequest: 'Aucune requête envoyée pour cette route.',
  fileImported: (name: string) => `${name} importé.`, importFailed: (reason: string) => `Import impossible : ${reason}`,
  closeNavigation: 'Fermer la navigation', openNavigation: 'Ouvrir la navigation', navigation: 'Navigation', apiNavigation: 'Navigation de l’API', home: 'Specanto, accueil', apiReference: 'Référence API', searchRoute: 'Rechercher une route', commandK: 'Commande K', introduction: 'Introduction',
  noSearchResults: (query: string) => `Aucune route pour « ${query} ».`, clearSearch: 'Effacer la recherche', importSpecification: 'Importer une spécification', importFile: 'Importer un fichier OpenAPI JSON ou YAML', enableLight: 'Activer le thème clair', enableDark: 'Activer le thème sombre', lightTheme: 'Thème clair', darkTheme: 'Thème sombre',
  loadingSpec: 'Chargement de la spécification', preparingDocs: 'Préparation de la documentation…', cannotOpenSpec: 'Cette spécification ne peut pas être ouverte.', importOpenApi: 'Importer un fichier OpenAPI', noDocumentedRoute: 'Aucune route documentée.', addOperations: 'Ajoutez des opérations dans la section paths de votre spécification OpenAPI.', importAnother: 'Importer une autre spécification',
  version: (version: string) => `Version ${version}`, overviewDescription: 'Explorez les routes, consultez leurs schémas et envoyez une requête depuis la documentation.', exploreApi: 'Explorer l’API', routeCount: (count: number) => `${count} ${count === 1 ? 'route' : 'routes'}`,
  jsonFormatted: 'Le JSON a été formaté.', documentedExampleInserted: 'L’exemple documenté a été inséré.', generatedExampleInserted: 'Un exemple a été généré à partir du schéma. Vérifiez les contraintes propres à votre API.',
  emptyJsonBody: 'Corps vide : aucune valeur JSON ajoutée.', jsonConstraintsValid: 'JSON lisible ; contraintes prises en charge respectées.', jsonSyntaxValid: 'Syntaxe JSON valide. Aucun schéma de validation fourni.', jsonActions: 'Actions sur le corps JSON', formatJson: 'Formater JSON', generateExample: 'Générer un exemple', reset: 'Réinitialiser', bodyReset: 'Le corps de la requête a été réinitialisé.', jsonBodyLabel: 'Corps JSON de la requête',
  partialValidation: 'Validation partielle : types, champs requis, valeurs autorisées, bornes numériques et nombre d’éléments. Les autres contraintes restent à vérifier.', noSchemaExample: 'Aucun exemple disponible pour ce schéma.',
};

type ReferenceMessages = { [Key in keyof typeof fr]: typeof fr[Key] extends (...args: infer Args) => string ? (...args: Args) => string : string };
const en: ReferenceMessages = {
  navigationWidth: 'Navigation width', requestWidth: 'Console width', resizePanels: 'Drag or use arrow keys to resize. Double-click or Enter to reset.',
  exampleUnavailable: 'Example unavailable.', unexpectedError: 'An unexpected error occurred.', anyValue: 'any value accepted', noValue: 'no value accepted', reference: 'reference', composition: 'composition',
  addFavorite: (name: string) => `Add ${name} to favorites`, removeFavorite: (name: string) => `Remove ${name} from favorites`,
  copy: 'Copy', copied: 'Copied', copiedClipboard: 'Copied to clipboard', copyLabel: label => `Copy ${label}`, copyNotice: label => `${label}: copied to clipboard.`, copyUnavailable: 'Copying is unavailable. Select the text to copy it.',
  booleanAccept: 'This boolean schema accepts any JSON value. No example is generated.', booleanReject: 'This boolean schema rejects every JSON value. No example is generated.', schemaSource: 'View source schema', noSchema: 'No schema defined in the specification.', required: 'required', optional: 'optional', itemProperties: 'Properties of each item', objectProperties: 'Properties of this object', advancedSchema: 'This schema uses advanced composition. Check the source schema for its constraints.',
  path: 'Path', query: 'Query', header: 'Header', cookie: 'Cookie', unsupportedSerialization: 'unsupported serialization', parameterSchema: 'Parameter schema', noDocumentedResponse: 'No documented response.', documentedResponses: 'Documented responses', documentedExample: 'Documented example', schemaExample: 'Example generated from the schema', noResponseExample: 'No response example defined for this schema.', noDocumentedBody: 'This response has no documented body.', responseSchema: 'Response schema',
  operations: 'Operations', copyPath: 'Copy path', tryRoute: 'Try this route', unavailableTry: 'Documentation available, requests unavailable', specNotes: count => `Specification notes (${count})`, parameters: 'Parameters', fieldCount: count => `${count} ${count === 1 ? 'field' : 'fields'}`, requestBody: 'Request body', documentedRequestExample: 'Documented request example', generatedRequestExample: 'Generated request example', responses: 'Responses', specificationExamples: 'Specification examples', documentedWith: 'Documented with',
  invalidProfiles: reason => `Invalid server profile configuration: ${reason}`, requestTimedOut: duration => `The server did not respond within ${duration}. Retry or check your connection.`, requestCancelled: 'The request was cancelled. Cancellation does not guarantee that the server has made no changes.', requestFailed: reason => `The request failed. ${reason} Check the server, your connection and the API’s CORS rules.`, transportFailed: reason => `The transport returned no response. ${reason}`,
  requestConsole: 'Request console', realHttp: 'Real HTTP', simulation: 'Simulation', customTransport: 'Custom transport', simulationHelp: 'Requests use a simulation. Responses do not come from an HTTP server.', customTransportHelp: 'The transport supplied by your application executes the request and returns its response.', httpHelp: 'Send a request and inspect your API’s response.',
  serverProfile: 'Server profile', openApiSpecification: 'OpenAPI specification', server: 'Server', backToProfile: 'Back to profile', specificationServers: 'Specification servers', otherServer: 'Other server', serverPlaceholder: 'https://api.example.com', relativeServerHelp: 'This local file uses a relative server. Choose “Other server” and enter its absolute URL.', authentication: 'Authentication', public: 'public', authenticationMethod: 'Authentication method', publicAccess: 'Public access', allKeysRequired: 'All keys below are required.', bearerPlaceholder: 'Your Bearer token', apiKeyPlaceholder: 'Your API key', unsupportedAuth: 'This authentication mechanism cannot be tested here.', thisServer: 'this server', credentialMemory: origin => `Kept in memory for ${origin}. Cleared when the destination changes.`, credentialsCleared: 'Credentials have been cleared from memory.', clearCredentials: 'Clear credentials', pathParameters: 'Path parameters', queryParameters: 'Query parameters', headers: 'Headers',
  unsupportedRoute: 'This route uses unsupported parameters. Check the documentation notes.', sending: 'Sending…', sendRequest: 'Send request', cancel: 'Cancel', codeExamples: 'Code examples', withoutSecrets: 'without secrets', exampleLanguage: 'Example language', secretFreeExample: language => `${language} example without secrets`, pythonHint: 'Python requires the requests package. Its 45 s timeout covers connection and reading, rather than the total duration.', snippetHint: 'This example reflects the form. It runs only after you copy it into your application.', snippetBodyHint: 'Bodies and parameters remain included.', realResponse: 'Real HTTP response', simulatedResponse: 'Simulated response', customResponse: 'Custom transport result', response: 'Response', responseView: 'Response view', body: 'Body', copyResponse: 'Copy response', noContent204: '204 No Content: the server responded without a body.', noContent: 'The server responded without a body.', truncatedResponse: 'The response is truncated because it exceeds the display limit.', waitingServer: 'Waiting for the server…', responsePlaceholder: 'The response will appear here.', cancelHelp: 'You can cancel the request.', noRequest: 'No request sent for this route.',
  fileImported: name => `${name} imported.`, importFailed: reason => `Import failed: ${reason}`, closeNavigation: 'Close navigation', openNavigation: 'Open navigation', navigation: 'Navigation', apiNavigation: 'API navigation', home: 'Specanto, home', apiReference: 'API reference', searchRoute: 'Search routes', commandK: 'Command K', introduction: 'Introduction', noSearchResults: query => `No routes for “${query}”.`, clearSearch: 'Clear search', importSpecification: 'Import a specification', importFile: 'Import an OpenAPI JSON or YAML file', enableLight: 'Enable light theme', enableDark: 'Enable dark theme', lightTheme: 'Light theme', darkTheme: 'Dark theme', loadingSpec: 'Loading specification', preparingDocs: 'Preparing documentation…', cannotOpenSpec: 'This specification cannot be opened.', importOpenApi: 'Import an OpenAPI file', noDocumentedRoute: 'No documented routes.', addOperations: 'Add operations to the paths section of your OpenAPI specification.', importAnother: 'Import another specification', version: version => `Version ${version}`, overviewDescription: 'Explore routes, inspect their schemas and send requests from the documentation.', exploreApi: 'Explore the API', routeCount: count => `${count} ${count === 1 ? 'route' : 'routes'}`,
  jsonFormatted: 'JSON has been formatted.', documentedExampleInserted: 'The documented example has been inserted.', generatedExampleInserted: 'An example has been generated from the schema. Check constraints specific to your API.', emptyJsonBody: 'Empty body: no JSON value added.', jsonConstraintsValid: 'Valid JSON; supported constraints satisfied.', jsonSyntaxValid: 'Valid JSON syntax. No validation schema provided.', jsonActions: 'JSON body actions', formatJson: 'Format JSON', generateExample: 'Generate an example', reset: 'Reset', bodyReset: 'The request body has been reset.', jsonBodyLabel: 'JSON request body', partialValidation: 'Partial validation: types, required fields, allowed values, numeric bounds and item counts. Other constraints still need checking.', noSchemaExample: 'No example available for this schema.',
};

export const messages: Record<ReferenceLocale, ReferenceMessages> = { fr, en };
const ReferenceLocaleContext = createContext<ReferenceLocale>('fr');
export function ReferenceLocaleProvider({ locale = 'fr', children }: { locale?: ReferenceLocale; children: ReactNode }) {
  return <ReferenceLocaleContext.Provider value={locale}>{children}</ReferenceLocaleContext.Provider>;
}
export const useReferenceLocale = () => useContext(ReferenceLocaleContext);
export const useReferenceMessages = () => messages[useReferenceLocale()];

/** Translates known library errors and preserves unknown diagnostics and user-supplied values. */
export function localizeError(error: unknown, locale: ReferenceLocale = 'fr'): string {
  const source = error instanceof Error ? error.message : typeof error === 'string' ? error : messages[locale].unexpectedError;
  if (locale === 'en') return source === 'requestTimeoutMs doit être un entier compris entre 100 et 300000 ms.' ? 'requestTimeoutMs must be an integer between 100 and 300000 ms.' : source;
  const exact: Record<string, string> = {
    'Only OpenAPI 3.0.x and 3.1.x documents are supported.': 'Seuls les documents OpenAPI 3.0.x et 3.1.x sont pris en charge.',
    'Only OpenAPI 3.1.x documents are supported.': 'Seuls les documents OpenAPI 3.1.x sont pris en charge.',
    'OpenAPI info.title and info.version are required.': 'Les champs OpenAPI info.title et info.version sont requis.',
    'OpenAPI paths must be an object.': 'Le champ OpenAPI paths doit être un objet.',
    'The document exceeds the maximum depth of 32.': 'Le document dépasse la profondeur maximale de 32 niveaux.',
    'The supplied document contains an object cycle.': 'Le document fourni contient une référence circulaire entre objets.',
    'The document is not a serializable object.': 'Le document n’est pas un objet sérialisable.',
    'The document is too large (2 MiB limit).': 'Le document est trop volumineux (limite de 2 Mio).',
    'The document is too large or empty (2 MiB limit).': 'Le document est trop volumineux ou vide (limite de 2 Mio).',
    'The specification is too large (2 MiB limit).': 'La spécification est trop volumineuse (limite de 2 Mio).',
    'An absolute HTTP URL is required outside a browser.': 'Une URL HTTP absolue est requise hors d’un navigateur.',
    'Specifications must be loaded from an HTTP or HTTPS URL.': 'Les spécifications doivent être chargées depuis une URL HTTP ou HTTPS.',
    'Credentials in specification URLs are not allowed.': 'Les identifiants dans les URL de spécification ne sont pas autorisés.',
    'The request was cancelled.': 'La requête a été annulée.',
    'Network, CORS or credentialed redirect prevented the request.': 'Le réseau, les règles CORS ou une redirection avec identifiants ont empêché la requête.',
    'The response stream could not be read.': 'Le flux de la réponse n’a pas pu être lu.',
    'A valid server URL with resolved variables is required.': 'Une URL de serveur valide avec des variables résolues est requise.',
    'A relative server URL requires an explicit base URL.': 'Une URL de serveur relative nécessite une URL de base explicite.',
    'Invalid server URL or base URL.': 'L’URL du serveur ou l’URL de base est invalide.',
    'Only HTTP and HTTPS destinations are supported.': 'Seules les destinations HTTP et HTTPS sont prises en charge.',
    'Credentials in server URLs are not allowed.': 'Les identifiants dans les URL de serveur ne sont pas autorisés.',
    'Dot segments are not supported as path parameter values.': 'Les segments . et .. ne sont pas autorisés comme valeurs de paramètres de chemin.',
    'Unsupported browser request method: TRACE.': 'La méthode TRACE n’est pas prise en charge par le navigateur.',
    'A required path parameter is unresolved.': 'Un paramètre de chemin requis n’est pas résolu.',
    'Unsupported request body serialization.': 'La sérialisation du corps de la requête n’est pas prise en charge.',
    'A JSON request body is required.': 'Le corps JSON de la requête est requis.',
    'The request body must contain valid JSON.': 'Le corps de la requête doit contenir du JSON valide.',
    'GET and HEAD requests cannot contain a body in the browser.': 'Les requêtes GET et HEAD ne peuvent pas contenir de corps dans le navigateur.',
    'The selected security alternative does not exist.': 'La méthode d’authentification sélectionnée n’existe pas.',
    'Server profile URL variables must be resolved.': 'Les variables de l’URL du profil de serveur doivent être résolues.',
    'A relative server profile URL requires an explicit base URL.': 'Une URL de profil relative nécessite une URL de base explicite.',
    'Invalid server profile URL or base URL.': 'L’URL du profil de serveur ou l’URL de base est invalide.',
    'Server profile destinations must use HTTP or HTTPS.': 'Les destinations des profils de serveur doivent utiliser HTTP ou HTTPS.',
    'Credentials in server profile URLs are not allowed.': 'Les identifiants dans les URL des profils de serveur ne sont pas autorisés.',
    'Server profile configuration must be an array.': 'La configuration des profils de serveur doit être un tableau.',
    'Server profile configuration is limited to 20 profiles.': 'La configuration est limitée à 20 profils de serveur.',
    'Each server profile must be an object.': 'Chaque profil de serveur doit être un objet.',
    'Server profile description must be a string of at most 1000 characters.': 'La description d’un profil doit être un texte d’au plus 1000 caractères.',
    'An unresolved operation or path reference prevents execution.': 'Une référence d’opération ou de chemin non résolue empêche l’exécution.',
    'An unresolved or invalid parameter prevents execution.': 'Un paramètre non résolu ou invalide empêche l’exécution.',
    'Invalid security declaration prevents execution.': 'Une déclaration d’authentification invalide empêche l’exécution.',
    'Reference expansion reached its depth or node limit.': 'Le développement des références a atteint sa limite de profondeur ou de nombre de nœuds.',
    'A server without a URL was ignored.': 'Un serveur sans URL a été ignoré.',
  };
  if (exact[source]) return exact[source];
  const rules: [RegExp, (...parts: string[]) => string][] = [
    [/^OpenAPI 3\.0 reference siblings were ignored: (.+)$/, ref => `Les champs voisins de la référence OpenAPI 3.0 ont été ignorés : ${ref}`],
    [/^Remote or external reference is display-only: (.+)$/, ref => `La référence distante ou externe est disponible en lecture seule : ${ref}`],
    [/^Cyclic reference is display-only: (.+)$/, ref => `La référence circulaire est disponible en lecture seule : ${ref}`],
    [/^Missing internal reference: (.+)$/, ref => `Référence interne introuvable : ${ref}`],
    [/^Boolean schema reference is display-only: (.+)$/, ref => `La référence de schéma booléen est disponible en lecture seule : ${ref}`],
    [/^Server variable has no default: (.+)$/, variable => `La variable de serveur n’a pas de valeur par défaut : ${variable}`],
    [/^Invalid path was ignored: (.+)$/, path => `Un chemin invalide a été ignoré : ${path}`],
    [/^Boolean request parameter schema is display-only: (.+)$/, detail => `Le schéma booléen du paramètre est disponible en lecture seule : ${detail}`],
    [/^Boolean request body schema is display-only: (.+)$/, detail => `Le schéma booléen du corps de la requête est disponible en lecture seule : ${detail}`],
    [/^Boolean response schema is display-only: (.+)$/, detail => `Le schéma booléen de réponse est disponible en lecture seule : ${detail}`],
    [/^Partial client validation for (.+): (.+) remain visible but are not validated\.$/, (operation, constraints) => `Validation partielle pour ${operation} : ${constraints} restent visibles mais ne sont pas validés.`],
    [/^Duplicate operationId: (.+)$/, id => `operationId en double : ${id}`],
    [/^Invalid JSON or YAML document: (.*)$/s, detail => `Document JSON ou YAML invalide : ${detail}`],
    [/^Could not load the OpenAPI document: HTTP (\d+)\.$/, status => `Impossible de charger le document OpenAPI : HTTP ${status}.`],
    [/^Required (parameter|credential|field) (.+) is missing\.$/, (kind, name) => `${kind === 'parameter' ? 'Le paramètre' : kind === 'credential' ? 'L’identifiant' : 'Le champ'} ${name} est requis.`],
    [/^(.+) must be ((?:string|integer|number|boolean|object|array|null)(?: or (?:string|integer|number|boolean|object|array|null))*)\.$/, (path, types) => `${path} doit être de type ${types.split(' or ').map(type => ({ string: 'texte', integer: 'entier', number: 'nombre', boolean: 'booléen', object: 'objet', array: 'tableau', null: 'nul' } as Record<string, string>)[type]).join(' ou ')}.`],
    [/^(.+) must be an array\.$/, name => `${name} doit être un tableau.`],
    [/^(.+) must be boolean \(true or false\)\.$/, name => `${name} doit être un booléen (true ou false).`],
    [/^(.+) must be a JSON array or comma-separated values\.$/, name => `${name} doit être un tableau JSON ou des valeurs séparées par des virgules.`],
    [/^(.+) is not an allowed enum value\.$/, path => `${path} ne fait pas partie des valeurs autorisées.`],
    [/^(.+) must be at least (.+)\.$/, (path, value) => `${path} doit être supérieur ou égal à ${value}.`],
    [/^(.+) must be at most (.+)\.$/, (path, value) => `${path} doit être inférieur ou égal à ${value}.`],
    [/^(.+) needs at least (.+) items\.$/, (path, value) => `${path} doit contenir au moins ${value} élément${value === '1' ? '' : 's'}.`],
    [/^(.+) allows at most (.+) items\.$/, (path, value) => `${path} doit contenir au plus ${value} élément${value === '1' ? '' : 's'}.`],
    [/^Unsupported schema reference or depth at (.+)\.$/, path => `${path} contient une référence ou une profondeur de schéma non prise en charge.`],
    [/^Invalid header: (.+)$/, name => `En-tête invalide : ${name}`],
    [/^Header (.+) is controlled by the browser and cannot be set\.$/, name => `L’en-tête ${name} est contrôlé par le navigateur et ne peut pas être défini.`],
    [/^Forbidden method override header: (.+)$/, name => `En-tête de substitution de méthode interdit : ${name}`],
    [/^Duplicate header collision: (.+)$/, name => `Collision entre en-têtes : ${name}`],
    [/^Unsupported scalar parameter: (.+)$/, name => `Paramètre scalaire non pris en charge : ${name}`],
    [/^Unsupported parameter (serialization|location): (.+)$/, (kind, name) => `${kind === 'serialization' ? 'Sérialisation' : 'Emplacement'} de paramètre non pris en charge : ${name}`],
    [/^Unsupported authentication scheme: (.+)$/, name => `Mécanisme d’authentification non pris en charge : ${name}`],
    [/^Credential (.+) is not bound to the final destination origin (.+)\.$/, (name, origin) => `L’identifiant ${name} n’est pas associé à l’origine de destination ${origin}.`],
    [/^Duplicate server profile id: (.+)$/, id => `Identifiant de profil de serveur en double : ${id}`],
    [/^Server profile (.+) must be a non-empty string\.$/, field => `Le champ ${field} du profil de serveur doit être un texte non vide.`],
    [/^Server profile (.+) exceeds the (.+) character limit\.$/, (field, limit) => `Le champ ${field} du profil de serveur dépasse la limite de ${limit} caractères.`],
    [/^Invalid (.+): (.+)$/, (path, detail) => `${path} invalide : ${({ 'a schema must be an object or boolean.': 'un schéma doit être un objet ou un booléen.', 'schema depth exceeds 32.': 'la profondeur du schéma dépasse 32.', 'OpenAPI 3.0 schemas must be objects.': 'les schémas OpenAPI 3.0 doivent être des objets.', 'OpenAPI 3.0 requires a single non-null type.': 'OpenAPI 3.0 exige un type unique autre que null.', 'OpenAPI 3.0 requires a boolean.': 'OpenAPI 3.0 exige un booléen.', 'OpenAPI 3.0 requires a finite number.': 'OpenAPI 3.0 exige un nombre fini.', 'use a recognized schema type or array of types.': 'utilisez un type de schéma reconnu ou un tableau de types.', 'expected a string.': 'un texte est attendu.', 'expected an array.': 'un tableau est attendu.', 'expected an array of strings.': 'un tableau de textes est attendu.', 'expected an object containing schemas.': 'un objet contenant des schémas est attendu.', 'expected an array of schemas.': 'un tableau de schémas est attendu.' } as Record<string, string>)[detail] ?? detail}`],
    [/^Unsupported request: (.+)$/s, detail => `Requête non prise en charge : ${localizeError(detail, locale)}`],
    [/^Unsupported parameter serialization or reference: (.+)$/, detail => `Sérialisation ou référence de paramètre non prise en charge : ${detail}`],
    [/^Unsupported request body media type, schema or reference: (.+)$/, detail => `Type de média, schéma ou référence du corps non pris en charge : ${detail}`],
  ];
  for (const [pattern, translate] of rules) {
    const match = source.match(pattern);
    if (match) return translate(...match.slice(1));
  }
  return source;
}
