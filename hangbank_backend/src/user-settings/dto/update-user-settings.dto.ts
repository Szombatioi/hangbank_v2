import { UiTheme } from '../entities/user-settings.entity';

export class UpdateUserSettingsDto {
  theme?: UiTheme;
  languageCode?: string;
  apiKey?: string;
}
