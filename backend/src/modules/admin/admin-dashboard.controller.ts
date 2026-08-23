import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('dashboard')
  @RequirePermissions('orders:r')
  @ApiOperation({ summary: 'CRM overview: revenue, order mix, low stock, recent orders' })
  overview() {
    return this.dashboard.overview();
  }
}
