export const spec = {
  openapi: '3.1.1',
  info: {
    title: 'Atelier',
    version: '1.0.0',
    description: 'Cet exemple consomme l’archive Specanto. La console utilise une simulation explicite.',
  },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/products': {
      get: {
        operationId: 'listProducts',
        summary: 'Lister les produits',
        tags: ['Produits'],
        responses: {
          '200': {
            description: 'La liste des objets de l’atelier.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: { id: { type: 'string' }, name: { type: 'string' } },
                  },
                },
                example: [{ id: 'prd_01', name: 'Lampe Halo' }],
              },
            },
          },
        },
      },
    },
  },
};
