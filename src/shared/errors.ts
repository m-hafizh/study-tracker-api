import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    options: { code: string; statusCode: number; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details ?? {};
  }
}

export const createErrorResponse = (
  message: string,
  code: string,
  details: Record<string, unknown> = {}
) => ({ message, code, details });

export const globalErrorHandler = (
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.log.error({ err: error }, 'Request failed');

  if (error instanceof AppError) {
    return reply
      .status(error.statusCode)
      .send(createErrorResponse(error.message, error.code, error.details));
  }

  if (error instanceof ZodError) {
    return reply.status(400).send(
      createErrorResponse('Validation failed', 'VALIDATION_ERROR', {
        issues: error.issues
      })
    );
  }

  return reply
    .status(500)
    .send(createErrorResponse('Internal server error', 'INTERNAL_SERVER_ERROR'));
};
