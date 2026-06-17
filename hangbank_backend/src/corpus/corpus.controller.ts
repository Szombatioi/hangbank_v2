import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from 'src/guards/auth.guard';
import type { IJwtPayload } from '@hangbank/shared';
import { CorpusService } from './corpus.service';
import { CreateCorpusDto } from './dto/create-corpus.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CorpusProcesserService } from './corpus-processer.service';

@Controller('corpus')
export class CorpusController {
  constructor(
    private readonly corpusService: CorpusService,
    private readonly corpusProcesserService: CorpusProcesserService,
  ) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Req() req: Request & { user: IJwtPayload }) {
    return this.corpusService.findAll(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Req() req: Request & { user: IJwtPayload },
    @Body() createCorpusDto: CreateCorpusDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.corpusService.create(req.user, createCorpusDto, file);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(
    @Req() req: Request & { user: IJwtPayload },
    @Param('id') id: string,
  ) {
    return this.corpusService.findOneForUser(id, req.user.id);
  }

  @Get(':id/blocks')
  @UseGuards(AuthGuard)
  async getCorpusBlocks(
    @Req() req: Request & { user: IJwtPayload },
    @Param('id') id: string,
    @Query('from', ParseIntPipe) from: number,
    @Query('to', ParseIntPipe) to: number,
  ) {
    return this.corpusService.getCorpusBlocks(id, req.user.id, from, to);
  }

  // @Post("test")
  // @UseInterceptors(FileInterceptor('file'))
  // async test(
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   return await this.corpusProcesserService.processCorpusFile(file);
  // }
}
