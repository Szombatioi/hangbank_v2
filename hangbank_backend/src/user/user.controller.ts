import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../auth/auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('user')
export class UserController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Get('search')
  search(@Query('q') q: string) {
    return this.authService.searchUsers(q ?? '');
  }

  @UseGuards(AuthGuard)
  @Get(':id/speaker-profile')
  async getSpeakerProfile(@Param('id') id: string) {
    const p = await this.authService.getProfile(id);
    return {
      id: p.id,
      email: p.email,
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender ?? null,
      birthDate: p.birthDate ?? null,
    };
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(
      req.user.id,
      req.headers.authorization,
      body,
    );
  }
}
