import { postJson } from './http';

export const login = (username: string, password: string) => postJson('/api/auth/login', { username, password });
export const logout = () => postJson('/api/auth/logout', {});
export const switchRole = (role: string) => postJson('/api/auth/role', { role });
export async function getMe() {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}
