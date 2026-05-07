import {
  apiCall,
  getToken,
  requireLogin,
  renderSidebar,
  saveAuth,
  setButtonLoading,
  showToast,
} from './admin.js';

if (!requireLogin()) throw new Error('redirect');

renderSidebar('settings');

const profileForm = document.getElementById('profile-form');
const passwordForm = document.getElementById('password-form');
const fullNameInput = document.getElementById('settings-full-name');
const usernameInput = document.getElementById('settings-username');
const roleInput = document.getElementById('settings-role');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const saveProfileBtn = document.getElementById('save-profile-btn');
const savePasswordBtn = document.getElementById('save-password-btn');
const systemStatusList = document.getElementById('system-status-list');
const endpointHealthList = document.getElementById('endpoint-health-list');
const qaChecklist = document.getElementById('qa-checklist');
const refreshStatusBtn = document.getElementById('refresh-status-btn');
const refreshDiagnosticsBtn = document.getElementById('refresh-diagnostics-btn');
const copyDiagnosticsBtn = document.getElementById('copy-diagnostics-btn');
const clearDiagnosticsBtn = document.getElementById('clear-diagnostics-btn');
const autoRefreshDiagnosticsInput = document.getElementById('auto-refresh-diagnostics');
const diagnosticsErrorsOnlyInput = document.getElementById('diagnostics-errors-only');
const diagnosticsErrorCount = document.getElementById('diagnostics-error-count');
const deployReadinessBox = document.getElementById('deploy-readiness-box');
const deployReadinessText = document.getElementById('deploy-readiness-text');
const bridgeDiagnosticsList = document.getElementById('bridge-diagnostics-list');
const syncOverallValue = document.getElementById('sync-overall-value');
const syncOverallMeta = document.getElementById('sync-overall-meta');
const lastCheckedValue = document.getElementById('last-checked-value');
const lastCheckedMeta = document.getElementById('last-checked-meta');
const bridgeRuntimeValue = document.getElementById('bridge-runtime-value');
const bridgeRuntimeMeta = document.getElementById('bridge-runtime-meta');
const syncOverallCard = syncOverallValue?.closest('.summary-card');
const lastCheckedCard = lastCheckedValue?.closest('.summary-card');
const bridgeRuntimeCard = bridgeRuntimeValue?.closest('.summary-card');

let latestQaChecks = [];
let latestDiagnostics = [];
let diagnosticsIntervalId = null;

