import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { extractToken, SESSION_COOKIE, SessionGuard } from './session.guard';

function fakeRequest(headers: Record<string, string>): { switchToHttp: () => { getRequest: () => unknown } } {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  };
}

describe('extractToken', () => {
  it('reads a Bearer token', () => {
    expect(extractToken({ headers: { authorization: 'Bearer abc123' } } as never)).toBe('abc123');
  });

  it('reads the session cookie', () => {
    expect(
      extractToken({ headers: { cookie: `${SESSION_COOKIE}=tok%201; other=x` } } as never),
    ).toBe('tok 1');
  });

  it('returns undefined when no credential is present', () => {
    expect(extractToken({ headers: {} } as never)).toBeUndefined();
  });
});

describe('SessionGuard (Phase 0 skeleton)', () => {
  it('rejects every request until sessions are implemented in Phase 5', async () => {
    const guard = new SessionGuard();

    await expect(
      guard.canActivate(fakeRequest({ authorization: 'Bearer abc' }) as unknown as ExecutionContext),
    ).rejects.toThrow(UnauthorizedException);

    await expect(guard.canActivate(fakeRequest({}) as unknown as ExecutionContext)).rejects.toThrow(
      /not available yet/,
    );
  });
});
