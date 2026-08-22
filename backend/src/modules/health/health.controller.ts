import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Liveness — process is up. No dependency checks. */
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Process alive' })
  live() {
    return { status: 'ok' as const, uptimeSec: Math.floor(process.uptime()) };
  }

  /** Readiness — all critical dependencies reachable. */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks PostgreSQL and Redis)' })
  @ApiResponse({ status: 200, description: 'All dependencies up' })
  @ApiResponse({ status: 503, description: 'One or more dependencies down' })
  async ready(@Res({ passthrough: true }) res: Response) {
    const report = await this.healthService.readiness();
    res.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
