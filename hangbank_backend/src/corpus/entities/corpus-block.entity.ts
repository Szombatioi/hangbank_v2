import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Corpus } from './corpus.entity';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';
import { CorpusBasedProject } from 'src/project/entities/corpus-based-project.entity';

@Entity()
export class CorpusBlock {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Corpus, { onDelete: 'CASCADE', nullable: false })
  corpus!: Corpus;

  @Column()
  blockIndex!: number;

  @Column('text')
  text!: string;

  @OneToOne(() => AudioFile, { nullable: true })
  @JoinColumn()
  audioFile?: AudioFile;

  @ManyToOne(() => CorpusBasedProject, (p) => p.blocks, { nullable: true, onDelete: 'CASCADE' })
  corpusProject?: CorpusBasedProject;
}
