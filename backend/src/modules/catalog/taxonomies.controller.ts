import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaxonomiesService } from './taxonomies.service';
import { Public } from '../../common/guards/public.decorator';

@ApiTags('taxonomies')
@Public()
@Controller('taxonomies')
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Active categories with active-product counts' })
  @ApiOkResponse({ description: 'Category list' })
  categories() {
    return this.taxonomiesService.listCategories();
  }

  @Get('animes')
  @ApiOperation({ summary: 'Animes with active-product counts' })
  @ApiOkResponse({ description: 'Anime list' })
  animes() {
    return this.taxonomiesService.listAnimes();
  }

  @Get('characters')
  @ApiOperation({ summary: 'Characters with their anime' })
  @ApiOkResponse({ description: 'Character list' })
  characters() {
    return this.taxonomiesService.listCharacters();
  }

  @Get('tags')
  @ApiOperation({ summary: 'All tags' })
  @ApiOkResponse({ description: 'Tag list' })
  tags() {
    return this.taxonomiesService.listTags();
  }
}
