import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Gender } from './gender.enum';
import { CorpusBasedProject } from './corpus-based-project.entity';

@Entity()
export class Speaker {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string; // cross-service reference

  @Column()
  actualAge!: number;

  @Column('text', { array: true, default: [] })
  characteristics!: string[]; // e.g. ['stutter', 'tics']

  @Column({ type: 'enum', enum: Gender })
  gender!: Gender;

  @Column({ nullable: true })
  microphoneDeviceId?: string; // device ID string, e.g. "default", "communications"

  @ManyToOne(() => CorpusBasedProject, (p) => p.speakers, { onDelete: 'CASCADE' })
  project!: CorpusBasedProject;
}
