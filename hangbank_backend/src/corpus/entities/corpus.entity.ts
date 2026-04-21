import { Language } from "src/language/entities/language.entity";
import { Column, CreateDateColumn, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { CorpusVisibility } from "./corpus-visibility";
import { CorpusDomain } from "src/corpus-domain/entities/corpus-domain.entity";

@Entity()
export class Corpus {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: false, nullable: false })
    name!: string;

    //nyelv
    @ManyToOne(() => Language)
    language!: Language;

    //láthatóság
    @Column({ type: 'enum', enum: CorpusVisibility, default: CorpusVisibility.PRIVATE })
    visibility!: CorpusVisibility; 

    // (protected esetén) hozzáférések
    // Ezt ide nem vesszük fel. A UserCorpusAccess entitásban lesz defininálva a jogosultság

    // object storage URL (ahová fel van töltve)
    @Column({ nullable: false })
    s3Link!: string;

    // domain (pl. orvosi beszédre, programozással kapcsolatos beszédre, stb.)
    // Ez egy opcionális mező, nem kötelező megadni feltöltéskor
    // Azért nem csak egy sima string, mert 
        //1. szűrésre jobb, ha ki van szervezve
        //2. feltöltéskor le lehet kérdezni az eddigieket, hogy ne legyen túl sok hasonló nevű domain
        //3. ha szerkeszteni kell a nevét (admin által), akkor könnyebb, ha külön van tárolva
    @ManyToOne(() => CorpusDomain)
    domain?: CorpusDomain;

    // fonetikai lefedettség (az adott nyelvre) 
    //a rendszer ki fogja számítani feltöltéskor, de biztonság kedvéért 0 a default érték
    @Column({ type: 'float', default: 0.0 })
    phoneticalCoverage!: number;

    // feltöltő ID (user ID, az Auth service pedig majd lekéri a user nevét, hogy megjeleníthesse)
    @Column({ nullable: false })
    uploaderId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    // forrás??
}
