import { Global, Module } from '@nestjs/common';
import { TronService } from './tron.service';

@Global()
@Module({
  providers: [TronService],
  exports: [TronService],
})
export class TronModule {}
