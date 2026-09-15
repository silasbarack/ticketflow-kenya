import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { installBigIntJsonPolyfill } from './tax/infrastructure/serializers/bigint-json.polyfill';

installBigIntJsonPolyfill();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Behind a reverse proxy (Render), every request arrives from the proxy's
  // address unless Express is told to read X-Forwarded-For — and then per-IP
  // rate limits would throttle all users as one. Only set this where a proxy
  // really sits in front: otherwise clients could spoof the header.
  const trustProxy = configService.get<string>('TRUST_PROXY');
  if (trustProxy) {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? parseInt(trustProxy, 10) : trustProxy);
  }

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.setGlobalPrefix('api');

  const port = configService.get<string>('PORT') || 4000;
  await app.listen(port);
  console.log(`TicketFlow Kenya API running on http://localhost:${port}/api`);
}

bootstrap();
