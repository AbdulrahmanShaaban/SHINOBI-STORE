import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from './require-permissions.decorator';

function getUser(ctx: ExecutionContext): AuthenticatedUser {
  const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
  return request.user;
}

/** The authenticated user attached by the global SessionGuard. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => getUser(ctx));

/** Just the authenticated user's id. */
export const UserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => getUser(ctx).id);
