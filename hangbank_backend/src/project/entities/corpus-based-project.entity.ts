import { ChildEntity, ManyToOne } from 'typeorm';
import { Corpus } from 'src/corpus/entities/corpus.entity';
import { Project } from './project.entity';

@ChildEntity()
export class CorpusBasedProject extends Project {
  @ManyToOne(() => Corpus)
  corpus!: Corpus;
}
