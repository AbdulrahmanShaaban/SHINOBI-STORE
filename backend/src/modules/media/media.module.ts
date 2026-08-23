import { Global, Module } from '@nestjs/common';
import { CloudinaryAdapter } from './cloudinary.adapter';
import { LocalMockAdapter } from './local-mock.adapter';
import { AdminMediaController } from './admin-media.controller';
import { PublicMediaController } from './public-media.controller';
import { AdminMediaService } from './admin-media.service';
import { MEDIA_STORAGE, type StoragePort } from './storage.port';

/**
 * Storage selection at boot: real Cloudinary when all three credentials are
 * present, otherwise the local mock (dev/test). MediaService only knows the
 * MEDIA_STORAGE token — identical pattern to PaymentsModule.
 */
@Global()
@Module({
  controllers: [AdminMediaController, PublicMediaController],
  providers: [
    AdminMediaService,
    {
      provide: MEDIA_STORAGE,
      useFactory: (): StoragePort => {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (cloudName && apiKey && apiSecret) {
          return new CloudinaryAdapter({ cloudName, apiKey, apiSecret });
        }
        return new LocalMockAdapter();
      },
    },
  ],
  exports: [MEDIA_STORAGE],
})
export class MediaModule {}
