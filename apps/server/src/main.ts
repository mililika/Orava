import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';
import { AppConfig } from './config/app-config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.useLogger(app.get(Logger));
  const config = app.get(AppConfig);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '64kb' });
  app.useBodyParser('urlencoded', { limit: '64kb', extended: false });
  app.enableCors({ origin: config.get('WEB_ORIGIN'), credentials: true });
  app.enableShutdownHooks();

  await app.listen(config.get('PORT'), '0.0.0.0');
}

await bootstrap();
