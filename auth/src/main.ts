import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeederService } from './seed/seeder.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ENABLED_URLS?.split(",") || 'http://localhost:3000',
    credentials: true,
  });

  const seederService = app.get(SeederService);
  await seederService.seed();

  console.log(`Starting server on port ${process.env.PORT ?? 8888}`);
  await app.listen(process.env.PORT ?? 8888);
}
bootstrap();
