// Test harness only: never imported by the production bootstrap.
const { localDatabase } = require('./local-database.cjs');
localDatabase(process.env.DATABASE_URL, /^\/lumi_test_browser_[a-f0-9]+$/);
process.env.NODE_ENV = 'test';
process.env.RESEND_API_KEY = '';
process.env.RESEND_FROM_EMAIL = '';
process.env.GOOGLE_CLIENT_ID = 'synthetic-disabled';
process.env.GOOGLE_CLIENT_SECRET = 'synthetic-disabled';
process.env.GOOGLE_CALLBACK_URL = 'http://127.0.0.1:3103/auth/google/callback';
delete process.env.RAILWAY_ENVIRONMENT_ID;
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
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
  await app.listen(3103, '127.0.0.1');
})().catch(() => {
  console.error('Isolated test API failed');
  process.exitCode = 1;
});
async function stop() {
  if (app) await app.close();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
