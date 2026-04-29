import { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../../../db/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { openApiRefs } from '../../../shared/openapi.js';

const eventInputSchema = z.object({
  title: z.string().min(1),
  subject: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean(),
  color: z.string().optional(),
  notes: z.string().optional()
});

const eventPatchSchema = z
  .object({
    title: z.string().min(1).optional(),
    subject: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    allDay: z.boolean().optional(),
    color: z.string().optional(),
    notes: z.string().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

const listEventsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional()
});

const idParamsSchema = z.object({
  id: z.string().min(1)
});

const mapEvent = (doc: {
  id: string;
  title: string;
  subject: string | null;
  eventDate: Date;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  color: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: doc.id,
  title: doc.title,
  subject: doc.subject ?? undefined,
  date: doc.eventDate.toISOString().slice(0, 10),
  startTime: doc.startTime ?? undefined,
  endTime: doc.endTime ?? undefined,
  allDay: doc.allDay,
  color: doc.color ?? undefined,
  notes: doc.notes ?? undefined,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString()
});

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const validateTimedEvent = ({
  allDay,
  startTime,
  endTime
}: {
  allDay: boolean;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
}) => {
  if (allDay) return;

  const normalizedStart = startTime?.trim() ?? '';
  const normalizedEnd = endTime?.trim() ?? '';

  if (!normalizedStart || !normalizedEnd) {
    throw new AppError('Start and end time are required for non all-day events.', {
      code: 'INVALID_EVENT_TIME',
      statusCode: 400,
      details: {
        field: 'timeRange'
      }
    });
  }

  if (!timePattern.test(normalizedStart) || !timePattern.test(normalizedEnd)) {
    throw new AppError('Invalid time format. Use HH:mm (24-hour).', {
      code: 'INVALID_EVENT_TIME',
      statusCode: 400,
      details: {
        field: 'timeRange'
      }
    });
  }

  if (normalizedStart >= normalizedEnd) {
    throw new AppError('End time must be after start time.', {
      code: 'INVALID_EVENT_TIME_RANGE',
      statusCode: 400,
      details: {
        field: 'timeRange'
      }
    });
  }
};

const mapCalendarWriteError = (error: unknown): never => {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2004' || error.code === 'P2000' || error.code === 'P2002') {
      throw new AppError('Could not save study plan. Please check the form values and try again.', {
        code: 'INVALID_CALENDAR_EVENT',
        statusCode: 400
      });
    }
  }

  throw error;
};

const calendarEventSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    subject: { type: 'string' },
    date: { type: 'string' },
    startTime: { type: 'string' },
    endTime: { type: 'string' },
    allDay: { type: 'boolean' },
    color: { type: 'string' },
    notes: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'title', 'date', 'allDay', 'createdAt', 'updatedAt']
} as const;

