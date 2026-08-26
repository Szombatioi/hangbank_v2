import {
  Body,
  Controller, Delete,
  Get, HttpCode,
  Param,
  ParseIntPipe,
  Patch,
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
import { UpdateCorpusDto } from './dto/update-corpus.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CorpusProcesserService } from './corpus-processer.service';
import { UserCorpusAccessGuard } from 'src/guards/user-corpus-access.guard';
import { CorpusOwnerGuard } from 'src/guards/corpus-owner.guard';

@Controller('corpus')
export class CorpusController {
  constructor(
    private readonly corpusService: CorpusService,
    private readonly corpusProcesserService: CorpusProcesserService,
  ) {}

  @UseGuards(AuthGuard) //This endpoint does not require UserCorpusAccess, it filters the corpora within the service
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

  @UseGuards(AuthGuard, CorpusOwnerGuard)
  @Patch(':id')
  update(
    @Req() req: Request & { user: IJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateCorpusDto,
  ) {
    return this.corpusService.update(id, req.user.id, dto);
  }

  @UseGuards(AuthGuard, CorpusOwnerGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.corpusService.remove(id);
  }

  @UseGuards(AuthGuard, UserCorpusAccessGuard)
  @Get(':id')
  findOne(
    @Req() req: Request & { user: IJwtPayload },
    @Param('id') id: string,
  ) {
    return this.corpusService.findOneForUser(id, req.user.id);
  }

  @UseGuards(AuthGuard, CorpusOwnerGuard)
  @Get(':id/accesses')
  getAccesses(
    @Req() req: Request & { user: IJwtPayload },
    @Param('id') id: string,
  ) {
    return this.corpusService.getAccesses(id, req.user.id);
  }

  @Get(':id/blocks')
  @UseGuards(AuthGuard, UserCorpusAccessGuard)
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
