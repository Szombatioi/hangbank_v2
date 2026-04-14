import { CorpusVisibility } from "../entities/corpus-visibility";

export class CreateCorpusDto {
    name!: string;
    languageCode!: string;
    visibility!: CorpusVisibility;
    domainName!: string;
    // uploaderId!: string; végülis nem kell, mert a guard megadja majd
}
