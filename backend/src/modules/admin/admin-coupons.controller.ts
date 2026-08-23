import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CreateCouponDto, ListCouponsQueryDto, UpdateCouponDto } from './dto/admin-coupons.dto';
import { AdminCouponsService } from './admin-coupons.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminCouponsController {
  constructor(private readonly adminCoupons: AdminCouponsService) {}

  @Get('coupons')
  @RequirePermissions('coupons:w')
  @ApiOperation({ summary: 'Paginated coupon list (newest first)' })
  list(@Query() query: ListCouponsQueryDto) {
    return this.adminCoupons.list(query);
  }

  @Post('coupons')
  @RequirePermissions('coupons:w')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a coupon (unique citext code → 409 when taken)' })
  create(
    @Body() body: CreateCouponDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminCoupons.create(actor.id, req.ip, body);
  }

  @Patch('coupons/:id')
  @RequirePermissions('coupons:w')
  @ApiOperation({ summary: 'Toggle activity / change expiry or usage limit' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateCouponDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminCoupons.update(actor.id, req.ip, id, body);
  }
}
