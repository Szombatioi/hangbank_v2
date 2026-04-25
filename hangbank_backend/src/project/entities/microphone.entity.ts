import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Microphone {
  @PrimaryColumn({ type: 'varchar', length: 17 })
  id!: string; // MAC address, e.g. "00:1A:2B:3C:4D:5E"

  @Column()
  name!: string;

  @Column()
  maxSamplingRate!: number;
}
