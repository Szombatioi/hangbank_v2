import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import * as path from 'path';
import * as stream from 'stream';

@Injectable()
export class S3StorageService implements OnModuleInit {
    private readonly logger = new Logger(S3StorageService.name);

    public readonly audioBucket = 'audio';
    public readonly originalCorpusBucket = 'corpus-original';
    public readonly corpusBucket = 'corpus';
    private readonly bucketNames = [this.audioBucket, this.corpusBucket, this.originalCorpusBucket];
    private readonly minioClient: Client;

    constructor() {
        this.minioClient = new Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: Number(process.env.MINIO_PORT) || 9000,
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
    }

    async onModuleInit() {
        for (const bucketName of this.bucketNames) {
            const exists = await this.minioClient.bucketExists(bucketName).catch(() => false);
            if (!exists) {
                await this.minioClient.makeBucket(bucketName);
                this.logger.log(`Created bucket: ${bucketName}`);
            }
        }
    }

    async uploadObject(file: Express.Multer.File, bucket: string) {
    const objectName = `${Date.now()}-${path.basename(file.originalname)}`; //Creating unique object name

    //Validating if bucket exists
    if(!this.bucketNames.includes(bucket)){
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
  async downloadObject(objectName: string, bucket: string): Promise<stream.Readable> {
    //Validating if bucket exists
    if(!this.bucketNames.includes(bucket)){
      throw new InternalServerErrorException('Invalid bucket name');
    }

    try {
      //Fetching audio object - throws error if not found
      const stat = await this.minioClient.statObject(bucket, objectName);
      // console.log(`Metadata for downloaded audio: `);
      // for (const key in stat.metaData) {
      //   console.log(`  ${key}: ${stat.metaData[key]}`);
      // }
      return await this.minioClient.getObject(bucket, objectName);
    } catch (err) {
      this.logger.error('Failed to download file', err);
      throw new InternalServerErrorException('Failed to download file');
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
}
