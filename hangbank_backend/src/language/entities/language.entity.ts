import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Language {
  /** BCP-47 language tag, serves as the natural primary key (e.g. "en-US", "hu-HU"). */
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code!: string;

  /**
   * Translation key used by the frontend i18n library to display the language name
   * (e.g. "lang_en_us" → "English (US)"). Keeping it a key – not the translated
   * string itself – means the display adapts to the active UI locale automatically.
   */
  @Column({ unique: true, nullable: false })
  name!: string;

  /**
   * Whether the frontend has a complete translation for this language.
   * Set to true only after the corresponding locale file has been shipped.
   * Defaults to false so newly added languages are not accidentally exposed as UI options.
   */
  @Column({ default: false })
  isTranslated!: boolean;
}
