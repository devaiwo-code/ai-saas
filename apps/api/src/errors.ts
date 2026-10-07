import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export interface ErrorDetail {
  path: string;
  message: string;
}

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Base class for errors that map to a known HTTP status and error code. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly headers?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    options: { details?: unknown; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.headers = options.headers;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(400, 'VALIDATION_ERROR', message, { details });
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}

export function zodIssuesToDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

function errorBody(code: string, message: string, details?: unknown): ErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

function isFastifyError(error: unknown): error is FastifyError {
  return error instanceof Error && 'code' in error;
}

/**
 * Makes every error and unknown route respond with `{ error: { code, message, details? } }`.
 * Stack traces and messages of unexpected errors are never sent to the client.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.headers) {
        void reply.headers(error.headers);
      }
      return reply
        .status(error.statusCode)
        .send(errorBody(error.code, error.message, error.details));
    }

    if (error instanceof ZodError) {
      return reply
        .status(400)
        .send(
          errorBody('VALIDATION_ERROR', 'Request validation failed', zodIssuesToDetails(error)),
        );
    }

    if (isFastifyError(error) && error.validation) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath.replace(/^\//, '').replaceAll('/', '.'),
        message: issue.message ?? 'Invalid value',
      }));
      return reply
        .status(400)
        .send(errorBody('VALIDATION_ERROR', 'Request validation failed', details));
    }

    if (
      isFastifyError(error) &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return reply
        .status(error.statusCode)
        .send(errorBody(error.code || 'BAD_REQUEST', error.message));
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send(errorBody('INTERNAL_ERROR', 'Internal server error'));
  });

  app.setNotFoundHandler((request, reply) => {
    return reply
      .status(404)
      .send(errorBody('NOT_FOUND', `Route ${request.method} ${request.url} not found`));
  });
}
