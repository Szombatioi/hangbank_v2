import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, TableInheritance, UpdateDateColumn } from 'typeorm';
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

  /**
   * Reference voice clip recorded once per project — used as the speaker's
   * baseline for later quality checks and as a calibration sample. Nullable
   * because new projects have none until the speaker records it.
   */
  @OneToOne(() => AudioFile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn()
  masterRecording?: AudioFile | null;

  @OneToMany(() => ProjectRole, (r) => r.project)
  roles!: ProjectRole[]; //No default value, because on creation we MUST declare its owner
}
