import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const configService = app.get(ConfigService);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/v1/uploads/' });

  // Combined single-service deploy: serve the Vite-built frontend directly
  // from artifacts/kudi-frontend/dist. start-prod.sh does `cd artifacts/api-server`
  // so process.cwd() is that directory; ../kudi-frontend/dist resolves correctly
  // on both Render and local. In dev on Replit the dist folder doesn't exist
  // (not built), so existsSync returns false and this block is skipped there.
  const frontendDist = join(process.cwd(), '..', 'kudi-frontend', 'dist');
  if (existsSync(frontendDist)) {
    app.useStaticAssets(frontendDist, { index: 'index.html' });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({ origin: configService.get('corsOrigin'), credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Archanda AG Escrow API')
    .setDescription('Transparent escrow transaction platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Archanda AG API listening on port ${port} — docs at /docs`);
}

bootstrap();
