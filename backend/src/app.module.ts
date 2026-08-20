import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { CryptoModule } from './crypto/crypto.module';
import { HealthController } from './health.controller';
import { KafkaModule } from './kafka/kafka.module';
import { PrismaModule } from './prisma/prisma.module';
import { TronModule } from './tron/tron.module';
import { WalletModule } from './wallet/wallet.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CryptoModule,
    TronModule,
    KafkaModule,
    AuthModule,
    WalletModule,
    WorkersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
