import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = allowedOrigins();

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  if (origins.length > 0) {
    app.enableCors({ origin: origins, credentials: false, maxAge: 600 });
  }

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
