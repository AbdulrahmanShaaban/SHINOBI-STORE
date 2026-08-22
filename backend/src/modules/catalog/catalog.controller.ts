import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';

@ApiTags('catalog')
@Controller('products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List active products (public)' })
  @ApiOkResponse({ description: 'Paginated active products' })
  list(@Query() query: ProductQueryDto) {
    return this.catalogService.list(query);
  }

  // Declared before :slug so "facets" is never captured as a slug param.
  @Get('facets')
  @ApiOperation({ summary: 'Taxonomy facet counts under the current filter set (public)' })
  @ApiOkResponse({ description: 'Counts per category/anime/character/tag; own dimension excluded per bucket' })
  facets(@Query() query: ProductQueryDto) {
    return this.catalogService.getFacets(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Product detail by slug (public; drafts are invisible)' })
  @ApiParam({ name: 'slug', example: 'naruto-rasengan-hoodie' })
  @ApiOkResponse({ description: 'Active product with variants, images and taxonomy' })
  @ApiNotFoundResponse({ description: 'Unknown or non-active slug' })
  detail(@Param('slug') slug: string) {
    return this.catalogService.getBySlug(slug);
  }
}
