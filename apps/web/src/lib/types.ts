export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EnrollmentStatus = 'ACTIVE' | 'CANCELLED';
export type Situation = 'IN_PROGRESS' | 'APPROVED' | 'FAILED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  isActive: boolean;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  user: User;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  publishedCourses: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  summary: string;
  level: CourseLevel;
  status: CourseStatus;
  workloadHours: number;
  capacity: number;
  enrolledCount: number;
  seatsLeft: number;
  lessonsCount: number;
  totalMinutes: number;
  category: { id: string; name: string; slug: string };
  teacher: { id: string; name: string };
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  durationMinutes: number;
  position: number;
}

export interface Lesson extends LessonSummary {
  content: string;
  completed?: boolean;
  updatedAt: string;
}

export interface CourseDetail extends CourseSummary {
  description: string;
  teacher: { id: string; name: string; bio: string };
  lessons: LessonSummary[];
  viewer: { isOwner: boolean; enrollmentId: string | null; canEnroll: boolean } | null;
}

export interface Grade {
  id: string;
  assessment: string;
  value: number;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  createdAt: string;
  cancelledAt: string | null;
  student: { id: string; name: string; email: string };
  course: {
    id: string;
    title: string;
    slug: string;
    status: CourseStatus;
    workloadHours: number;
    category: { name: string; slug: string };
    teacher: { id: string; name: string };
  };
  progress: { completedLessons: number; totalLessons: number; percent: number; completedLessonIds: string[] };
  grades: Grade[];
  average: number | null;
  situation: Situation;
  certificate: { code: string; issuedAt: string } | null;
  policy: { minAssessments: number; passingAverage: number; minProgressPercent: number };
}

export interface Certificate {
  code: string;
  studentName: string;
  courseTitle: string;
  teacherName: string;
  workloadHours: number;
  finalAverage: number;
  issuedAt: string;
  valid?: boolean;
}

export interface TopCourse {
  id: string;
  title: string;
  capacity: number;
  enrolled: number;
  status?: CourseStatus;
}

export interface AdminDashboard {
  activeUsers: Record<Role, number>;
  courses: Record<CourseStatus, number>;
  enrollments: { active: number; cancelled: number };
  certificatesIssued: number;
  topCourses: TopCourse[];
  recentEnrollments: { id: string; createdAt: string; studentName: string; courseTitle: string }[];
}

export interface TeacherDashboard {
  courses: Record<CourseStatus, number>;
  activeStudents: number;
  averageGrade: number | null;
  enrollmentsPendingGrades: number;
  topCourses: TopCourse[];
}
