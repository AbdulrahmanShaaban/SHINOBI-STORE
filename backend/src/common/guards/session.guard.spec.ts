import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { extractToken, SESSION_COOKIE, SessionGuard } from './session.guard';
import type { SessionsService } from '../../modules/auth/sessions.service';

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

const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;

function guardWith(session: ReturnType<typeof sessionsStub>) {
  return new SessionGuard(session as unknown as SessionsService, reflector);
}

function sessionsStub(overrides: Partial<{ validate: SessionsService['validate'] }> = {}) {
  const base: Partial<SessionsService> = {
    validate: jest.fn().mockResolvedValue({
      sessionId: 's1',
      renewed: false,
      expiresAt: new Date(Date.now() + 86_400_000),
      user: { id: 'u1', email: 'n@k.jp', fullName: 'N', role: 'customer' },
    }),
  };
  return { ...base, ...overrides };
}

function exec(headers: Record<string, string>, method = 'GET'): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers, method }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('SessionGuard (real, Phase 5)', () => {
  it('authenticates a valid session and attaches user + sessionId', async () => {
    const guard = guardWith(sessionsStub());
    const ctx = exec({ cookie: `${SESSION_COOKIE}=valid-token-value-000000000` });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const req = ctx.switchToHttp().getRequest() as { user?: unknown; sessionId?: string };
    expect(req.user?.id).toBe('u1');
    expect(req.sessionId).toBe('s1');
  });

  it('rejects missing tokens with the stable error code', async () => {
    const guard = guardWith(sessionsStub());
    await expect(guard.canActivate(exec({}))).rejects.toMatchObject({
      response: { code: 'UNAUTHENTICATED' },
    });
  });

  it('rejects invalid/expired/revoked sessions identically', async () => {
    const guard = guardWith(
      sessionsStub({ validate: jest.fn().mockResolvedValue(null) }),
    );
    await expect(
      guard.canActivate(exec({ cookie: `${SESSION_COOKIE}=dead-token-value-0000000000` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('enforces the CSRF custom header for cookie-authed mutations', async () => {
    const guard = guardWith(sessionsStub());

    await expect(
      guard.canActivate(exec({ cookie: `${SESSION_COOKIE}=t-0000000000000000000` }, 'POST')),
    ).rejects.toMatchObject({ response: { code: 'CSRF_TOKEN_MISSING' } });

    await expect(
      guard.canActivate(
        exec({ cookie: `${SESSION_COOKIE}=t-0000000000000000000`, 'x-csrf-token': '1' }, 'POST'),
      ),
    ).resolves.toBe(true);
  });

  it('does not require the CSRF header for bearer-authed clients', async () => {
    const guard = guardWith(sessionsStub());
    await expect(
      guard.canActivate(exec({ authorization: 'Bearer t-000000000000000000000' }, 'DELETE')),
    ).resolves.toBe(true);
  });
});
