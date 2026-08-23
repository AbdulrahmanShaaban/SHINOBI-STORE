import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { media_folder, MediaEntry } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { sniffImageFormat } from './magic-bytes';
import { MEDIA_PAGE_SIZE } from './media.constants';
import { MEDIA_STORAGE, type StoragePort } from './storage.port';

/** Mirrors the DB enum media_folder — the ONLY folders the server will use. */
export const MEDIA_FOLDERS: readonly media_folder[] = [
  'products',
  'characters',
  'hero',
  'banners',
  'collections',
  'general',
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * §Phase 8 media library writes/reads. Security invariants:
 *  - the server decides the folder taxonomy; client-supplied paths are ignored,
 *  - declared mimetype is advisory — magic bytes over the payload decide,
 *  - deletion is refused while any table still references the asset.
 */
@Injectable()
export class AdminMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    // Symbol token → explicit @Inject (interface types vanish at runtime).
    @Inject(MEDIA_STORAGE) private readonly storage: StoragePort,
  ) {}

  async upload(
    actorId: string | null,
    file: UploadedFilePayload | undefined,
    folder: media_folder | undefined,
    ip?: string,
  ): Promise<MediaEntry> {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: "Multipart field 'file' is required",
      });
    }
    if (!folder || !MEDIA_FOLDERS.includes(folder)) {
      throw new BadRequestException({
        code: 'FOLDER_INVALID',
        message: `folder must be one of: ${MEDIA_FOLDERS.join(', ')}`,
      });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `File exceeds the ${MAX_UPLOAD_BYTES} byte limit`,
      });
    }
    // Sniff BEFORE anything touches storage: a renamed .exe is not an image.
    const format = sniffImageFormat(file.buffer.subarray(0, 12));
    if (!format) {
      throw new BadRequestException({
        code: 'UNSUPPORTED_FORMAT',
        message: 'Only png, jpeg, gif and webp images are allowed',
      });
    }

    const stored = await this.storage.upload(
      file.buffer,
      file.originalname,
      format.mime,
      folder,
    );

    const entry = await this.prisma.mediaEntry.create({
      data: {
        provider: this.storage.name,
        publicId: stored.publicId,
        url: stored.url,
        width: stored.width,
        height: stored.height,
        format: stored.format,
        bytes: stored.bytes,
        folder,
        uploadedByAdminId: actorId ?? undefined,
      },
    });

    await this.audit.record(actorId, 'media.upload', 'media_entry', entry.id, {
      folder,
      publicId: stored.publicId,
      bytes: stored.bytes,
      format: stored.format,
    }, ip);

    return entry;
  }

  async list(folder: media_folder | undefined, page: number) {
    const current = Math.max(1, page);
    const where = folder && MEDIA_FOLDERS.includes(folder) ? { folder } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.mediaEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (current - 1) * MEDIA_PAGE_SIZE,
        take: MEDIA_PAGE_SIZE,
      }),
      this.prisma.mediaEntry.count({ where }),
    ]);
    return {
      items,
      meta: {
        page: current,
        limit: MEDIA_PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE)),
      },
    };
  }

  async getPublic(id: string): Promise<Pick<MediaEntry, 'url' | 'width' | 'height' | 'format'>> {
    const entry = await this.prisma.mediaEntry.findUnique({
      where: { id },
      select: { url: true, width: true, height: true, format: true },
    });
    if (!entry) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media not found' });
    }
    return entry;
  }

  async remove(actorId: string | null, id: string, ip?: string): Promise<{ id: string }> {
    const entry = await this.prisma.mediaEntry.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media not found' });
    }

    // Usage gate — every table referencing MediaEntry must appear here.
    const productImageRefs = await this.prisma.productImage.count({ where: { mediaId: id } });
    if (productImageRefs > 0) {
      throw new ConflictException({
        code: 'MEDIA_IN_USE',
        message: 'Media is referenced by existing content and cannot be deleted',
      });
    }

    await this.storage.destroy(entry.publicId);
    await this.prisma.mediaEntry.delete({ where: { id } });

    await this.audit.record(actorId, 'media.delete', 'media_entry', id, {
      publicId: entry.publicId,
      folder: entry.folder,
    }, ip);

    return { id };
  }
}
