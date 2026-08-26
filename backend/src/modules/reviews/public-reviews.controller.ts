import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { ReviewsService } from './reviews.service';

/**
 * Public cross-product review endpoints. The community page uses this to
 * display a feed of the most recent approved reviews across all products.
 */
@ApiTags('reviews')
@Public()
@Controller('reviews')
export class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recent approved reviews across all products (public, paginated)' })
  listRecent(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Number.parseInt(page ?? '1', 10);
    const parsedLimit = Number.parseInt(limit ?? '20', 10);
    return this.reviews.listRecentReviews(
      Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
      Number.isInteger(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100 ? parsedLimit : 20,
    );
  }
}
