import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguageModule } from 'src/language/language.module';
import { UserSettings } from './entities/user-settings.entity';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';
import { EncryptionModule } from 'src/encryption-service/encryption.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSettings]), 
    LanguageModule,
    EncryptionModule,
  ],
  controllers: [UserSettingsController],
  providers: [UserSettingsService],
})
export class UserSettingsModule {}
