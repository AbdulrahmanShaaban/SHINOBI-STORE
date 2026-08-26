import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { PublicReviewsController } from './public-reviews.controller';

@Module({
  controllers: [ReviewsController, AdminReviewsController, PublicReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
