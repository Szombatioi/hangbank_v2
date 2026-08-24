import { CorpusVisibility } from "../entities/corpus-visibility";

export class CreateCorpusDto {
    name!: string;
    languageCode!: string;
    visibility!: CorpusVisibility;
    domainName!: string; //TODO: make it optional
    pageSkips?: number; // optional, only include if > 0
    userAccesses?: string[]; // optional, only if visibility is protected
    // uploaderId!: string; végülis nem kell, mert a guard megadja majd
}
