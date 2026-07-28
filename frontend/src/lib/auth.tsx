import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api, TOKEN_KEY } from './api';
import type { User } from './types';

const STORAGE_KEY = 'aldeia.auth';

interface LoginStart {
  requiresCode: true;
  pendingToken: string;
  email: string;
}

interface LoginDone {
  requiresCode: false;
  token: string;
  user: User;
}

type LoginResult = LoginStart | LoginDone;

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyCode: (pendingToken: string, code: string) => Promise<void>;
  resendCode: (pendingToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });

  /** 1ª etapa: e-mail/senha. Envia um código de verificação por e-mail (se ativado). */
  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<LoginResult>('/auth/login', { email, password });
    if (!result.requiresCode) {
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      setUser(result.user);
    }
    return result;
  }, []);

  /** 2ª etapa: confirma o código recebido por e-mail e conclui o login. */
  const verifyCode = useCallback(async (pendingToken: string, code: string) => {
    const { token, user: logged } = await api.post<{ token: string; user: User }>(
      '/auth/login/verify',
      { pendingToken, code },
    );
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logged));
    setUser(logged);
  }, []);

  const resendCode = useCallback(async (pendingToken: string) => {
    await api.post('/auth/login/resend', { pendingToken });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, verifyCode, resendCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