function setSummaryCardState(card, state = 'warn') {
  if (!card) return;
  card.classList.remove('summary-card--ok', 'summary-card--warn', 'summary-card--error');
  if (state === 'ok') {
    card.classList.add('summary-card--ok');
    return;
  }
  if (state === 'error') {
    card.classList.add('summary-card--error');
    return;
  }
  card.classList.add('summary-card--warn');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderStatusRow(label, desc, ok = true, pillText = ok ? 'OK' : 'Perlu Cek') {
  return `
    <div class="status-item">
      <div class="status-item__meta">
        <div class="status-item__label">${escapeHtml(label)}</div>
        <div class="status-item__desc">${escapeHtml(desc)}</div>
      </div>
      <span class="status-pill ${ok ? 'status-pill--ok' : 'status-pill--warn'}">${escapeHtml(pillText)}</span>
    </div>
  `;
}

function formatEnvAvailability(value) {
  return value ? 'Siap' : 'Belum siap';
}

function getFriendlyAccessLabel(visibility) {
  return visibility === 'admin' ? 'Khusus Admin' : 'Untuk Website';
}

function getFriendlyPathLabel(path = '') {
  const map = {
    '/api/page-content?page=homepage': 'Konten halaman beranda',
    '/api/homepage-content': 'Ringkasan konten beranda',
    '/api/site-content': 'Foto dan media website',
    '/api/gallery-content': 'Galeri website',
    '/api/media': 'Daftar media admin',
    '/api/admin/profile': 'Profil admin aktif',
  };

  return map[path] || path || 'Jalur tidak dikenal';
}

function getFriendlyRequestTitle(item = {}) {
  const path = String(item.path || '');
  const method = String(item.method || 'REQ');
  const actionMap = {
    GET: 'Membaca data',
    POST: 'Menyimpan data baru',
    PUT: 'Memperbarui data',
    PATCH: 'Memperbarui data',
    DELETE: 'Menghapus data',
  };
  const targetMap = {
    '/api/system-status': 'status sistem',
    '/api/bridge-diagnostics': 'diagnostics bridge',
    '/api/admin/profile': 'profil admin',
    '/api/admin/change-password': 'password admin',
    '/api/media': 'media website',
    '/api/media-slots': 'slot media website',
    '/api/site-content': 'konten foto website',
    '/api/gallery-content': 'galeri website',
    '/api/homepage-content': 'konten beranda',
  };

  const target = targetMap[path] || path.replace('/api/', '').replaceAll('-', ' ') || 'data sistem';
  return `${actionMap[method] || 'Memproses request'} ${target}`;
}

function getQaCurrentState(item = {}) {
  const stateMap = {
    text_sync: item.ready
      ? 'Saat ini alur perubahan teks terlihat siap untuk diuji di website.'
      : 'Saat ini alur perubahan teks masih perlu dicek sebelum dipakai audit akhir.',
    photo_sync: item.ready
      ? 'Saat ini alur foto website terlihat siap untuk diuji di section yang sesuai.'
      : 'Saat ini alur foto website masih perlu dicek pada media admin atau section frontend.',
    video_sync: item.ready
      ? 'Saat ini alur video website terlihat siap untuk diuji di galeri atau slot publik.'
      : 'Saat ini alur video website masih perlu dicek pada media admin atau galeri publik.',
    session_persistence: item.ready
      ? 'Saat ini penyimpanan perubahan admin terlihat siap bertahan setelah refresh.'
      : 'Saat ini persistensi perubahan admin masih perlu dicek setelah refresh halaman.',
  };

  return stateMap[item.key] || (item.ready
    ? 'Saat ini alur ini terlihat siap untuk diuji.'
    : 'Saat ini alur ini masih perlu dicek lebih dulu.');
}

function formatDeployAction(item = '') {
  const warning = String(item || '');

  if (warning.includes('Database belum terhubung')) {
    return 'Sambungkan database utama agar perubahan admin tetap tersimpan dengan aman setelah refresh.';
  }

  if (warning.includes('JWT_SECRET belum tersedia')) {
    return 'Lengkapi kunci keamanan login agar akses admin aman dipakai di lingkungan production.';
  }

  if (warning.includes('PASSWORD_SALT belum tersedia')) {
    return 'Tambahkan proteksi password agar penyimpanan akun admin tidak berjalan dengan konfigurasi yang lemah.';
  }

  if (warning.includes('Cloudinary upload belum aktif')) {
    return 'Lengkapi Cloudinary hanya jika tim ingin upload video atau media cloud langsung dari dashboard.';
  }

  return warning;
}

function renderDeployReadiness(data = {}) {
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];

  if (data.ready) {
    return `
      <strong>Siap dipakai:</strong>
      <div style="margin-top: 8px;">Flow dasar admin, konten, foto Google Drive, dan sinkronisasi website terlihat siap untuk penggunaan harian.</div>
    `;
  }

  return `
    <strong>Yang perlu dibereskan dulu:</strong>
    <ul>${warnings.map((item) => `<li>${escapeHtml(formatDeployAction(item))}</li>`).join('')}</ul>
    <div style="margin-top: 8px;">Jika website dipakai harian dan perubahan inti sudah berjalan, item di atas bisa diprioritaskan bertahap sesuai kebutuhan tim.</div>
  `;
}

