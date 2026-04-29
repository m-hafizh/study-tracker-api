import { FastifyInstance } from 'fastify';

import { analyticsRoutes } from './analytics/routes/analytics.routes.js';
import { authRoutes } from './auth/routes/auth.routes.js';
import { calendarRoutes } from './calendar/routes/calendar.routes.js';
import { kanbanRoutes } from './kanban/routes/kanban.routes.js';
import { settingsRoutes } from './settings/routes/settings.routes.js';
import { studyRoutes } from './study/routes/study.routes.js';

export const registerModules = async (app: FastifyInstance): Promise<void> => {
  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(studyRoutes, { prefix: '/v1' });
  await app.register(calendarRoutes, { prefix: '/v1/calendar' });
  await app.register(kanbanRoutes, { prefix: '/v1/kanban' });
  await app.register(settingsRoutes, { prefix: '/v1/settings' });
  await app.register(analyticsRoutes, { prefix: '/v1/analytics' });
};
