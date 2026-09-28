import { Clock, PlayCircle, Users } from 'lucide-react';
import { Link } from 'react-router';
import type { CourseSummary } from '../../lib/types';
import { formatMinutes } from '../../lib/format';
import { Avatar } from '../ui/misc';
import { CourseCover, LevelBadge } from './course-visuals';

export function CourseCard({ course }: { course: CourseSummary }) {
  const full = course.seatsLeft === 0;
  return (
    <article
      data-testid="course-card"
      aria-labelledby={`course-${course.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <CourseCover categorySlug={course.category.slug} className="h-36" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{course.category.name}</span>
          <span className="text-slate-300">•</span>
          <LevelBadge level={course.level} />
        </div>
        <h3 id={`course-${course.id}`} className="text-lg font-semibold leading-snug text-slate-900">
          <Link to={`/cursos/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{course.summary}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{course.workloadHours}h</span>
          <span className="inline-flex items-center gap-1"><PlayCircle className="size-3.5" aria-hidden />{course.lessonsCount} aulas · {formatMinutes(course.totalMinutes)}</span>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <Avatar name={course.teacher.name} size="sm" />
            {course.teacher.name}
          </span>
          <span className={full ? 'text-xs font-semibold text-rose-600' : 'inline-flex items-center gap-1 text-xs text-slate-500'} data-testid="seats">
            {full ? 'Esgotado' : (<><Users className="size-3.5" aria-hidden />{course.seatsLeft} vagas</>)}
          </span>
        </div>
      </div>
    </article>
  );
}
