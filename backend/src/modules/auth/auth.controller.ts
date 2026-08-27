import { Body, Controller, Get, HttpCode, HttpStatus, HttpException, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, ResendVerificationDto } from './dto/auth.dto';
import { Public } from '../../common/guards/public.decorator';
import { SESSION_COOKIE } from '../../common/guards/session.guard';

// §16: 5/min per IP for credential endpoints (tunable per environment).
const AUTH_THROTTLE = {
  default: { limit: Number(process.env.THROTTLE_AUTH_LIMIT ?? 5), ttl: 60_000 },
};

function cookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  @Public()
  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create an account (uniform response regardless of account existence)' })
  async register(@Body() body: RegisterDto) {
    await this.auth.register(body);
    return { ok: true };
  }

  @Public()
  @Post('login')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login; sets the shinobi_session httpOnly cookie' })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Per-identifier throttle (per-IP is enforced by the route decorator above).
    const allowed = await this.auth.checkIdentifierThrottle(body.email);
    if (!allowed) {
      res.header('Retry-After', '60');
      throw new HttpException(
        { code: 'TOO_MANY_ATTEMPTS', message: 'Too many attempts. Try again shortly.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const { token, expiresAt, user } = await this.auth.login(body, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current session and clear the cookie' })
  async logout(@Req() req: Request & { sessionId?: string }, @Res({ passthrough: true }) res: Response) {
    if (req.sessionId) await this.sessions.revokeById(req.sessionId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke every session for the current user' })
  async logoutAll(@Req() req: Request & { user?: { id?: string } }) {
    if (req.user?.id) await this.sessions.revokeAllForUser(req.user.id);
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@Req() req: Request & { user?: unknown }) {
    return { user: req.user };
  }

  @Public()
  @Post('forgot-password')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset (uniform response)' })
  forgot(@Body() body: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(body.email);
  }

  @Public()
  @Post('reset-password')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume a reset token and set a new password (revokes all sessions)' })
  async reset(@Body() body: ResetPasswordDto) {
    await this.auth.resetPassword(body.token, body.password);
    return { ok: true };
  }

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address via token' })
  async verifyEmail(@Query('token') token: string) {
    await this.auth.verifyEmail(token);
    return { ok: true };
  }

  @Public()
  @Post('resend-verification')
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() body: ResendVerificationDto) {
    await this.auth.resendVerification(body.email);
    return { ok: true };
  }
}
