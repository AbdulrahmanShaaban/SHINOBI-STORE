import { plainToInstance } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, Max, Matches, MaxLength, validateSync } from 'class-validator';

/**
 * Validated environment contract. Boot fails fast if any value is malformed.
 * Local development defaults are applied in configuration.ts; production must
 * set DATABASE_URL / REDIS_URL explicitly (see assertProductionRequirements).
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 5000;

  @IsString()
  @IsOptional()
  @Matches(/^postgresql:\/\//, { message: 'DATABASE_URL must be a postgresql:// connection string' })
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  @Matches(/^redis:\/\//, { message: 'REDIS_URL must be a redis:// connection string' })
  REDIS_URL?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  CORS_ORIGIN?: string;
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { whitelist: true });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join('; '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  if (validated.NODE_ENV === 'production' && (!config.DATABASE_URL || !config.REDIS_URL)) {
    throw new Error(
      'Invalid environment configuration:\n  - production requires explicit DATABASE_URL and REDIS_URL',
    );
  }

  return config;
}
