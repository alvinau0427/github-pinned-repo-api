import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import * as packageInfo from '../../package.json';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: packageInfo.name,
            version: packageInfo.version,
            description: packageInfo.description,
        },
        servers: [
            {
                url: process.env.APP_URL || 'http://localhost:3000',
                description: 'API Server',
            },
        ],
        paths: {
            '/api/{username}': {
                get: {
                    summary: 'Get GitHub pinned repositories',
                    description: 'Fetches pinned repositories for a specific GitHub user.',
                    parameters: [
                        {
                            name: 'username',
                            in: 'path',
                            required: true,
                            description: 'The GitHub username to fetch',
                            schema: { type: 'string' }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'A JSON array of pinned repositories.',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/PinnedRepo' }
                                    }
                                }
                            }
                        },
                        '404': { description: 'User not found' }
                    }
                }
            }
        },
        components: {
            schemas: {
                PinnedRepo: {
                    type: 'object',
                    properties: {
                        owner: { type: 'string' },
                        repo: { type: 'string' },
                        link: { type: 'string' },
                        description: { type: 'string' },
                        image: { type: 'string' },
                        website: { type: 'string', nullable: true },
                        language: { type: 'string', nullable: true },
                        languageColor: { type: 'string', nullable: true },
                        stars: { type: 'integer' },
                        forks: { type: 'integer' },
                        isArchived: { type: 'boolean' },
                        isFork: { type: 'boolean' },
                        parentRepo: { 
                            type: 'object',
                            nullable: true,
                            properties: {
                                owner: { type: 'string' },
                                repo: { type: 'string' },
                                link: { type: 'string' }
                            },
                            description: 'Information about the parent repository if this is a fork'
                        },
                        topics: { 
                            type: 'array', 
                            items: { type: 'string' } 
                        }
                    }
                }
            }
        }
    },
    apis: [], 
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
    console.log(`[Docs] Swagger UI is ready at /docs`);
};