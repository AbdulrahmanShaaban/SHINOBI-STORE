import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { media_folder } from '@prisma/client';
import { type StoragePort, type UploadedMedia } from './storage.port';

const PUBLIC_DIR = join(process.cwd(), '..', 'frontend', 'public');

const EXT_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * Real local file adapter for dev: writes uploaded buffers to public/media/
 * so they're served by Next.js static file serving. No external I/O.
 */
@Injectable()
export class LocalFileAdapter implements StoragePort {
  readonly name = 'local-file';
  private readonly logger = new Logger(LocalFileAdapter.name);

  async upload(
    buffer: Buffer,
    _filename: string,
    mime: string,
    folder: media_folder,
  ): Promise<UploadedMedia> {
    const ext = EXT_MAP[mime] ?? 'bin';
    const hash = createHash('sha256')
      .update(buffer)
      .update(String(Date.now()))
      .digest('hex')
      .slice(0, 24);

    const dir = join(PUBLIC_DIR, 'media', folder);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${hash}.${ext}`);
    await writeFile(filePath, buffer);

    const url = `/media/${folder}/${hash}.${ext}`;
    this.logger.log(`Saved ${url} (${buffer.length} bytes)`);

    return {
      publicId: `${folder}/${hash}.${ext}`,
      url,
      width: 0,
      height: 0,
      format: ext,
      bytes: buffer.length,
    };
  }

  async destroy(publicId: string): Promise<void> {
    try {
      await unlink(join(PUBLIC_DIR, 'media', publicId));
    } catch {
      this.logger.warn(`Could not delete ${publicId}`);
    }
  }
}
