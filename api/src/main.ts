import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitamos hooks de apagado limpio (SIGTERM / SIGINT) para cerrar el pool de PostgreSQL
  app.enableShutdownHooks();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const isProd = process.env.NODE_ENV === 'production';
  const frontendUrl = process.env.FRONTEND_URL;

  if (isProd && !frontendUrl) {
    throw new Error(
      'CRITICAL: La variable de entorno FRONTEND_URL es obligatoria en producción para configurar CORS de forma segura.',
    );
  }

  // Configuramos CORS para que el frontend pueda comunicarse con la API
  app.enableCors({
    origin: frontendUrl || 'http://localhost:3001',
    credentials: true,
  });

  // Activamos la validación estricta global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Filtra propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // Rechaza payloads con propiedades no declaradas
      transform: true, // Transforma automáticamente payloads a instancias de DTOs y castea primitivos
    }),
  );

  // Configuración de Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Lumi API')
    .setDescription('Documentación interactiva de la API de Lumi - Finanzas Personales')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Lumi API Documentation',
  });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err) => {
  console.error('Error arrancando el servidor:', err);
  process.exit(1);
});
