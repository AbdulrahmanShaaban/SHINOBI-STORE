import {
  Body,
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
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminOrderQueryDto, OrderTransitionDto } from './dto/admin-orders.dto';
import { AdminOrdersService } from './admin-orders.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminOrdersController {
  constructor(private readonly adminOrders: AdminOrdersService) {}

  @Get('orders')
  @RequirePermissions('orders:r')
  @ApiOperation({ summary: 'Paginated order search (status filter, number/email query)' })
  list(@Query() query: AdminOrderQueryDto) {
    return this.adminOrders.list(query);
  }

  @Get('orders/:orderNumber')
  @RequirePermissions('orders:r')
  @ApiOperation({ summary: 'Full order detail incl. items, timeline events and payment states' })
  detail(@Param('orderNumber') orderNumber: string) {
    return this.adminOrders.detail(orderNumber);
  }

  @Post('orders/:orderNumber/transition')
  @RequirePermissions('orders:transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Whitelisted status transition (illegal moves → 409)' })
  transition(
    @Param('orderNumber') orderNumber: string,
    @Body() body: OrderTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminOrders.transition(actor.id, req.ip, orderNumber, body);
  }
}
