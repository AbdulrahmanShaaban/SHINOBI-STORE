import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
import { AdminContentService } from './admin-content.service';
import { UpdateSectionDto } from './dto/update-section.dto';

/**
 * Admin homepage content (§Phase 8). Config payloads are validated against
 * section-schemas.ts before persistence; every mutation is audited.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly adminContent: AdminContentService) {}

  @Get('sections')
  @RequirePermissions('content:w')
  @ApiOperation({ summary: 'All homepage sections ordered by key' })
  list() {
    return this.adminContent.listAll();
  }

  @Patch('sections/:key')
  @RequirePermissions('content:w')
  @ApiOperation({ summary: 'Update visibility/order/config of one section' })
  update(
    @Param('key') key: string,
    @Body() body: UpdateSectionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminContent.update(actor.id, req.ip, key, body);
  }
}
