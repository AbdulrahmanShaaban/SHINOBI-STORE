/** Shared media-module constants. */
export const MEDIA_PAGE_SIZE = 24;

/**
 * Hard memory ceiling for the multipart parser. The business cap (10MB) is
 * enforced in AdminMediaService as a 400; this ceiling only stops absurd
 * payloads from being buffered into memory at all (multer answers 413).
 */
export const MULTIPART_CEILING_BYTES = 25 * 1024 * 1024;
