import { api, downloadBlob } from './client';

export async function getDashboardReport() {
  const { data } = await api.get('/reports/dashboard/');
  return data;
}

export async function exportReport(type, format, params = {}) {
  const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
  const filename = `${type}-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
  await downloadBlob(`/reports/${type}/`, filename, { ...params, format: ext });
}
