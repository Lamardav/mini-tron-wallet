import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
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
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
