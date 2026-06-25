import { api, downloadBlob } from './client';

export async function listInvoices(params = {}) {
  const { data } = await api.get('/invoices/', { params });
  return data;
}

export async function getInvoice(id) {
  const { data } = await api.get(`/invoices/${id}/`);
  return data;
}

export async function createInvoice(payload) {
  const { data } = await api.post('/invoices/', payload);
  return data;
}

export async function updateInvoice(id, payload) {
  const { data } = await api.patch(`/invoices/${id}/`, payload);
  return data;
}

export async function deleteInvoice(id) {
  await api.delete(`/invoices/${id}/`);
}

export async function downloadInvoicePdf(id, invoiceNumber) {
  await downloadBlob(`/invoices/${id}/pdf/`, `${invoiceNumber || `invoice-${id}`}.pdf`);
}
