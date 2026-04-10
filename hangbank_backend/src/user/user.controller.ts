import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';

@Controller('user')
export class UserController {
  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return req.user;
  }
}
