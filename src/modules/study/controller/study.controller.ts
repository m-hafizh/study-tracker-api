import { FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from '../../../shared/errors.js';
import { StudyService } from '../service/study.service.js';

export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  public getSessions = async (request: FastifyRequest) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const query = request.query as {
      from?: string;
      to?: string;
      subject?: string;
      search?: string;
      page?: number;
      limit?: number;
    };

    return this.studyService.getSessions(request.auth.userId, query);
  };

  public createSession = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const body = request.body as {
      subject: string;
      topic: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      date: string;
      notes: string;
    };

    const created = await this.studyService.createSession(request.auth.userId, body);
    return reply.status(201).send(created);
  };

  public updateSession = async (request: FastifyRequest) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const params = request.params as { id: string };
    const body = request.body as Partial<{
      subject: string;
      topic: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      date: string;
      notes: string;
    }>;

    return this.studyService.updateSession(request.auth.userId, params.id, body);
  };

  public deleteSession = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const params = request.params as { id: string };
    await this.studyService.deleteSession(request.auth.userId, params.id);
    return reply.status(204).send();
  };

  public getSubjects = async (request: FastifyRequest) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    return this.studyService.getSubjects(request.auth.userId);
  };

  public createSubject = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const body = request.body as {
      subject: string;
      color: string;
    };

    const created = await this.studyService.createSubject(request.auth.userId, body);
    return reply.status(201).send(created);
  };

  public updateSubject = async (request: FastifyRequest) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const params = request.params as { id: string };
    const body = request.body as Partial<{
      subject: string;
      color: string;
    }>;

    return this.studyService.updateSubject(request.auth.userId, params.id, body);
  };

  public deleteSubject = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth) {
      throw new AppError('Unauthorized', {
        code: 'UNAUTHORIZED',
        statusCode: 401
      });
    }

    const params = request.params as { id: string };
    await this.studyService.deleteSubject(request.auth.userId, params.id);
    return reply.status(204).send();
  };
}
