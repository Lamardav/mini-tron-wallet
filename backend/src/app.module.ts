import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { CryptoModule } from './crypto/crypto.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { TronModule } from './tron/tron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CryptoModule,
    TronModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