function renderEndpointRow(check = {}) {
  const latencyLabel = Number.isFinite(check.latency_ms)
    ? `${check.latency_ms} ms`
    : 'Belum ada data';
  const visibilityClass = check.visibility === 'admin' ? 'status-pill--admin' : 'status-pill--ok';
  const healthClass = check.ok ? 'status-pill--ok' : 'status-pill--warn';
  const visibilityLabel = getFriendlyAccessLabel(check.visibility);
  const statusLabel = check.ok ? 'Aman Dipakai' : 'Perlu Dicek';
  const detail = [
    check.description,
    `Dipakai oleh: ${visibilityLabel}`,
    `Fungsi: ${getFriendlyPathLabel(check.path)}`,
    `Respon terakhir: ${latencyLabel}`,
  ]
    .filter(Boolean)
    .join(' • ');

  return `
    <div class="status-item">
      <div class="status-item__meta">
        <div class="status-item__label">${escapeHtml(check.label || 'Endpoint')}</div>
        <div class="status-item__desc">${escapeHtml(detail)}</div>
      </div>
      <div class="settings-actions" style="margin-top: 0;">
        <span class="status-pill ${visibilityClass}">${escapeHtml(visibilityLabel)}</span>
        <span class="status-pill ${healthClass}">${escapeHtml(statusLabel)}</span>
      </div>
    </div>
  `;
}

function renderQaRow(item = {}) {
  const actions = Array.isArray(item.actions) ? item.actions : [];
  return `
    <div class="qa-item">
      <div class="qa-item__head">
        <div class="qa-item__title">${escapeHtml(item.label || 'Checklist')}</div>
        <span class="status-pill ${item.ready ? 'status-pill--ok' : 'status-pill--warn'}">${escapeHtml(item.ready ? 'Siap Uji' : 'Perlu Cek')}</span>
      </div>
      <p class="qa-item__text"><strong>Kondisi sekarang:</strong> ${escapeHtml(getQaCurrentState(item))}</p>
      <p class="qa-item__text">${escapeHtml(item.summary || '')}</p>
      <p class="qa-item__text"><strong>Yang dicek:</strong> ${escapeHtml(item.requirement || '-')}</p>
      ${item.note ? `<p class="qa-item__text"><strong>Info tambahan:</strong> ${escapeHtml(item.note)}</p>` : ''}
      ${actions.length ? `
        <details class="advanced-panel" style="margin-top: 12px;">
          <summary>
            <span>Langkah Cepat</span>
            <span class="advanced-panel__meta">Buka halaman terkait untuk cek atau perbaiki</span>
          </summary>
          <div class="advanced-panel__body">
            <div class="qa-item__actions" style="margin-top: 0;">
              ${actions.map((action) => {
                const isPreview = String(action.label || '').toLowerCase().includes('preview');
                return `<a class="mini-link-btn ${isPreview ? 'mini-link-btn--preview' : ''}" href="${escapeHtml(action.href || '#')}">${escapeHtml(action.label || 'Buka')}</a>`;
              }).join('')}
            </div>
          </div>
        </details>
      ` : ''}
    </div>
  `;
}

function renderBridgeDiagnosticRow(item = {}) {
  const phaseLabelMap = {
    started: 'Sedang Jalan',
    completed: 'Selesai',
    failed: 'Gagal',
  };
  const statusPillText = item.phase === 'failed'
    ? 'Perlu Dicek'
    : item.phase === 'completed'
      ? 'Aman'
      : 'Berjalan';
  const statusText = item.status
    ? `${item.status}`
    : (phaseLabelMap[item.phase] || 'Tidak Diketahui');
  const durationText = Number.isFinite(item.duration_ms) ? `${item.duration_ms} ms` : 'Menunggu';
  const phaseText = phaseLabelMap[item.phase] || item.phase || 'Tidak Diketahui';

  return `
    <div class="diag-item">
      <div class="diag-item__head">
        <div class="diag-item__title">${escapeHtml(getFriendlyRequestTitle(item))}</div>
        <span class="status-pill ${item.phase === 'failed' ? 'status-pill--warn' : 'status-pill--ok'}">${escapeHtml(statusPillText)}</span>
      </div>
      <p class="diag-item__meta">Request: ${escapeHtml(item.method || 'REQ')} ${escapeHtml(item.path || '-')}</p>
      <p class="diag-item__meta">Status proses: ${escapeHtml(phaseText)} | Kode respon: ${escapeHtml(statusText)} | Durasi: ${escapeHtml(durationText)}</p>
      <p class="diag-item__meta">Waktu: ${escapeHtml(item.timestamp || '-')}</p>
      ${item.error ? `<p class="diag-item__meta">Catatan error: ${escapeHtml(item.error)}</p>` : ''}
    </div>
  `;
}

