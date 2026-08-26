import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
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

  @IsOptional()
  @IsString()
  @MaxLength(10)
  price?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  compareAtPrice?: string;
}

/** One image in the replacement set for PUT /admin/products/:id/images. */
export class ProductImageEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsUUID()
  mediaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class SetProductImagesDto {
  /** Full ordered replacement set — the previous set is deleted. */
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ProductImageEntryDto)
  images!: ProductImageEntryDto[];
}

class TaxonomyBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
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

  @Get('products')
  @RequirePermissions('products:r')
  @ApiOperation({ summary: 'List products with search/status filter (admin)' })
  listProducts(
    @Query('q') q: string | undefined,
    @Query('status') status: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminCatalogService.listProducts({
      q: q?.trim() || undefined,
      status: status?.trim() || undefined,
      page: Math.min(Math.max(page, 1), 500),
      limit: Math.min(Math.max(limit, 1), 50),
    });
  }
  @RequirePermissions('products:w')
  @Post('products')
  @ApiOperation({ summary: 'Create product (admin)' })
  createProduct(@Body() body: ProductBodyDto) {
    const slug = (body.name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.adminCatalogService.createProduct({
      slug,
      name: body.name ?? '',
      description: body.description ?? '',
      categoryId: body.categoryId || undefined,
      animeId: body.animeId || null,
      characterId: body.characterId || null,
      status: body.status ?? 'draft',
      featured: body.featured,
      price: body.price,
      compareAtPrice: body.compareAtPrice,
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

  @RequirePermissions('products:w')
  @Put('products/:id/images')
  @ApiOperation({ summary: 'Replace the ordered image set of a product (admin)' })
  setProductImages(
    @Param('id') id: string,
    @Body() body: SetProductImagesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminCatalogService.setProductImages(id, body.images, actor.id, req.ip);
  }

  @RequirePermissions('products:w')
  @Post('animes')
  @ApiOperation({ summary: 'Create anime taxonomy (admin)' })
  createAnime(@Body() body: TaxonomyBodyDto) {
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.adminCatalogService.createAnime({ slug, name: body.name });
  }

  @RequirePermissions('products:w')
  @Post('characters')
  @ApiOperation({ summary: 'Create character taxonomy (admin)' })
  createCharacter(@Body() body: TaxonomyBodyDto) {
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.adminCatalogService.createCharacter({ slug, name: body.name });
  }
}
