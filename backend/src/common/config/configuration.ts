export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  corsOrigins: string[];
}

const DEV_DEFAULTS = {
  DATABASE_URL: 'postgresql://shinobi:shinobi_dev_password@localhost:5432/shinobi_store?schema=public',
  REDIS_URL: 'redis://localhost:6379',
};

export default (): AppConfig => {
  const nodeEnv = (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development';

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port: Number(process.env.PORT ?? 5000),
    // Development defaults exist so a fresh clone boots against docker-compose.dev.yml
    // without copying .env.example first. Production forbids implicit defaults.
    databaseUrl: process.env.DATABASE_URL ?? (nodeEnv === 'production' ? '' : DEV_DEFAULTS.DATABASE_URL),
    redisUrl: process.env.REDIS_URL ?? (nodeEnv === 'production' ? '' : DEV_DEFAULTS.REDIS_URL),
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
};
