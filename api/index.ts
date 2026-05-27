import type { FastifyInstance } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { buildApp } from '../src/app.js';
import { connectToDatabase } from '../src/db/prisma.js';

let appPromise: Promise<FastifyInstance> | undefined;

const getApp = async (): Promise<FastifyInstance> => {
  if (!appPromise) {
    appPromise = (async () => {
      await connectToDatabase();
      const app = await buildApp();
      await app.ready();
      return app;
    })().catch((error) => {
      appPromise = undefined;
      throw error;
    });
  }

  return appPromise;
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();

  app.server.emit('request', req, res);
}
