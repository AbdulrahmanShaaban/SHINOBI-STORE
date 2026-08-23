import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
import { CurrentUser } from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdjustInventoryDto } from './dto/admin-inventory.dto';
import { AdminInventoryService } from './admin-inventory.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminInventoryController {
  constructor(private readonly adminInventory: AdminInventoryService) {}

  @Post('inventory/adjustments')
  @RequirePermissions('inventory:adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Signed stock correction (clamped at zero), ledger + audit recorded' })
  adjust(
    @Body() body: AdjustInventoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminInventory.adjust(actor.id, req.ip, body);
  }
}
