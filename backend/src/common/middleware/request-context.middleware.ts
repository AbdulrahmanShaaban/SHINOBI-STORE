import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../logger/logger';
import { RequestLog } from '../../types/request-log';

/**
 * Assigns a correlation id to every request (honoring an inbound
 * `x-request-id`), echoes it on the response, and binds a request-scoped
 * pino child logger so every log line inside the request is correlatable.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: RequestLog, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers['x-request-id'] as string | undefined)?.slice(0, 128) || randomUUID();

    req.id = requestId;
    req.log = logger.child({ requestId });
    res.setHeader('x-request-id', requestId);

    next();
  }
}
