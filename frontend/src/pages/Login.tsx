import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Leaf, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel de marca */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-700 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Leaf size={22} />
          </span>
          <div>
            <div className="text-lg font-bold">APOINME</div>
            <div className="text-xs text-white/70">Gestão Financeira</div>
          </div>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Controle financeiro claro para fortalecer a articulação dos povos
            indígenas.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Entradas e saídas, contas, relatórios e indicadores — em um só lugar,
            de qualquer dispositivo.
          </p>
        </div>
        <p className="text-xs text-white/50">
          Articulação dos Povos Indígenas do Nordeste, Minas Gerais e Espírito
          Santo.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex w-full items-center justify-center bg-plane p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Leaf size={22} />
            </span>
          </div>

          <h1 className="text-2xl font-semibold text-ink">Acessar plataforma</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use suas credenciais para entrar.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
                E-mail
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                <Mail size={16} className="text-ink-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                  placeholder="voce@apoinme.org.br"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-secondary">
                Senha
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-hairline bg-white px-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
                <Lock size={16} className="text-ink-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm outline-none"
                  placeholder="••••••••"
                />
              </div>
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-ink-secondary">
                <input type="checkbox" className="rounded border-hairline" />
                Lembrar-me
              </label>
              <Link
                to="/recuperar-senha"
                className="font-medium text-brand-600 hover:underline"
              >
                Esqueci a senha
              </Link>
            </div>

            {error && <p className="text-sm text-critical">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
