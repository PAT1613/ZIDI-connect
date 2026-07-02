import { api } from './client';
import { ListParams, Paginated } from './types';

export interface Escalation {
  id: string | number;
  customer_service?: string | number | Record<string, unknown>;
  customer_service_id?: string | number;
  customer_name?: string;
  assigned_to?: string | number | null;
  assigned_to_name?: string | null;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed' | string;
  reason?: string;
  notes?: string;
  opened_at?: string;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export async function listEscalations(params: ListParams = {}): Promise<Paginated<Escalation>> {
  const { data } = await api.get<Paginated<Escalation>>('/escalations/', { params });
  return data;
}

export async function getEscalation(id: string | number): Promise<Escalation> {
  const { data } = await api.get<Escalation>(`/escalations/${id}/`);
  return data;
}

export async function createEscalation(payload: Partial<Escalation>): Promise<Escalation> {
  const { data } = await api.post<Escalation>('/escalations/', payload);
  return data;
}

export async function updateEscalation(id: string | number, payload: Partial<Escalation>): Promise<Escalation> {
  const { data } = await api.patch<Escalation>(`/escalations/${id}/`, payload);
  return data;
}
