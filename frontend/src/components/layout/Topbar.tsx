import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface TopbarProps {
  onMenu: () => void;
  title: string;
}

export function Topbar({ onMenu, title }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const initials =
    user?.name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'US';

  // Busca global: leva para Entradas e Saídas com o termo aplicado.
  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/transacoes?q=${encodeURIComponent(q)}` : '/transacoes');
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        className="text-ink-secondary lg:hidden"
        onClick={onMenu}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <h1 className="truncate text-base font-semibold tracking-tight text-ink">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <form
          onSubmit={onSearch}
          className="hidden items-center gap-2 rounded-full border border-hairline bg-plane px-3.5 py-1.5 text-sm transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100 md:flex"
        >
          <Search size={15} className="shrink-0 text-ink-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44 bg-transparent text-ink outline-none placeholder:text-ink-muted lg:w-56"
            placeholder="Buscar movimentações…"
            aria-label="Buscar movimentações"
          />
        </form>

        <div className="mx-1 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-semibold text-white shadow-sm">
            {initials}
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-medium text-ink">{user?.name}</div>
            <div className="text-[11px] text-ink-muted">{user?.email}</div>
          </div>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-hairline sm:block" />

        <button
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-critical/10 hover:text-critical"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
