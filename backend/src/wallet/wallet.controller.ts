import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
  history(@Req() request: AuthenticatedRequest, @Query('cursor') cursor?: string) {
    return this.wallet.history(request.user.id, cursor);
  }

  @Get('transactions/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tron-wallet-statement.csv"')
  export(@Req() request: AuthenticatedRequest) {
    return this.wallet.exportCsv(request.user.id);
  }

  @Get('updates')
  updates(@Req() request: AuthenticatedRequest, @Query('since') since?: string) {
    return this.wallet.waitForUpdate(request.user.id, Number(since ?? 0) || 0);
  }

  @HttpCode(200)
  @Post('estimate')
  estimate(@Req() request: AuthenticatedRequest, @Body() dto: SendDto) {
    return this.wallet.estimate(request.user.id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('send')
  send(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SendDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.wallet.send(request.user.id, dto, idempotencyKey);
  }
}
