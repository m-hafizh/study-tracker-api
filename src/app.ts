import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';

import { env } from './config/env.js';
import { registerAuthMiddleware } from './middleware/auth.js';
import { loggingPlugin } from './middleware/logging.js';
import { registerModules } from './modules/index.js';
import { globalErrorHandler } from './shared/errors.js';

export const buildApp = async () => {
  const app = Fastify({ logger: true });

  await app.register(cors);
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Study Tracker API',
        description: 'Backend API documentation for Study Tracker.',
        version: '0.1.0'
      },
      servers: [{ url: '/v1', description: 'Versioned API base path' }],
      tags: [
        { name: 'auth', description: 'Authentication and session management' },
        { name: 'study', description: 'Study sessions and history' },
        { name: 'subjects', description: 'Study subject management' },
        { name: 'calendar', description: 'Study planning calendar events' },
        { name: 'kanban', description: 'Kanban board workflows' },
        { name: 'settings', description: 'User study preferences' },
        { name: 'analytics', description: 'Study analytics and summaries' }
      ],
      components: {
        responses: {
          NoContent: {
            description: 'Request processed successfully. No response body.'
          }
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Validation failed' },
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              details: { type: 'object', additionalProperties: true }
            },
            required: ['message', 'code', 'details']
          }
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  });
  await app.register(loggingPlugin);
  await registerAuthMiddleware(app);
  await registerModules(app);

  app.setErrorHandler(globalErrorHandler);
  app.get('/health', async () => ({ status: 'ok' }));

  return app;
};
