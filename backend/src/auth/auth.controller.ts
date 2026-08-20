import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, VerifyEmailDto } from './dto';
import { AuthenticatedUser, JwtAuthGuard } from './jwt.guard';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('auth/register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() request: { user: AuthenticatedUser }) {
    return this.auth.me(request.user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/verify')
  verify(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post('auth/resend-verification')
  resend(@Req() request: { user: AuthenticatedUser }) {
    return this.auth.resendVerification(request.user.id);
  }
}
