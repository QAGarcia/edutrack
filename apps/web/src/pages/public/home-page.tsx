import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, BookOpenCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth-context';
import { CourseCard } from '../../components/course/course-card';
import { themeOf } from '../../components/course/course-visuals';
import { ButtonLink } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/feedback';
import { Container } from '../../components/ui/misc';
import { api } from '../../lib/api';
import { HOME_BY_ROLE } from '../../lib/format';

export default function HomePage() {
  const { user } = useAuth();
  const featured = useQuery({ queryKey: ['courses', 'featured'], queryFn: () => api.courses.list({ sort: 'popular', limit: 3 }) });
  const categories = useQuery({ queryKey: ['categories'], queryFn: api.categories.list });

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-slate-50">
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="absolute -left-24 top-40 size-72 rounded-full bg-fuchsia-200/30 blur-3xl" aria-hidden />
        <Container className="relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-100">
              <Sparkles className="size-3.5" aria-hidden /> Aprenda no seu ritmo
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Cursos que levam você <span className="bg-gradient-to-r from-brand-600 to-fuchsia-600 bg-clip-text text-transparent">mais longe</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Tecnologia, dados, negócios e educação com professores especialistas, acompanhamento de progresso e certificado verificável.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/cursos" size="lg">Explorar cursos <ArrowRight className="size-4" aria-hidden /></ButtonLink>
              {user ? (
                <ButtonLink to={HOME_BY_ROLE[user.role]} size="lg" variant="outline">Ir para meu painel</ButtonLink>
              ) : (
                <ButtonLink to="/cadastro" size="lg" variant="outline">Criar conta grátis</ButtonLink>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4" aria-hidden>
            {[
              { icon: BookOpenCheck, title: 'Aulas objetivas', text: 'Conteúdo direto ao ponto, com progresso salvo.' },
              { icon: Award, title: 'Certificado', text: 'Emitido ao ser aprovado, com código único.' },
              { icon: ShieldCheck, title: 'Verificável', text: 'Qualquer pessoa confirma a autenticidade.' },
              { icon: Sparkles, title: 'Professores', text: 'Especialistas com experiência de mercado.' },
            ].map(({ icon: Icon, title, text }, i) => (
              <div key={title} className={`rounded-2xl border border-white bg-white/80 p-5 shadow-card backdrop-blur ${i % 2 ? 'translate-y-6' : ''}`}>
                <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white"><Icon className="size-5" /></span>
                <p className="mt-4 font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-16">
        <h2 className="text-xl font-bold text-slate-900">Explore por área</h2>
        <ul className="mt-5 flex flex-wrap gap-3" aria-label="Categorias">
          {categories.data?.map((c) => {
            const { icon: Icon } = themeOf(c.slug);
            return (
              <li key={c.id}>
                <Link to={`/cursos?categoria=${c.slug}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700">
                  <Icon className="size-4" aria-hidden /> {c.name}
                  <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">{c.publishedCourses}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-14 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Mais procurados</h2>
            <p className="mt-1 text-slate-500">Os cursos com mais alunos no momento.</p>
          </div>
          <Link to="/cursos?ordem=popular" className="hidden text-sm font-semibold text-brand-600 hover:text-brand-700 sm:block">Ver todos →</Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-80" />)}
          {featured.data?.data.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </Container>
    </>
  );
}
