import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './project.entity';

@Entity()
export class AudioFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Project, (p) => p.audioFiles, { onDelete: 'CASCADE' })
  project!: Project;
}
