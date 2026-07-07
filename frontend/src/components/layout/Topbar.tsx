import { Menu, LogOut, Search, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface TopbarProps {
  onMenu: () => void;
  title: string;
}

export function Topbar({ onMenu, title }: TopbarProps) {
  const { user, logout } = useAuth();
  const initials =
    user?.name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? 'US';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-white/90 px-4 backdrop-blur lg:px-6">
      <button
        className="text-ink-secondary lg:hidden"
        onClick={onMenu}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>

      <h1 className="text-base font-semibold text-ink">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-hairline bg-plane px-3 py-1.5 text-sm text-ink-muted md:flex">
          <Search size={15} />
          <input
            className="w-40 bg-transparent outline-none placeholder:text-ink-muted"
            placeholder="Buscar…"
          />
        </div>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-plane"
          aria-label="Notificações"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-critical" />
        </button>

        <div className="mx-1 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            {initials}
          </span>
          <div className="hidden leading-tight sm:block">
            <div className="text-sm font-medium text-ink">{user?.name}</div>
            <div className="text-[11px] text-ink-muted">{user?.email}</div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-plane hover:text-critical"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
