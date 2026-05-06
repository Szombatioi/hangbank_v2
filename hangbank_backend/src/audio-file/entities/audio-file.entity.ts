import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from 'src/project/entities/project.entity';
import { AudioQuality } from 'src/audio-quality/entities/audio-quality.entity';
import { AudioModification } from 'src/audio-modification/entities/audio-modification.entity';

@Entity()
export class AudioFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  s3Link!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Project, (p) => p.audioFiles, { onDelete: 'CASCADE' })
  project!: Project;

  @OneToMany(() => AudioQuality, (aq) => aq.audioFile)
  audioQualities!: AudioQuality[];

  @OneToMany(() => AudioModification, (am) => am.audioFile)
  audioModifications!: AudioModification[];
}
