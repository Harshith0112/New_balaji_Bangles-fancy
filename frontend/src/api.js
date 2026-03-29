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

/** Public: track order by store order ID (e.g. NB00012026) — no login */
export function trackOrder(orderId) {
  const enc = encodeURIComponent(String(orderId).trim());
  return fetch(`${API_BASE}/orders/track/${enc}`).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Order not found');
    return data;
  });
}

// Public: create an online order (no login)
export function createOnlineOrder(data) {
  return fetch(`${API_BASE}/orders/online`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to place order');
    return out;
  });
}

// Public: get lightweight order history by phone
export function getOrdersByPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return Promise.resolve({ orders: [] });
  const enc = encodeURIComponent(digits);
  return fetch(`${API_BASE}/orders/by-phone/${enc}`)
    .then(async (res) => {
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.message || 'Failed to load orders');
      return out;
    });
}

/** Public: validate coupon for cart subtotal */
export function validateCoupon(code, subtotal) {
  return fetch(`${API_BASE}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, subtotal }),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to validate coupon');
    return out;
  });
}

export function adminGetCoupons() {
  return fetch(`${API_BASE}/coupons`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(async (res) => {
    if (!res.ok) throw new Error('Failed to load coupons');
    return res.json();
  });
}

export function adminCreateCoupon(data) {
  return fetch(`${API_BASE}/coupons`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to create coupon');
    return out;
  });
}

export function adminUpdateCoupon(id, data) {
  return fetch(`${API_BASE}/coupons/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to update coupon');
    return out;
  });
}

export function adminDeleteCoupon(id) {
  return fetch(`${API_BASE}/coupons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(async (res) => {
    if (!res.ok) {
      const out = await res.json().catch(() => ({}));
      throw new Error(out.message || 'Failed to delete');
    }
    return res.json();
  });
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

// ----- Customer auth (no relation to admin token) -----
const CUSTOMER_TOKEN_KEY = 'nbf-customer-token';

export function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function clearCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export function customerRegister({ name, phone, password }) {
  return fetch(`${API_BASE}/customers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, password }),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Registration failed');
    return out;
  });
}

export function customerLogin({ phone, password }) {
  return fetch(`${API_BASE}/customers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Login failed');
    return out;
  });
}

export function customerMe() {
  const token = getCustomerToken();
  return fetch(`${API_BASE}/customers/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to load profile');
    return out;
  });
}

export function customerAddAddress(addressPayload) {
  const token = getCustomerToken();
  return fetch(`${API_BASE}/customers/addresses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(addressPayload),
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to add address');
    return out;
  });
}

export function customerDeleteAddress(id) {
  const token = getCustomerToken();
  return fetch(`${API_BASE}/customers/addresses/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to delete address');
    return out;
  });
}

export function customerOrders() {
  const token = getCustomerToken();
  return fetch(`${API_BASE}/customers/orders`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to load orders');
    return out;
  });
}

/** Authenticated: one order with line items (same phone as account) */
export function customerOrderDetail(id) {
  const token = getCustomerToken();
  return fetch(`${API_BASE}/customers/orders/${encodeURIComponent(String(id))}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.message || 'Failed to load order');
    return out;
  });
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
  const token = getToken();
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  return fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isForm ? data : JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) return res.json().then((d) => { throw new Error(d.message || 'Failed'); });
    return res.json();
  });
}

export function adminUpdateCategory(id, data) {
  const token = getToken();
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  return fetch(`${API_BASE}/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isForm ? data : JSON.stringify(data),
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
