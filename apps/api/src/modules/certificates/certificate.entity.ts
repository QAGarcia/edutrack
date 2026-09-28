import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Enrollment } from '../enrollments/enrollment.entity';

/** Guarda um "retrato" dos dados no momento da emissão: o certificado não muda se o curso mudar. */
@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid') id: string;
  @OneToOne(() => Enrollment, (e) => e.certificate, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;
  @Index({ unique: true }) @Column({ length: 20 }) code: string;
  @Column({ name: 'student_name', length: 120 }) studentName: string;
  @Column({ name: 'course_title', length: 120 }) courseTitle: string;
  @Column({ name: 'teacher_name', length: 120 }) teacherName: string;
  @Column({ name: 'workload_hours', type: 'int' }) workloadHours: number;
  @Column({ name: 'final_average', type: 'numeric', precision: 4, scale: 2, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  finalAverage: number;
  @CreateDateColumn({ name: 'issued_at', type: 'timestamptz' }) issuedAt: Date;
}
