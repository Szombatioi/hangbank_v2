import { ChildEntity, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Corpus } from 'src/corpus/entities/corpus.entity';
import { Project } from './project.entity';
import { Speaker } from './speaker.entity';
import { CorpusBlock } from 'src/corpus/entities/corpus-block.entity';

@ChildEntity()
export class CorpusBasedProject extends Project {
  @ManyToOne(() => Corpus)
  corpus!: Corpus;

  @OneToOne(() => Speaker, (s) => s.project)
  speaker!: Speaker;

  @OneToMany(() => CorpusBlock, (b) => b.corpusProject)
  blocks!: CorpusBlock[];
}
