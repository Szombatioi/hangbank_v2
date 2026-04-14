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
        const languages = [
            { code: 'hu-HU', name: 'lang_hu-HU' },
            { code: 'en-US', name: 'lang_en-US' },
            { code: 'de-DE', name: 'lang_de-DE' },
            // { code: 'fr-FR', name: 'lang_fr-FR' },
            // { code: 'es-ES', name: 'lang_es-ES' },
        ];

        for (const lang of languages) {
            const existing = await this.languageRepository.findOneBy({ code: lang.code });
            if (!existing) {
                const language = this.languageRepository.create(lang);
                await this.languageRepository.save(language);
            }
        }
        console.log("Languages seeded.");
    }
}
