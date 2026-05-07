import { renderSidebar, requireLogin, apiCall, showToast, showConfirm, formatDateTime, setButtonLoading } from './admin.js';

if (!requireLogin()) throw new Error('redirect');

renderSidebar('media');

const state = {
  mode: 'video_cloudinary',
  photoSource: 'url',
  slotDefinitions: [],
  mediaItems: [],
  summary: null,
};

const modeInfoCopy = {
  video_cloudinary: `
    <strong>Mode Video Cloudinary</strong>
    Gunakan mode ini hanya untuk frame video website yang memang terstruktur.
    <ul>
      <li><strong>Slot resmi:</strong> Hero Video Beranda dan Video Gallery.</li>
      <li><strong>Aturan utama:</strong> Hero Beranda hanya boleh punya 1 video aktif.</li>
      <li><strong>Sumber wajib:</strong> URL video Cloudinary, bukan Google Drive.</li>
    </ul>
  `,
  website_photo: `
    <strong>Mode Foto Website</strong>
    Gunakan mode ini untuk frame foto terstruktur yang tampil langsung di website.
    <ul>
      <li><strong>Slot resmi:</strong> Promo Cards, Foto Gallery, Kartu Layanan, Kartu Produk, Cover Berita, Foto Dokter, Sertifikat, Visual Lokasi, Banner Promo, dan Foto Testimoni.</li>
      <li><strong>Sumber wajib:</strong> link file Google Drive publik.</li>
      <li><strong>Data wajib:</strong> halaman, section, posisi, dan alt text harus lengkap.</li>
    </ul>
  `,
};

const modeTitleCopy = {
  video_cloudinary: 'Cloudinary URL',
  website_photo: 'URL Foto / Google Drive',
};

const modePlaceholderCopy = {
  video_cloudinary: 'https://res.cloudinary.com/your-cloud/video/upload/v1/hero.mp4',
  website_photo: 'https://drive.google.com/file/d/FILE_ID/view?usp=sharing',
};

const modeUrlNoteCopy = {
  video_cloudinary: 'Masukkan URL Cloudinary video yang akan dipakai di website.',
  website_photo: 'Paste link file Google Drive yang sudah di-set public. Format yang aman biasanya mengandung /file/d/ atau parameter ?id=.',
};

const sourceTypeLabels = {
  cloudinary: 'Cloudinary',
  upload: 'Upload Dashboard',
  google_drive: 'URL Google Drive',
  external_url: 'URL Eksternal',
};

const modeButtons = [...document.querySelectorAll('[data-mode]')];
const newMediaBtn = document.getElementById('new-media-btn');
const modeInfo = document.getElementById('mode-info');
const mediaForm = document.getElementById('media-form');
const mediaIdInput = document.getElementById('media-id');
const mediaKindInput = document.getElementById('media-kind');
const titleInput = document.getElementById('title-input');
const fileInput = document.getElementById('file-input');
const urlInput = document.getElementById('url-input');
const urlField = document.getElementById('url-field');
const urlLabel = document.getElementById('url-label');
const urlNote = document.getElementById('url-note');
const urlHelper = document.getElementById('url-helper');
const driveActions = document.getElementById('drive-actions');
const checkDriveBtn = document.getElementById('check-drive-btn');
const copyDirectUrlBtn = document.getElementById('copy-direct-url-btn');
const directUrlField = document.getElementById('direct-url-field');
const directUrlOutput = document.getElementById('direct-url-output');
const pageSelect = document.getElementById('page-select');
const sectionSelect = document.getElementById('section-select');
const positionSelect = document.getElementById('position-select');
const statusSelect = document.getElementById('status-select');
const altInput = document.getElementById('alt-input');
const notesInput = document.getElementById('notes-input');
const previewBox = document.getElementById('preview-box');
const photoSourceField = document.getElementById('photo-source-field');
const uploadField = document.getElementById('upload-field');
const altField = document.getElementById('alt-field');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const searchInput = document.getElementById('search-input');
const filterPage = document.getElementById('filter-page');
const filterStatus = document.getElementById('filter-status');
const refreshBtn = document.getElementById('refresh-btn');
const summaryRow = document.getElementById('summary-row');
const mediaList = document.getElementById('media-list');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeModeLabel(mode) {
  return mode === 'video_cloudinary' ? 'Video Cloudinary' : 'Foto Website';
}

