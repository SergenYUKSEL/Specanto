# Propositions de fonctionnalités

Les trois premières fonctionnalités sont désormais livrées. Les suivantes restent des propositions. L'ordre privilégie des améliorations utiles au quotidien et compatibles avec une bibliothèque React sans service Specanto dédié.

| Statut / priorité | Fonctionnalité | Bénéfice concret | Périmètre proposé |
| --- | --- | --- | --- |
| Livré | Exemples de code multilangages | Copier une requête directement dans un projet JavaScript ou Python. | Onglets cURL, Fetch et Python, construits depuis les mêmes paramètres. Masquer les identifiants dans chaque langage. |
| Livré | Profils de serveurs | Passer facilement entre local, staging et production. | Profils fournis par l’intégrateur hors OpenAPI, noms, URL et description ; sélection conservée entre les routes. Conserver la séparation des identifiants par origine et aucune requête automatique. |
| Livré | Éditeur JSON guidé | Corriger un corps de requête sans chercher l'erreur dans un grand JSON. | Erreurs au chemin du champ, formatage manuel et génération d'un exemple. Respecter les limites du validateur, puis étendre progressivement ses contraintes. |
| 4 | Comparaison de deux spécifications | Repérer ce qui a changé avant d'intégrer une nouvelle version d'API. | Routes ajoutées/supprimées, champs devenus obligatoires, changement de types et de sécurité. Présenter les changements potentiellement incompatibles avec leur justification. |
| 5 | Historique temporaire et favoris | Retrouver les essais et routes utiles pendant une session. | Historique en mémoire, limité et effaçable ; retirer les en-têtes secrets. Un corps peut contenir des données sensibles : prévoir une exclusion, sans stockage persistant par défaut. |
| 6 | Interface FR/EN configurable | Intégrer Specanto dans une application internationale. | Dictionnaire des libellés de l'interface et des erreurs, langue fournie par l'intégrateur. Ne pas traduire silencieusement le contenu OpenAPI. |

## Ordre conseillé

Les snippets Fetch/Python, profils de serveurs et premier éditeur JSON guidé sont livrés. La comparaison de spécifications est la prochaine proposition distinctive ; historique temporaire et interface FR/EN peuvent ensuite être priorisés selon les usages.

Pour chaque fonctionnalité, conserver les règles du MVP : interactions explicites, secrets en mémoire, pas de requête métier automatique, limites visibles et aucune dépendance obligatoire à un compte cloud.

## Extensions selon les demandes d'intégration

OpenAPI 3.0, OAuth/OIDC, multipart, références externes et streaming méritent des lots séparés. Ils changent davantage les garanties du moteur et demandent des cas d'usage réels avant de fixer leur priorité. Un portail multi-API peut arriver plus tard, lorsque plusieurs équipes utilisent effectivement le composant.
