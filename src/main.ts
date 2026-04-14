import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // HTTP security headers
  app.use(helmet());

  // CORS — Angular dev server
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.replace(/\/$/, '') === corsOrigin.replace(/\/$/, '')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefixo global da API
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 CasalPerfeito API rodando em http://localhost:${port}/api`);
}
bootstrap();

