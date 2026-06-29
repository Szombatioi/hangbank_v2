import { Module } from '@nestjs/common';
import { SupportTextService } from './support-text.service';
import { SupportTextController } from './support-text.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportText } from './entities/support-text.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportText])],
  controllers: [SupportTextController],
  providers: [SupportTextService],
})
export class SupportTextModule {}
