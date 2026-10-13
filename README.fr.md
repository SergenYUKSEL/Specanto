# Specanto

La documentation API, avec du caractère.

Specanto transforme une description OpenAPI en documentation React interactive : navigation par tags, recherche, schémas, exemples et panneau de requête HTTP manuel. L’interface s’adapte aux écrans mobiles et propose un mode sombre.

[English](./README.md) · [Compatibilité](./docs/compatibility.md) · [Contribuer](./CONTRIBUTING.md) · [Fonctionnalités proposées](./docs/features.md)

## État du projet

La version `0.1.0` est une version candidate sous licence MIT, compatible avec le sous-ensemble documenté d’OpenAPI 3.0.x et 3.1.x. `@specanto/react` reste le nom prévu, dont l’accès au scope npm doit être confirmé. Le manifeste est prêt pour une publication publique, mais le package n’est pas encore publié : il manque un compte npm et l’accès au scope choisi. Son installation se fait actuellement depuis une archive locale.

La vitrine est disponible sur `/`, la démo sur `/demo` et la comparaison locale OpenAPI sur `/compare`. La démo utilise Atelier, une boutique fictive d’objets design :

| Opération | Fonction |
| --- | --- |
| `GET /api/products` | Lister et filtrer les produits |
| `GET /api/products/{id}` | Consulter un produit |
| `POST /api/orders` | Valider et renvoyer une commande fictive |

Les requêtes HTTP sont réelles. Il n’y a ni compte, ni paiement, ni base de données. Le serveur ne conserve pas les commandes, ne journalise pas leurs corps et ne stocke pas les jetons Bearer. Le jeton est facultatif et peut être fictif. Le corps d’une commande est limité à 16 Kio. Utilisez des coordonnées fictives, comme `camille@example.com`.

![Référence API sur ordinateur](./docs/screenshots/reference-desktop.png)

## Lancer le projet

Utilisez Bun `1.3.14`, la version indiquée dans le manifeste.

```sh
bun install
bun run dev
```

Ouvrez `http://localhost:5188` ou `http://localhost:5188/demo`. Le serveur API Bun écoute sur `3001` ; Vite lui transmet les chemins `/api`, `/openapi.json` et `/health`.

Pour lancer le build de production en local :

```sh
bun run build
PORT=3001 bun run start
```

La vitrine, la démo et l’API sont alors servies ensemble sur `http://localhost:3001`.

## Installer la bibliothèque dans une application React

Depuis ce dépôt, construisez l’archive :

```sh
bun install
bun run build:lib
bun pm pack --filename specanto-react-0.1.0.tgz
```

Depuis votre application React, ajoutez-la avec son chemin réel :

```sh
bun add /chemin/absolu/vers/Specanto/specanto-react-0.1.0.tgz
```

Votre application fournit React et React DOM (`>=18.2.0 <20`).

```tsx
import { ApiReference } from '@specanto/react';
import '@specanto/react/styles.css';

export function Documentation() {
  return <ApiReference specUrl="/openapi.json" locale="fr" colorMode="light" />;
}
```

La bibliothèque s’intègre à votre hébergement habituel. Elle n’a besoin ni d’un serveur Specanto dédié, ni d’un compte cloud. Les requêtes partent directement vers l’API sélectionnée, selon les autorisations CORS de cette API. Le serveur Bun de ce dépôt sert uniquement la vitrine et l’API de démonstration.

