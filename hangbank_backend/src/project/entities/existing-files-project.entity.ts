import { ChildEntity, OneToOne } from 'typeorm';
import { Project } from './project.entity';
import { Speaker } from './speaker.entity';

@ChildEntity()
export class ExistingFilesProject extends Project {
  @OneToOne(() => Speaker, (s) => s.project)
  speaker!: Speaker;
}
