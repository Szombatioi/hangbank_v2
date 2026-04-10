import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  register(
    @Body()
    body: {
      email: string;
      password: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      profilePictureUrl?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @UseGuards(AuthGuard)
  @Get("me")
  getMe(@Req() req) {
    return req.user;
  }
}
