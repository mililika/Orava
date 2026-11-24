import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
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
  // Every response is per user (or an error): never cached, by the browser or anything in between.
  app.set('etag', false);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // The biggest body is a chat: 20 messages × 2,000 characters, up to 4 bytes each in UTF-8.
  app.useBodyParser('json', { limit: '256kb' });
  app.enableCors({ origin: config.get('WEB_ORIGIN') });
  app.enableShutdownHooks();

  await app.listen(config.get('PORT'), '0.0.0.0');
}

await bootstrap();
