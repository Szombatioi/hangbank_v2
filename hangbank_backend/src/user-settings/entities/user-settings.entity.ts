import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Language } from 'src/language/entities/language.entity';

export enum UiTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

@Entity()
export class UserSettings {
  @PrimaryColumn()
  userId!: string;

  @Column({ type: 'enum', enum: UiTheme, default: UiTheme.LIGHT })
  theme!: UiTheme;

  @Column({ type: 'varchar', nullable: true })
  languageCode!: string | null;

  @ManyToOne(() => Language, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'languageCode' })
  language?: Language | null;

  @Column({ type: 'varchar', nullable: true })
  apiKey?: string | null;
}
