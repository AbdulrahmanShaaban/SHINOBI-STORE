// Runs before every e2e suite: relax the global IP throttle so multi-step
// contract flows (many logins per suite) don't trip rate limiting in tests.
process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT ?? '1000';
process.env.THROTTLE_TTL_MS = process.env.THROTTLE_TTL_MS ?? '60000';
process.env.THROTTLE_AUTH_LIMIT = process.env.THROTTLE_AUTH_LIMIT ?? '1000';