Fournissez exactement une entrée : `spec` (objet ou texte JSON/YAML) ou `specUrl`. Les options sont détaillées dans le [README anglais](./README.md#component-api). Un document chargé par URL résout ses serveurs relatifs à partir de son URL source. Pour un objet, du texte ou un fichier local, utilisez des serveurs API avec une URL HTTP(S) absolue. Pour une simulation injectée via `transport`, indiquez `transportMode="simulation"` : le panneau affiche explicitement son mode.

## Personnaliser

`logo` remplace la marque sur ordinateur et mobile. `fontFamily` et `monoFontFamily` configurent les deux familles ; votre application charge les polices. `requestTimeoutMs` accepte un entier de 100 à 300 000 ms, avec 45 000 ms par défaut. Une valeur invalide bloque l’envoi. Le [guide de personnalisation](./docs/customization.md) montre aussi les variables CSS limitées au composant.

`locale` accepte `fr` ou `en`, avec `fr` par défaut. Il change les libellés de l’interface et les diagnostics connus de la bibliothèque. Les titres, descriptions, noms de champs et exemples du document OpenAPI restent dans leur langue d’origine ; les diagnostics inconnus sont conservés tels quels.

Un [exemple Vite permanent](https://github.com/SergenYUKSEL/Specanto/tree/main/examples/consumer-vite) utilise le package installé depuis son archive et un transport de simulation explicite.

## Console enrichie

La console propose des exemples cURL, Fetch et Python à copier, avec les en-têtes secrets masqués. `serverProfiles` fournit des destinations nommées, indépendantes du fichier OpenAPI : le choix reste actif entre les routes, et les identifiants sont effacés quand l’origine change. L’éditeur JSON affiche les erreurs au chemin du champ et propose un formatage ainsi qu’un exemple sur clic. Aucune de ces actions n’envoie une requête automatiquement.

## Session et comparaison

Le panneau Session conserve en mémoire jusqu’à 20 entrées d’historique et 100 identifiants d’opérations favorites. L’historique contient uniquement l’opération, sa méthode et son chemin modèle, l’origine du serveur, le statut ou la catégorie du résultat, la durée et la date. Il exclut les valeurs des paramètres, les en-têtes, les corps de requête/réponse et les erreurs brutes. Les listes sont effaçables et réinitialisées au changement de spécification, à l’import, au rechargement ou au remontage du composant. Aucun stockage navigateur n’est utilisé. Ouvrir une entrée affiche la documentation sans rejouer la requête.

Le composant exporté `SpecComparison` lit deux fichiers JSON/YAML locaux et lance leur comparaison sur clic :

```tsx
import { SpecComparison } from '@specanto/react';
import '@specanto/react/styles.css';

export function Comparaison() {
  return <SpecComparison locale="fr" colorMode="light" />;
}
```

Ses options sont `locale: 'fr' | 'en'` (`fr` par défaut) et `colorMode: 'light' | 'dark'` (`light` par défaut). Le moteur `compareSpecs(before, after)` accepte deux `NormalizedSpec`, produits par `parseSpec` ou `loadSpec`, et retourne les changements, avertissements, compteurs par catégorie et `truncated`.

La revue compare méthodes/chemins, paramètres, types de contenu principaux des requêtes/réponses, contraintes de schéma et sécurité. Elle reste heuristique et ne certifie pas toute la compatibilité d’une API. Les serveurs et métadonnées documentaires sont exclus. Limites : 500 changements, profondeur 16 et 20 000 visites de parcours ; si `truncated` vaut `true`, les compteurs portent uniquement sur les changements retournés. Schémas avancés et références non résolues demandent une vérification manuelle. Les fichiers restent en mémoire, sans envoi ni exécution de requête API. Le [guide d’intégration](./docs/customization.md#specification-comparison) précise ce périmètre.

## Vérifier les changements

```sh
bun run check
bun run check:consumer
bun run test:e2e
```

`check` lance le lint, TypeScript, les tests, la vérification des notices et les deux builds. `check:consumer` vérifie l’archive et les types dans des applications React 18.2 et 19.3 distinctes. Les tests navigateur utilisent Chromium et WebKit mobile : installez-les si nécessaire avec `bunx playwright install chromium webkit`.

GitHub Actions automatise ces contrôles sur les pushes main et les pull requests. Les tests CI utilisent le build de production. La [procédure de sortie](./docs/releasing.md) garde la publication npm manuelle.

Consultez la [matrice de compatibilité](./docs/compatibility.md) pour les limites OpenAPI, les schémas avancés, l’authentification et la sérialisation.

## Déploiement de la vitrine et de la démo

[Vitrine en ligne](https://specanto-demo-production.up.railway.app) · [Démo interactive](https://specanto-demo-production.up.railway.app/demo) · [Comparaison OpenAPI](https://specanto-demo-production.up.railway.app/compare)

Le déploiement se fait depuis ce dépôt via la CLI Railway, sur le [projet choisi](https://railway.com/project/e7e1ab33-b677-4537-bb14-c43201359ef5?environmentId=a1e0cb54-c0a1-481e-92b4-7853b4c8d561) :

- Projet `agile-dream` : `e7e1ab33-b677-4537-bb14-c43201359ef5`.
- Environnement `production` : `a1e0cb54-c0a1-481e-92b4-7853b4c8d561`.

Le service est `specanto-demo` (`ac4e2b9e-b881-45bc-b75f-34d4952b9bc1`). Le [README anglais](./README.md#deployment) contient la commande avec sa cible explicite. Railway construit le Dockerfile avec Bun 1.3.14. Le serveur stateless utilise `PORT=3000`, comme le domaine public, et `/health` comme vérification de démarrage. Vérifiez l’état du déploiement puis les chemins publics `/health`, `/demo`, `/compare` et `/api/products`.

## Licence

Specanto est distribué sous [licence MIT](./LICENSE), qui autorise notamment l’usage commercial, la modification et la redistribution avec conservation des mentions prévues par la licence. La publication npm est autorisée, mais attend la création/connexion du compte et la vérification du nom/scope choisi. Le package n’est pas encore disponible sur le registre.

Les [notices tierces](./THIRD_PARTY_NOTICES.md) conservent les licences des dépendances et des polices de démo. Le [changelog](./CHANGELOG.md) décrit la version candidate.
