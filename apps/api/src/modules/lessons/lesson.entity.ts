import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Course } from '../courses/course.entity';

@Entity('lessons')
@Index(['course', 'position'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Course, (c) => c.lessons, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'course_id' })
  course: Course;
  @Column({ length: 120 }) title: string;
  @Column({ type: 'text', default: '' }) content: string;
  @Column({ name: 'duration_minutes', type: 'int' }) durationMinutes: number;
  @Column({ type: 'int' }) position: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
