import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { AvailabilityDto } from './dto/availability.dto';
import { Public } from '../../common/guards/public.decorator';

@ApiTags('catalog')
@Public()
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

  @Post('availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch live availability for variants (cart revalidation)' })
  @ApiOkResponse({ description: 'Only purchasable variants of active products are returned' })
  availability(@Body() body: AvailabilityDto) {
    return this.catalogService.getAvailability(body);
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
