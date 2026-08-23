import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminCatalogService } from './admin-catalog.service';

class ProductBodyDto {
  @IsOptional()
  @MinLength(3)
  @MaxLength(120)
  @IsString()
  name?: string;

  @IsOptional()
  @MaxLength(5000)
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  animeId?: string | null;

  @IsOptional()
  @IsUUID()
  characterId?: string | null;

  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

/**
 * Admin catalog CRUD. Every route requires an admin session (Phase 5) —
 * until then AdminGuard rejects all traffic with SESSIONS_NOT_IMPLEMENTED.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@ApiUnauthorizedResponse({ description: 'Missing/invalid session or insufficient role' })
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @RequirePermissions('products:w')
  @Post('products')
  @ApiOperation({ summary: 'Create product (admin)' })
  createProduct(@Body() body: ProductBodyDto) {
    return this.adminCatalogService.createProduct({
      name: body.name ?? '',
      description: body.description ?? '',
      categoryId: body.categoryId ?? '',
      animeId: body.animeId,
      characterId: body.characterId,
      status: body.status,
      featured: body.featured,
    });
  }

  @RequirePermissions('products:w')
  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product (admin)' })
  updateProduct(@Param('id') id: string, @Body() body: ProductBodyDto) {
    return this.adminCatalogService.updateProduct(id, body);
  }

  @RequirePermissions('products:w')
  @Delete('products/:id')
  @ApiOperation({ summary: 'Archive product (admin)' })
  archiveProduct(@Param('id') id: string) {
    return this.adminCatalogService.archiveProduct(id);
  }

  @RequirePermissions('products:r')
  @Get('products/:id')
  @ApiOperation({ summary: 'Fetch product incl. drafts (admin)' })
  getProduct(@Param('id') id: string) {
    return this.adminCatalogService.getProduct(id);
  }
}
