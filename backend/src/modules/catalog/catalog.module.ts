import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TaxonomiesController } from './taxonomies.controller';
import { TaxonomiesService } from './taxonomies.service';

@Module({
  controllers: [CatalogController, TaxonomiesController, AdminCatalogController],
  providers: [CatalogService, TaxonomiesService, AdminCatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
