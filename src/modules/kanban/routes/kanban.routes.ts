import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

import { prisma } from '../../../db/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { openApiRefs } from '../../../shared/openapi.js';

type KanbanCard = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
};

type KanbanList = {
  id: string;
  title: string;
  cards: KanbanCard[];
  createdAt: string;
  updatedAt: string;
};

type KanbanBoard = {
  id: string;
  title: string;
  lists: KanbanList[];
  createdAt: string;
  updatedAt: string;
};

const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().optional(),
  notes: z.string().optional(),
  estimateMinutes: z.number().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const listSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  cards: z.array(cardSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const boardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lists: z.array(listSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const createDefaultBoard = (): KanbanBoard => {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: 'Study Tasks',
    lists: [
      { id: randomUUID(), title: 'To Do', cards: [], createdAt: now, updatedAt: now },
      { id: randomUUID(), title: 'In Progress', cards: [], createdAt: now, updatedAt: now },
      { id: randomUUID(), title: 'Done', cards: [], createdAt: now, updatedAt: now }
    ],
    createdAt: now,
    updatedAt: now
  };
};

const kanbanCardSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    subject: { type: 'string' },
    notes: { type: 'string' },
    estimateMinutes: { type: 'number' },
    dueDate: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
  },
  required: ['id', 'title', 'createdAt', 'updatedAt']
} as const;

const kanbanListSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    cards: { type: 'array', items: kanbanCardSchema },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
  },
  required: ['id', 'title', 'cards', 'createdAt', 'updatedAt']
} as const;

const kanbanBoardSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    lists: { type: 'array', items: kanbanListSchema },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
  },
  required: ['id', 'title', 'lists', 'createdAt', 'updatedAt']
} as const;

export const kanbanRoutes: FastifyPluginAsync = async (app) => {
  app.get('/board', {
    preHandler: app.authenticate,
    schema: {
      tags: ['kanban'],
      summary: 'Get current kanban board',
  description: 'Returns the current kanban board snapshot, creating a default board if none exists.',
      security: [{ bearerAuth: [] }],
      response: {
        200: kanbanBoardSchema,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const userId = request.auth.userId;
    const row = await prisma.kanbanBoard.findUnique({ where: { userId } });
    if (row) return boardSchema.parse(row.board);

    const board = createDefaultBoard();
    await prisma.kanbanBoard.create({
      data: {
        userId,
        board: board as Prisma.InputJsonValue
      }
    });
    return board;
  });

  app.put('/board', {
    preHandler: app.authenticate,
    schema: {
      tags: ['kanban'],
      summary: 'Save entire kanban board snapshot',
  description: 'Persists the full board state sent by the client.',
      security: [{ bearerAuth: [] }],
      body: kanbanBoardSchema,
      response: {
        200: kanbanBoardSchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const board = boardSchema.parse(request.body);
    const userId = request.auth.userId;

    await prisma.kanbanBoard.upsert({
      where: { userId },
      create: {
        userId,
        board: board as Prisma.InputJsonValue
      },
      update: {
        board: board as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });

    return board;
  });

  app.post('/board/reset', {
    preHandler: app.authenticate,
    schema: {
      tags: ['kanban'],
      summary: 'Reset board to default columns',
      security: [{ bearerAuth: [] }],
      response: {
        200: kanbanBoardSchema,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const userId = request.auth.userId;
    const board = createDefaultBoard();

    await prisma.kanbanBoard.upsert({
      where: { userId },
      create: {
        userId,
        board: board as Prisma.InputJsonValue
      },
      update: {
        board: board as Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    });

    return board;
  });
};
