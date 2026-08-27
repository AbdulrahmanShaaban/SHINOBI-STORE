import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import {
  CurrentUserOptional,
  UserId,
} from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/review.dto';

/**
 * Product reviews. GET is public (approved-only for non-staff); POST is for
 * authenticated customers (`reviews:create`) and lands in the `pending` queue.
 */
@ApiTags('reviews')
@Controller('products')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get(':slug/reviews')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reviews for a product (approved-only for non-staff)' })
  list(@Param('slug') slug: string, @CurrentUserOptional() viewer?: AuthenticatedUser) {
    return this.reviews.listForProduct(slug, viewer ? { role: viewer.role } : undefined);
  }

  @RequirePermissions('reviews:create')
  @Post(':slug/reviews')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a product (authenticated customers; enters pending moderation)' })
  create(@Param('slug') slug: string, @UserId() userId: string, @Body() body: CreateReviewDto) {
    return this.reviews.create(slug, userId, body);
  }
}
