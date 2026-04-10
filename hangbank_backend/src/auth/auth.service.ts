import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly authUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.authUrl =
      this.configService.get<string>('AUTH_SERVICE_URL') ?? 'http://localhost:8888';
  }

  async login(email: string, password: string) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.authUrl}/login`, { email, password }),
    );
    return data;
  }

  async register(body: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  }) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.authUrl}/register`, body),
    );
    return data;
  }
}
