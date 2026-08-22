import { validateEnv } from './env.validation';

const validBase = {
  NODE_ENV: 'development',
  PORT: '5000',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnv', () => {
  it('accepts a fully valid environment', () => {
    expect(() => validateEnv({ ...validBase })).not.toThrow();
  });

  it('rejects a malformed DATABASE_URL', () => {
    expect(() => validateEnv({ ...validBase, DATABASE_URL: 'mysql://nope' })).toThrow(
      /DATABASE_URL must be a postgresql/,
    );
  });

  it('rejects a malformed REDIS_URL', () => {
    expect(() => validateEnv({ ...validBase, REDIS_URL: 'postgres://nope' })).toThrow(
      /REDIS_URL must be a redis/,
    );
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => validateEnv({ ...validBase, PORT: '99999' })).toThrow();
  });

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => validateEnv({ ...validBase, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('requires explicit DATABASE_URL and REDIS_URL in production', () => {
    // Keys absent entirely — the real scenario when env vars are unset.
    expect(() => validateEnv({ NODE_ENV: 'production', PORT: '5000' })).toThrow(
      /production requires explicit/,
    );
  });
});
