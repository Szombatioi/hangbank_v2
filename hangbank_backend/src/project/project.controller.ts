import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectRoleType } from './entities/project-role.enum';
import { AuthGuard } from 'src/guards/auth.guard';
import type { IJwtPayload } from '@hangbank/shared';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

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
    @Body()
    body: {
      name?: string;
      description?: string;
      audioChecks?: string[];
      addMembers?: { userId: string; role: ProjectRoleType }[];
      removeMemberIds?: string[];
    },
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

  // Recorded audio files of a project, with the metadata the export UI needs.
  @UseGuards(AuthGuard)
  @Get(':id/audio-files')
  getExportableAudioFiles(
    @Req() req: { user: IJwtPayload },
    @Param('id') id: string,
  ) {
    return this.projectService.getExportableAudioFiles(req.user.id, id);
  }
}
