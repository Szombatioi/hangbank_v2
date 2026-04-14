import { Corpus } from "src/corpus/entities/corpus.entity";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

@Entity()
export class UserCorpusAccess {
    @PrimaryColumn('uuid')
    userId!: string; //Kiről van szó

    @PrimaryColumn('uuid')
    corpusId!: string;

    @ManyToOne(() => Corpus, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'corpus_id' })
    corpus!: Corpus;

}
