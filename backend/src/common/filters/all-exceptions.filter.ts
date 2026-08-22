import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { logger } from '../logger/logger';
import { RequestLog } from '../../types/request-log';

const STATUS_TO_CODE: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND_ERROR',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'DEPENDENCY_UNAVAILABLE',
};

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  code: string;
  requestId?: string;
}

/**
 * Single error contract for every failure (see plan §9.3).
 * Never leaks stack traces or internals; unknown errors become opaque 500s.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<RequestLog>();
    const res = http.getResponse<Response>();
    const log = req.log ?? logger;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body = this.buildBody(exception.getResponse(), statusCode, req);

      if (statusCode >= 500) {
        log.error({ err: exception, route: req.originalUrl }, 'request failed with server error');
      }

      res.status(statusCode).json(body);
      return;
    }

    log.error({ err: exception, route: req.originalUrl }, 'unhandled exception');
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Something went wrong',
      code: STATUS_TO_CODE[500],
      requestId: req.id,
    });
  }

  private buildBody(
    exceptionResponse: string | object,
    statusCode: number,
    req: RequestLog,
  ): ErrorResponseBody {
    let message: string | string[] = exceptionResponse instanceof String ? String(exceptionResponse) : 'Request failed';
    // Domain code attached by the thrower (e.g. PRODUCT_NOT_FOUND) takes
    // precedence; otherwise the stable HTTP-derived fallback applies.
    let code: string | undefined;
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const r = exceptionResponse as Record<string, unknown>;
      if (Array.isArray(r.message)) message = r.message as string[];
      else if (typeof r.message === 'string') message = r.message;
      if (typeof r.code === 'string') code = r.code;
    }

    return {
      statusCode,
      error: HttpStatus[statusCode] ?? 'Error',
      message,
      code: code ?? STATUS_TO_CODE[statusCode] ?? `HTTP_${statusCode}`,
      requestId: req.id,
    };
  }
}
