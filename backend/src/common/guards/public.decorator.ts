import { SetMetadata } from '@nestjs/common';

/** Marks a route as unauthenticated (skips SessionGuard). */
export const IS_PUBLIC_KEY = 'is_public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
