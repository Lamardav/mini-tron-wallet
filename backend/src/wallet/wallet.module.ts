import { Global, Module } from '@nestjs/common';
import { WalletEventsService } from './wallet-events.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Global()
@Module({
  controllers: [WalletController],
  providers: [WalletService, WalletEventsService],
  exports: [WalletEventsService],
})
export class WalletModule {}
