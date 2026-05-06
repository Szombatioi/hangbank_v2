import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';

@Entity()
export class AudioModification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AudioFile, (af) => af.audioModifications, { onDelete: 'CASCADE' })
  audioFile!: AudioFile;
}
