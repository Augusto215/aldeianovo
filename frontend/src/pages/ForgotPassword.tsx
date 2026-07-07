import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

/**
 * Recuperação de senha. O backend gera o token; enquanto não há serviço
 * de e-mail configurado, o link é registrado no log do servidor.
 */
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-plane p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Leaf size={22} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-ink">APOINME</div>
            <div className="text-[11px] text-ink-muted">Gestão Financeira</div>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl border border-hairline bg-white p-6 text-center">
            <CheckCircle2 size={32} className="mx-auto text-good" />
            <h1 className="mt-3 text-lg font-semibold text-ink">
              Verifique seu e-mail
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Se <strong>{email}</strong> estiver cadastrado, enviaremos as
              instruções para redefinir a senha.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            >
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-ink">Recuperar senha</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Informe o e-mail cadastrado e enviaremos as instruções.
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

              {error && <p className="text-sm text-critical">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Enviar instruções
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
              >
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
