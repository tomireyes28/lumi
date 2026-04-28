import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // <-- Importar

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuramos CORS para que el frontend pueda pegarle a la API
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  // Activamos la validación estricta global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Filtra propiedades que no estén en el DTO
    forbidNonWhitelisted: true, // Tira error si mandan basura
  }));

  await app.listen(process.env.PORT ?? 3000);
}



bootstrap().catch((err) => {
  console.error('Error arrancando el servidor:', err);
});