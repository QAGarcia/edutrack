import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CourseLevel, CourseStatus } from '../../domain/enums';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { Lesson } from '../lessons/lesson.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) title: string;
  @Index({ unique: true }) @Column({ length: 100 }) slug: string;
  @Column({ length: 200 }) summary: string;
  @Column({ type: 'text', default: '' }) description: string;
  @Column({ type: 'enum', enum: CourseLevel }) level: CourseLevel;
  @Column({ name: 'workload_hours', type: 'int' }) workloadHours: number;
  @Column({ type: 'int' }) capacity: number;
  @Index() @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT }) status: CourseStatus;

  @ManyToOne(() => Category, { eager: true, onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User, { eager: true, onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @OneToMany(() => Lesson, (l) => l.course) lessons: Lesson[];

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
