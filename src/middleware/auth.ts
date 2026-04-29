import { FastifyInstance } from 'fastify';

import { AppError } from '../shared/errors.js';

type AuthPayload = {
  sub: string;
  email: string;
};

export const registerAuthMiddleware = async (app: FastifyInstance): Promise<void> => {
  app.decorate('authenticate', async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = await app.jwt.verify<AuthPayload>(token);
      request.auth = {
        userId: payload.sub,
        email: payload.email
      };
    } catch {
      throw new AppError('Invalid or expired access token', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }
  });
};
