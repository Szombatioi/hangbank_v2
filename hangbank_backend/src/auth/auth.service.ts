import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

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

  async getProfile(userId: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.authUrl}/profile/${userId}`),
      );
      return data;
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        throw new NotFoundException(`User ${userId} not found`);
      }
      throw err;
    }
  }
}
