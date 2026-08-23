import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/guards/public.decorator';
import { AdminMediaService } from './admin-media.service';

/**
 * Public media read for rendering (§Phase 8). Deliberately narrow shape —
 * internal bookkeeping (provider, publicId, uploader) never leaves the API.
 */
@ApiTags('content')
@Public()
@Controller('content/media')
export class PublicMediaController {
  constructor(private readonly adminMedia: AdminMediaService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Fetch renderable media facts by id (public)' })
  @ApiOkResponse({ description: 'url + intrinsic dimensions/format' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminMedia.getPublic(id);
  }
}
