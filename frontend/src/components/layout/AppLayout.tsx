import { useEffect, useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/lib/auth';

const TITLES: Record<string, string> = {
  '/': 'Dashboard Financeiro',
  '/transacoes': 'Entradas e Saídas',
  '/contas': 'Gestão de Contas',
  '/relatorios': 'Relatórios e Exportação',
  '/usuarios': 'Controle de Usuários',
  '/auditoria': 'Trilha de Auditoria',
  '/documentos': 'Documentos (GED)',
};

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();

  const title = TITLES[pathname] ?? 'APOINME';

  // Título da aba do navegador acompanha a página atual.
  useEffect(() => {
    document.title = `${title} · APOINME`;
  }, [title]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-plane">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenuOpen(true)} title={title} />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
