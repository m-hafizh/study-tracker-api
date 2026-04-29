import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { AuthController } from '../controller/auth.controller.js';
import { AuthRepository } from '../repository/auth.repository.js';
import { AuthService } from '../service/auth.service.js';
import { openApiRefs } from '../../../shared/openapi.js';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32)
});

const updateMeSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(80).optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128)
});

const authUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    name: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'email', 'name', 'createdAt', 'updatedAt']
} as const;

const authSessionSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: authUserSchema
  },
  required: ['accessToken', 'refreshToken', 'user']
} as const;

const refreshResponseSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' }
  },
  required: ['accessToken', 'refreshToken']
} as const;

export const authRoutes: FastifyPluginAsync = async (app) => {
  const repository = new AuthRepository();
  const service = new AuthService(repository, app);
  const controller = new AuthController(service);

  await service.ensureIndexes();

  app.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Register a new user',
      description: 'Creates a user account and returns an authenticated session.',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 2, maxLength: 80 },
          password: { type: 'string', minLength: 8, maxLength: 128 }
        },
        required: ['email', 'name', 'password'],
        examples: [{ email: 'student@example.com', name: 'Study User', password: 'Password123!' }]
      },
      response: {
        201: authSessionSchema,
        400: openApiRefs.errorResponse,
        409: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.body = registerSchema.parse(request.body);
    return controller.register(request, reply);
  });

  app.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Login with email and password',
      description: 'Authenticates a user and returns access and refresh tokens.',
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 128 }
        },
        required: ['email', 'password'],
        examples: [{ email: 'student@example.com', password: 'Password123!' }]
      },
      response: {
        200: authSessionSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    request.body = loginSchema.parse(request.body);
    return controller.login(request);
  });

  app.post('/refresh', {
    schema: {
      tags: ['auth'],
      summary: 'Refresh access token',
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string', minLength: 32 }
        },
        required: ['refreshToken']
      },
      response: {
        200: refreshResponseSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    request.body = refreshSchema.parse(request.body);
    return controller.refresh(request);
  });

  app.post('/logout', {
    schema: {
      tags: ['auth'],
      summary: 'Logout and invalidate refresh token',
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string', minLength: 32 }
        },
        required: ['refreshToken']
      },
      response: {
        204: openApiRefs.noContentResponse,
        400: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.body = refreshSchema.parse(request.body);
    return controller.logout(request, reply);
  });

  app.get('/me', {
    preHandler: app.authenticate,
    schema: {
      tags: ['auth'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
      response: {
        200: authUserSchema,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, controller.me);

  app.patch('/me', {
    preHandler: app.authenticate,
    schema: {
      tags: ['auth'],
      summary: 'Update current user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          name: { type: 'string', minLength: 2, maxLength: 80 }
        }
      },
      response: {
        200: authUserSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse,
        409: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    request.body = updateMeSchema.parse(request.body);
    return controller.updateMe(request);
  });

  app.post('/change-password', {
    preHandler: app.authenticate,
    schema: {
      tags: ['auth'],
      summary: 'Change current user password',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          currentPassword: { type: 'string', minLength: 8, maxLength: 128 },
          newPassword: { type: 'string', minLength: 8, maxLength: 128 }
        },
        required: ['currentPassword', 'newPassword']
      },
      response: {
        204: openApiRefs.noContentResponse,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.body = changePasswordSchema.parse(request.body);
    return controller.changePassword(request, reply);
  });
};
