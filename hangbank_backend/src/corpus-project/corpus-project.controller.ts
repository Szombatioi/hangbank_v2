import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Blob } from 'buffer';
import type { IJwtPayload } from '@hangbank/shared';
import { AuthGuard } from 'src/guards/auth.guard';
import { CorpusProjectService } from './corpus-project.service';
import { CreateCorpusProjectDto } from './dto/create-corpus-project.dto';

interface RecordingData {
  blockId: string;
  blockIndex: number;
  durationSeconds: number;
  transcription?: string;
}

@Controller('corpus-project')
export class CorpusProjectController {
  constructor(private readonly corpusProjectService: CorpusProjectService) {}

  @UseGuards(AuthGuard)
  @Post('project')
  create(
    @Req() req: { user: IJwtPayload },
    @Body() dto: CreateCorpusProjectDto,
  ) {
    return this.corpusProjectService.create(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Get('project/:id/detail')
  findCorpusDetail(@Param('id') id: string) {
    return this.corpusProjectService.findCorpusDetail(id);
  }

  @UseGuards(AuthGuard)
  @Get('project/:id/blocks')
  getBlocks(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.corpusProjectService.getBlocks(
      id,
      from ? +from : 0,
      to ? +to : 50,
    );
  }

  @UseGuards(AuthGuard)
  @Get('project/:id/master-recording-prompt')
  getMasterRecordingPrompt(@Param('id') id: string) {
    return this.corpusProjectService.getMasterRecordingPrompt(id);
  }

  @UseGuards(AuthGuard)
  @Post('project/:id/master-recording')
  @UseInterceptors(FileInterceptor('audio'))
  uploadMasterRecording(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('durationSeconds') durationSecondsRaw: string,
  ) {
    if (!file) {
      throw new BadRequestException('audio file is required');
    }
    const durationSeconds = Number(durationSecondsRaw);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new BadRequestException(
        'durationSeconds must be a positive number',
      );
    }
    return this.corpusProjectService.saveMasterRecording(
      id,
      file,
      durationSeconds,
    );
  }

  /**
   * Batch-upload block recordings. The client sends each WAV under the `audio`
   * field and a JSON `data` array whose entries match the files by index.
   */
  @UseGuards(AuthGuard)
  @Post('project/:id/recordings')
  @UseInterceptors(FilesInterceptor('audio'))
  uploadBlockRecordings(
    @Req() req: { user: IJwtPayload },
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('data') dataRaw: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one audio file is required');
    }

    let data: RecordingData[];
    try {
      data = JSON.parse(dataRaw) as RecordingData[];
    } catch {
      throw new BadRequestException('data must be a valid JSON array');
    }
    if (!Array.isArray(data) || data.length !== files.length) {
      throw new BadRequestException(
        `data length (${data?.length ?? 0}) must match file count (${files.length})`,
      );
    }

    const recordings = files.map((file, i) => {
      if (!data[i]?.blockId) {
        throw new BadRequestException(`Some files are missing required fields`);
      }

      const blob = new Blob([file.buffer], {
        type: file.mimetype || 'audio/wav',
      });

      return {
        blob: blob as unknown as globalThis.Blob,
        blockId: data[i].blockId,
        blockIndex: data[i].blockIndex,
        durationSeconds: data[i].durationSeconds,
        transcription: data[i].transcription ?? '',
      };
    });

    return this.corpusProjectService.saveBlockRecordings(
      req.user.id,
      id,
      recordings,
    );
  }
}
