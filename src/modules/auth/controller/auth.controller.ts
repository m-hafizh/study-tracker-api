import { FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from '../../../shared/errors.js';
import { AuthService } from '../service/auth.service.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public register = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      email: string;
      name: string;
      password: string;
    };

    const data = await this.authService.register(body);
    return reply.status(201).send(data);
  };

  public login = async (request: FastifyRequest) => {
    const body = request.body as {
      email: string;
      password: string;
    };

    return this.authService.login(body);
  };

  public refresh = async (request: FastifyRequest) => {
    const body = request.body as {
      refreshToken: string;
    };

    return this.authService.refresh(body);
  };

  public logout = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      refreshToken: string;
    };

    await this.authService.logout(body);
    return reply.status(204).send();
  };

  public me = async (request: FastifyRequest) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    return this.authService.me(request.auth.userId);
  };

  public updateMe = async (request: FastifyRequest) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const body = request.body as {
      email?: string;
      name?: string;
    };

    return this.authService.updateMe(request.auth.userId, body);
  };

  public changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const body = request.body as {
      currentPassword: string;
      newPassword: string;
    };

    await this.authService.changePassword({
      userId: request.auth.userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword
    });

    return reply.status(204).send();
  };
}
