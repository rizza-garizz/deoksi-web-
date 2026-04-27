/**
 * Deoksi Admin - Shared Utilities
 * Auth, API calls, and UI helpers
 */

const API_BASE = '/api';

// =====================
// AUTH MANAGEMENT
// =====================
function getToken() {
  return localStorage.getItem('deoksi_admin_token');
}

function getUser() {
  const raw = localStorage.getItem('deoksi_admin_user');
  return raw ? JSON.parse(raw) : null;
}

function saveAuth(token, user) {
  localStorage.setItem('deoksi_admin_token', token);
  localStorage.setItem('deoksi_admin_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('deoksi_admin_token');
  localStorage.removeItem('deoksi_admin_user');
}

function setSessionMessage(message) {
  localStorage.setItem('deoksi_admin_flash', message);
}

function consumeSessionMessage() {
  const message = localStorage.getItem('deoksi_admin_flash');
  if (message) {
    localStorage.removeItem('deoksi_admin_flash');
  }
  return message;
}

function requireLogin() {
  if (!getToken()) {
    window.location.href = '/admin/index.html';
    return false;
  }
  return true;
}

function logout() {
  clearAuth();
  window.location.href = '/admin/index.html';
}

// =====================
// API HELPERS
// =====================
async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const fullUrl = `${API_BASE}${endpoint}`;
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // 🔍 DEBUG: Before fetch
  console.log(`[apiCall] ➡️  ${method} ${fullUrl}`, {
    hasToken: Boolean(token),
    headers: Object.keys(headers),
  });

  let response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (networkError) {
    // 🔍 DEBUG: Network error (server unreachable, CORS, DNS, etc.)
    console.error(`[apiCall] ❌ NETWORK ERROR on ${method} ${fullUrl}`, {
      errorType: networkError.name,
      errorMessage: networkError.message,
      stack: networkError.stack,
    });
    throw new Error('Tidak dapat terhubung ke server.');
  }

  // 🔍 DEBUG: After fetch — response received
  console.log(`[apiCall] ⬅️  ${method} ${fullUrl} → status ${response.status}`, {
    ok: response.ok,
    statusText: response.statusText,
    contentType: response.headers.get('content-type'),
    url: response.url,
  });

  try {
    const data = await response.json();

    // 🔍 DEBUG: Parsed JSON data
    console.log(`[apiCall] 📦 ${method} ${fullUrl} → data:`, {
      keys: data ? Object.keys(data) : null,
      hasPagination: Boolean(data?.pagination),
      dataPreview: data?.data ? `[${Array.isArray(data.data) ? data.data.length + ' items' : 'object'}]` : 'N/A',
    });

    if (response.status === 401) {
      console.warn(`[apiCall] 🔒 401 Unauthorized on ${fullUrl} — redirecting to login`);
      setSessionMessage('Sesi login habis atau tidak valid. Silakan login lagi.');
      clearAuth();
      window.location.href = '/admin/index.html';
      return null;
    }

    if (!response.ok) {
      const errMsg = data.error || 'Terjadi kesalahan';
      console.error(`[apiCall] ⚠️  HTTP ${response.status} on ${fullUrl}:`, errMsg);
      showToast(errMsg, 'error');
      throw new Error(errMsg);
    }

    return data;
  } catch (parseError) {
    // 🔍 DEBUG: JSON parse failure or rethrown error
    console.error(`[apiCall] ❌ PARSE/RESPONSE ERROR on ${method} ${fullUrl}`, {
      errorType: parseError.name,
      errorMessage: parseError.message,
      responseStatus: response.status,
      contentType: response.headers.get('content-type'),
    });
    throw parseError;
  }
}

