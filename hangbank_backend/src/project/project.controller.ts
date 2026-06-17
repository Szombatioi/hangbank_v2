import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { ProjectService } from './project.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateCorpusProjectDto } from './dto/create-corpus-project.dto';
import type { IJwtPayload } from '@hangbank/shared';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(
    @Req() req: { user: IJwtPayload },
    @Body() dto: CreateCorpusProjectDto,
  ) {
    return this.projectService.create(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Get()
  findAll(@Req() req: { user: IJwtPayload }) {
    return this.projectService.findAll(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.projectService.remove(req.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get(':id/detail')
  findCorpusDetail(@Param('id') id: string) {
    return this.projectService.findCorpusDetail(id);
  }

  @UseGuards(AuthGuard)
  @Get(':id/blocks')
  getBlocks(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.projectService.getBlocks(id, from ? +from : 0, to ? +to : 50);
  }

  @UseGuards(AuthGuard)
  @Get(':id/master-recording-prompt')
  getMasterRecordingPrompt(@Param('id') id: string) {
    return this.projectService.getMasterRecordingPrompt(id);
  }

  @UseGuards(AuthGuard)
  @Post(':id/master-recording')
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
    return this.projectService.saveMasterRecording(id, file, durationSeconds);
  }

  /**
   * Batch-upload block recordings. The client sends each WAV under the `audio`
   * field and a JSON `meta` array whose entries match the files by index.
   */
  @UseGuards(AuthGuard)
  @Post(':id/recordings')
  @UseInterceptors(FilesInterceptor('audio'))
  uploadBlockRecordings(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('meta') metaRaw: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one audio file is required');
    }

    interface RecordingMeta {
      blockId: string;
      blockIndex: number;
      durationSeconds: number;
      transcription?: string;
    }

    let meta: RecordingMeta[];
    try {
      meta = JSON.parse(metaRaw) as RecordingMeta[];
    } catch {
      throw new BadRequestException('meta must be a valid JSON array');
    }
    if (!Array.isArray(meta) || meta.length !== files.length) {
      throw new BadRequestException(
        `meta length (${meta?.length ?? 0}) must match file count (${files.length})`,
      );
    }

    const recordings = files.map((file, i) => {
      const m = meta[i];
      if (!m?.blockId || !Number.isFinite(m.durationSeconds)) {
        throw new BadRequestException(`meta[${i}] is missing required fields`);
      }
      const blob = new Blob([file.buffer], {
        type: file.mimetype || 'audio/wav',
      });
      return {
        blob: blob as unknown as globalThis.Blob,
        blockId: m.blockId,
        blockIndex: m.blockIndex,
        durationSeconds: m.durationSeconds,
        transcription: m.transcription ?? '',
      };
    });

    return this.projectService.saveBlockRecordings(id, recordings);
  }
}
