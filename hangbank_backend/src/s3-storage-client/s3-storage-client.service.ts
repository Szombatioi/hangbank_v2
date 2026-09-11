import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import type { Readable } from 'stream';

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly baseUrl: string;

  public readonly audioBucket = 'audio';
  public readonly originalCorpusBucket = 'corpus-original';
  public readonly corpusBucket = 'corpus';

  constructor(
    private readonly httpService: HttpService,
    configService: ConfigService,
  ) {
    this.baseUrl =
      configService.get<string>('S3_STORAGE_SERVICE_URL') ??
      'http://localhost:3005';
  }

  async uploadObject(
    file: Express.Multer.File,
    bucket: string,
  ): Promise<{ filename: string; url: string }> {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype || 'application/octet-stream',
    });
    form.append('file', blob, file.originalname);

    try {
      const { data } = await this.httpService.axiosRef.post<{
        filename: string;
        url: string;
      }>(`${this.bucketBase(bucket)}/objects`, form, {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return data;
    } catch (err) {
      this.logger.error('Failed to upload file', err as Error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async downloadObject(objectName: string, bucket: string): Promise<Readable> {
    const name = path.basename(objectName);
    try {
      const resp = await this.httpService.axiosRef.get<Readable>(
        `${this.bucketBase(bucket)}/objects/${encodeURIComponent(name)}`,
        { responseType: 'stream' },
      );
      return resp.data;
    } catch (err) {
      this.logger.error('Failed to download file', err as Error);
      throw new InternalServerErrorException('Failed to download file');
    }
  }

  async getPresignedUrl(
    objectName: string,
    bucket: string,
    expirySeconds: number,
  ): Promise<string> {
    const name = path.basename(objectName);
    try {
      const { data } = await this.httpService.axiosRef.get<{ url: string }>(
        `${this.bucketBase(bucket)}/objects/${encodeURIComponent(name)}/presigned-url`,
        { params: { expirySeconds } },
      );
      return data.url;
    } catch (err) {
      this.logger.error('Failed to generate presigned URL', err as Error);
      throw new InternalServerErrorException(
        'Failed to generate presigned URL',
      );
    }
  }

  async deleteObject(objectName: string, bucket: string): Promise<void> {
    const name = path.basename(objectName);
    try {
      await this.httpService.axiosRef.delete(
        `${this.bucketBase(bucket)}/objects/${encodeURIComponent(name)}`,
      );
    } catch (err) {
      this.logger.error('Failed to delete file', err as Error);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async deleteBulk(objectNames: string[], bucket: string): Promise<void> {
    if (objectNames.length === 0) return;
    const names = objectNames.map((n) => path.basename(n));
    try {
      await this.httpService.axiosRef.post(
        `${this.bucketBase(bucket)}/delete-bulk`,
        { objectNames: names },
      );
    } catch (err) {
      this.logger.error('Failed to delete files', err as Error);
      throw new InternalServerErrorException('Failed to delete files');
    }
  }

  private bucketBase(bucket: string): string {
    return `${this.baseUrl}/buckets/${encodeURIComponent(bucket)}`;
  }
}
