import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../domain/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) name: string;
  @Index({ unique: true }) @Column({ length: 160 }) email: string;
  @Column({ name: 'password_hash', select: false }) passwordHash: string;
  @Column({ type: 'enum', enum: Role, default: Role.STUDENT }) role: Role;
  @Column({ type: 'varchar', length: 300, default: '' }) bio: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
