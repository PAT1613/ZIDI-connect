import { api } from './client';

export async function listPayments(params = {}) {
  const { data } = await api.get('/payments/', { params });
  return data;
}

export async function getPayment(id) {
  const { data } = await api.get(`/payments/${id}/`);
  return data;
}

export async function createPayment(payload) {
  const { data } = await api.post('/payments/', payload);
  return data;
}

export async function deletePayment(id) {
  await api.delete(`/payments/${id}/`);
}
