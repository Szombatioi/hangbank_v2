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
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { IJwtPayload } from '@hangbank/shared';
import { AuthGuard } from 'src/guards/auth.guard';
import { ExistingAudioProjectService } from './existing-audio-project.service';
import { SaveExistingAudioProjectDto } from './dto/save-existing-audio-project.dto';
import { NewAudioDetailsDto } from './dto/save-new-audio.dto';
import { UpdateExistingAudioDto } from './dto/update-existing-audio.dto';
import { DeleteExistingAudioDto } from './dto/delete-existing-audio.dto';

const MAX_FILES_PER_REQUEST = 20;
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

@Controller('existing-audio-project')
export class ExistingAudioProjectController {
  constructor(
    private readonly existingAudioProjectService: ExistingAudioProjectService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('project/:id')
  loadProject(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.existingAudioProjectService.loadProject(req.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('project')
  create(
    @Req() req: { user: IJwtPayload },
    @Body() dto: SaveExistingAudioProjectDto,
  ) {
    return this.existingAudioProjectService.create(req.user, dto);
  }

  @UseGuards(AuthGuard)
  @Post('files')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  saveNew(
    @Req() req: { user: IJwtPayload },
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body('projectId') projectId: string,
    @Body('details') details?: string,
  ) {
    if (!projectId) throw new BadRequestException('projectId is required');
    const parsedDetails = parseDetails(details, files.length);

    return this.existingAudioProjectService.saveNew(req.user.id, {
      projectId,
      files: files.map((audioFile, i) => ({ audioFile, ...parsedDetails[i] })),
    });
  }

  @UseGuards(AuthGuard)
  @Patch('files')
  updateMany(
    @Req() req: { user: IJwtPayload },
    @Body() dto: UpdateExistingAudioDto,
  ) {
    return this.existingAudioProjectService.updateMany(req.user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('files')
  @HttpCode(204)
  deleteMany(
    @Req() req: { user: IJwtPayload },
    @Body() dto: DeleteExistingAudioDto,
  ) {
    return this.existingAudioProjectService.deleteMany(req.user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Post('transcribe')
  requireTranscription(
    @Req() req: { user: IJwtPayload },
    @Body() dto: RequireTranscriptionDto
  ) {
    return this.existingAudioProjectService.requireTranscription(req.user.id, dto);
  }
}

function parseDetails(
  raw: string | undefined,
  fileCount: number,
): NewAudioDetailsDto[] {
  if (!raw) return Array.from({ length: fileCount }, () => ({}));

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('details must be a JSON array');
  }
  if (!Array.isArray(parsed) || parsed.length !== fileCount) {
    throw new BadRequestException(
      'details must be a JSON array with one entry per file',
    );
  }
  return parsed as NewAudioDetailsDto[];
}
