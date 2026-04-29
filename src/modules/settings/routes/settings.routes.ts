import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../../db/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { openApiRefs } from '../../../shared/openapi.js';

const updateSettingsSchema = z.object({
  dailyTargetMinutes: z.number().int().min(1).max(24 * 60)
});

const studySettingsSchema = {
  type: 'object',
  properties: {
    dailyTargetMinutes: { type: 'number' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['dailyTargetMinutes', 'updatedAt']
} as const;

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/study', {
    preHandler: app.authenticate,
    schema: {
      tags: ['settings'],
      summary: 'Get study settings',
  description: 'Returns persisted study settings and initializes defaults if none exist.',
      security: [{ bearerAuth: [] }],
      response: {
        200: studySettingsSchema,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const userId = request.auth.userId;
    const row = await prisma.studySetting.findUnique({ where: { userId } });
    if (row) {
      return {
        dailyTargetMinutes: row.dailyTargetMinutes,
        updatedAt: row.updatedAt.toISOString()
      };
    }

    const now = new Date();
    const defaultValue = 120;
    await prisma.studySetting.create({
      data: {
      userId,
      dailyTargetMinutes: defaultValue,
      createdAt: now,
      updatedAt: now
      }
    });

    return {
      dailyTargetMinutes: defaultValue,
      updatedAt: now.toISOString()
    };
  });

  app.put('/study', {
    preHandler: app.authenticate,
    schema: {
      tags: ['settings'],
      summary: 'Update study settings',
  description: 'Updates study preference values for the current user.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          dailyTargetMinutes: { type: 'number', minimum: 1, maximum: 1440 }
        },
        required: ['dailyTargetMinutes'],
        examples: [{ dailyTargetMinutes: 120 }]
      },
      response: {
        200: studySettingsSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const payload = updateSettingsSchema.parse(request.body);
    const userId = request.auth.userId;
    const now = new Date();

    await prisma.studySetting.upsert({
      where: { userId },
      create: {
        userId,
        dailyTargetMinutes: payload.dailyTargetMinutes,
        createdAt: now,
        updatedAt: now
      },
      update: {
        dailyTargetMinutes: payload.dailyTargetMinutes,
        updatedAt: now
      }
    });

    return {
      dailyTargetMinutes: payload.dailyTargetMinutes,
      updatedAt: now.toISOString()
    };
  });
};
