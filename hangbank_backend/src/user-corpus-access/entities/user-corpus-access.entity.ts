import { Corpus } from "src/corpus/entities/corpus.entity";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity()
export class UserCorpusAccess {
    @PrimaryColumn('uuid')
    userId!: string; //Which user has access (only ID, since user is in another service)

    
    @PrimaryColumn('uuid')
    corpusId!: string; //To which corpus the user has access

    @ManyToOne(() => Corpus, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'corpusId' })
    corpus!: Corpus;

}
