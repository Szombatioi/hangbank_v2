import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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

  // Edit a project's name and/or description (owner only).
  @UseGuards(AuthGuard)
  @Patch(':id')
  updateProject(
    @Req() req: { user: IJwtPayload },
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.projectService.updateProject(req.user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.projectService.remove(req.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Get('audio-file/:audioFileId')
  getAudioFile(
    @Req() req: { user: IJwtPayload },
    @Param('audioFileId') audioFileId: string,
  ) {
    return this.projectService.getAudioFile(req.user.id, audioFileId);
  }

  @UseGuards(AuthGuard)
  @Get('audio-file/:audioFileId/url')
  getAudioFileUrl(
    @Req() req: { user: IJwtPayload },
    @Param('audioFileId') audioFileId: string,
  ) {
    return this.projectService.getAudioFileUrl(req.user.id, audioFileId);
  }

  // Update an audio file's transcription only (no new audio).
  @UseGuards(AuthGuard)
  @Patch('audio-file/:audioFileId/transcription')
  updateAudioFileTranscription(
    @Req() req: { user: IJwtPayload },
    @Param('audioFileId') audioFileId: string,
    @Body('transcription') transcription: string,
  ) {
    return this.projectService.updateAudioFileTranscription(
      req.user.id,
      audioFileId,
      transcription ?? '',
    );
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

  // Recorded audio files of a project, with the metadata the export UI needs.
  @UseGuards(AuthGuard)
  @Get(':id/audio-files')
  getExportableAudioFiles(
    @Req() req: { user: IJwtPayload },
    @Param('id') id: string,
  ) {
    return this.projectService.getExportableAudioFiles(req.user.id, id);
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
    @Req() req: { user: IJwtPayload },
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

    return this.projectService.saveBlockRecordings(req.user.id, id, recordings);
  }
}
