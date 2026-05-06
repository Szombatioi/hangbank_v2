import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, TableInheritance, UpdateDateColumn } from 'typeorm';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';
import { ProjectRole } from './project-role.entity';

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

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => AudioFile, (a) => a.project)
  audioFiles!: AudioFile[];

  @OneToMany(() => ProjectRole, (r) => r.project)
  roles!: ProjectRole[]; //No default value, because on creation we MUST declare its owner
}
