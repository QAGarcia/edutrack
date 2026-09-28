import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { EnrollmentStatus } from '../../domain/enums';
import { User } from '../users/user.entity';
import { Course } from '../courses/course.entity';
import { Grade } from './grade.entity';
import { LessonProgress } from './lesson-progress.entity';
import { Certificate } from '../certificates/certificate.entity';

/**
 * Índice único parcial: no máximo UMA matrícula ativa por aluno/curso.
 * Garantia no banco, não só no código (protege contra requisições concorrentes).
 */
@Entity('enrollments')
@Index('uq_enrollment_active', ['student', 'course'], { unique: true, where: `"status" = 'ACTIVE'` })
export class Enrollment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'student_id' }) student: User;
  @ManyToOne(() => Course, { eager: true, onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'course_id' }) course: Course;
  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE }) status: EnrollmentStatus;
  @OneToMany(() => Grade, (g) => g.enrollment) grades: Grade[];
  @OneToMany(() => LessonProgress, (p) => p.enrollment) progress: LessonProgress[];
  @OneToOne(() => Certificate, (c) => c.enrollment) certificate: Certificate | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true }) cancelledAt: Date | null;
}
