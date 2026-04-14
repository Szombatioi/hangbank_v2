import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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
  ) { }

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

  // @Post("test")
  // @UseInterceptors(FileInterceptor('file'))
  // async test(
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   return await this.corpusProcesserService.processCorpusFile(file);
  // }
}