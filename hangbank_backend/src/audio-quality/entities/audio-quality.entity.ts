import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AudioFile } from 'src/audio-file/entities/audio-file.entity';

// The quality-check identifiers. Values match the checker's QualityMeasure.name
// (e.g. SpeakerCheck), so a returned measure maps straight onto a type.
export enum AudioQualityType {
  SpeakerCheck = 'SpeakerCheck',
  NoiseCheck = 'NoiseCheck',
  VolumeCheck = 'VolumeCheck',
  TranscriptionCheck = 'TranscriptionCheck',
}

@Entity()
export class AudioQuality {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AudioFile, (af) => af.audioQualities, { onDelete: 'CASCADE' })
  audioFile!: AudioFile;

  // Which check this row holds (the "quality identifier")
  @Column({ type: 'enum', enum: AudioQualityType })
  type!: AudioQualityType;

  // Numeric result(s) of the check — double precision so floats are stored exactly
  // (e.g. cosine similarity, volume dB), not truncated to integers.
  // Display name + value ranges are static per type — see audio-quality.metadata.ts.
  @Column('double precision', { array: true })
  values!: number[];
}
