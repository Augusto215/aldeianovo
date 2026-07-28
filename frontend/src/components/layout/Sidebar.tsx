import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  FileBarChart,
  FolderArchive,
  Users,
  ShieldCheck,
  Leaf,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Entradas e Saídas', icon: ArrowRightLeft },
  { to: '/contas', label: 'Contas', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck, adminOnly: true },
  { to: '/documentos', label: 'Documentos (GED)', icon: FolderArchive, badge: 'Etapa 2' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const nav = NAV.filter((item) => !item.adminOnly || user?.role === 'ADMIN');

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-hairline bg-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-hairline px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
              <Leaf size={18} />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-ink">APOINME</div>
              <div className="text-[11px] text-ink-muted">Gestão Financeira</div>
            </div>
          </div>
          <button
            className="text-ink-muted lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          <span className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Menu
          </span>
          {nav.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-secondary hover:bg-plane hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-600" />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={2}
                    className={isActive ? 'text-brand-600' : 'text-ink-muted group-hover:text-ink-secondary'}
                  />
                  {label}
                  {badge && (
                    <span className="ml-auto rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#8a5a00] ring-1 ring-inset ring-warning/40">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

      </aside>
    </>
  );
}
