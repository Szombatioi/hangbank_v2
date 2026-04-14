import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { SeederController } from './seeder.controller';
import { LanguageModule } from 'src/language/language.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from 'src/language/entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Language]),
  ],
  controllers: [SeederController],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
