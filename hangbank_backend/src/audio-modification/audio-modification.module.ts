import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudioModification } from './entities/audio-modification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AudioModification])],
  exports: [TypeOrmModule],
})
export class AudioModificationModule {}
