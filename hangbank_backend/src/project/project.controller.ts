import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
  @Get(':id/blocks')
  getBlocks(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.projectService.getBlocks(id, from ? +from : 0, to ? +to : 50);
  }
}
