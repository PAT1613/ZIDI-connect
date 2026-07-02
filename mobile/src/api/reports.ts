import { api, downloadToCache } from './client';

export interface MonthRevenue {
  month: string;
  total: string | number;
}

export interface ChannelStatusCount {
  channel: string;
  status: string;
  count: number;
}

export interface DashboardReport {
  customers: { active: number; total: number };
  services: { active: number };
  subscriptions: { upcoming_renewals: number; expired: number; active: number };
  revenue: {
    month_to_date: number | string;
    total: number | string;
    by_month: MonthRevenue[];
  };
  invoices: { pending: number; overdue: number };
  escalations: { open: number };
  notifications_30d: ChannelStatusCount[];
}

export async function getDashboardReport(): Promise<DashboardReport> {
  const { data } = await api.get<DashboardReport>('/reports/dashboard/');
  return data;
}

export type ReportType =
  | 'customers'
  | 'services'
  | 'revenue'
  | 'invoices'
  | 'payments'
  | 'notifications';

export type ReportFormat = 'pdf' | 'xlsx';

export async function exportReport(
  type: ReportType,
  format: ReportFormat,
  params: Record<string, string | number | undefined> = {},
): Promise<string> {
  const ext = format === 'pdf' ? 'pdf' : 'xlsx';
  const filename = `report-${type}-${Date.now()}.${ext}`;
  return downloadToCache(`/reports/${type}/`, filename, { ...params, format });
}
