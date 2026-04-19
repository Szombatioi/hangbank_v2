import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CorpusProcesserService } from './corpus/corpus-processer.service';
import * as fs from 'fs';
import { SeederService } from './seeder/seeder.service';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ENABLED_URLS?.split(',') || 'http://localhost:3000',
    credentials: true,
  });

  console.log("Allowed CORS origins:", process.env.ENABLED_URLS || 'http://localhost:3000');

  //Start seeding service
  const seederService = app.get(SeederService);
  await seederService.seedLanguages();

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
