import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
import { CurrentUser } from '../../common/rbac/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { QueueAdminService } from './queue-admin.service';

/**
 * §17 DLQ surface for staff. Read-only introspection plus a guarded requeue
 * (audited as 'queue.requeue'). Guard usage mirrors admin-catalog.controller:
 * AdminGate only — the global chain has already authenticated the session.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/queues')
export class QueueAdminController {
  constructor(
    private readonly queueAdmin: QueueAdminService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Queue overview with counts and dead-letter size' })
  list() {
    return this.queueAdmin.listQueues();
  }

  @Get(':name/failed')
  @ApiOperation({ summary: 'Paginated failed jobs for a queue (DLQ view)' })
  failed(@Param('name') name: string, @Query('page') page?: string) {
    return this.queueAdmin.listFailed(name, Number(page) || 1);
  }

  @Post(':name/failed/:jobId/requeue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Requeue a dead-lettered job (audited)' })
  async requeue(
    @Param('name') name: string,
    @Param('jobId') jobId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.queueAdmin.requeue(name, jobId);
    await this.audit.record(actor?.id ?? null, 'queue.requeue', 'queue', `${name}:${jobId}`, {
      name,
      jobId,
    }, req.ip);
    return result;
  }
}
