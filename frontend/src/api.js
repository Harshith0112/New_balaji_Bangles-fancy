const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function getProducts(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/products${q ? `?${q}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  return res.json();
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getOffer() {
  const res = await fetch(`${API_BASE}/offer`);
  if (!res.ok) return null;
  return res.json();
}

export async function adminUpdateOffer(data) {
  const res = await fetch(`${API_BASE}/offer`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const out = await res.json();
  if (!res.ok) throw new Error(out.message || 'Failed to update offer');
  return out;
}

export function getToken() {
  return localStorage.getItem('adminToken');
}

export function setToken(token) {
  localStorage.setItem('adminToken', token);
}

export function clearToken() {
  localStorage.removeItem('adminToken');
}

export async function adminLogin(email, password) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

export async function adminMe() {
  const token = getToken();
  if (!token) return { admin: null, unauthorized: false };
  const res = await fetch(`${API_BASE}/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) return { admin: null, unauthorized: true };
    return { admin: null, unauthorized: false };
  }
  const data = await res.json();
  return { ...data, unauthorized: false };
}

export async function adminProducts(opts = {}) {
  const { method = 'GET', body, id } = opts;
  const token = getToken();
  const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : {};
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function getSuggestedNbf() {
  return fetch(`${API_BASE}/products/suggest-nbf`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) throw new Error('Failed to get suggestion');
    return res.json();
  });
}

export function adminCreateProduct(formData) {
  return fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminUpdateProduct(id, formData) {
  return fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminDeleteProduct(id) {
  return fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

// Admin categories
export function adminGetCategories() {
  return getCategories();
}

export function adminCreateCategory(data) {
  return fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminUpdateCategory(id, data) {
  return fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminDeleteCategory(id) {
  return fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

// Banner functions
export async function getBanners() {
  const res = await fetch(`${API_BASE}/banners`);
  if (!res.ok) throw new Error('Failed to fetch banners');
  return res.json();
}

export async function adminGetBanners() {
  const res = await fetch(`${API_BASE}/banners/admin`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed to fetch banners');
  return res.json();
}

export function adminCreateBanner(formData) {
  return fetch(`${API_BASE}/banners`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminUpdateBanner(id, formData) {
  return fetch(`${API_BASE}/banners/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminDeleteBanner(id) {
  return fetch(`${API_BASE}/banners/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

// Orders (admin processing)
export function adminParseOrder(text) {
  return fetch(`${API_BASE}/orders/parse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminCreateOrder(data) {
  return fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminGetOrders() {
  return fetch(`${API_BASE}/orders`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminUpdateOrder(id, data) {
  return fetch(`${API_BASE}/orders/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminGetOrderBill(id) {
  return fetch(`${API_BASE}/orders/${id}/bill`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminGetOrderConfirmation(id) {
  return fetch(`${API_BASE}/orders/${id}/confirmation`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

// Draft orders (packing in Orders; generate order ID in Processing)
export function adminGetDrafts() {
  return fetch(`${API_BASE}/orders/drafts`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminCreateDraft(data) {
  return fetch(`${API_BASE}/orders/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminUpdateDraft(id, data) {
  return fetch(`${API_BASE}/orders/drafts/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminConfirmDraft(id) {
  return fetch(`${API_BASE}/orders/drafts/${id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}
