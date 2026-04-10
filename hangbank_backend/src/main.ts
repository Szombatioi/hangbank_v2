import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ENABLED_URLS?.split(',') || 'http://localhost:3000',
    credentials: true,
  });

  console.log("Allowed CORS origins:", process.env.ENABLED_URLS || 'http://localhost:3000');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
