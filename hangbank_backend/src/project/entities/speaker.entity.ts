import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Gender } from './gender.enum';
import { Microphone } from './microphone.entity';
import { Project } from './project.entity';

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

  @ManyToOne(() => Microphone, { nullable: true, eager: true })
  microphone?: Microphone;

  @ManyToOne(() => Project, (p) => p.speakers, { onDelete: 'CASCADE' })
  project!: Project;
}
