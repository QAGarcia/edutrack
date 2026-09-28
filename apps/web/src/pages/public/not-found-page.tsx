import { Compass, ShieldAlert } from 'lucide-react';
import { ButtonLink } from '../../components/ui/button';
import { Container } from '../../components/ui/misc';

export default function NotFoundPage({ what = 'página' }: { what?: string }) {
  return (
    <Container className="grid place-items-center py-24 text-center">
      <Compass className="size-12 text-brand-400" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-brand-600">Erro 404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Não encontramos este(a) {what}</h1>
      <p className="mt-2 text-slate-500">O endereço pode estar errado ou o conteúdo não está mais disponível.</p>
      <ButtonLink to="/" className="mt-8">Voltar ao início</ButtonLink>
    </Container>
  );
}

export function ForbiddenPage() {
  return (
    <Container className="grid place-items-center py-24 text-center">
      <ShieldAlert className="size-12 text-rose-400" aria-hidden />
      <p className="mt-4 text-sm font-semibold text-rose-600">Erro 403</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Acesso negado</h1>
      <p className="mt-2 text-slate-500">Seu perfil não tem permissão para acessar esta área.</p>
      <ButtonLink to="/" className="mt-8">Voltar ao início</ButtonLink>
    </Container>
  );
}
