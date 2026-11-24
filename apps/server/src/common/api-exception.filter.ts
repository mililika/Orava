import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ApiErrorBody, ErrorCode } from '@orava/contracts';
import type { Response } from 'express';
import { ZodError } from 'zod';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  401: 'unauthorized',
  403: 'unauthorized',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

function codeForStatus(status: number): ErrorCode {
  if (status >= 500) return 'internal';
  return CODE_BY_STATUS[status] ?? 'validation_failed';
}

function bodyParserStatus(exception: unknown): number | undefined {
  const { type, status } = (exception ?? {}) as { type?: unknown; status?: unknown };
  return typeof type === 'string' && type.startsWith('entity.') && typeof status === 'number'
    ? status
    : undefined;
}

/** An HttpException thrown with `{ code, message, details? }` keeps its code and details. */
function namedError(response: string | object): {
  code?: ErrorCode;
  message?: string;
  details?: unknown;
} {
  if (typeof response !== 'object') return {};
  const { code, message, details } = response as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const parsed = ErrorCode.safeParse(code);
  return parsed.success
    ? { code: parsed.data, message: typeof message === 'string' ? message : undefined, details }
    : {};
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const [status, body] = this.toResponse(exception);
    res.status(status).json(body);
  }

  private toResponse(exception: unknown): [number, ApiErrorBody] {
    if (exception instanceof ZodError) {
      const details = exception.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
        message: issue.message,
      }));
      return [
        HttpStatus.BAD_REQUEST,
        { error: { code: 'validation_failed', message: 'Some fields are invalid.', details } },
      ];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const named = namedError(exception.getResponse());
      // A 5xx keeps its own message only when it was thrown on purpose with a code
      // (e.g. 503 ai_unavailable); anything else is an unexpected error.
      if (status >= 500 && !named.code) return this.internal(exception, status);
      return [
        status,
        {
          error: {
            code: named.code ?? codeForStatus(status),
            message: named.message ?? exception.message,
            ...(named.details !== undefined && { details: named.details }),
          },
        },
      ];
    }

    const parserStatus = bodyParserStatus(exception);
    if (parserStatus) {
      return [
        parserStatus,
        { error: { code: codeForStatus(parserStatus), message: 'The request could not be read.' } },
      ];
    }

    return this.internal(exception, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /** 5xx: keeps the status (e.g. 503 from health), never the error's own message. */
  private internal(exception: unknown, status: number): [number, ApiErrorBody] {
    this.logger.error(exception);
    return [status, { error: { code: 'internal', message: 'Something went wrong.' } }];
  }
}
