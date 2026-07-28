import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
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
  microphoneLabel?: string; // full OS label, e.g. "Mikrofon (3 - Anua Mic CM 900) (0d8c:0134)"

  // @ManyToOne(() => CorpusBasedProject, (p) => p.speakers, { onDelete: 'CASCADE' })
  @OneToOne(() => CorpusBasedProject, (p) => p.speaker, { onDelete: 'CASCADE' })
  @JoinColumn()
  project!: CorpusBasedProject;
}