export const calendarRoutes: FastifyPluginAsync = async (app) => {
  app.get('/events', {
    preHandler: app.authenticate,
    schema: {
      tags: ['calendar'],
      summary: 'List calendar events',
      description: 'Returns calendar events for the authenticated user, optionally filtered by date range and subject.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          subject: { type: 'string' }
        }
      },
      response: {
        200: { type: 'array', items: calendarEventSchema },
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const query = listEventsQuerySchema.parse(request.query);
    const where: {
      userId: string;
      eventDate?: { gte?: Date; lte?: Date };
      subject?: string;
    } = {
      userId: request.auth.userId
    };

    if (query.from || query.to) {
      where.eventDate = {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {})
      };
    }

    if (query.subject) {
      where.subject = query.subject;
    }

    const rows = await prisma.calendarEvent.findMany({
      where,
      orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }]
    });
    return rows.map(mapEvent);
  });

  app.post('/events', {
    preHandler: app.authenticate,
    schema: {
      tags: ['calendar'],
      summary: 'Create a calendar event',
      description: 'Creates a calendar event for planning study activities.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1 },
          subject: { type: 'string' },
          date: { type: 'string', minLength: 1 },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          allDay: { type: 'boolean' },
          color: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['title', 'date', 'allDay'],
        examples: [{ title: 'Chemistry revision', subject: 'Chemistry', date: '2026-04-24', startTime: '18:00', endTime: '19:30', allDay: false, color: '#8b5cf6', notes: 'Focus on ionic bonds' }]
      },
      response: {
        201: calendarEventSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const input = eventInputSchema.parse(request.body);

    const normalizedStartTime = input.startTime?.trim() || null;
    const normalizedEndTime = input.endTime?.trim() || null;

    validateTimedEvent({
      allDay: input.allDay,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime
    });

    try {
      const doc = await prisma.calendarEvent.create({
        data: {
          userId: request.auth.userId,
          title: input.title.trim(),
          subject: input.subject?.trim() || null,
          eventDate: new Date(`${input.date}T00:00:00.000Z`),
          startTime: input.allDay ? null : normalizedStartTime,
          endTime: input.allDay ? null : normalizedEndTime,
          allDay: input.allDay,
          color: input.color ?? null,
          notes: input.notes?.trim() || null
        }
      });

      return reply.status(201).send(mapEvent(doc));
    } catch (error) {
      mapCalendarWriteError(error);
    }
  });

  app.put('/events/:id', {
    preHandler: app.authenticate,
    schema: {
      tags: ['calendar'],
      summary: 'Update a calendar event',
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
          title: { type: 'string', minLength: 1 },
          subject: { type: 'string' },
          date: { type: 'string', minLength: 1 },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          allDay: { type: 'boolean' },
          color: { type: 'string' },
          notes: { type: 'string' }
        },
        minProperties: 1
      },
      response: {
        200: calendarEventSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse,
        404: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const { id } = idParamsSchema.parse(request.params);
    if (!isUuid(id)) throw new AppError('Invalid id format', { code: 'INVALID_ID', statusCode: 400 });
    const patch = eventPatchSchema.parse(request.body);

    const existing = await prisma.calendarEvent.findFirst({
      where: {
        id,
        userId: request.auth.userId
      }
    });

    if (!existing) {
      throw new AppError('Event not found', { code: 'EVENT_NOT_FOUND', statusCode: 404 });
    }

    const nextAllDay = patch.allDay ?? existing.allDay;
    const nextStartTime = patch.startTime !== undefined ? patch.startTime.trim() || null : existing.startTime;
    const nextEndTime = patch.endTime !== undefined ? patch.endTime.trim() || null : existing.endTime;

    validateTimedEvent({
      allDay: nextAllDay,
      startTime: nextStartTime,
      endTime: nextEndTime
    });

    const updates: {
      title?: string;
      subject?: string | null;
      eventDate?: Date;
      startTime?: string | null;
      endTime?: string | null;
      allDay?: boolean;
      color?: string | null;
      notes?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date()
    };

    if (patch.title !== undefined) updates.title = patch.title.trim();
    if (patch.subject !== undefined) updates.subject = patch.subject.trim() || null;
    if (patch.date !== undefined) updates.eventDate = new Date(`${patch.date}T00:00:00.000Z`);
    if (patch.startTime !== undefined) updates.startTime = nextStartTime;
    if (patch.endTime !== undefined) updates.endTime = nextEndTime;
    if (patch.allDay !== undefined) updates.allDay = patch.allDay;
    if (patch.color !== undefined) updates.color = patch.color || null;
    if (patch.notes !== undefined) updates.notes = patch.notes.trim() || null;

    if (nextAllDay) {
      updates.startTime = null;
      updates.endTime = null;
    }

    try {
      await prisma.calendarEvent.updateMany({
        where: {
          id,
          userId: request.auth.userId
        },
        data: updates
      });
    } catch (error) {
      mapCalendarWriteError(error);
    }

    const result = await prisma.calendarEvent.findFirst({
      where: {
        id,
        userId: request.auth.userId
      }
    });

    if (!result) {
      throw new AppError('Event not found', { code: 'EVENT_NOT_FOUND', statusCode: 404 });
    }

    return mapEvent(result);
  });

  app.delete('/events/:id', {
    preHandler: app.authenticate,
    schema: {
      tags: ['calendar'],
      summary: 'Delete a calendar event',
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
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const { id } = idParamsSchema.parse(request.params);
    if (!isUuid(id)) throw new AppError('Invalid id format', { code: 'INVALID_ID', statusCode: 400 });

    const result = await prisma.calendarEvent.deleteMany({
      where: {
        id,
        userId: request.auth.userId
      }
    });

    if (result.count === 0) {
      throw new AppError('Event not found', { code: 'EVENT_NOT_FOUND', statusCode: 404 });
    }

    return reply.status(204).send();
  });

  app.delete('/events', {
    preHandler: app.authenticate,
    schema: {
      tags: ['calendar'],
      summary: 'Delete all calendar events for current user',
      security: [{ bearerAuth: [] }],
      response: {
        204: openApiRefs.noContentResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request, reply) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    await prisma.calendarEvent.deleteMany({ where: { userId: request.auth.userId } });
    return reply.status(204).send();
  });
};
