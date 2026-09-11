import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('buckets')
  getBuckets() {
    return {
      audio: this.appService.audioBucket,
      corpus: this.appService.corpusBucket,
      originalCorpus: this.appService.originalCorpusBucket,
    };
  }

  @Post('buckets/:bucket/objects')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('bucket') bucket: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required (multipart field "file")');
    }
    return this.appService.uploadObject(file, bucket);
  }

  @Get('buckets/:bucket/objects/:objectName')
  async download(
    @Param('bucket') bucket: string,
    @Param('objectName') objectName: string,
    @Res() res: Response,
  ) {
    const stream = await this.appService.downloadObject(objectName, bucket);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(err);
      }
    });
    stream.pipe(res);
  }

  @Get('buckets/:bucket/objects/:objectName/presigned-url')
  async presignedUrl(
    @Param('bucket') bucket: string,
    @Param('objectName') objectName: string,
    @Query('expirySeconds', new DefaultValuePipe(1200), ParseIntPipe)
    expirySeconds: number,
  ): Promise<{ url: string }> {
    const url = await this.appService.getPresignedUrl(
      objectName,
      bucket,
      expirySeconds,
    );
    return { url };
  }

  @Delete('buckets/:bucket/objects/:objectName')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteObject(
    @Param('bucket') bucket: string,
    @Param('objectName') objectName: string,
  ): Promise<void> {
    await this.appService.deleteObject(objectName, bucket);
  }

  @Post('buckets/:bucket/delete-bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBulk(
    @Param('bucket') bucket: string,
    @Body() body: { objectNames?: string[] },
  ): Promise<void> {
    await this.appService.deleteBulk(body?.objectNames ?? [], bucket);
  }
}
