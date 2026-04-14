import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from 'src/guards/auth.guard';
import type { IJwtPayload } from '@hangbank/shared';
import { UserCorpusAccessService } from './user-corpus-access.service';

@UseGuards(AuthGuard)
@Controller('user-corpus-access')
export class UserCorpusAccessController {
  constructor(private readonly userCorpusAccessService: UserCorpusAccessService) {}

  @Post(':corpusId')
  grantAccess(
    @Req() req: Request & { user: IJwtPayload },
    @Param('corpusId') corpusId: string,
  ) {
    return this.userCorpusAccessService.grantAccess(req.user.id, corpusId);
  }

  @Get(':corpusId')
  hasAccess(
    @Req() req: Request & { user: IJwtPayload },
    @Param('corpusId') corpusId: string,
  ) {
    return this.userCorpusAccessService.hasAccess(req.user.id, corpusId);
  }

  @Delete(':corpusId')
  revokeAccess(
    @Req() req: Request & { user: IJwtPayload },
    @Param('corpusId') corpusId: string,
  ) {
    return this.userCorpusAccessService.revokeAccess(req.user.id, corpusId);
  }
}
