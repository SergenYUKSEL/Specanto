# Démarrer avec Express, sans swagger-jsdoc

Specanto affiche un document OpenAPI. Il n’exige ni Swagger UI ni swagger-jsdoc, et ne découvre pas les routes Express dans votre code. Vous pouvez commencer avec un fichier JSON maintenu dans une app de documentation séparée.

## 1. Créer l’app locale

La CLI est publiée sur npm depuis la version 0.2.0 :

```sh
bunx --package @specanto/react@0.2.1 specanto init api-docs --api-url http://localhost:3001
cd api-docs
bun install
bun run dev
```

`api-docs` désigne le nouveau dossier de documentation, pas le package Specanto. Choisissez un autre nom si vous le souhaitez ; l’application générée est privée et dépend de `@specanto/react`.

Avec npm :

```sh
npx --package @specanto/react@0.2.1 specanto init api-docs --api-url http://localhost:3001
cd api-docs
npm install
npm run dev
```

Depuis le checkout Specanto : `node cli/index.mjs init ../api-docs --api-url http://localhost:3001`, puis les mêmes commandes d’installation dans le dossier créé.

Ouvrez `http://127.0.0.1:5193`. Utilisez Node 22.12+ pour Vite, ou Bun 1.3.14. Le backend doit tourner séparément. La CLI crée uniquement un dossier nouveau dont le parent existe ; elle ne remplace aucun projet et ne lance ni installation, ni serveur, ni requête API.

## 2. Décrire les routes utiles

Éditez `public/openapi.json`. Le starter contient une route d’exemple `GET /recipes` ; remplacez-la par une route réelle avant de cliquer sur le bouton d’envoi. Les routes d’authentification, de recettes et de mood sont de bons premiers candidats si votre application les utilise.

Par exemple, ce backend correspond exactement au document du starter. Ce code est un exemple ; n’ajoutez pas une route fictive à votre application pour satisfaire la documentation.

```js
import express from 'express';

const app = express();
app.get('/recipes', (_req, res) => {
  res.json([{ id: 'recipe_1', title: 'Salade de saison' }]);
});
app.listen(3001, '127.0.0.1');
```

Il suffit d’Express pour exécuter cet exemple : aucun générateur OpenAPI n’est nécessaire. Le document est servi par Vite, pas par le backend. Ajoutez les paramètres, corps de requête, codes de réponse et schémas selon le comportement réel de vos handlers et validateurs. Les exemples JSON sont des données fictives ; Specanto ne garantit pas qu’ils correspondent à votre implémentation.

Si votre backend utilise un préfixe `/api`, indiquez `/api/recipes` dans `paths`. Gardez `servers[0].url` à `/__specanto_api` pour le parcours avec proxy.

## 3. Comprendre le proxy local

Le navigateur charge `/openapi.json` depuis Vite. Une requête manuelle sur `/recipes` suit ensuite ce trajet :

```text
Navigateur → http://127.0.0.1:5193/__specanto_api/recipes
           → backend configuré : http://localhost:3001/recipes
```

Vite retire seulement `/__specanto_api` et transmet au backend configuré. Le navigateur reste sur l’origine de la documentation ; vous n’avez donc pas à modifier le CORS du backend pour ce parcours. Un changement d’origine direct, par exemple un serveur `http://localhost:3001` dans le document, nécessite les autorisations CORS du backend pour la documentation, les méthodes et les en-têtes utilisés. Le proxy ne remplace pas les règles d’authentification ou d’autorisation du backend.

Pour changer l’adresse, copiez `.env.example` dans `.env.local`, définissez `SPECANTO_API_URL`, puis redémarrez Vite. Cette valeur doit être une origine HTTP(S), sans identifiants, chemin, query ou fragment. Mettez les préfixes de routes dans `paths`. Ne placez aucun jeton dans l’URL. Le serveur Vite écoute sur `127.0.0.1` et ne choisit pas silencieusement un autre port si `5193` est occupé.

## 4. Décrire une authentification Bearer

Ajoutez ces champs à la racine du document, en conservant `openapi`, `info`, `servers` et `paths` :

```json
{
  "components": {
    "securitySchemes": {
      "bearerAuth": { "type": "http", "scheme": "bearer" }
    }
  },
  "security": [{ "bearerAuth": [] }]
}
```

La console proposera le champ Bearer ; saisissez un jeton de développement au moment de tester. Une opération publique peut remplacer la sécurité héritée avec `"security": []`. La documentation décrit la sécurité, mais c’est votre API qui la vérifie.

Le client actuel supporte Bearer et API-key en en-tête. Il ne transmet pas les cookies et n’exécute pas de connexion OAuth/OIDC. Si votre backend utilise uniquement une session cookie, ne présentez pas ce starter comme un testeur de cette authentification ; utilisez un transport personnalisé adapté à votre application.

## 5. Utiliser une description existante

Si vous avez déjà un document OpenAPI 3.0.x ou 3.1.x, remplacez le fichier du starter. Pour utiliser le proxy, adaptez ses serveurs racine et ses éventuels serveurs déclarés sur les chemins/opérations ; ces derniers ont priorité. Les références externes ne sont pas chargées par Specanto : fournissez un document autonome avec des références internes.

Vous pouvez aussi intégrer un objet ou du JSON/YAML dans une app React existante :

```tsx
import { ApiReference } from '@specanto/react';
import '@specanto/react/styles.css';
import document from './openapi.json';

export function Documentation() {
  return <ApiReference spec={document} locale="fr" />;
}
```

Avec `spec={document}`, fournissez des serveurs HTTP(S) absolus, car il n’y a pas d’URL source pour résoudre les serveurs relatifs. Pour conserver le proxy, utilisez par exemple `window.location.origin + '/__specanto_api'` dans `servers` côté navigateur. Une source `specUrl="/openapi.json"` conserve au contraire une base de résolution.

Si le backend sert déjà un document, `specUrl` peut pointer sur cette route ; ce choix n’est pas obligatoire. Pour une route privée, récupérez le document dans votre application authentifiée, puis passez-le via `spec`. Le chargement intégré par `specUrl` n’ajoute ni en-têtes d’authentification ni cookies, même lorsqu’ils sont saisis pour la console API.

## 6. Préparer un hébergement

`bun run build` ou `npm run build` vérifie les types et produit `dist/`. Le proxy Vite est destiné au développement local et n’est pas inclus dans ces fichiers statiques. Avant un déploiement, configurez une adresse API réelle avec CORS, ou un reverse proxy sur votre hébergement pour `/__specanto_api`.

Une page React peut être publique ou privée selon votre hébergement. Pour une documentation interne, protégez l’accès à la page **et** à son document OpenAPI ; un fichier importé dans le bundle reste accessible aux personnes qui peuvent télécharger ce bundle. Masquer un lien ou les noms d’endpoints ne remplace pas le contrôle d’accès de l’API.

Le [contrat de compatibilité](./compatibility.md) précise les limites des schémas, références, authentifications et formats de requête. La démo Railway n’intervient jamais dans ce starter.
