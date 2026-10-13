export function starterFiles(apiUrl, version, name) {
  const document = {
    openapi: '3.1.1',
    info: { title: 'Mon API', version: '1.0.0', description: 'Documentation locale. La route et ses schémas sont des exemples à adapter à votre backend.' },
    servers: [{ url: '/__specanto_api', description: 'Backend via le proxy local' }],
    paths: {
      '/recipes': { get: { operationId: 'listRecipes', summary: 'Lister les recettes', tags: ['Recettes'], responses: {
        '200': { description: 'Exemple de réponse à adapter.', content: { 'application/json': {
          schema: { type: 'array', items: { type: 'object', required: ['id', 'title'], properties: { id: { type: 'string' }, title: { type: 'string' } } } },
          example: [{ id: 'recipe_1', title: 'Salade de saison' }],
        } } },
      } } },
    },
  };
  return {
    'package.json': JSON.stringify({
      name, private: true, version: '0.0.0', type: 'module',
      scripts: { dev: 'vite', build: 'tsc --noEmit && vite build' },
      dependencies: { '@specanto/react': version, react: '19.3.0', 'react-dom': '19.3.0' },
      devDependencies: { '@types/react': '19.3.0', '@types/react-dom': '19.3.0', '@vitejs/plugin-react': '6.1.2', typescript: '6.0.3', vite: '8.3.4' },
      engines: { node: '>=22.12.0' },
    }, null, 2) + '\n',
    '.gitignore': 'node_modules/\ndist/\n.env\n.env.local\n.env.*.local\n',
    '.env.example': `# Copier dans .env.local pour changer le backend. Ne pas ajouter de secrets.\nSPECANTO_API_URL=${apiUrl}\n`,
    'index.html': '<!doctype html>\n<html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Documentation API</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true, skipLibCheck: false, verbatimModuleSyntax: true, noEmit: true, types: ['vite/client'] }, include: ['src'] }, null, 2) + '\n',
    'vite.config.mjs': `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'SPECANTO_');
  const target = new URL(env.SPECANTO_API_URL || ${JSON.stringify(apiUrl)});
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('SPECANTO_API_URL doit être une origine HTTP(S) sans chemin, identifiants ni paramètres.');
  }
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1', port: 5193, strictPort: true,
      proxy: {
        '^/__specanto_api(?:/|$)': {
          target: target.origin, changeOrigin: true,
          rewrite: path => path.replace(/^\\/__specanto_api/, ''),
        },
      },
    },
  };
});
`,
    'public/openapi.json': JSON.stringify(document, null, 2) + '\n',
    'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApiReference } from '@specanto/react';
import '@specanto/react/styles.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><ApiReference specUrl="/openapi.json" locale="fr" /></StrictMode>,
);
`,
    'src/styles.css': 'body { margin: 0; }\n',
    'README.md': `# Documentation locale de votre API

Cet exemple utilise Specanto ${version}. Node 22.12+ est requis par les outils Vite ; Bun 1.3.14 convient également.

1. Lancez votre backend séparément sur ${apiUrl}.
2. Exécutez \`bun install\`, puis \`bun run dev\` (ou \`npm install\`, puis \`npm run dev\`).
3. Ouvrez http://127.0.0.1:5193.
4. Adaptez \`public/openapi.json\` : la route \`GET /recipes\`, ses schémas et exemples ne sont pas détectés dans votre code.

Le fichier est servi par cette app Vite ; aucune route \`/openapi.json\` ni dépendance swagger-jsdoc n'est nécessaire côté backend. La console envoie une vraie requête uniquement après un clic. Vous pouvez aussi importer un autre fichier dans l'interface ; ses serveurs doivent être configurés pour votre destination.

Le serveur déclaré \`/__specanto_api\` passe par le proxy Vite vers ${apiUrl}. Le navigateur reste sur la même origine : aucune modification du CORS backend n'est nécessaire pour ce parcours local. Si les routes commencent par \`/api\`, écrivez par exemple \`/api/recipes\` dans \`paths\`.

Pour changer le backend, copiez \`.env.example\` dans \`.env.local\`, changez \`SPECANTO_API_URL\` et redémarrez Vite. Utilisez une origine HTTP(S) sans chemin ni identifiants ; le proxy ne supprime que son propre préfixe. Ne mettez aucun secret dans le document OpenAPI.

\`bun run build\` vérifie les types et produit \`dist/\`. Ce starter vise le développement local : le proxy Vite n'est pas un serveur de production. Avant déploiement, configurez vos véritables serveurs API/CORS ou votre propre reverse proxy et protégez l'accès à l'app ET au document. La documentation est accessible à toute personne pouvant accéder au serveur qui la sert.

Le chargement \`specUrl\` ne transmet ni cookies ni en-têtes d'authentification. Pour un document privé, récupérez-le depuis votre application authentifiée puis passez-le via \`spec\`. La console supporte Bearer/API-key en en-tête, mais pas l'authentification par cookies.
`,
  };
}
