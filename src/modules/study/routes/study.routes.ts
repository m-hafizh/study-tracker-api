import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { StudyController } from '../controller/study.controller.js';
import { StudyRepository } from '../repository/study.repository.js';
import { StudyService } from '../service/study.service.js';
import { openApiRefs } from '../../../shared/openapi.js';

const listSessionsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
});

const createSessionSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().default(''),
  startTime: z.string().default(''),
  endTime: z.string().default(''),
  durationMinutes: z.coerce.number().int().nonnegative(),
  date: z.string().min(1),
  notes: z.string().default('')
});

const updateSessionSchema = z
  .object({
    subject: z.string().min(1).optional(),
    topic: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    durationMinutes: z.coerce.number().int().nonnegative().optional(),
    date: z.string().min(1).optional(),
    notes: z.string().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

const createSubjectSchema = z.object({
  subject: z.string().min(1),
  color: z.string().min(1)
});

const updateSubjectSchema = z
  .object({
    subject: z.string().min(1).optional(),
    color: z.string().min(1).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });

const idParamsSchema = z.object({
  id: z.string().min(1)
});

const studySessionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    subject: { type: 'string' },
    topic: { type: 'string' },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
    durationMinutes: { type: 'number' },
    date: { type: 'string' },
    notes: { type: 'string' }
  },
  required: ['id', 'subject', 'topic', 'startTime', 'endTime', 'durationMinutes', 'date', 'notes']
} as const;

const subjectResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    subject: { type: 'string' },
    color: { type: 'string' }
  },
  required: ['id', 'subject', 'color']
} as const;

export const studyRoutes: FastifyPluginAsync = async (app) => {
  const repository = new StudyRepository();
  const service = new StudyService(repository);
  const controller = new StudyController(service);

  await service.ensureIndexes();

  app.get('/study-sessions', {
    preHandler: app.authenticate,
    schema: {
      tags: ['study'],
      summary: 'List study sessions',
  description: 'Returns filtered study sessions and total count for the authenticated user.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          subject: { type: 'string' },
          search: { type: 'string' },
          page: { type: 'number', minimum: 1 },
          limit: { type: 'number', minimum: 1, maximum: 200 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array', items: studySessionResponseSchema },
            total: { type: 'number' }
          },
          required: ['items', 'total']
        },
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    request.query = listSessionsQuerySchema.parse(request.query);
    return controller.getSessions(request);
  });

  app.post('/study-sessions', {
    preHandler: app.authenticate,
    schema: {
      tags: ['study'],
      summary: 'Create a study session',
  description: 'Creates a new study session entry.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 1 },
          topic: { type: 'string', default: '' },
          startTime: { type: 'string', default: '' },
          endTime: { type: 'string', default: '' },
          durationMinutes: { type: 'number', minimum: 0 },
          date: { type: 'string', minLength: 1 },
          notes: { type: 'string', default: '' }
        },
        required: ['subject', 'durationMinutes', 'date'],
        examples: [{ subject: 'Math', topic: 'Integration', startTime: '19:00', endTime: '20:00', durationMinutes: 60, date: '2026-04-23', notes: 'Practice exercises 1-10' }]
      },
      response: {
        201: studySessionResponseSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.body = createSessionSchema.parse(request.body);
    return controller.createSession(request, reply);
  });

  app.put('/study-sessions/:id', {
    preHandler: app.authenticate,
    schema: {
      tags: ['study'],
      summary: 'Update a study session',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 1 },
          topic: { type: 'string' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          durationMinutes: { type: 'number', minimum: 0 },
          date: { type: 'string', minLength: 1 },
          notes: { type: 'string' }
        },
        minProperties: 1
      },
      response: {
        200: studySessionResponseSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    request.params = idParamsSchema.parse(request.params);
    request.body = updateSessionSchema.parse(request.body);
    return controller.updateSession(request);
  });

  app.delete('/study-sessions/:id', {
    preHandler: app.authenticate,
    schema: {
      tags: ['study'],
      summary: 'Delete a study session',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        204: openApiRefs.noContentResponse,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.params = idParamsSchema.parse(request.params);
    return controller.deleteSession(request, reply);
  });

  app.get('/subjects', {
    preHandler: app.authenticate,
    schema: {
      tags: ['subjects'],
      summary: 'List all subjects',
      security: [{ bearerAuth: [] }],
      response: {
        200: { type: 'array', items: subjectResponseSchema },
        401: openApiRefs.errorResponse
      }
    }
  }, controller.getSubjects);

  app.post('/subjects', {
    preHandler: app.authenticate,
    schema: {
      tags: ['subjects'],
      summary: 'Create a subject',
    description: 'Creates a subject used for organizing sessions and plans.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 }
        },
        required: ['subject', 'color'],
        examples: [{ subject: 'Physics', color: '#3b82f6' }]
      },
      response: {
        201: subjectResponseSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.body = createSubjectSchema.parse(request.body);
    return controller.createSubject(request, reply);
  });

  app.put('/subjects/:id', {
    preHandler: app.authenticate,
    schema: {
      tags: ['subjects'],
      summary: 'Update a subject',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          subject: { type: 'string', minLength: 1 },
          color: { type: 'string', minLength: 1 }
        },
        minProperties: 1
      },
      response: {
        200: subjectResponseSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    request.params = idParamsSchema.parse(request.params);
    request.body = updateSubjectSchema.parse(request.body);
    return controller.updateSubject(request);
  });

  app.delete('/subjects/:id', {
    preHandler: app.authenticate,
    schema: {
      tags: ['subjects'],
      summary: 'Delete a subject',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        204: openApiRefs.noContentResponse,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    request.params = idParamsSchema.parse(request.params);
    return controller.deleteSubject(request, reply);
  });
};
