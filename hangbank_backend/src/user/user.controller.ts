import { Body, Controller, Get, Patch, Query, Req, UseGuards } from '@nestjs/common';
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
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(
      req.user.id,
      req.headers.authorization,
      body,
    );
  }
}