function getVisibleDiagnostics() {
  if (!diagnosticsErrorsOnlyInput?.checked) {
    return latestDiagnostics;
  }

  return latestDiagnostics.filter((item) => item.phase === 'failed');
}

function renderBridgeDiagnosticsList() {
  const items = getVisibleDiagnostics();
  const errorsOnly = Boolean(diagnosticsErrorsOnlyInput?.checked);
  const errorCount = latestDiagnostics.filter((item) => item.phase === 'failed').length;

  if (diagnosticsErrorCount) {
    diagnosticsErrorCount.textContent = String(errorCount);
  }

  bridgeDiagnosticsList.innerHTML = items.length
    ? items.map((item) => renderBridgeDiagnosticRow(item)).join('')
    : `
      <div class="diag-item">
        <div class="diag-item__head">
          <div class="diag-item__title">${errorsOnly ? 'Tidak ada error bridge' : 'Belum ada request bridge'}</div>
          <span class="status-pill ${errorsOnly ? 'status-pill--ok' : 'status-pill--warn'}">${errorsOnly ? 'Aman' : 'Kosong'}</span>
        </div>
        <p class="diag-item__meta">${errorsOnly ? 'Tidak ditemukan request failed pada diagnostics saat ini.' : 'Jalankan beberapa request admin/frontend lalu refresh diagnostics.'}</p>
      </div>
    `;
}

function buildDiagnosticsClipboardText() {
  if (!latestDiagnostics.length) {
    return 'Bridge diagnostics kosong. Jalankan beberapa request lalu refresh diagnostics.';
  }

  const phaseLabelMap = {
    started: 'Sedang Jalan',
    completed: 'Selesai',
    failed: 'Gagal',
  };

  return latestDiagnostics.map((item) => {
    const parts = [
      `[${item.timestamp || '-'}]`,
      `${item.method || 'REQ'} ${item.path || '-'}`,
      `status_proses=${phaseLabelMap[item.phase] || item.phase || '-'}`,
      `status_http=${item.status || '-'}`,
      `durasi=${Number.isFinite(item.duration_ms) ? `${item.duration_ms}ms` : '-'}`,
    ];

    if (item.error) {
      parts.push(`catatan_error=${item.error}`);
    }

    return parts.join(' | ');
  }).join('\n');
}

