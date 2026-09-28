import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '../../auth/auth-context';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
import { Field, Input, Textarea } from '../../components/ui/field';
import { Avatar, Container, PageHeader } from '../../components/ui/misc';
import { api, ApiError, errorMessage } from '../../lib/api';
import { formatDate, ROLE_LABEL } from '../../lib/format';

const profileSchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter ao menos 3 caracteres').max(120, 'Nome muito longo'),
  bio: z.string().max(300, 'Máximo de 300 caracteres'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/, 'Mínimo 8 caracteres, com maiúscula, minúscula e número'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { path: ['confirm'], message: 'As senhas não conferem' });

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const profile = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { name: user!.name, bio: user!.bio } });
  const pwd = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });
  const bio = profile.watch('bio') ?? '';

  const saveProfile = profile.handleSubmit(async (data) => {
    try {
      updateUser(await api.auth.updateProfile(data));
      toast.success('Perfil atualizado');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  });

  const savePassword = pwd.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      pwd.reset();
      toast.success('Senha alterada com sucesso');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CURRENT_PASSWORD') pwd.setError('currentPassword', { message: err.message });
      else toast.error(errorMessage(err));
    }
  });

  return (
    <Container className="max-w-3xl py-10">
      <PageHeader title="Meu perfil" />
      <Card className="mb-6 flex items-center gap-4 p-6">
        <Avatar name={user!.name} size="lg" />
        <div>
          <p className="text-lg font-semibold text-slate-900">{user!.name}</p>
          <p className="text-sm text-slate-500">{user!.email}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Badge tone="brand">{ROLE_LABEL[user!.role]}</Badge> membro desde {formatDate(user!.createdAt)}</div>
        </div>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Dados pessoais" description="Como você aparece para professores e colegas." />
        <form onSubmit={saveProfile} noValidate className="space-y-5 p-6" aria-label="Dados pessoais">
          <Field label="Nome" error={profile.formState.errors.name?.message}>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} error={profile.formState.errors.name?.message} {...profile.register('name')} />}
          </Field>
          <Field label="Bio" error={profile.formState.errors.bio?.message} hint={`${bio.length}/300 caracteres`}>
            {({ id, describedBy }) => <Textarea id={id} rows={3} aria-describedby={describedBy} error={profile.formState.errors.bio?.message} {...profile.register('bio')} />}
          </Field>
          <div className="flex justify-end"><Button type="submit" loading={profile.formState.isSubmitting}>Salvar alterações</Button></div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Alterar senha" />
        <form onSubmit={savePassword} noValidate className="space-y-5 p-6" aria-label="Alterar senha">
          <Field label="Senha atual" error={pwd.formState.errors.currentPassword?.message}>
            {({ id, describedBy }) => <Input id={id} type="password" autoComplete="current-password" aria-describedby={describedBy} error={pwd.formState.errors.currentPassword?.message} {...pwd.register('currentPassword')} />}
          </Field>
          <Field label="Nova senha" error={pwd.formState.errors.newPassword?.message}>
            {({ id, describedBy }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} error={pwd.formState.errors.newPassword?.message} {...pwd.register('newPassword')} />}
          </Field>
          <Field label="Confirmar nova senha" error={pwd.formState.errors.confirm?.message}>
            {({ id, describedBy }) => <Input id={id} type="password" autoComplete="new-password" aria-describedby={describedBy} error={pwd.formState.errors.confirm?.message} {...pwd.register('confirm')} />}
          </Field>
          <div className="flex justify-end"><Button type="submit" loading={pwd.formState.isSubmitting}>Alterar senha</Button></div>
        </form>
      </Card>
    </Container>
  );
}
