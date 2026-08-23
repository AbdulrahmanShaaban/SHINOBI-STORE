import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { media_folder } from '@prisma/client';
import { type StoragePort, type UploadedMedia } from './storage.port';

/** Deterministic fake dimensions — enough for layout math, never real pixels. */
const MOCK_WIDTH = 1200;
const MOCK_HEIGHT = 800;

/**
 * Development/test adapter (no CLOUDINARY_* env): writes nothing external and
 * returns a stable placeholder path the frontend can render. NEVER selected
 * when Cloudinary credentials are configured.
 */
@Injectable()
export class LocalMockAdapter implements StoragePort {
  readonly name = 'local-mock';

  async upload(
    buffer: Buffer,
    filename: string,
    mime: string,
    folder: media_folder,
  ): Promise<UploadedMedia> {
    const hash = createHash('sha256')
      .update(buffer)
      .update(filename)
      .update(mime)
      .digest('hex')
      .slice(0, 32);

    return {
      publicId: `${folder}/${hash}`,
      url: `/media/${folder}/${hash}.svg`,
      width: MOCK_WIDTH,
      height: MOCK_HEIGHT,
      format: 'svg',
      bytes: buffer.length,
    };
  }

  async destroy(_publicId: string): Promise<void> {
    // Nothing external to remove — DB row deletion is the whole story.
  }
}
