import type {
  AdminDashboard, Category, Certificate, CourseDetail, CourseSummary, Enrollment, Lesson, Page, Session,
  TeacherDashboard, User,
} from './types';

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: { field: string; message: string }[];
  requestId?: string;
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody) {
    super(body.message);
  }
  get code() {
    return this.body.code;
  }
}

const SESSION_KEY = 'edutrack.session';

export const sessionStore = {
  read(): Session | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  write(session: Session | null) {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  },
};

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

type Query = Record<string, string | number | boolean | undefined | null>;

async function request<T>(method: string, path: string, opts: { body?: unknown; query?: Query } = {}): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const token = sessionStore.read()?.accessToken;
  const res = await fetch(url, {
    method,
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const body: ApiErrorBody = data ?? { statusCode: res.status, code: 'NETWORK_ERROR', message: 'Falha de comunicação com o servidor' };
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, body);
  }
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) => request<Session>('POST', '/auth/login', { body: { email, password } }),
    register: (body: { name: string; email: string; password: string; role: 'STUDENT' | 'TEACHER' }) =>
      request<Session>('POST', '/auth/register', { body }),
    me: () => request<User>('GET', '/auth/me'),
    updateProfile: (body: { name?: string; bio?: string }) => request<User>('PATCH', '/auth/me', { body }),
    changePassword: (body: { currentPassword: string; newPassword: string }) =>
      request<void>('POST', '/auth/me/password', { body }),
  },
  categories: {
    list: () => request<Category[]>('GET', '/categories'),
  },
  courses: {
    list: (query: Query) => request<Page<CourseSummary>>('GET', '/courses', { query }),
    get: (idOrSlug: string) => request<CourseDetail>('GET', `/courses/${idOrSlug}`),
    create: (body: CourseInput) => request<CourseDetail>('POST', '/courses', { body }),
    update: (id: string, body: Partial<CourseInput>) => request<CourseDetail>('PATCH', `/courses/${id}`, { body }),
    publish: (id: string) => request<CourseDetail>('POST', `/courses/${id}/publish`),
    archive: (id: string) => request<CourseDetail>('POST', `/courses/${id}/archive`),
    remove: (id: string) => request<void>('DELETE', `/courses/${id}`),
    lesson: (courseId: string, lessonId: string) => request<Lesson>('GET', `/courses/${courseId}/lessons/${lessonId}`),
    addLesson: (courseId: string, body: LessonInput) => request<Lesson>('POST', `/courses/${courseId}/lessons`, { body }),
    updateLesson: (courseId: string, lessonId: string, body: Partial<LessonInput>) =>
      request<Lesson>('PATCH', `/courses/${courseId}/lessons/${lessonId}`, { body }),
    removeLesson: (courseId: string, lessonId: string) => request<void>('DELETE', `/courses/${courseId}/lessons/${lessonId}`),
    reorderLessons: (courseId: string, lessonIds: string[]) =>
      request<Lesson[]>('POST', `/courses/${courseId}/lessons/reorder`, { body: { lessonIds } }),
    enrollments: (courseId: string) => request<Enrollment[]>('GET', `/courses/${courseId}/enrollments`),
  },
  enrollments: {
    create: (courseId: string) => request<Enrollment>('POST', '/enrollments', { body: { courseId } }),
    mine: () => request<Enrollment[]>('GET', '/enrollments/me'),
    get: (id: string) => request<Enrollment>('GET', `/enrollments/${id}`),
    cancel: (id: string) => request<Enrollment>('POST', `/enrollments/${id}/cancel`),
    complete: (id: string, lessonId: string) => request<Enrollment>('POST', `/enrollments/${id}/lessons/${lessonId}/complete`),
    undo: (id: string, lessonId: string) => request<Enrollment>('DELETE', `/enrollments/${id}/lessons/${lessonId}/complete`),
    addGrade: (id: string, body: { assessment: string; value: number }) =>
      request<Enrollment>('POST', `/enrollments/${id}/grades`, { body }),
    updateGrade: (id: string, gradeId: string, value: number) =>
      request<Enrollment>('PATCH', `/enrollments/${id}/grades/${gradeId}`, { body: { value } }),
    certificate: (id: string) => request<Certificate>('POST', `/enrollments/${id}/certificate`),
  },
  certificates: {
    verify: (code: string) => request<Certificate>('GET', `/certificates/${encodeURIComponent(code)}`),
  },
  users: {
    list: (query: Query) => request<Page<User>>('GET', '/users', { query }),
    setStatus: (id: string, isActive: boolean) => request<User>('PATCH', `/users/${id}/status`, { body: { isActive } }),
  },
  dashboard: {
    admin: () => request<AdminDashboard>('GET', '/dashboard/admin'),
    teacher: () => request<TeacherDashboard>('GET', '/dashboard/teacher'),
  },
};

export interface CourseInput {
  title: string;
  summary: string;
  description?: string;
  categoryId: string;
  level: string;
  workloadHours: number;
  capacity: number;
}

export interface LessonInput {
  title: string;
  content?: string;
  durationMinutes: number;
}

/** Mensagem amigável para qualquer erro (usada em toasts e alertas). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.body.details?.length) return err.body.details.map((d) => d.message).join(' • ');
    return err.message;
  }
  return 'Algo deu errado. Tente novamente.';
}
