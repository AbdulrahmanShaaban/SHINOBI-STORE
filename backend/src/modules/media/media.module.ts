import { Global, Module } from '@nestjs/common';
import { CloudinaryAdapter } from './cloudinary.adapter';
import { ImageKitAdapter } from './imagekit.adapter';
import { LocalFileAdapter } from './local-file.adapter';
import { AdminMediaController } from './admin-media.controller';
import { PublicMediaController } from './public-media.controller';
import { AdminMediaService } from './admin-media.service';
import { MEDIA_STORAGE, type StoragePort } from './storage.port';

/**
 * Storage selection at boot: ImageKit → Cloudinary → local file adapter.
 * Env-gated: whichever set of credentials is complete wins.
 */
@Global()
@Module({
  controllers: [AdminMediaController, PublicMediaController],
  providers: [
    AdminMediaService,
    {
      provide: MEDIA_STORAGE,
      useFactory: (): StoragePort => {
        const ikPublicKey = process.env.IMAGEKIT_PUBLIC_KEY;
        const ikPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        const ikUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
        if (ikPublicKey && ikPrivateKey && ikUrlEndpoint) {
          return new ImageKitAdapter({ publicKey: ikPublicKey, privateKey: ikPrivateKey, urlEndpoint: ikUrlEndpoint });
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (cloudName && apiKey && apiSecret) {
          return new CloudinaryAdapter({ cloudName, apiKey, apiSecret });
        }

        return new LocalFileAdapter();
      },
    },
  ],
  exports: [MEDIA_STORAGE],
})
export class MediaModule {}
