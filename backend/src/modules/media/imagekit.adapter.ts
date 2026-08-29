import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import ImageKit from '@imagekit/nodejs';
import type { media_folder } from '@prisma/client';
import { type StoragePort, type UploadedMedia } from './storage.port';

const UPLOAD_TIMEOUT_MS = 15_000;

export interface ImageKitCredentials {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

/**
 * ImageKit storage adapter — mirrors the Cloudinary adapter contract.
 * Server-side uploads use the private API key; the client never sees it.
 * fileId is stored as publicId for delete operations (files.delete requires fileId,
 * filePath causes a 500 error from ImageKit).
 */
@Injectable()
export class ImageKitAdapter implements StoragePort {
  readonly name = 'imagekit';
  private readonly logger = new Logger(ImageKitAdapter.name);
  private readonly client: ImageKit;

  constructor(credentials: ImageKitCredentials) {
    this.client = new ImageKit({
      privateKey: credentials.privateKey,
    });
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mime: string,
    folder: media_folder,
  ): Promise<UploadedMedia> {
    try {
      const file = await ImageKit.toFile(buffer, filename, { type: mime });
      const result = await this.withTimeout(
        this.client.files.upload({
          file,
          fileName: filename,
          folder: `shinobi/${folder}`,
          useUniqueFileName: true,
        }),
        'upload',
      );

      return {
        publicId: result.fileId ?? result.filePath ?? filename,
        url: result.url ?? '',
        width: result.width ?? 0,
        height: result.height ?? 0,
        format: this.mimeToFormat(mime),
        bytes: result.size ?? buffer.length,
      };
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, 'imagekit upload failed');
      throw new BadGatewayException({
        code: 'STORAGE_UPSTREAM_ERROR',
        message: 'Image storage provider rejected the upload — check credentials or try again later',
      });
    }
  }

  async destroy(publicId: string): Promise<void> {
    try {
      // publicId stores the fileId from upload; ImageKit delete requires fileId
      await this.withTimeout(
        this.client.files.delete(publicId),
        'destroy',
      );
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, `imagekit destroy failed for ${publicId}`);
      throw err;
    }
  }

  private mimeToFormat(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/avif': 'avif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'application/pdf': 'pdf',
    };
    return map[mime] ?? mime.split('/')[1] ?? 'bin';
  }

  private async withTimeout<T>(p: Promise<T>, what: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`imagekit ${what} timed out after ${UPLOAD_TIMEOUT_MS}ms`)),
        UPLOAD_TIMEOUT_MS,
      );
    });
    try {
      return await Promise.race([p, timeout]);
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, `imagekit ${what} failed`);
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
