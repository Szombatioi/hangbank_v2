import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { IJwtPayload } from '@hangbank/shared';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserSettingsService } from './user-settings.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Controller('user-settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  findMine(@Req() req: { user: IJwtPayload }) {
    return this.userSettingsService.find(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  updateMine(
    @Req() req: { user: IJwtPayload },
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.userSettingsService.update(req.user.id, dto);
  }
}
