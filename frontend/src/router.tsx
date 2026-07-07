import { createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Accounts } from '@/pages/Accounts';
import { Reports } from '@/pages/Reports';
import { Users } from '@/pages/Users';
import { Documents } from '@/pages/Documents';
import { ForgotPassword } from '@/pages/ForgotPassword';

/** Envolve toda a árvore com o provider de autenticação. */
function Root({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export const router = createBrowserRouter([
  {
    element: (
      <Root>
        <AppLayout />
      </Root>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/transacoes', element: <Transactions /> },
      { path: '/contas', element: <Accounts /> },
      { path: '/relatorios', element: <Reports /> },
      { path: '/usuarios', element: <Users /> },
      { path: '/documentos', element: <Documents /> },
    ],
  },
  {
    path: '/login',
    element: (
      <Root>
        <Login />
      </Root>
    ),
  },
  {
    path: '/recuperar-senha',
    element: (
      <Root>
        <ForgotPassword />
      </Root>
    ),
  },
]);