function extractGoogleDriveFileId(rawUrl) {
  if (!rawUrl) return '';

  try {
    const parsed = new URL(rawUrl);
    const idParam = parsed.searchParams.get('id');
    if (idParam) return idParam;

    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/i)
      || parsed.pathname.match(/\/d\/([^/]+)/i);
    return pathMatch?.[1] || '';
  } catch {
    return '';
  }
}

function normalizeGoogleDriveUrl(rawUrl) {
  const fileId = extractGoogleDriveFileId(rawUrl);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000` : rawUrl;
}

function isGoogleDriveUrl(rawUrl) {
  return Boolean(extractGoogleDriveFileId(rawUrl));
}

function normalizeInputUrl(rawUrl) {
  return String(rawUrl || '').trim();
}

function normalizePreviewUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (/drive\.google\.com|docs\.google\.com/i.test(trimmed)) {
    return normalizeGoogleDriveUrl(trimmed);
  }
  return trimmed;
}

function getSourceTypeLabel(sourceType) {
  return sourceTypeLabels[sourceType] || sourceType || '-';
}

function updateDirectUrlOutput() {
  if (!directUrlField || !directUrlOutput) return;

  const isPhotoMode = state.mode === 'website_photo';
  const rawUrl = urlInput.value.trim();
  directUrlField.classList.toggle('hidden', !isPhotoMode);

  if (!isPhotoMode) {
    directUrlOutput.value = '';
    return;
  }

  directUrlOutput.value = isGoogleDriveUrl(rawUrl) ? normalizeGoogleDriveUrl(rawUrl) : '';
}

function updateUrlHelper() {
  if (!urlHelper) return;

  const rawUrl = normalizeInputUrl(urlInput.value);
  urlHelper.classList.add('hidden');
  urlHelper.classList.remove('is-success', 'is-error');
  driveActions?.classList.toggle('hidden', state.mode !== 'website_photo');
  updateDirectUrlOutput();

  if (state.mode !== 'website_photo' || !rawUrl) {
    return;
  }

  urlHelper.classList.remove('hidden');

  if (isGoogleDriveUrl(rawUrl)) {
    const fileId = extractGoogleDriveFileId(rawUrl);
    urlHelper.textContent = `Link Google Drive valid. File ID: ${fileId}. URL publik akan dipakai sebagai https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
    urlHelper.classList.add('is-success');
    return;
  }

  urlHelper.textContent = 'Link belum valid. Gunakan link file Google Drive seperti https://drive.google.com/file/d/FILE_ID/view?usp=sharing atau link dengan parameter ?id=FILE_ID.';
  urlHelper.classList.add('is-error');
}

function getDefinitionsForMode(mode = state.mode) {
  return state.slotDefinitions.filter((item) => item.media_kind === mode);
}

function getGroupsForMode(mode = state.mode) {
  return getDefinitionsForMode(mode).reduce((acc, item) => {
    if (!acc[item.page_key]) {
      acc[item.page_key] = {
        page_key: item.page_key,
        page_label: item.page_label,
        sections: {},
      };
    }
    if (!acc[item.page_key].sections[item.section_key]) {
      acc[item.page_key].sections[item.section_key] = {
        section_key: item.section_key,
        section_label: item.section_label,
        positions: [],
      };
    }
    acc[item.page_key].sections[item.section_key].positions.push(item);
    return acc;
  }, {});
}

function populatePageOptions() {
  const groups = getGroupsForMode();
  pageSelect.innerHTML = Object.values(groups)
    .map((item) => `<option value="${item.page_key}">${item.page_label}</option>`)
    .join('');

  filterPage.innerHTML = [
    '<option value="">Semua Halaman</option>',
    ...Object.values(groups).map((item) => `<option value="${item.page_key}">${item.page_label}</option>`),
  ].join('');
}

