import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../../db/prisma.js';
import { AppError } from '../../../shared/errors.js';
import { openApiRefs } from '../../../shared/openapi.js';

const querySchema = z.object({
  weekStart: z.string().optional()
});

const toDateKey = (value: string) => value.slice(0, 10);

const buildCurrentStreak = (dailyTotals: Map<string, number>) => {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if ((dailyTotals.get(key) ?? 0) <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const studySummarySchema = {
  type: 'object',
  properties: {
    totalMinutes: { type: 'number' },
    totalHours: { type: 'number' },
    sessionsCount: { type: 'number' },
    currentStreakDays: { type: 'number' },
    weeklyMinutes: { type: 'number' },
    todayMinutes: { type: 'number' },
    dailyTargetMinutes: { type: 'number' },
    todayTargetProgress: { type: 'number' },
    topSubjects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          minutes: { type: 'number' }
        },
        required: ['subject', 'minutes']
      }
    },
    dailyBreakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          minutes: { type: 'number' }
        },
        required: ['date', 'minutes']
      }
    },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: [
    'totalMinutes',
    'totalHours',
    'sessionsCount',
    'currentStreakDays',
    'weeklyMinutes',
    'todayMinutes',
    'dailyTargetMinutes',
    'todayTargetProgress',
    'topSubjects',
    'dailyBreakdown',
    'updatedAt'
  ]
} as const;

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/study-summary', {
    preHandler: app.authenticate,
    schema: {
      tags: ['analytics'],
      summary: 'Get study analytics summary',
  description: 'Returns aggregated study metrics including streak, weekly totals, top subjects, and daily breakdown.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          weekStart: { type: 'string' }
        }
      },
      response: {
        200: studySummarySchema,
        400: openApiRefs.errorResponse,
        401: openApiRefs.errorResponse
      }
    }
  }, async (request) => {
    if (!request.auth) throw new AppError('Unauthorized', { code: 'UNAUTHORIZED', statusCode: 401 });

    const query = querySchema.parse(request.query);
    const userId = request.auth.userId;

    const [rows, settingRow] = await Promise.all([
      prisma.studySession.findMany({
        where: { userId },
        orderBy: { sessionDate: 'asc' }
      }),
      prisma.studySetting.findUnique({ where: { userId } })
    ]);

    const dailyTotals = new Map<string, number>();
    let totalMinutes = 0;
    for (const session of rows) {
      totalMinutes += session.durationMinutes;
      const key = toDateKey(session.sessionDate.toISOString());
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + session.durationMinutes);
    }

    const now = new Date();
    const weekStart = query.weekStart ? new Date(query.weekStart) : new Date(now);
    if (!query.weekStart) {
      weekStart.setDate(now.getDate() - now.getDay());
    }
    weekStart.setHours(0, 0, 0, 0);

    const weekKeys = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + index);
      return d.toISOString().slice(0, 10);
    });

    const weeklyMinutes = weekKeys.reduce((sum, key) => sum + (dailyTotals.get(key) ?? 0), 0);
    const target = settingRow?.dailyTargetMinutes ?? 120;
    const todayKey = now.toISOString().slice(0, 10);
    const todayMinutes = dailyTotals.get(todayKey) ?? 0;

    const bySubject = rows.reduce<Record<string, number>>((acc, session) => {
      acc[session.subject] = (acc[session.subject] ?? 0) + session.durationMinutes;
      return acc;
    }, {});

    const topSubjects = Object.entries(bySubject)
      .map(([subject, minutes]) => ({ subject, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    const dailyBreakdown = weekKeys.map((key) => ({
      date: key,
      minutes: dailyTotals.get(key) ?? 0
    }));

    return {
      totalMinutes,
      totalHours: Number((totalMinutes / 60).toFixed(1)),
      sessionsCount: rows.length,
      currentStreakDays: buildCurrentStreak(dailyTotals),
      weeklyMinutes,
      todayMinutes,
      dailyTargetMinutes: target,
      todayTargetProgress: target > 0 ? Math.min(1, todayMinutes / target) : 0,
      topSubjects,
      dailyBreakdown,
      updatedAt: new Date().toISOString()
    };
  });
};