function isValidUrl(value, options = {}) {
  const {
    allowRelative = false,
    allowedProtocols = ['http:', 'https:'],
  } = options;

  const input = String(value || '').trim();
  if (!input) return false;

  if (allowRelative && (input.startsWith('/') || input.startsWith('#'))) {
    return true;
  }

  try {
    const parsed = new URL(input, window.location.origin);
    if (allowRelative && parsed.origin === window.location.origin) {
      return true;
    }
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

function setButtonLoading(button, isLoading, loadingText, idleText) {
  if (!button) return;

  if (!button.dataset.idleText) {
    button.dataset.idleText = idleText || button.textContent || '';
  }
  if (loadingText) {
    button.dataset.loadingText = loadingText;
  }

  button.disabled = Boolean(isLoading);
  button.classList.toggle('is-loading', Boolean(isLoading));
  button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  button.textContent = isLoading
    ? (button.dataset.loadingText || loadingText || 'Memproses...')
    : (idleText || button.dataset.idleText);
}

// =====================
// UI HELPERS
// =====================
function showToast(message, type = 'success') {
  const existing = document.querySelector('.admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast--${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showConfirm(message, options = {}) {
  const {
    confirmLabel = 'Hapus',
    cancelLabel = 'Batal',
    confirmType = 'danger',
  } = options;

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'admin-confirm-overlay';
    overlay.innerHTML = `
      <div class="admin-confirm-box">
        <p>${message}</p>
        <div class="admin-confirm-actions">
          <button class="btn-admin btn-admin--secondary" data-action="cancel">${cancelLabel}</button>
          <button class="btn-admin btn-admin--${confirmType}" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-visible'));

    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') resolve(true);
      if (action === 'cancel' || e.target === overlay) resolve(false);
      if (action) {
        overlay.classList.remove('is-visible');
        setTimeout(() => overlay.remove(), 200);
      }
    });
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status) {
  const labels = {
    new: { text: 'Baru', cls: 'badge--new' },
    contacted: { text: 'Dihubungi', cls: 'badge--contacted' },
    scheduled: { text: 'Terjadwal', cls: 'badge--scheduled' },
    done: { text: 'Selesai', cls: 'badge--done' },
  };
  const s = labels[status] || { text: status, cls: '' };
  return `<span class="badge ${s.cls}">${s.text}</span>`;
}

function renderSidebar(activePage) {
  const user = getUser();
  const sidebar = document.getElementById('admin-sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-logo-orange">DEOKSI</span><span class="sidebar-logo-dark">Admin</span>
    </div>
    <nav class="sidebar-nav">
      <a href="/admin/dashboard.html" class="sidebar-link ${activePage === 'dashboard' ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Dashboard
      </a>
      <a href="/admin/content.html" class="sidebar-link ${activePage === 'content' ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 0 4 24V4.5A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="13" y2="15"/></svg>
        Kelola Website
      </a>
      <a href="/admin/customers.html" class="sidebar-link ${activePage === 'customers' ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Pelanggan / Leads
      </a>
      <a href="/admin/settings.html" class="sidebar-link ${activePage === 'settings' ? 'active' : ''}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Pengaturan
      </a>
      
      <div style="padding: 16px 20px 8px; font-size: 0.75rem; font-weight: 700; color: var(--admin-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
        Sistem
      </div>
      <a href="/" class="sidebar-link" target="_blank">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Lihat Website Publik
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${(user?.full_name || 'A').charAt(0)}</div>
        <div>
          <div class="sidebar-username">${user?.full_name || 'Admin'}</div>
          <div class="sidebar-role">${user?.role || 'admin'}</div>
        </div>
      </div>
      <button class="sidebar-logout" onclick="logout()">Logout</button>
    </div>
  `;
}

// Expose shared helpers for admin pages that still call them from inline scripts.
Object.assign(window, {
  getToken,
  getUser,
  saveAuth,
  clearAuth,
  setSessionMessage,
  consumeSessionMessage,
  requireLogin,
  logout,
  apiCall,
  isValidUrl,
  setButtonLoading,
  showToast,
  showConfirm,
  formatDate,
  formatDateTime,
  statusBadge,
  renderSidebar,
});