function populateSectionOptions() {
  const groups = getGroupsForMode();
  const page = pageSelect.value;
  const sections = page && groups[page] ? Object.values(groups[page].sections) : [];
  sectionSelect.innerHTML = sections
    .map((item) => `<option value="${item.section_key}">${item.section_label}</option>`)
    .join('');
  populatePositionOptions();
}

function populatePositionOptions() {
  const definitions = getDefinitionsForMode().filter((item) => (
    item.page_key === pageSelect.value && item.section_key === sectionSelect.value
  ));
  positionSelect.innerHTML = definitions
    .map((item) => `<option value="${item.position_key}">${item.position_label}</option>`)
    .join('');
}

function syncModeUI() {
  mediaKindInput.value = state.mode;
  modeInfo.innerHTML = modeInfoCopy[state.mode];
  urlLabel.textContent = modeTitleCopy[state.mode];
  urlInput.placeholder = modePlaceholderCopy[state.mode];
  urlNote.textContent = modeUrlNoteCopy[state.mode];
  if (state.mode === 'website_photo') {
    state.photoSource = 'url';
  }
  photoSourceField.classList.toggle('hidden', state.mode !== 'website_photo');
  if (uploadField) {
    uploadField.classList.add('hidden');
  }
  altField.classList.toggle('hidden', state.mode !== 'website_photo');
  urlField.classList.remove('hidden');
  modeButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.mode === state.mode);
  });
  populatePageOptions();
  populateSectionOptions();
  updateUrlHelper();
  renderPreview();
}

function resetForm() {
  mediaForm.reset();
  mediaIdInput.value = '';
  mediaKindInput.value = state.mode;
  state.photoSource = state.mode === 'website_photo' ? 'url' : state.photoSource;
  urlInput.value = '';
  titleInput.value = '';
  notesInput.value = '';
  altInput.value = '';
  statusSelect.value = 'draft';
  populatePageOptions();
  populateSectionOptions();
  updateUrlHelper();
  renderPreview();
}

function renderPreview() {
  const url = normalizePreviewUrl(normalizeInputUrl(urlInput.value));
  const file = fileInput?.files?.[0];
  const filePreviewUrl = file ? URL.createObjectURL(file) : '';
  const previewUrl = filePreviewUrl || url;
  if (!previewUrl) {
    updateUrlHelper();
    previewBox.innerHTML = 'Preview media akan tampil di sini';
    return;
  }

  if (state.mode === 'video_cloudinary') {
    updateUrlHelper();
    previewBox.innerHTML = `<video src="${escapeHtml(previewUrl)}" controls muted playsinline></video>`;
    return;
  }

  updateUrlHelper();
  previewBox.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(altInput.value || titleInput.value || 'Preview foto')}">`;
}

function handleCheckDriveLink() {
  if (state.mode !== 'website_photo') return;
  updateUrlHelper();

  const rawUrl = normalizeInputUrl(urlInput.value);
  if (!rawUrl) {
    showToast('Tempel link Google Drive dulu.', 'error');
    return;
  }

  if (!isGoogleDriveUrl(rawUrl)) {
    showToast('Link Google Drive belum valid.', 'error');
    return;
  }

  const directUrl = normalizeGoogleDriveUrl(rawUrl);
  renderPreview();
  showToast(`Link valid. Direct URL siap dipakai: ${directUrl}`);
}

async function handleCopyDirectUrl() {
  if (state.mode !== 'website_photo') return;

  const rawUrl = normalizeInputUrl(urlInput.value);
  if (!rawUrl) {
    showToast('Tempel link Google Drive dulu.', 'error');
    return;
  }

  if (!isGoogleDriveUrl(rawUrl)) {
    showToast('Link Google Drive belum valid.', 'error');
    return;
  }

  const directUrl = normalizeGoogleDriveUrl(rawUrl);
  await navigator.clipboard.writeText(directUrl);
  if (directUrlOutput) {
    directUrlOutput.value = directUrl;
  }
  showToast('Direct URL Google Drive berhasil disalin.');
}

