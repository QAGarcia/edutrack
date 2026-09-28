import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap, Presentation } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../../auth/auth-context';
import { Logo } from '../../components/layout/app-shell';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/feedback';
import { Field, Input } from '../../components/ui/field';
import { ApiError, errorMessage } from '../../lib/api';
import { cn } from '../../lib/cn';
import { HOME_BY_ROLE } from '../../lib/format';

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12">
        <div className="animate-fade-in w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-fuchsia-700 lg:block" aria-hidden>
        <div className="absolute -right-20 -top-20 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-10 size-96 rounded-full bg-white/10" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-auto [&_span]:text-white [&_a]:text-white"><Logo /></div>
          <p className="text-3xl font-bold leading-tight">"Educação é a arma mais poderosa que você pode usar para mudar o mundo."</p>
          <p className="mt-3 text-brand-100">— Nelson Mandela</p>
        </div>
      </div>
    </div>
  );
}

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setServerError(null);
    try {
      const user = await login(email, password);
      toast.success(`Bem-vindo(a), ${user.name.split(' ')[0]}!`);
      const redirect = params.get('redirect');
      navigate(redirect && redirect.startsWith('/') ? redirect : HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : errorMessage(err));
    }
  });

  return (
    <AuthLayout title="Entrar na sua conta" subtitle={<>Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-brand-600 hover:text-brand-700">Cadastre-se grátis</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Formulário de login">
        {params.get('sessao') === 'expirada' && <Alert tone="warning">Sua sessão expirou. Entre novamente.</Alert>}
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <Field label="E-mail" error={formState.errors.email?.message}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="email" autoComplete="username" error={formState.errors.email?.message} {...register('email')} />}
        </Field>
        <Field label="Senha" error={formState.errors.password?.message}>
          {({ id, describedBy }) => <PasswordInput id={id} aria-describedby={describedBy} autoComplete="current-password" error={formState.errors.password?.message} {...register('password')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Entrar</Button>
      </form>
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Contas de demonstração (senha: Senha@123)</p>
        <p className="mt-1">aluno@edutrack.dev · marina.prof@edutrack.dev · admin@edutrack.dev</p>
      </div>
    </AuthLayout>
  );
}

const registerSchema = z
  .object({
    name: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres').max(120, 'Nome muito longo'),
    email: z.string().trim().min(1, 'Informe seu e-mail').email('E-mail inválido'),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .max(64, 'Máximo de 64 caracteres')
      .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
      .regex(/[a-z]/, 'Inclua ao menos uma letra minúscula')
      .regex(/\d/, 'Inclua ao menos um número'),
    confirm: z.string().min(1, 'Confirme sua senha'),
    role: z.enum(['STUDENT', 'TEACHER']),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'As senhas não conferem' });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState, watch, setValue, setError } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STUDENT' },
  });
  const role = watch('role');

  const onSubmit = handleSubmit(async ({ confirm: _c, ...data }) => {
    setServerError(null);
    try {
      const user = await signUp(data);
      toast.success('Conta criada com sucesso!');
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') setError('email', { message: err.message });
      else setServerError(errorMessage(err));
    }
  });

  const e = formState.errors;
  return (
    <AuthLayout title="Crie sua conta" subtitle={<>Já tem conta? <Link to="/entrar" className="font-semibold text-brand-600 hover:text-brand-700">Entrar</Link></>}>
      <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Formulário de cadastro">
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Quero me cadastrar como</legend>
          <div className="grid grid-cols-2 gap-3">
            {([['STUDENT', 'Aluno', GraduationCap], ['TEACHER', 'Professor', Presentation]] as const).map(([value, label, Icon]) => (
              <label key={value} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium transition', role === value ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400')}>
                <input type="radio" value={value} className="sr-only" checked={role === value} onChange={() => setValue('role', value)} name="role" />
                <Icon className="size-5" aria-hidden /> {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Nome completo" error={e.name?.message}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} autoComplete="name" error={e.name?.message} {...register('name')} />}
        </Field>
        <Field label="E-mail" error={e.email?.message}>
          {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} type="email" autoComplete="email" error={e.email?.message} {...register('email')} />}
        </Field>
        <Field label="Senha" error={e.password?.message} hint="Mínimo 8 caracteres, com maiúscula, minúscula e número.">
          {({ id, describedBy }) => <PasswordInput id={id} aria-describedby={describedBy} autoComplete="new-password" error={e.password?.message} {...register('password')} />}
        </Field>
        <Field label="Confirmar senha" error={e.confirm?.message}>
          {({ id, describedBy }) => <PasswordInput id={id} aria-describedby={describedBy} autoComplete="new-password" error={e.confirm?.message} {...register('confirm')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>Criar conta</Button>
      </form>
    </AuthLayout>
  );
}
