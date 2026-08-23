import type { media_folder } from '@prisma/client';

/** Stored-asset facts every adapter must return from upload(). */
export interface UploadedMedia {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * §Phase 8 — storage boundary. MediaService depends on this port only; adding
 * a provider means a new adapter + an env-gated branch in MediaModule.
 */
export interface StoragePort {
  readonly name: string;
  upload(
    buffer: Buffer,
    filename: string,
    mime: string,
    folder: media_folder,
  ): Promise<UploadedMedia>;
  destroy(publicId: string): Promise<void>;
}

/** DI token for the active storage adapter (mirrors PAYMENT_PROVIDER). */
export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');