function formatTimestamp(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

function updateSummaryCards() {
  const readyCount = latestQaChecks.filter((item) => item.ready).length;
  const totalQa = latestQaChecks.length;
  const failedDiagnostics = latestDiagnostics.filter((item) => item.phase === 'failed');
  const latestDiagnostic = latestDiagnostics[0];

  if (syncOverallValue && syncOverallMeta) {
    if (!totalQa) {
      syncOverallValue.textContent = 'Belum Ada Data';
      syncOverallMeta.textContent = 'Checklist QA belum selesai dimuat.';
      setSummaryCardState(syncOverallCard, 'warn');
    } else if (readyCount === totalQa) {
      syncOverallValue.textContent = 'Sinkron Siap Uji';
      syncOverallMeta.textContent = `${readyCount}/${totalQa} checklist QA berada dalam kondisi siap uji.`;
      setSummaryCardState(syncOverallCard, 'ok');
    } else {
      syncOverallValue.textContent = 'Perlu Tindak Lanjut';
      syncOverallMeta.textContent = `${readyCount}/${totalQa} checklist QA siap. Sisanya perlu dicek sebelum audit akhir.`;
      setSummaryCardState(syncOverallCard, 'warn');
    }
  }

  if (bridgeRuntimeValue && bridgeRuntimeMeta) {
    if (!latestDiagnostics.length) {
      bridgeRuntimeValue.textContent = 'Belum Ada Request';
      bridgeRuntimeMeta.textContent = 'Bridge diagnostics belum memiliki jejak request.';
      setSummaryCardState(bridgeRuntimeCard, 'warn');
    } else if (failedDiagnostics.length > 0) {
      bridgeRuntimeValue.textContent = 'Ada Request Gagal';
      bridgeRuntimeMeta.textContent = `${failedDiagnostics.length} request terakhir bridge berstatus failed. Cek detail diagnostics di bawah.`;
      setSummaryCardState(bridgeRuntimeCard, 'error');
    } else {
      bridgeRuntimeValue.textContent = 'Bridge Stabil';
      bridgeRuntimeMeta.textContent = `Aktivitas terakhir berjalan normal saat ${getFriendlyRequestTitle(latestDiagnostic || {})}.`;
      setSummaryCardState(bridgeRuntimeCard, 'ok');
    }
  }

  if (lastCheckedValue && lastCheckedMeta) {
    const timestamp = latestDiagnostic?.timestamp || new Date().toISOString();
    lastCheckedValue.textContent = formatTimestamp(new Date(timestamp));
    lastCheckedMeta.textContent = latestDiagnostic
      ? `Data terakhir diperbarui saat ${getFriendlyRequestTitle(latestDiagnostic || {})}.`
      : 'Diambil dari waktu refresh status terakhir.';
    setSummaryCardState(lastCheckedCard, latestDiagnostic ? 'ok' : 'warn');
  }
}

function syncUserSession(user) {
  const token = getToken();
  if (!token) return;
  saveAuth(token, user);
  renderSidebar('settings');
}

async function loadProfile() {
  const response = await apiCall('/admin/profile');
  const user = response?.data;
  if (!user) return;

  fullNameInput.value = user.full_name || '';
  usernameInput.value = user.username || '';
  roleInput.value = user.role || 'admin';
  syncUserSession(user);
}

async function loadSystemStatus() {
  setButtonLoading(refreshStatusBtn, true, 'Memuat...', 'Refresh Status');
  try {
    const response = await apiCall('/system-status');
    const data = response?.data;
    if (!data) {
      systemStatusList.innerHTML = renderStatusRow('Status Sistem', 'Data status tidak tersedia.', false, 'Tidak Tersedia');
      if (deployReadinessText) {
        deployReadinessText.textContent = 'Data kesiapan deploy tidak tersedia.';
      }
      return;
    }

    if (deployReadinessBox && deployReadinessText) {
      const warnings = data.deploy_readiness?.warnings || [];
      deployReadinessBox.classList.toggle('settings-note--warn', warnings.length > 0);
      deployReadinessText.innerHTML = renderDeployReadiness(data.deploy_readiness || {});
    }

    systemStatusList.innerHTML = [
      renderStatusRow(
        'Akses Admin',
        data.auth.token_active
          ? 'Sesi admin aktif dan halaman pengaturan bisa memakai akses login dengan normal.'
          : 'Sesi admin tidak aktif. Beberapa fitur pengaturan bisa gagal dipakai.',
        Boolean(data.auth.token_active),
        data.auth.token_active ? 'Aman' : 'Login Ulang'
      ),
      renderStatusRow(
        'Foto Website',
        'Foto website saat ini mengambil sumber dari Google Drive publik.',
        data.media.photo_mode === 'google_drive',
        data.media.photo_mode === 'google_drive' ? 'Google Drive' : 'Perlu Cek'
      ),
      renderStatusRow(
        'Video Website',
        data.media.cloudinary_enabled
          ? `Video website siap memakai Cloudinary${data.media.cloudinary_cloud_name ? ` (${data.media.cloudinary_cloud_name})` : ''}.`
          : 'Video website tetap bisa memakai URL Cloudinary, tetapi pengaturan upload cloud belum lengkap.',
        Boolean(data.media.cloudinary_enabled),
        data.media.cloudinary_enabled ? 'Siap' : 'Belum Lengkap'
      ),
      renderStatusRow(
        'Penyimpanan Data',
        data.database.connected
          ? `Perubahan admin tersimpan melalui ${data.database.label}.`
          : `Penyimpanan utama belum tersambung. Mode saat ini: ${data.database.label}.`,
        Boolean(data.database.connected),
        data.database.connected ? 'Tersambung' : 'Perlu Cek'
      ),
      renderStatusRow(
        'Kesiapan Dasar Sistem',
        `Database: ${formatEnvAvailability(data.env.has_database_url)} • Keamanan login: ${formatEnvAvailability(data.env.has_jwt_secret)} • Proteksi password: ${formatEnvAvailability(data.env.has_password_salt)}`,
        Boolean(data.env.has_jwt_secret && data.env.has_password_salt),
        data.env.has_jwt_secret && data.env.has_password_salt ? 'Siap' : 'Perlu Lengkapi'
      ),
    ].join('');

    const endpointChecks = Array.isArray(data.endpoint_checks) ? data.endpoint_checks : [];
    endpointHealthList.innerHTML = endpointChecks.length
      ? endpointChecks.map((item) => renderEndpointRow(item)).join('')
      : renderStatusRow(
        'Endpoint Checks',
        'Belum ada data health endpoint yang tersedia.',
        false,
        'Tidak Ada Data'
      );

    const qaChecks = Array.isArray(data.qa_checks) ? data.qa_checks : [];
    latestQaChecks = qaChecks;
    qaChecklist.innerHTML = qaChecks.length
      ? qaChecks.map((item) => renderQaRow(item)).join('')
      : `
        <div class="qa-item">
          <div class="qa-item__head">
            <div class="qa-item__title">Checklist QA belum tersedia</div>
            <span class="status-pill status-pill--warn">Kosong</span>
          </div>
          <p class="qa-item__text">Data kesiapan sinkronisasi belum berhasil dimuat dari sistem.</p>
        </div>
      `;
    updateSummaryCards();
  } finally {
    setButtonLoading(refreshStatusBtn, false, 'Memuat...', 'Refresh Status');
  }
}

async function loadBridgeDiagnostics() {
  setButtonLoading(refreshDiagnosticsBtn, true, 'Memuat...', 'Refresh Diagnostics');
  try {
    const response = await apiCall('/bridge-diagnostics');
    const items = Array.isArray(response?.data?.items) ? response.data.items : [];
    latestDiagnostics = items;
    renderBridgeDiagnosticsList();
  } catch (error) {
    latestDiagnostics = [];
    bridgeDiagnosticsList.innerHTML = `
      <div class="diag-item">
        <div class="diag-item__head">
          <div class="diag-item__title">Diagnostics gagal dimuat</div>
          <span class="status-pill status-pill--warn">Error</span>
        </div>
        <p class="diag-item__meta">${escapeHtml(error.message || 'Unknown diagnostics error.')}</p>
      </div>
    `;
  } finally {
    updateSummaryCards();
    setButtonLoading(refreshDiagnosticsBtn, false, 'Memuat...', 'Refresh Diagnostics');
  }
}

async function clearBridgeDiagnostics() {
  setButtonLoading(clearDiagnosticsBtn, true, 'Membersihkan...', 'Clear Diagnostics');
  try {
    await apiCall('/bridge-diagnostics', {
      method: 'DELETE',
    });
    latestDiagnostics = [];
    renderBridgeDiagnosticsList();
    updateSummaryCards();
    showToast('Bridge diagnostics berhasil dibersihkan.');
  } catch (error) {
    showToast(error.message || 'Gagal membersihkan bridge diagnostics.', 'error');
  } finally {
    setButtonLoading(clearDiagnosticsBtn, false, 'Membersihkan...', 'Clear Diagnostics');
  }
}

function stopDiagnosticsAutoRefresh() {
  if (diagnosticsIntervalId) {
    window.clearInterval(diagnosticsIntervalId);
    diagnosticsIntervalId = null;
  }
}

function startDiagnosticsAutoRefresh() {
  stopDiagnosticsAutoRefresh();
  diagnosticsIntervalId = window.setInterval(() => {
    loadBridgeDiagnostics().catch((error) => {
      console.error('Auto-refresh diagnostics error:', error);
    });
  }, 5000);
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  setButtonLoading(saveProfileBtn, true, 'Menyimpan...', 'Simpan Profil');

  try {
    const full_name = fullNameInput.value.trim();
    if (!full_name) {
      throw new Error('Nama lengkap wajib diisi.');
    }

    const response = await apiCall('/admin/profile', {
      method: 'PUT',
      body: JSON.stringify({ full_name }),
    });

    const user = response?.data;
    if (user) {
      syncUserSession(user);
    }
    showToast('Profil admin berhasil diperbarui.');
  } catch (error) {
    showToast(error.message || 'Gagal memperbarui profil admin.', 'error');
  } finally {
    setButtonLoading(saveProfileBtn, false, 'Menyimpan...', 'Simpan Profil');
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  setButtonLoading(savePasswordBtn, true, 'Memperbarui...', 'Perbarui Password');

  try {
    const payload = {
      current_password: currentPasswordInput.value,
      new_password: newPasswordInput.value,
      confirm_password: confirmPasswordInput.value,
    };

    await apiCall('/admin/change-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    passwordForm.reset();
    showToast('Password admin berhasil diperbarui.');
  } catch (error) {
    showToast(error.message || 'Gagal memperbarui password.', 'error');
  } finally {
    setButtonLoading(savePasswordBtn, false, 'Memperbarui...', 'Perbarui Password');
  }
}

async function initSettingsPage() {
  await Promise.all([loadProfile(), loadSystemStatus(), loadBridgeDiagnostics()]);
}

profileForm.addEventListener('submit', handleProfileSubmit);
passwordForm.addEventListener('submit', handlePasswordSubmit);
refreshStatusBtn?.addEventListener('click', () => {
  loadSystemStatus().catch((error) => showToast(error.message || 'Gagal memuat status sistem.', 'error'));
});
refreshDiagnosticsBtn?.addEventListener('click', () => {
  loadBridgeDiagnostics().catch((error) => showToast(error.message || 'Gagal memuat bridge diagnostics.', 'error'));
});
copyDiagnosticsBtn?.addEventListener('click', async () => {
  try {
    const text = buildDiagnosticsClipboardText();
    await navigator.clipboard.writeText(text);
    showToast('Bridge diagnostics berhasil disalin.');
  } catch (error) {
    showToast(error.message || 'Gagal menyalin bridge diagnostics.', 'error');
  }
});
clearDiagnosticsBtn?.addEventListener('click', () => {
  clearBridgeDiagnostics().catch((error) => showToast(error.message || 'Gagal membersihkan bridge diagnostics.', 'error'));
});
autoRefreshDiagnosticsInput?.addEventListener('change', () => {
  if (autoRefreshDiagnosticsInput.checked) {
    startDiagnosticsAutoRefresh();
    showToast('Auto-refresh diagnostics aktif setiap 5 detik.');
    return;
  }
  stopDiagnosticsAutoRefresh();
  showToast('Auto-refresh diagnostics dimatikan.');
});
diagnosticsErrorsOnlyInput?.addEventListener('change', () => {
  renderBridgeDiagnosticsList();
});

window.addEventListener('beforeunload', () => {
  stopDiagnosticsAutoRefresh();
});

initSettingsPage().catch((error) => {
  console.error('Settings init error:', error);
  showToast(error.message || 'Gagal memuat halaman pengaturan.', 'error');
});
