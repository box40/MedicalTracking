import { UserData } from '../types';

const BASE = '/api';
const TOKEN_KEY = 'medtrack_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export async function apiRegister(email: string, password: string): Promise<{ token: string; email: string }> {
  return request('POST', '/auth/register', { email, password });
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; email: string }> {
  return request('POST', '/auth/login', { email, password });
}

export async function apiGetData(): Promise<UserData> {
  return request('GET', '/data');
}

export async function apiSaveData(data: UserData): Promise<void> {
  await request('PUT', '/data', data);
}

export async function apiForgotPassword(email: string): Promise<{ message: string; resetLink?: string }> {
  return request('POST', '/auth/forgot-password', { email });
}

export async function apiResetPassword(token: string, password: string): Promise<{ token: string; email: string }> {
  return request('POST', '/auth/reset-password', { token, password });
}

export async function apiGetProviders(): Promise<{ google: boolean; apple: boolean; yahoo: boolean }> {
  return request('GET', '/auth/providers');
}
