/**
 * §17 background-job conventions: queue names, retry policies and timing
 * bounds shared by producers, workers and the admin API. Payloads carry ids,
 * never blobs — handlers re-fetch fresh state.
 */

export const EMAIL_QUEUE = 'email';
export const SCHEDULER_QUEUE = 'jobs-scheduler';

/** Repeatable job names registered on the scheduler queue. */
export const PAYMENT_RECON_JOB = 'payment-recon';
export const MAINTENANCE_JOB = 'maintenance';

/** Email job name (send simulation until the SMTP adapter lands). */
export const EMAIL_SEND_JOB = 'send';

/** §17 email policy: 5 attempts with exponential backoff → DLQ (failed set). */
export const EMAIL_MAX_ATTEMPTS = 5;
export const EMAIL_BACKOFF_BASE_MS = 30_000;

/**
 * payment-recon (§17): payments stuck in a pending-ish state for longer than
 * this are compared against provider truth every 15 minutes; transitions are
 * state-guarded so overlapping runs are safe.
 */
export const RECON_REPEAT_EVERY_MS = 15 * 60 * 1000;
export const RECON_STALE_AFTER_MS = 15 * 60 * 1000;
/** One bad provider row must never kill the sweep — bound each call. */
export const RECON_PROVIDER_TIMEOUT_MS = 8_000;

/** maintenance (§17): nightly session + orphaned-cart cleanup at 03:00. */
export const MAINTENANCE_CRON = '0 3 * * *';
export const SESSION_REVOKED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const EMPTY_CART_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Queues surfaced by the admin API ('email' + any queues this module registers). */
export const ADMIN_QUEUE_NAMES: readonly string[] = [EMAIL_QUEUE, SCHEDULER_QUEUE];
