import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LanguageService } from 'src/language/language.service';
import { UiTheme, UserSettings } from './entities/user-settings.entity';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { EncryptionService } from 'src/encryption-service/encryption.service';

export interface UserSettingsView {
  theme: UiTheme;
  languageCode: string | null;
  apiKeyPresent: boolean;
  //apiKey: string | null;
}

@Injectable()
export class UserSettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>,
    private readonly languageService: LanguageService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async find(userId: string): Promise<UserSettingsView> {
    const settings = await this.userSettingsRepository.findOne({
      where: { userId },
    });
    return this.toView(settings);
  }

  async update(userId: string, dto: UpdateUserSettingsDto): Promise<UserSettingsView> {
    if (dto.theme !== undefined && !Object.values(UiTheme).includes(dto.theme)) {
      throw new BadRequestException(`Unknown theme '${dto.theme}'`);
    }

    if (dto.languageCode !== undefined) {
      const language = await this.languageService.findOne(dto.languageCode);
      if (!language.isTranslated) {
        throw new BadRequestException(`Language '${dto.languageCode}' is not available as an interface language`);
      }
    }

    const existing = await this.userSettingsRepository.findOne({
      where: { userId },
    });

    if(existing){
      if(dto.theme) existing.theme = dto.theme;
      if(dto.languageCode) existing.languageCode = dto.languageCode;
      if(dto.apiKey) {
        existing.apiKey = this.encryptionService.encrypt(dto.apiKey)
      }

      const saved = await this.userSettingsRepository.save(existing);
      return this.toView(saved);
    }

    const saved = await this.userSettingsRepository.save(
      this.userSettingsRepository.create({
        userId,
        theme: dto.theme ?? UiTheme.LIGHT,
        languageCode: dto.languageCode ?? null,
        apiKey: dto.apiKey ? this.encryptionService.encrypt(dto.apiKey) : null,
      }),
    );
    return this.toView(saved);
  }

  private toView(settings: UserSettings | null): UserSettingsView {
    return {
      theme: settings?.theme ?? UiTheme.LIGHT,
      languageCode: settings?.languageCode ?? null,
      apiKeyPresent: !!settings?.apiKey,
      //apiKey: (settings && settings.apiKey) ? this.encryptionService.decrypt(settings.apiKey) : null,
    };
  }
}
