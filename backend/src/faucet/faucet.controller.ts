import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt.guard';
import { ClaimDto } from './dto';
import { FaucetService } from './faucet.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard)
@Controller('faucet')
export class FaucetController {
  constructor(private readonly faucet: FaucetService) {}

  @Get()
  status() {
    return this.faucet.status();
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  @Post('claim')
  claim(@Req() request: AuthenticatedRequest, @Body() dto: ClaimDto) {
    return this.faucet.claim(request.user.id, dto);
  }
}
