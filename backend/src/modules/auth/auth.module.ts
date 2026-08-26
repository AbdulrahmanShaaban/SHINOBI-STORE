import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { EmailService } from '../notifications/email.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionsService, EmailService],
  exports: [SessionsService],
})
export class AuthModule {}
