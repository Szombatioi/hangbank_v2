import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CorpusDomainService } from './corpus-domain.service';
import { CreateCorpusDomainDto } from './dto/create-corpus-domain.dto';

@Controller('corpus-domain')
export class CorpusDomainController {
  constructor(private readonly corpusDomainService: CorpusDomainService) {}

  @Post()
  create(@Body() createCorpusDomainDto: CreateCorpusDomainDto) {
    return this.corpusDomainService.create(createCorpusDomainDto);
  }

  @Get()
  findAll() {
    return this.corpusDomainService.findAll();
  }

  @Get(':name')
  findOne(@Param('name') name: string) {
    return this.corpusDomainService.findOne(name);
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.corpusDomainService.remove(name);
  }
}
