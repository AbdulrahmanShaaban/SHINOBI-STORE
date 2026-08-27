import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import type { media_folder } from '@prisma/client';
import { type StoragePort, type UploadedMedia } from './storage.port';

const UPLOAD_TIMEOUT_MS = 15_000;

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * §Phase 8 Cloudinary adapter. All three credentials must come from env —
 * uploads are signed server-side with the API secret, never from the client.
 * No eager transformations: originals are stored, resizing is a delivery concern.
 */
@Injectable()
export class CloudinaryAdapter implements StoragePort {
  readonly name = 'cloudinary';
  private readonly logger = new Logger(CloudinaryAdapter.name);

  constructor(credentials: CloudinaryCredentials) {
    cloudinary.config({
      cloud_name: credentials.cloudName,
      api_key: credentials.apiKey,
      api_secret: credentials.apiSecret,
      secure: true,
    });
  }

  async upload(
    buffer: Buffer,
    _filename: string,
    _mime: string,
    folder: media_folder,
  ): Promise<UploadedMedia> {
    let result: UploadApiResponse;
    try {
      result = await this.withTimeout(
        new Promise<UploadApiResponse>((resolve, reject) => {
          // Server-side signature: api_secret is configured above, so the SDK
          // signs the upload — the client never participates in auth.
          // public_id is provider-generated (random) to avoid collisions.
          const stream = cloudinary.uploader.upload_stream(
            { folder: `shinobi/${folder}` },
            (error, res) => (error || !res ? reject(error ?? new Error('empty upload response')) : resolve(res)),
          );
          stream.end(buffer);
        }),
        'upload',
      );
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, 'cloudinary upload failed');
      throw new BadGatewayException({
        code: 'STORAGE_UPSTREAM_ERROR',
        message: 'Image storage provider rejected the upload — check credentials or try again later',
      });
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  }

  async destroy(publicId: string): Promise<void> {
    await this.withTimeout(
      cloudinary.uploader.destroy(publicId).then((res) => {
        if (res.result !== 'ok' && res.result !== 'not found') {
          throw new Error(`cloudinary destroy returned '${res.result}' for ${publicId}`);
        }
        return res;
      }),
      'destroy',
    );
  }

  private async withTimeout<T>(p: Promise<T>, what: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`cloudinary ${what} timed out after ${UPLOAD_TIMEOUT_MS}ms`)), UPLOAD_TIMEOUT_MS);
    });
    try {
      return await Promise.race([p, timeout]);
    } catch (err) {
      this.logger.error({ err: (err as Error).message }, `cloudinary ${what} failed`);
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
