import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { media_folder } from '@prisma/client';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/rbac/current-user.decorator';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import type { AuthenticatedUser } from '../../common/rbac/require-permissions.decorator';
import { AdminMediaService, type UploadedFilePayload } from './admin-media.service';
import { MULTIPART_CEILING_BYTES } from './media.constants';
import { ListMediaQueryDto, MediaFolderDto } from './dto/media.dto';

/**
 * Admin media library (§Phase 8). Folder taxonomy is decided here on the
 * server: clients may pass `folder` as query or form field but only as one of
 * the fixed media_folder values — any client path is ignored.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly adminMedia: AdminMediaService) {}

  @Post()
  @RequirePermissions('media:w')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: MULTIPART_CEILING_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', enum: ['products', 'characters', 'hero', 'banners', 'collections', 'general'] },
        altText: { type: 'string', description: 'Optional image name/alt text. Auto-generated if omitted.' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload an image (magic-byte allowlist, 10MB cap)' })
  upload(
    @UploadedFile() file: UploadedFilePayload | undefined,
    @Query() query: MediaFolderDto,
    @Body() body: MediaFolderDto & { altText?: string },
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminMedia.upload(actor.id, file, query.folder ?? body.folder, body.altText, req.ip);
  }

  @Get()
  @RequirePermissions('media:w')
  @ApiOperation({ summary: 'Paginated media library, newest first' })
  list(@Query() query: ListMediaQueryDto) {
    return this.adminMedia.list(query.folder, query.page ?? 1);
  }

  @Delete(':id')
  @RequirePermissions('media:w')
  @ApiOperation({ summary: 'Delete unused media (409 while still referenced)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.adminMedia.remove(actor.id, id, req.ip);
  }
}
