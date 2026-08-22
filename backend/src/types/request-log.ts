import type { Request } from 'express';
import type { Logger } from 'pino';

/**
 * Express Request enriched by RequestContextMiddleware.
 * Used via narrow casts (`as RequestLog`) at consumption sites.
 */
export interface RequestLog extends Request {
  /** Correlation id (echoed as x-request-id response header). */
  id?: string;
  /** Request-scoped child logger bound to the correlation id. */
  log?: Logger;
}
