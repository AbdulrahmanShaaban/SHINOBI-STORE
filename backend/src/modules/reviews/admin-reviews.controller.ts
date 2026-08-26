import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
import { ReviewsService } from './reviews.service';
import { ModerateReviewDto } from './dto/review.dto';

/**
 * Review moderation (`reviews:w` — admin / content_manager). Pending reviews
 * never appear publicly; approval is what publishes them and recomputes the
 * product's live rating aggregate.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @RequirePermissions('reviews:w')
  @ApiOperation({ summary: 'List reviews with optional status filter (moderation queue)' })
  list(@Query('status') status: 'pending' | 'approved' | 'rejected' | undefined, @Query('page') page?: string) {
    const parsed = Number.parseInt(page ?? '1', 10);
    return this.reviews.listAdmin(status, Number.isInteger(parsed) && parsed >= 1 ? parsed : 1);
  }

  @Post(':id/moderate')
  @RequirePermissions('reviews:w')
  @ApiOperation({ summary: 'Approve or reject a review (recomputes product rating aggregate)' })
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ModerateReviewDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.reviews.moderate(id, body.status, actor.id, req.ip);
  }

  @Delete(':id')
  @RequirePermissions('reviews:w')
  @ApiOperation({ summary: 'Delete a review permanently (recomputes product rating aggregate)' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.reviews.deleteReview(id, actor.id, req.ip);
  }
}
