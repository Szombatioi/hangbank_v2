import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CorpusModule } from './corpus/corpus.module';
import { LanguageModule } from './language/language.module';
import { UserCorpusAccessModule } from './user-corpus-access/user-corpus-access.module';
import { CorpusDomainModule } from './corpus-domain/corpus-domain.module';
import { S3StorageModule } from './s3-storage/s3-storage.module';
import { SeederModule } from './seeder/seeder.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '48h' },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: configService.get<string>('DB_TYPE', 'postgres') as 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5433),
        username: configService.get<string>('DB_USERNAME', 'hangbank'),
        password: configService.get<string>('DB_PASSWORD', 'hangbank'),
        database: configService.get<string>('DB_DATABASE', 'hangbank_dev'),
        entities: [path.join(__dirname, '**', '*.entity{.ts,.js}')],
        synchronize: true,
      }),
    }),
    AuthModule,
    UserModule,
    CorpusModule,
    LanguageModule,
    UserCorpusAccessModule,
    CorpusDomainModule,
    S3StorageModule,
    SeederModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
