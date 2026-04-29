import { ChildEntity, ManyToOne, OneToMany } from 'typeorm';
import { Corpus } from 'src/corpus/entities/corpus.entity';
import { Project } from './project.entity';
import { Speaker } from './speaker.entity';

@ChildEntity()
export class CorpusBasedProject extends Project {
  @ManyToOne(() => Corpus)
  corpus!: Corpus;

  @OneToMany(() => Speaker, (s) => s.project)
  speakers!: Speaker[];
}
