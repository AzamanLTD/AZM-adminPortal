const BASE_URL = import.meta.env.VITE_API_URL || 'https://azm-backend.onrender.com';

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) window.location.assign('/login');
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const controlPlaneApi = {
  staff: {
    list: () => request('/api/admin/control-plane/staff'),
    detail: (id) => request(`/api/admin/control-plane/staff/${id}`),
    create: (data) => request('/api/admin/control-plane/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/admin/control-plane/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    suspend: (id, reason) => request(`/api/admin/control-plane/staff/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
    activate: (id) => request(`/api/admin/control-plane/staff/${id}/activate`, { method: 'POST' }),
    deactivate: (id, reason) => request(`/api/admin/control-plane/staff/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) }),
    permissions: (id, permissions) => request(`/api/admin/control-plane/staff/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
    duties: (id, dutyKey) => request(`/api/admin/control-plane/staff/${id}/duties`, { method: 'POST', body: JSON.stringify({ dutyKey }) }),
    revokeDuty: (id, dutyId) => request(`/api/admin/control-plane/staff/${id}/duties/${dutyId}`, { method: 'DELETE' }),
    activity: (id) => request(`/api/admin/control-plane/staff/${id}/activity`),
  },
  departments: {
    list: () => request('/api/admin/control-plane/departments'),
    create: (data) => request('/api/admin/control-plane/departments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/api/admin/control-plane/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  permissions: () => request('/api/admin/control-plane/permissions'),
  duties: () => request('/api/admin/control-plane/duties'),
  presence: () => request('/api/admin/control-plane/presence'),
  activity: (page = 1, limit = 50) => request(`/api/admin/control-plane/activity?page=${page}&limit=${limit}`),
  reconciliation: {
    list: (page = 1, limit = 50, status = 'OPEN') => request(`/api/admin/control-plane/exceptions?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`),
    claim: (id) => request(`/api/admin/control-plane/exceptions/${id}/claim`, { method: 'POST' }),
    release: (id) => request(`/api/admin/control-plane/exceptions/${id}/release`, { method: 'POST' }),
    resolve: (id, reason) => request(`/api/admin/control-plane/exceptions/${id}/resolve`, { method: 'POST', body: JSON.stringify({ reason }) }),
  },
};

export function getControlPlaneSummary() { return request('/api/admin/control-plane/summary'); }
export function getControlPlaneActivity(page = 1, limit = 50) { return controlPlaneApi.activity(page, limit); }
