import { ChildEntity, Column, ManyToOne, OneToOne } from 'typeorm';
import { Project } from './project.entity';
import { Speaker } from './speaker.entity';
import { Language } from 'src/language/entities/language.entity';

@ChildEntity()
export class ExistingFilesProject extends Project {
  @OneToOne(() => Speaker, (s) => s.project)
  speaker!: Speaker;

  @Column({ default: false })
  useAutomaticTranscription!: boolean;

  @ManyToOne(() => Language, { nullable: true })
  transcriptionLanguage?: Language | null;
}
