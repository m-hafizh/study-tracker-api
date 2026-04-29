import { FastifyPluginAsync } from 'fastify';

export const loggingPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (request) => {
    request.log.info({ method: request.method, url: request.url }, 'Incoming request');
  });
};
