import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Language } from 'src/language/entities/language.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SeederService {
    constructor(
        @InjectRepository(Language) private readonly languageRepository: Repository<Language>,
    ) { }

    async seedLanguages() {
        console.log("Seeding languages...");
        // isTranslated marks languages with a complete shipped UI locale — only these
        // are offered as interface options on the settings page. Currently only en-US.
        const languages = [
            { code: 'hu-HU', name: 'lang_hu-HU', isTranslated: false },
            { code: 'en-US', name: 'lang_en-US', isTranslated: true },
            { code: 'de-DE', name: 'lang_de-DE', isTranslated: false },
            // { code: 'fr-FR', name: 'lang_fr-FR', isTranslated: false },
            // { code: 'es-ES', name: 'lang_es-ES', isTranslated: false },
        ];

        for (const lang of languages) {
            const existing = await this.languageRepository.findOneBy({ code: lang.code });
            if (!existing) {
                const language = this.languageRepository.create(lang);
                await this.languageRepository.save(language);
            } else if (existing.isTranslated !== lang.isTranslated) {
                // Keep the translation flag in sync for already-seeded rows
                existing.isTranslated = lang.isTranslated;
                await this.languageRepository.save(existing);
            }
        }
        console.log("Languages seeded.");
    }
}
