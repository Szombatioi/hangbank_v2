export class CreateLanguageDto {
  /** BCP-47 language tag (e.g. "en-US", "hu-HU"). Used as the primary key. */
  code!: string;

  /** i18n key for the language name rendered by the frontend (e.g. "lang_en_us"). */
  name!: string;

  /** Whether the UI ships a full translation for this language. Defaults to false. */
  isTranslated?: boolean;
}
