import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { AdminContentService } from './admin-content.service';

/**
 * Public homepage composition (§Phase 8). No cookies are ever set on this
 * route (SessionGuard skips @Public) and a short shared-cache TTL keeps the
 * storefront render path cheap; admin edits take effect after expiry.
 */
@ApiTags('content')
@Public()
@Controller('content')
export class PublicContentController {
  constructor(private readonly adminContent: AdminContentService) {}

  @Get('homepage')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Visible homepage sections in render order (public)' })
  @ApiOkResponse({ description: '[{ key, isVisible, sortOrder, config }] ordered by sortOrder asc' })
  homepage() {
    return this.adminContent.listVisiblePublic();
  }
}
