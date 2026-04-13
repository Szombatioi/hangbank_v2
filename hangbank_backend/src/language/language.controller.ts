import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { LanguageService } from './language.service';

@Controller('language')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  @Post()
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languageService.create(createLanguageDto);
  }

  @Get()
  findAll() {
    return this.languageService.findAll();
  }

  /** Returns only languages that have a complete UI translation. */
  @Get('translated')
  findAllTranslated() {
    return this.languageService.findAllTranslated();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.languageService.findOne(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateLanguageDto: UpdateLanguageDto) {
    return this.languageService.update(code, updateLanguageDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.languageService.remove(code);
  }
}
