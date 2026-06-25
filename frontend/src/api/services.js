import { api } from './client';

export async function listServices(params = {}) {
  const { data } = await api.get('/services/', { params });
  return data;
}

export async function getService(id) {
  const { data } = await api.get(`/services/${id}/`);
  return data;
}

export async function createService(payload) {
  const { data } = await api.post('/services/', payload);
  return data;
}

export async function updateService(id, payload) {
  const { data } = await api.patch(`/services/${id}/`, payload);
  return data;
}

export async function deleteService(id) {
  await api.delete(`/services/${id}/`);
}
