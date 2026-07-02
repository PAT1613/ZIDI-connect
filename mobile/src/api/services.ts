import { api } from './client';
import { ListParams, Paginated } from './types';

export interface Service {
  id: string | number;
  name?: string;
  description?: string;
  price?: string | number;
  billing_cycle?: string;
  sla_days?: number;
  status?: string;
  [key: string]: unknown;
}

export async function listServices(params: ListParams = {}): Promise<Paginated<Service>> {
  const { data } = await api.get<Paginated<Service>>('/services/', { params });
  return data;
}

export async function getService(id: string | number): Promise<Service> {
  const { data } = await api.get<Service>(`/services/${id}/`);
  return data;
}

export async function createService(payload: Partial<Service>): Promise<Service> {
  const { data } = await api.post<Service>('/services/', payload);
  return data;
}

export async function updateService(id: string | number, payload: Partial<Service>): Promise<Service> {
  const { data } = await api.patch<Service>(`/services/${id}/`, payload);
  return data;
}

export async function deleteService(id: string | number): Promise<void> {
  await api.delete(`/services/${id}/`);
}
