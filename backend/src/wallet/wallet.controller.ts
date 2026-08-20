import { Body, Controller, Get, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, JwtAuthGuard } from '../auth/jwt.guard';
import { SendDto } from './dto';
import { WalletService } from './wallet.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  overview(@Req() request: AuthenticatedRequest) {
    return this.wallet.overview(request.user.id);
  }

  @Get('transactions')
  history(@Req() request: AuthenticatedRequest) {
    return this.wallet.history(request.user.id);
  }

  @HttpCode(200)
  @Post('estimate')
  estimate(@Req() request: AuthenticatedRequest, @Body() dto: SendDto) {
    return this.wallet.estimate(request.user.id, dto);
  }

  @Post('send')
  send(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SendDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.wallet.send(request.user.id, dto, idempotencyKey);
  }
}
