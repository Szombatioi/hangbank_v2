import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, TableInheritance } from 'typeorm';
import { AudioFile } from './audio-file.entity';
import { ProjectRole } from './project-role.entity';
import { Speaker } from './speaker.entity';

@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: false, nullable: false })
  name!: string;

  @Column({ unique: false, nullable: false })
  description!: string;

  @Column({ nullable: true })
  samplingRate?: number; // Hz, e.g. 44100, 48000

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Speaker, (s) => s.project)
  speakers!: Speaker[];

  @OneToMany(() => AudioFile, (a) => a.project)
  audioFiles!: AudioFile[];

  @OneToMany(() => ProjectRole, (r) => r.project)
  roles!: ProjectRole[];
}
