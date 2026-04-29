import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateCorpusProjectDto } from './dto/create-corpus-project.dto';
import type { IJwtPayload } from '@hangbank/shared';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @UseGuards(AuthGuard)
  @Post()
  create(@Req() req: { user: IJwtPayload }, @Body() dto: CreateCorpusProjectDto) {
    return this.projectService.create(req.user, dto);
  }
}
