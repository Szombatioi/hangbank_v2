import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorpusDomain } from './entities/corpus-domain.entity';
import { CorpusDomainService } from './corpus-domain.service';
import { CorpusDomainController } from './corpus-domain.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CorpusDomain])],
  controllers: [CorpusDomainController],
  providers: [CorpusDomainService],
  exports: [CorpusDomainService],
})
export class CorpusDomainModule {}
