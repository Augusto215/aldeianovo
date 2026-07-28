import { useCallback, useEffect, useState } from 'react';

/** Cliente HTTP para a API do backend. */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export const TOKEN_KEY = 'aldeia.token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    // Sessão expirada: limpa credenciais e volta ao login.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('aldeia.auth');
    window.location.href = '/login';
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Envia um arquivo (multipart/form-data) autenticado. */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Baixa um arquivo autenticado (ex.: exportação CSV). */
export async function downloadFile(path: string, filename: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Erro ${res.status} ao exportar`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Hook simples de busca: dados, carregamento, erro e recarga. */
export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(reload, [reload]);

  return { data, loading, error, reload };
}
