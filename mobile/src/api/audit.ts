import { api } from './client';
import { ListParams, Paginated } from './types';

export interface AuditLog {
  id: string | number;
  created_at: string;
  user_email?: string | null;
  action: string;
  module: string;
  object_repr?: string;
  ip_address?: string;
  [key: string]: unknown;
}

export async function listAuditLogs(params: ListParams = {}): Promise<Paginated<AuditLog>> {
  const { data } = await api.get<Paginated<AuditLog>>('/audit-logs/', { params });
  return data;
}
