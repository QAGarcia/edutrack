import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 60 }) name: string;
  @Index({ unique: true }) @Column({ length: 80 }) slug: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
