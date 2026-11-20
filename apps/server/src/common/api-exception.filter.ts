import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody, ErrorCode } from '@orava/contracts';
import type { Response } from 'express';
import { ZodError } from 'zod';

function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
    case 413:
    case 422:
      return 'validation_failed';
    case 401:
    case 403:
      return 'unauthorized';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limited';
    default:
      return status >= 500 ? 'internal' : 'validation_failed';
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const [status, body] = this.toBody(exception);
    res.status(status).json(body);
  }

  private toBody(exception: unknown): [number, ApiErrorBody] {
    if (exception instanceof ZodError) {
      const details = exception.issues.map((i) => ({
        path: i.path.join('.'),
        code: i.code,
        message: i.message,
      }));
      return [
        HttpStatus.BAD_REQUEST,
        { error: { code: 'validation_failed', message: 'Some fields are invalid.', details } },
      ];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const named = typeof response === 'object' && response !== null ? response : {};
      const code = 'code' in named ? (named.code as ErrorCode) : codeForStatus(status);
      const message =
        'code' in named && 'message' in named && typeof named.message === 'string'
          ? named.message
          : exception.message;
      if (status >= 500) this.logger.error(exception);
      return [status, { error: { code, message } }];
    }

    this.logger.error(exception);
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      { error: { code: 'internal', message: 'Something went wrong.' } },
    ];
  }
}
