import { api } from './client';
import { ListParams, Paginated } from './types';

export interface UsageRecord {
  id: string | number;
  subscription: string | number;
  period_start: string;
  period_end: string;
  quantity: string | number;
  unit?: string;
  notes?: string;
  recorded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export async function listUsage(params: ListParams = {}): Promise<Paginated<UsageRecord>> {
  const { data } = await api.get<Paginated<UsageRecord>>('/usage/', { params });
  return data;
}

export async function getUsage(id: string | number): Promise<UsageRecord> {
  const { data } = await api.get<UsageRecord>(`/usage/${id}/`);
  return data;
}

export async function createUsage(payload: {
  subscription_id: string | number;
  period_start: string;
  period_end: string;
  quantity: string | number;
  unit?: string;
  notes?: string;
}): Promise<UsageRecord> {
  const { data } = await api.post<UsageRecord>('/usage/', payload);
  return data;
}

export async function deleteUsage(id: string | number): Promise<void> {
  await api.delete(`/usage/${id}/`);
}
