import { api } from './client';
import { ListParams, Paginated } from './types';
import type { AuthUser, UserRole } from './auth';

export async function listUsers(params: ListParams = {}): Promise<Paginated<AuthUser>> {
  const { data } = await api.get<Paginated<AuthUser>>('/users/', { params });
  return data;
}

export async function getUser(id: string | number): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>(`/users/${id}/`);
  return data;
}

export async function createUser(payload: Partial<AuthUser> & { password?: string }): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/users/', payload);
  return data;
}

export async function updateUser(id: string | number, payload: Partial<AuthUser>): Promise<AuthUser> {
  const { data } = await api.patch<AuthUser>(`/users/${id}/`, payload);
  return data;
}

export async function deleteUser(id: string | number): Promise<void> {
  await api.delete(`/users/${id}/`);
}

export async function listRoles(params: ListParams = {}): Promise<Paginated<UserRole>> {
  const { data } = await api.get<Paginated<UserRole>>('/roles/', { params });
  return data;
}
