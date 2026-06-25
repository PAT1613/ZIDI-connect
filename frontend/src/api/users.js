import { api } from './client';

export async function listUsers(params = {}) {
  const { data } = await api.get('/users/', { params });
  return data;
}

export async function getUser(id) {
  const { data } = await api.get(`/users/${id}/`);
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post('/users/', payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await api.patch(`/users/${id}/`, payload);
  return data;
}

export async function deleteUser(id) {
  await api.delete(`/users/${id}/`);
}

export async function listRoles(params = {}) {
  const { data } = await api.get('/roles/', { params });
  return data;
}
