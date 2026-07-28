import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'minio';
import * as path from 'path';
import * as stream from 'stream';

@Injectable()
export class S3StorageService implements OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);

  public readonly audioBucket = 'audio';
  public readonly originalCorpusBucket = 'corpus-original';
  public readonly corpusBucket = 'corpus';
  private readonly bucketNames = [
    this.audioBucket,
    this.corpusBucket,
    this.originalCorpusBucket,
  ];
  private readonly minioClient: Client;
  // Base URL the minio client signs from (internal docker hostname), and the public
  // base the browser can actually reach (e.g. via the reverse proxy). Presigned URLs
  // are rewritten from the former to the latter so they work outside the network.
  private readonly internalBaseUrl: string;
  private readonly publicBaseUrl?: string;

  constructor() {
    const endPoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = Number(process.env.MINIO_PORT) || 9000;
    const useSSL = process.env.MINIO_USE_SSL === 'true';

    this.minioClient = new Client({
      endPoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });

    this.internalBaseUrl = `${useSSL ? 'https' : 'http'}://${endPoint}:${port}`;
    this.publicBaseUrl = process.env.MINIO_PUBLIC_URL || undefined;
  }

  async onModuleInit() {
    for (const bucketName of this.bucketNames) {
      const exists = await this.minioClient
        .bucketExists(bucketName)
        .catch(() => false);
      if (!exists) {
        await this.minioClient.makeBucket(bucketName);
        this.logger.log(`Created bucket: ${bucketName}`);
      }
    }
  }

  async uploadObject(file: Express.Multer.File, bucket: string) {
    console.log(file);
    const objectName = `${Date.now()}-${path.basename(file.originalname)}`; //Creating unique object name

    //Validating if bucket exists
    if (!this.bucketNames.includes(bucket)) {
      throw new InternalServerErrorException('Invalid bucket name');
    }

    try {
      //uploading object
      await this.minioClient.putObject(
        bucket,
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      return {
        filename: objectName,
        url: `${process.env.MINIO_PUBLIC_URL || 'http://localhost:9000'}/${bucket}/${objectName}`,
      };
    } catch (err) {
      this.logger.error('Failed to upload file', err);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  //Download any kind of object
  async downloadObject(
    objectName: string,
    bucket: string,
  ): Promise<stream.Readable> {
    //Validating if bucket exists
    if (!this.bucketNames.includes(bucket)) {
      throw new InternalServerErrorException('Invalid bucket name');
    }

    try {
      //Fetching audio object - throws error if not found
      // const stat = await this.minioClient.statObject(bucket, objectName);
      // console.log(`Metadata for downloaded audio: `);
      // for (const key in stat.metaData) {
      //   console.log(`  ${key}: ${stat.metaData[key]}`);
      // }
      return await this.minioClient.getObject(bucket, path.basename(objectName));
    } catch (err) {
      this.logger.error('Failed to download file', err);
      throw new InternalServerErrorException('Failed to download file');
    }
  }

  //Generates a presigned GET URL so a client can fetch the object directly
  async getPresignedUrl(
    objectName: string,
    bucket: string,
    expirySeconds: number,
  ): Promise<string> {
    //Validating if bucket exists
    if (!this.bucketNames.includes(bucket)) {
      throw new InternalServerErrorException('Invalid bucket name');
    }

    try {
      const url = await this.minioClient.presignedGetObject(
        bucket,
        path.basename(objectName),
        expirySeconds,
      );
      // Rewrite the internal endpoint to the public one (when configured) so the
      // browser can fetch the object — the signature stays valid as long as the
      // proxy forwards the request to MinIO with the original Host header.
      return this.publicBaseUrl
        ? url.replace(this.internalBaseUrl, this.publicBaseUrl)
        : url;
    } catch (err) {
      this.logger.error('Failed to generate presigned URL', err);
      throw new InternalServerErrorException('Failed to generate presigned URL');
    }
  }

  //Deletes a specific object
  async deleteObject(objectName: string, bucket: string): Promise<void> {
    //Validating if bucket exists
    if (!this.bucketNames.includes(bucket)) {
      throw new InternalServerErrorException('Invalid bucket name');
    }

    try {
      //Deleting object
      const sanitizedObjectName = path.basename(objectName);
      await this.minioClient.removeObject(bucket, sanitizedObjectName);
    } catch (err) {
      this.logger.error('Failed to delete file', err);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  //Deletes multiple objects in a single call
  async deleteBulk(objectNames: string[], bucket: string): Promise<void> {
    if (objectNames.length === 0) return;

    //Validating if bucket exists
    if (!this.bucketNames.includes(bucket)) {
      throw new InternalServerErrorException('Invalid bucket name');
    }

    try {
      const sanitizedObjectNames = objectNames.map((name) =>
        path.basename(name),
      );
      await this.minioClient.removeObjects(bucket, sanitizedObjectNames);
    } catch (err) {
      this.logger.error('Failed to delete files', err);
      throw new InternalServerErrorException('Failed to delete files');
    }
  }
}
