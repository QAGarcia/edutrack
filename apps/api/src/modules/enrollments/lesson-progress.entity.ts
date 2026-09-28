import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { Lesson } from '../lessons/lesson.entity';

@Entity('lesson_progress')
@Unique('uq_progress_lesson', ['enrollment', 'lesson'])
export class LessonProgress {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Enrollment, (e) => e.progress, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'enrollment_id' }) enrollment: Enrollment;
  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', nullable: false }) @JoinColumn({ name: 'lesson_id' }) lesson: Lesson;
  @CreateDateColumn({ name: 'completed_at', type: 'timestamptz' }) completedAt: Date;
}
