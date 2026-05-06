import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';

@Entity()
export class AudioQuality {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AudioFile, (af) => af.audioQualities, { onDelete: 'CASCADE' })
  audioFile!: AudioFile;
}
