import { useState, type FormEvent } from 'react';
import { UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Modal, Field, inputClass } from '@/components/ui/Modal';
import { Loading, LoadError } from '@/components/ui/Async';
import { api, useFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { User, Role } from '@/lib/types';

const ROLE_STYLE: Record<Role, string> = {
  ADMIN: 'bg-brand-50 text-brand-700 ring-brand-200',
  COORDENACAO: 'bg-[#7c3aed]/10 text-[#5b21b6] ring-[#7c3aed]/30',
  FINANCEIRO: 'bg-[#2a78d6]/10 text-[#1c5cab] ring-[#2a78d6]/30',
  LEITURA: 'bg-plane text-ink-secondary ring-hairline',
};

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'COORDENACAO', label: 'Coordenação' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'LEITURA', label: 'Leitura' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'FINANCEIRO' as Role,
};

export function Users() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'ADMIN';

  const { data: users, loading, error, reload } = useFetch<User[]>('/users');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormError(null);
    setModalOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, {
          name: form.name,
          role: form.role,
        });
      } else {
        await api.post('/users', form);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: User) {
    try {
      await api.put(`/users/${u.id}`, { active: !u.active });
      reload();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) return <Loading />;
  if (error || !users) return <LoadError message={error ?? 'Erro ao carregar'} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          Gerencie perfis de acesso e permissões da equipe.
        </p>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <UserPlus size={15} /> Convidar usuário
          </button>
        )}
      </div>

      <Card>
        <CardHeader title="Usuários" subtitle={`${users.length} cadastrados`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-5 py-3 font-medium">Usuário</th>
                <th className="px-5 py-3 font-medium">Perfil</th>
                <th className="px-5 py-3 font-medium">Situação</th>
                {isAdmin && (
                  <th className="px-5 py-3 text-right font-medium">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-hairline last:border-0 hover:bg-plane"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                        {u.name
                          .split(' ')
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <div className="font-medium text-ink">{u.name}</div>
                        <div className="text-xs text-ink-muted">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_STYLE[u.role]}`}
                    >
                      {u.role === 'ADMIN' && <ShieldCheck size={12} />}
                      {u.roleLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          u.active ? 'bg-good' : 'bg-ink-muted'
                        }`}
                      />
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        Editar
                      </button>
                      {u.id !== me?.id && (
                        <button
                          onClick={() => toggleActive(u)}
                          className="ml-3 text-sm font-medium text-ink-secondary hover:underline"
                        >
                          {u.active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Criar / editar usuário */}
      <Modal
        open={modalOpen}
        title={editing ? `Editar ${editing.name}` : 'Convidar usuário'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </Field>
          {!editing && (
            <>
              <Field label="E-mail">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="pessoa@apoinme.org.br"
                />
              </Field>
              <Field label="Senha inicial (mín. 8 caracteres)">
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </>
          )}
          <Field label="Perfil de acesso">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          {formError && <p className="text-sm text-critical">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-70"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
