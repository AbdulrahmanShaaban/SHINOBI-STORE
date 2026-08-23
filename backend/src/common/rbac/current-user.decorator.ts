import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './require-permissions.decorator';

function getUser(ctx: ExecutionContext): AuthenticatedUser | undefined {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
  return request.user;
}

/** The authenticated user attached by the global SessionGuard (throws if none via guard chain). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => getUser(ctx)!);

/** Just the authenticated user's id. */
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => getUser(ctx)!.id);

/** Optional variant for routes that serve both guests and users (@Public() + soft auth). */
export const CurrentUserOptional = createParamDecorator(
  (_, ctx: ExecutionContext): AuthenticatedUser | undefined => getUser(ctx),
);

export const UserIdOptional = createParamDecorator(
  (_, ctx: ExecutionContext): string | undefined => getUser(ctx)?.id,
);
