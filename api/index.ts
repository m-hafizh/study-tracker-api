import type { FastifyInstance } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';

let appPromise: Promise<FastifyInstance> | undefined;

const getApp = async (): Promise<FastifyInstance> => {
  if (!appPromise) {
    appPromise = (async () => {
      const [{ buildApp }, { connectToDatabase }] = await Promise.all([
        import('../src/app.js'),
        import('../src/db/prisma.js')
      ]);

      const app = await buildApp();
      await connectToDatabase();
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
  try {
    const app = await getApp();

    app.server.emit('request', req, res);
  } catch (error) {
    // Surface startup/runtime failures as API JSON instead of an opaque platform crash page.
    // eslint-disable-next-line no-console
    console.error('Vercel function initialization failed', error);

    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        message: 'Server initialization failed',
        code: 'SERVER_INIT_ERROR'
      })
    );
  }
}
