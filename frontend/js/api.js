// Tynd fetch-wrapper om backendens REST API. Nginx proxier /api/ til backenden (samme origin).

export class ApiError extends Error {
  constructor(status, error) {
    super(error?.message ?? `HTTP ${status}`);
    this.status = status;
    this.code = error?.code;
    this.details = error?.details ?? [];
  }
}

async function request(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  // Fejl kommer altid som { error: { code, message, details? } } (research R-15).
  if (!response.ok) throw new ApiError(response.status, data?.error);
  return data;
}

function query(params) {
  const entries = Object.entries(params).filter(([, value]) => value !== '' && value != null);
  if (entries.length === 0) return '';
  // encodeURIComponent giver %20 for mellemrum; URLSearchParams giver '+', som backendens
  // OpenAPI-validering afviser (fx "LOFT Suite", "United Kingdom").
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`;
}

export const api = {
  listRoomTypes: () => request('GET', '/room-types'),
  listBookings: (filters = {}) => request('GET', `/bookings${query(filters)}`),
  getBooking: (id) => request('GET', `/bookings/${id}`),
  createBooking: (input) => request('POST', '/bookings', input),
  updateBooking: (id, input) => request('PUT', `/bookings/${id}`, input),
  deleteBooking: (id) => request('DELETE', `/bookings/${id}`),
  get: (path, params = {}) => request('GET', `${path}${query(params)}`),
};
