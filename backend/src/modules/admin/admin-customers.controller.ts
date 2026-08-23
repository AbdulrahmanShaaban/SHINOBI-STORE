import {
  Body,
  Controller,
  ForbiddenException,
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
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminCustomerQueryDto, BanCustomerDto } from './dto/admin-customers.dto';
import { AdminCustomersService } from './admin-customers.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminCustomersController {
  constructor(private readonly adminCustomers: AdminCustomersService) {}

  @Get('customers')
  @RequirePermissions('customers:r')
  @ApiOperation({ summary: 'Paginated customer directory (email/name search)' })
  list(@Query() query: AdminCustomerQueryDto) {
    return this.adminCustomers.list(query);
  }

  @Get('customers/:id')
  @RequirePermissions('customers:r')
  @ApiOperation({ summary: 'Customer detail with their last 10 orders' })
  detail(@Param('id') id: string) {
    return this.adminCustomers.detail(id);
  }

  /**
   * Banning is a staff-trust decision: the permission matrix alone cannot
   * express "admins above order_manager", so an explicit role check applies
   * here (order_manager holds customers:r but must not ban).
   */
  @Post('customers/:id/ban')
  @RequirePermissions('customers:r')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a customer and revoke all their sessions (admin only)' })
  ban(
    @Param('id') id: string,
    @Body() body: BanCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    if (actor.role !== 'admin' && actor.role !== 'super_admin') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    return this.adminCustomers.ban(actor.id, req.ip, id, body);
  }
}
