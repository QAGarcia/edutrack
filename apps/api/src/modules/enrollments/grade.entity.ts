import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Enrollment } from './enrollment.entity';

const numeric = { to: (v: number) => v, from: (v: string | null) => (v === null ? null : Number(v)) };

@Entity('grades')
@Unique('uq_grade_assessment', ['enrollment', 'assessment'])
export class Grade {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Enrollment, (e) => e.grades, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'enrollment_id' }) enrollment: Enrollment;
  @Column({ length: 20 }) assessment: string;
  @Column({ type: 'numeric', precision: 4, scale: 2, transformer: numeric }) value: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
