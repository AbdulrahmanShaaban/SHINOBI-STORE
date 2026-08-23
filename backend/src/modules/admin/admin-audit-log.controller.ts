import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditLogQueryDto } from './dto/admin-audit-log.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminAuditLogController {
  constructor(private readonly audit: AuditService) {}

  @Get('audit-log')
  @RequirePermissions('admins:r')
  @ApiOperation({ summary: 'Append-only staff action trail (newest first, optional action filter)' })
  list(@Query() query: AuditLogQueryDto) {
    return this.audit.list(query);
  }
}
