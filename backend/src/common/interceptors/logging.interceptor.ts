import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { logger } from '../logger/logger';
import { RequestLog } from '../../types/request-log';

/**
 * Emits one structured access-log entry per request:
 * method, route, status, duration and the correlation id.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestLog>();
    const res = http.getResponse<Response>();
    const startedAt = process.hrtime.bigint();
    const log = req.log ?? logger;

    return next.handle().pipe(
      tap({
        next: () => {
          log.info(
            {
              method: req.method,
              route: req.originalUrl,
              statusCode: res.statusCode,
              durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
            },
            'request completed',
          );
        },
        error: (err: unknown) => {
          log.error(
            {
              method: req.method,
              route: req.originalUrl,
              durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
              err,
            },
            'request failed',
          );
        },
      }),
    );
  }
}
