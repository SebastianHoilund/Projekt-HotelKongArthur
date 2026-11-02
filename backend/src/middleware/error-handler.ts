import type { ErrorRequestHandler, Response } from 'express';
import { logger } from '../config/logger.js';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors.js';
import type { ErrorDetail } from '../domain/errors.js';

type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

function send(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): void {
  res.status(status).json({ error: { code, message, ...(details && { details }) } });
}

/** Fejl fra express-openapi-validator og body-parser. */
interface HttpError {
  status: number;
  message: string;
  errors?: { path: string; message: string }[];
}

function isClientHttpError(err: unknown): err is HttpError {
  const status = (err as HttpError | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ValidationError) {
    send(res, 400, 'VALIDATION_ERROR', err.message, err.details);
  } else if (err instanceof NotFoundError) {
    send(res, 404, 'NOT_FOUND', err.message);
  } else if (err instanceof ConflictError) {
    send(res, 409, 'CONFLICT', err.message);
  } else if (isClientHttpError(err)) {
    if (err.status === 404) {
      send(res, 404, 'NOT_FOUND', err.message);
    } else {
      const details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
      send(res, 400, 'VALIDATION_ERROR', err.message, details);
    }
  } else {
    logger.error({ err }, 'Uventet fejl');
    send(res, 500, 'INTERNAL', 'Der opstod en uventet fejl');
  }
};
