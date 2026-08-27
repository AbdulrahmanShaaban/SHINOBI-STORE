import { Controller, Get, Post, Body, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { UserId } from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';

/**
 * Public cross-product review endpoints. The community page uses this to
 * display a feed of the most recent approved reviews across all products.
 */
@ApiTags('reviews')
@Controller('reviews')
export class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
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

  @RequirePermissions('reviews:create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a general review without a specific product (authenticated; enters pending moderation)' })
  createGeneral(@UserId() userId: string, @Body() body: CreateReviewDto) {
    return this.reviews.createGeneral(userId, body);
  }
}
