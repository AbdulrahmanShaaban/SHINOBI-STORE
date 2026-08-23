import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { AdminContentController } from './admin-content.controller';
import { PublicContentController } from './public-content.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [CacheModule],
  controllers: [AdminContentController, PublicContentController],
  providers: [AdminContentService],
})
export class ContentModule {}
