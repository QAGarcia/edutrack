import { User } from '../modules/users/user.entity';
import { Category } from '../modules/categories/category.entity';
import { Course } from '../modules/courses/course.entity';
import { Lesson } from '../modules/lessons/lesson.entity';
import { Enrollment } from '../modules/enrollments/enrollment.entity';
import { Grade } from '../modules/enrollments/grade.entity';
import { LessonProgress } from '../modules/enrollments/lesson-progress.entity';
import { Certificate } from '../modules/certificates/certificate.entity';

export const entities = [User, Category, Course, Lesson, Enrollment, Grade, LessonProgress, Certificate];
export { User, Category, Course, Lesson, Enrollment, Grade, LessonProgress, Certificate };
