import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, BadgeCheck, Printer, SearchCheck, XCircle } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { Logo } from '../../components/layout/app-shell';
import { Button, ButtonLink } from '../../components/ui/button';
import { Alert, Spinner } from '../../components/ui/feedback';
import { Input } from '../../components/ui/field';
import { Container, PageHeader } from '../../components/ui/misc';
import { api, ApiError, errorMessage } from '../../lib/api';
import { formatGrade, formatLongDate } from '../../lib/format';
import type { Certificate } from '../../lib/types';

export function CertificateSheet({ cert }: { cert: Certificate }) {
  return (
    <article aria-label="Certificado" className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border-8 border-double border-brand-200 bg-white p-10 text-center shadow-lift sm:p-16">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-brand-500 via-fuchsia-500 to-amber-400" aria-hidden />
      <div className="flex justify-center"><Logo /></div>
      <p className="mt-10 text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Certificado de conclusão</p>
      <p className="mt-8 text-slate-500">Certificamos que</p>
      <p className="mt-2 font-serif text-4xl font-bold text-slate-900" data-testid="certificate-student">{cert.studentName}</p>
      <p className="mt-6 text-slate-500">concluiu com aproveitamento o curso</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900" data-testid="certificate-course">{cert.courseTitle}</p>
      <p className="mt-6 text-slate-600">
        com carga horária de <strong>{cert.workloadHours} horas</strong> e média final <strong>{formatGrade(cert.finalAverage)}</strong>,
        ministrado por {cert.teacherName}.
      </p>
      <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-slate-100 pt-6 text-left text-sm">
        <div>
          <p className="text-slate-500">Emitido em</p>
          <p className="font-semibold text-slate-900">{formatLongDate(cert.issuedAt)}</p>
        </div>
        <Award className="size-14 text-amber-400" aria-hidden />
        <div className="text-right">
          <p className="text-slate-500">Código de verificação</p>
          <p className="font-mono text-lg font-bold tracking-wider text-brand-700" data-testid="certificate-code">{cert.code}</p>
        </div>
      </div>
    </article>
  );
}

export function CertificatePage() {
  const { code = '' } = useParams();
  const q = useQuery({ queryKey: ['certificate', code], queryFn: () => api.certificates.verify(code), retry: false });
  return (
    <Container className="py-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <ButtonLink to="/meu-aprendizado" variant="ghost">← Meu aprendizado</ButtonLink>
        <Button variant="outline" onClick={() => window.print()} disabled={!q.data}><Printer className="size-4" aria-hidden /> Imprimir / salvar PDF</Button>
      </div>
      {q.isLoading && <Spinner />}
      {q.isError && <Alert tone="danger">{errorMessage(q.error)}</Alert>}
      {q.data && <CertificateSheet cert={q.data} />}
    </Container>
  );
}

export function VerifyCertificatePage() {
  const [params, setParams] = useSearchParams();
  const code = params.get('codigo') ?? '';
  const [value, setValue] = useState(code);
  const q = useQuery({ queryKey: ['certificate', code], queryFn: () => api.certificates.verify(code), enabled: !!code, retry: false });
  const notFound = q.error instanceof ApiError && q.error.status === 404;

  return (
    <Container className="max-w-3xl py-12">
      <PageHeader title="Verificar certificado" description="Confirme a autenticidade de um certificado emitido pela EduTrack usando o código impresso nele." />
      <form role="search" aria-label="Verificar certificado" className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setParams(value.trim() ? { codigo: value.trim().toUpperCase() } : {}); }}>
        <label htmlFor="codigo" className="sr-only">Código do certificado</label>
        <Input id="codigo" placeholder="EDU-XXXX-XXXX" value={value} onChange={(e) => setValue(e.target.value)} className="font-mono uppercase" />
        <Button type="submit"><SearchCheck className="size-4" aria-hidden /> Verificar</Button>
      </form>

      <div className="mt-8" aria-live="polite">
        {q.isFetching && <Spinner label="Verificando..." />}
        {notFound && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <XCircle className="size-6 shrink-0 text-rose-500" aria-hidden />
            <div>
              <p className="font-semibold text-rose-800">Certificado não encontrado</p>
              <p className="text-sm text-rose-700">Nenhum certificado corresponde ao código <span className="font-mono font-semibold">{code}</span>.</p>
            </div>
          </div>
        )}
        {q.data && (
          <div className="space-y-6">
            <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <BadgeCheck className="size-6 shrink-0 text-emerald-600" aria-hidden />
              <div>
                <p className="font-semibold text-emerald-800">Certificado válido</p>
                <p className="text-sm text-emerald-700">Emitido para {q.data.studentName} em {formatLongDate(q.data.issuedAt)}.</p>
              </div>
            </div>
            <CertificateSheet cert={q.data} />
          </div>
        )}
      </div>
    </Container>
  );
}
