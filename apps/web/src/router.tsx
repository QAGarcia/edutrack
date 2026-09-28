import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import { AppShell } from './components/layout/app-shell';

// Cada página vira um arquivo JS separado, carregado sob demanda.
const AdminDashboardPage = lazy(() => import('./pages/admin/admin-dashboard-page'));
const UsersPage = lazy(() => import('./pages/admin/users-page'));
const LoginPage = lazy(() => import('./pages/public/auth-pages').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/public/auth-pages').then((m) => ({ default: m.RegisterPage })));
const CatalogPage = lazy(() => import('./pages/public/catalog-page'));
const CertificatePage = lazy(() => import('./pages/public/certificate-pages').then((m) => ({ default: m.CertificatePage })));
const VerifyCertificatePage = lazy(() => import('./pages/public/certificate-pages').then((m) => ({ default: m.VerifyCertificatePage })));
const CourseDetailPage = lazy(() => import('./pages/public/course-detail-page'));
const HomePage = lazy(() => import('./pages/public/home-page'));
const NotFoundPage = lazy(() => import('./pages/public/not-found-page'));
const ForbiddenPage = lazy(() => import('./pages/public/not-found-page').then((m) => ({ default: m.ForbiddenPage })));
const CoursePlayerPage = lazy(() => import('./pages/student/course-player-page'));
const MyLearningPage = lazy(() => import('./pages/student/my-learning-page'));
const ProfilePage = lazy(() => import('./pages/student/profile-page'));
const ClassroomPage = lazy(() => import('./pages/teacher/classroom-page'));
const CourseEditorPage = lazy(() => import('./pages/teacher/course-editor-page'));
const CoursesTablePage = lazy(() => import('./pages/teacher/courses-table-page'));
const TeacherDashboardPage = lazy(() => import('./pages/teacher/teacher-dashboard-page'));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/cursos', element: <CatalogPage /> },
      { path: '/cursos/:slug', element: <CourseDetailPage /> },
      { path: '/verificar-certificado', element: <VerifyCertificatePage /> },
      { path: '/certificados/:code', element: <CertificatePage /> },
      { path: '/entrar', element: <GuestOnly><LoginPage /></GuestOnly> },
      { path: '/cadastro', element: <GuestOnly><RegisterPage /></GuestOnly> },

      { path: '/perfil', element: <RequireAuth><ProfilePage /></RequireAuth> },

      { path: '/meu-aprendizado', element: <RequireAuth roles={['STUDENT']}><MyLearningPage /></RequireAuth> },
      { path: '/aprender/:enrollmentId/:lessonId?', element: <RequireAuth roles={['STUDENT']}><CoursePlayerPage /></RequireAuth> },

      { path: '/professor', element: <RequireAuth roles={['TEACHER']}><TeacherDashboardPage /></RequireAuth> },
      { path: '/professor/cursos', element: <RequireAuth roles={['TEACHER']}><CoursesTablePage scope="mine" /></RequireAuth> },
      { path: '/professor/cursos/novo', element: <RequireAuth roles={['TEACHER', 'ADMIN']}><CourseEditorPage /></RequireAuth> },
      { path: '/professor/cursos/:id', element: <RequireAuth roles={['TEACHER', 'ADMIN']}><CourseEditorPage /></RequireAuth> },
      { path: '/professor/cursos/:id/turma', element: <RequireAuth roles={['TEACHER', 'ADMIN']}><ClassroomPage /></RequireAuth> },

      { path: '/admin', element: <RequireAuth roles={['ADMIN']}><AdminDashboardPage /></RequireAuth> },
      { path: '/admin/usuarios', element: <RequireAuth roles={['ADMIN']}><UsersPage /></RequireAuth> },
      { path: '/admin/cursos', element: <RequireAuth roles={['ADMIN']}><CoursesTablePage scope="all" /></RequireAuth> },

      { path: '/acesso-negado', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
