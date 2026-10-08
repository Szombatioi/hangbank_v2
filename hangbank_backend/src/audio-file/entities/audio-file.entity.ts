import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from 'src/project/entities/project.entity';
import { AudioQuality } from 'src/audio-quality/entities/audio-quality.entity';

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

  @Column({ type: 'float' })
  durationSeconds!: number; //The duration of the file

  @Column({ type: 'text' })
  transcription!: string; //The actual transcription of the recording

  @Column({ type: 'text', nullable: true, default: 'undefined' })
  emotion?: string | null;

  @Column({ type: 'int', nullable: true })
  originalSamplingRate?: number | null; // Hz

  @Column({ type: 'varchar', nullable: true })
  originalFormat?: string | null; // e.g. mp3

  @ManyToOne(() => Project, (p) => p.audioFiles, { onDelete: 'CASCADE' })
  project!: Project;

  @OneToMany(() => AudioQuality, (aq) => aq.audioFile)
  audioQualities!: AudioQuality[];
}