function renderSummary() {
  const summary = state.summary || {};
  const items = [
    `Mode: ${normalizeModeLabel(state.mode)}`,
    `Total: ${summary.total || 0}`,
    `Active: ${summary.active || 0}`,
    `Draft: ${summary.draft || 0}`,
    `Arsip: ${summary.archived || 0}`,
    `Video: ${summary.videos || 0}`,
    `Foto: ${summary.photos || 0}`,
  ];
  summaryRow.innerHTML = items.map((item) => `<span class="summary-chip">${escapeHtml(item)}</span>`).join('');
}

function filteredItems() {
  const query = searchInput.value.trim().toLowerCase();
  const pageFilter = filterPage.value;
  const statusFilter = filterStatus.value;

  return state.mediaItems.filter((item) => {
    if (item.media_kind !== state.mode) return false;
    if (pageFilter && item.page_key !== pageFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (!query) return true;

    return [
      item.title,
      item.filename,
      item.page_label,
      item.section_label,
      item.position_label,
      item.usage_label,
      item.notes,
      item.alt_text,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function renderMediaList() {
  const items = filteredItems();
  if (!items.length) {
    mediaList.innerHTML = `<div class="empty-state">Belum ada ${escapeHtml(normalizeModeLabel(state.mode).toLowerCase())} untuk filter ini.</div>`;
    return;
  }

  mediaList.innerHTML = items.map((item) => {
    const isVideo = item.type === 'video';
    const preview = isVideo
      ? `<video src="${escapeHtml(item.url)}" muted playsinline preload="metadata"></video>`
      : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt_text || item.title || 'Foto website')}" loading="lazy">`;

    return `
      <article class="media-card">
        <div class="media-thumb">${preview}</div>
        <div class="media-meta">
          <h3>${escapeHtml(item.title || item.filename || 'Media tanpa judul')}</h3>
          <div class="meta-line">${escapeHtml(item.usage_label || '-')}</div>
          <div class="meta-line">Sumber: ${escapeHtml(getSourceTypeLabel(item.source_type))} | Update: ${escapeHtml(formatDateTime(item.updated_at))}</div>
          ${item.alt_text ? `<div class="meta-line">Alt text: ${escapeHtml(item.alt_text)}</div>` : ''}
          ${item.notes ? `<div class="meta-line">Catatan: ${escapeHtml(item.notes)}</div>` : ''}
          <div class="badge-row">
            <span class="mini-badge status-${escapeHtml(item.status || 'draft')}">${escapeHtml(item.status || 'draft')}</span>
            <span class="mini-badge">${escapeHtml(item.page_label || '-')}</span>
            <span class="mini-badge">${escapeHtml(item.section_label || '-')}</span>
            <span class="mini-badge">${escapeHtml(item.position_label || '-')}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-lite" type="button" data-action="edit" data-id="${item.id}">Edit</button>
          <button class="btn-lite" type="button" data-action="toggle" data-id="${item.id}">
            ${item.status === 'active' ? 'Arsipkan' : 'Aktifkan'}
          </button>
          <button class="btn-lite" type="button" data-action="copy" data-url="${escapeHtml(item.url)}">Salin URL</button>
          <button class="btn-lite" type="button" data-action="delete" data-id="${item.id}">Hapus</button>
        </div>
      </article>
    `;
  }).join('');
}

async function loadSlotDefinitions() {
  const response = await apiCall('/media-slots');
  state.slotDefinitions = response?.data || [];
}

async function loadSummary() {
  const response = await apiCall('/media?summary=true');
  state.summary = response?.summary || {};
}

async function loadMedia() {
  const response = await apiCall('/media?limit=200');
  state.mediaItems = response?.data || [];
}

async function refreshAll() {
  await Promise.all([loadSummary(), loadMedia()]);
  renderSummary();
  renderMediaList();
}

async function uploadPhotoIfNeeded() {
  if (state.mode !== 'website_photo') return urlInput.value.trim();
  return urlInput.value.trim();
}

function getDefinitionByPlacement() {
  return getDefinitionsForMode().find((item) => (
    item.page_key === pageSelect.value
    && item.section_key === sectionSelect.value
    && item.position_key === positionSelect.value
  ));
}

function buildPayload(url) {
  const definition = getDefinitionByPlacement();
  const title = titleInput.value.trim();
  const status = statusSelect.value;
  const notes = notesInput.value.trim();
  const altText = altInput.value.trim();
  const isActive = status === 'active';
  const rawUrl = normalizeInputUrl(urlInput.value) || url;
  const normalizedUrl = normalizePreviewUrl(url);
  const photoSourceType = 'google_drive';

  return {
    title,
    filename: title || definition?.slot_name || 'media-item',
    media_kind: state.mode,
    source_type: state.mode === 'video_cloudinary' ? 'cloudinary' : photoSourceType,
    url: state.mode === 'video_cloudinary' ? rawUrl : normalizedUrl,
    original_url: rawUrl,
    optimized_url: state.mode === 'video_cloudinary' ? rawUrl : normalizedUrl,
    thumb_url: state.mode === 'video_cloudinary' ? rawUrl : normalizedUrl,
    page_key: pageSelect.value,
    section_key: sectionSelect.value,
    position_key: positionSelect.value,
    section_name: definition?.section_name,
    slot_key: definition?.slot_key,
    slot_name: definition?.slot_name,
    replace_policy: definition?.replace_policy,
    display_order: definition?.display_order || 0,
    type: state.mode === 'video_cloudinary' ? 'video' : 'image',
    category: state.mode === 'video_cloudinary' ? 'video' : 'photo',
    alt_text: state.mode === 'website_photo' ? altText : '',
    status,
    notes,
    is_slot_active: isActive,
  };
}

function applyMediaToForm(item) {
  state.mode = item.media_kind || state.mode;
  state.photoSource = item.media_kind === 'website_photo' ? 'url' : state.photoSource;
  syncModeUI();
  mediaIdInput.value = item.id;
  titleInput.value = item.title || '';
  urlInput.value = item.original_url || item.url || '';
  statusSelect.value = item.status || 'draft';
  altInput.value = item.alt_text || '';
  notesInput.value = item.notes || '';
  pageSelect.value = item.page_key || pageSelect.value;
  populateSectionOptions();
  sectionSelect.value = item.section_key || sectionSelect.value;
  populatePositionOptions();
  positionSelect.value = item.position_key || positionSelect.value;
  renderPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleSave(event) {
  event.preventDefault();
  setButtonLoading(saveBtn, true, 'Menyimpan...', 'Simpan Media');

  try {
    if (state.mode === 'website_photo' && !isGoogleDriveUrl(normalizeInputUrl(urlInput.value))) {
      throw new Error('Foto Website wajib memakai link file Google Drive yang valid.');
    }

    const url = await uploadPhotoIfNeeded();
    const payload = buildPayload(url);
    const method = mediaIdInput.value ? 'PUT' : 'POST';
    const endpoint = mediaIdInput.value ? `/media?id=${mediaIdInput.value}` : '/media';
    await apiCall(endpoint, {
      method,
      body: JSON.stringify(payload),
    });

    showToast('Media berhasil disimpan.');
    resetForm();
    await refreshAll();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan media.', 'error');
  } finally {
    setButtonLoading(saveBtn, false, 'Menyimpan...', 'Simpan Media');
  }
}

async function handleToggleStatus(id) {
  const item = state.mediaItems.find((entry) => String(entry.id) === String(id));
  if (!item) return;

  const nextStatus = item.status === 'active' ? 'archived' : 'active';
  const confirmed = await showConfirm(
    nextStatus === 'active'
      ? `Aktifkan media ini untuk ${item.usage_label}?`
      : `Arsipkan media ini dari ${item.usage_label}?`,
    {
      confirmLabel: nextStatus === 'active' ? 'Aktifkan' : 'Arsipkan',
      confirmType: nextStatus === 'active' ? 'primary' : 'danger',
    }
  );
  if (!confirmed) return;

  await apiCall(`/media?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: item.title,
      filename: item.filename,
      url: item.url,
      original_url: item.original_url || item.url,
      optimized_url: item.optimized_url || item.url,
      thumb_url: item.thumb_url || item.url,
      source_type: item.source_type,
      type: item.type,
      alt_text: item.alt_text,
      notes: item.notes,
      status: nextStatus,
      is_slot_active: nextStatus === 'active',
      page_key: item.page_key,
      section_key: item.section_key,
      position_key: item.position_key,
      slot_key: item.slot_key,
      slot_name: item.slot_name,
      section_name: item.section_name,
      replace_policy: item.replace_policy,
      media_kind: item.media_kind,
    }),
  });

  showToast(`Media berhasil ${nextStatus === 'active' ? 'diaktifkan' : 'diarsipkan'}.`);
  await refreshAll();
}

async function handleDelete(id) {
  const confirmed = await showConfirm('Hapus media ini dari dashboard?', {
    confirmLabel: 'Hapus',
    confirmType: 'danger',
  });
  if (!confirmed) return;

  await apiCall(`/media?id=${id}`, {
    method: 'DELETE',
  });
  showToast('Media berhasil dihapus.');
  if (String(mediaIdInput.value) === String(id)) {
    resetForm();
  }
  await refreshAll();
}

function handleListAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === 'edit') {
    const item = state.mediaItems.find((entry) => String(entry.id) === String(id));
    if (item) applyMediaToForm(item);
    return;
  }

  if (action === 'copy') {
    navigator.clipboard.writeText(button.dataset.url || '');
    showToast('URL media berhasil disalin.');
    return;
  }

  if (action === 'toggle') {
    handleToggleStatus(id).catch((error) => showToast(error.message || 'Gagal mengubah status media.', 'error'));
    return;
  }

  if (action === 'delete') {
    handleDelete(id).catch((error) => showToast(error.message || 'Gagal menghapus media.', 'error'));
  }
}

async function init() {
  await loadSlotDefinitions();
  syncModeUI();
  resetForm();
  await refreshAll();
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    state.photoSource = state.mode === 'website_photo' ? 'url' : state.photoSource;
    syncModeUI();
    resetForm();
    renderMediaList();
  });
});

pageSelect.addEventListener('change', populateSectionOptions);
sectionSelect.addEventListener('change', populatePositionOptions);
urlInput.addEventListener('input', renderPreview);
urlInput.addEventListener('paste', () => {
  window.setTimeout(() => {
    urlInput.value = normalizeInputUrl(urlInput.value);
    renderPreview();
  }, 0);
});
urlInput.addEventListener('blur', () => {
  urlInput.value = normalizeInputUrl(urlInput.value);
  if (state.mode === 'website_photo' && isGoogleDriveUrl(urlInput.value)) {
    renderPreview();
  }
  updateUrlHelper();
});
fileInput?.addEventListener('change', renderPreview);
titleInput.addEventListener('input', renderPreview);
altInput.addEventListener('input', renderPreview);
mediaForm.addEventListener('submit', handleSave);
resetBtn.addEventListener('click', resetForm);
newMediaBtn.addEventListener('click', resetForm);
searchInput.addEventListener('input', renderMediaList);
filterPage.addEventListener('change', renderMediaList);
filterStatus.addEventListener('change', renderMediaList);
refreshBtn.addEventListener('click', () => {
  refreshAll().catch((error) => showToast(error.message || 'Gagal memuat media.', 'error'));
});
mediaList.addEventListener('click', handleListAction);
checkDriveBtn?.addEventListener('click', handleCheckDriveLink);
copyDirectUrlBtn?.addEventListener('click', () => {
  handleCopyDirectUrl().catch((error) => showToast(error.message || 'Gagal menyalin direct URL.', 'error'));
});

init().catch((error) => {
  console.error('Media manager init error:', error);
  showToast(error.message || 'Gagal memuat Media Manager.', 'error');
});
