// Local demo entrypoint; production main.ts never imports this file.
const { demoUrl } = require('./seed-demo.cjs');
process.env.DATABASE_URL = demoUrl();
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = '';
process.env.RESEND_FROM_EMAIL = '';
process.env.GOOGLE_CLIENT_ID = 'demo-disabled';
process.env.GOOGLE_CLIENT_SECRET = 'demo-disabled';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3200/auth/google/callback';
const { NestFactory } = require('@nestjs/core'),
  { ValidationPipe } = require('@nestjs/common');
const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
const { AppModule } = require('../dist/src/app.module.js');
let app;
(async () => {
  app = await NestFactory.create(AppModule, { logger: false, rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: 'http://localhost:3201', credentials: true });
  const config = new DocumentBuilder()
    .setTitle('Lumi · demo local')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
  await app.listen(3200, '127.0.0.1');
})().catch(() => {
  console.error('Local demo API failed');
  process.exitCode = 1;
});
async function stop() {
  if (app) await app.close();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
