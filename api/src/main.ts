import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; 
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Configuramos CORS para que el frontend pueda pegarle a la API
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // Activamos la validación estricta global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Filtra propiedades que no estén en el DTO
    forbidNonWhitelisted: true, // Tira error si mandan basura
    transform: true, // Transforma automáticamente payloads a instancias de DTOs y castea primitivos
  }));

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
});