import pino from 'pino';

/**
 * Process-wide structured logger. Request-scoped child loggers (bound to
 * requestId) are created by RequestContextMiddleware and exposed on `req.log`.
 *
 * Never log: passwords, tokens, payment credentials, raw personal data.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'shinobi-api' },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});
