import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('i18n_languages')
export class Language {
  /** BCP-47 language code, e.g. "en", "de", "zh-CN" */
  @PrimaryColumn({ type: 'varchar', length: 10 })
  code: string;

  /** English display name */
  @Column({ type: 'varchar' })
  name: string;

  /** Name in the language itself */
  @Column({ type: 'varchar' })
  nativeName: string;

  /** Flag emoji */
  @Column({ type: 'varchar', length: 10 })
  flagEmoji: string;

  /** True for Arabic, Hebrew, etc. */
  @Column({ default: false })
  isRTL: boolean;

  /** Admin can disable a language without deleting it */
  @Column({ default: true })
  isEnabled: boolean;

  /** Only one language should have this true */
  @Column({ default: false })
  isDefault: boolean;

  /** Controls display order in the selector */
  @Column({ type: 'int', default: 100 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
