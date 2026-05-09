import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API CamerFarmAI',
            version: '1.0.0',
            description: 'Documentation de l\'API pour l\'application backend CamerFarmAI',
            contact: {
                name: 'Support CamerFarmAI',
                email: 'support@camerfarmai.com',
            },
        },
        servers: [
            {
                // Utilise l'URL publique quand elle est configurée (Traefik/production),
                // sinon fallback en local.
                url: (() => {
                    const publicUrl = process.env.PUBLIC_BACKEND_URL?.replace(/\/+$/, '');
                    if (!publicUrl) return 'http://localhost:3000/api/v1';

                    // Si PUBLIC_BACKEND_URL contient déjà `/api/v1` (cas fréquent),
                    // on évite de le dupliquer.
                    if (/\/api\/v1\/?$/.test(publicUrl)) return publicUrl;

                    return `${publicUrl}/api/v1`;
                })(),
                description: 'API base URL',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
