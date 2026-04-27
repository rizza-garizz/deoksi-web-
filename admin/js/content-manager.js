import { PAGE_SCHEMAS } from './content-schema.js';

if (!requireLogin()) throw new Error('redirect');

renderSidebar('content');

let currentTab = 'homepage';
let currentSectionId = null;
let loadedData = {}; // key: pageKey, value: data
let isBootstrapping = true;

const heroGrid = document.getElementById('hero-grid');
const sectionsGrid = document.getElementById('sections-grid');
const pageTitleDisplay = document.getElementById('page-title-display');
const pageDescDisplay = document.getElementById('page-desc-display');
const sectionCountText = document.getElementById('section-count-text');
const viewSiteBtn = document.getElementById('view-site-btn');

// Modal Elements
const modalOverlay = document.getElementById('edit-modal');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalStatus = document.getElementById('modal-status');

function setStatus(message, isError = false) {
  modalStatus.textContent = message || '';
  modalStatus.style.color = isError ? '#dc2626' : 'var(--admin-text-muted)';
}

function setContentLoading(isLoading, message = 'Memuat data...') {
  const mask = document.getElementById('content-loading-mask');
  mask.innerHTML = `<div class="cms-loading-spinner">${message}</div>`;
  mask.classList.toggle('is-visible', Boolean(isLoading));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function loadPageData(pageKey) {
  setContentLoading(true);
  try {
    const endpoint = pageKey === 'homepage' ? '/homepage-content' : `/page-content?page=${pageKey}`;
    const separator = endpoint.includes('?') ? '&' : '?';
    const res = await apiCall(`${endpoint}${separator}admin=1&t=${Date.now()}`);
    if (res && res.data) {
      if (pageKey === 'seo') {
        const flatSeo = {};
        for (const [page, tags] of Object.entries(res.data)) {
          for (const [key, value] of Object.entries(tags)) {
            flatSeo[`${page}_${key}`] = value;
          }
        }
        loadedData[pageKey] = flatSeo;
      } else {
        loadedData[pageKey] = res.data;
      }
    } else {
      loadedData[pageKey] = {}; // Fallback empty
    }
  } catch (err) {
    console.error(`Gagal memuat data ${pageKey}.`, err);
  } finally {
    setContentLoading(false);
  }
}

function renderTabs() {
  const tabsNav = document.getElementById('tabs-nav');
  let html = '';
  for (const [key, schema] of Object.entries(PAGE_SCHEMAS)) {
    const isActive = key === currentTab ? 'is-active' : '';
    const shortTitle = schema.shortTitle || schema.title;
    html += `<button class="cms-tab-btn ${isActive}" data-tab="${key}">
      <span class="cms-tab-icon">${schema.icon || ''}</span>
      ${shortTitle}
    </button>`;
  }
  tabsNav.innerHTML = html;

  document.querySelectorAll('.cms-tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.cms-tab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentTab = btn.getAttribute('data-tab');
      
      if (!loadedData[currentTab]) {
        await loadPageData(currentTab);
      }
      renderSections(currentTab);
    });
  });
}

/**
 * Get a truncated preview value from loaded data
 */
function getPreviewValue(data, fieldId, maxLen = 80) {
  const val = data?.[fieldId];
  if (!val || typeof val !== 'string') return null;
  return val.length > maxLen ? val.substring(0, maxLen) + '…' : val;
}

/**
 * Get the count of items for array sections
 */
function getArrayCount(data, sectionId) {
  const arr = data?.[sectionId];
  return Array.isArray(arr) ? arr.length : 0;
}

/**
 * Build preview snippet HTML
 */
function buildSnippetHtml(section, data) {
  if (section.isArray) {
    const count = getArrayCount(data, section.id);
    return `
      <div class="section-card-snippet">
        <div class="section-card-snippet-label">Data Tersimpan</div>
        <div class="section-card-snippet-value">${count} item tersedia</div>
      </div>
    `;
  }

  if (section.previewFields && section.previewFields.length > 0) {
    const firstField = section.previewFields[0];
    const preview = getPreviewValue(data, firstField);
    if (preview) {
      return `
        <div class="section-card-snippet">
          <div class="section-card-snippet-label">Konten Saat Ini</div>
          <div class="section-card-snippet-value">${escapeHtml(preview)}</div>
        </div>
      `;
    }
  }

  // Fallback
  const fieldCount = section.fields ? section.fields.length : (section.itemFields ? section.itemFields.length : 0);
  return `
    <div class="section-card-snippet">
      <div class="section-card-snippet-label">Informasi</div>
      <div class="section-card-snippet-value is-empty">${fieldCount} field tersedia untuk diedit</div>
    </div>
  `;
}

/**
 * Build preview image HTML
 */
function buildPreviewImage(section, data) {
  if (section.previewImage) {
    const imgUrl = data?.[section.previewImage];
    if (imgUrl && typeof imgUrl === 'string' && imgUrl.length > 10) {
      return `
        <div class="section-card-preview">
          <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(section.title)}" loading="lazy" />
        </div>
      `;
    }
  }
  // Placeholder with icon
  return `
    <div class="section-card-preview">
      <div class="section-card-preview-placeholder">${section.icon || '📄'}</div>
    </div>
  `;
}

/**
 * Build info strip HTML
 */
function buildInfoStrip(section, data) {
  const items = [];
  
  if (section.isArray) {
    const count = getArrayCount(data, section.id);
    items.push(`<span class="section-card-info-item">📊 ${count} item</span>`);
  } else if (section.fields) {
    items.push(`<span class="section-card-info-item">📝 ${section.fields.length} field</span>`);
  }

  // Check how many fields have data
  if (!section.isArray && section.fields && data) {
    const filledCount = section.fields.filter(f => {
      const v = data[f.id];
      return v !== undefined && v !== null && v !== '';
    }).length;
    items.push(`<span class="section-card-info-item">✅ ${filledCount}/${section.fields.length} terisi</span>`);
  }

  return items.length > 0 ? `<div class="section-card-info">${items.join('')}</div>` : '';
}

/**
 * Build the CTA button SVG icon
 */
function ctaIcon() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}

/**
 * Build a single section card
 */
function buildSectionCard(section, pageKey, data, isHero = false) {
  const heroClass = isHero ? 'section-card--hero' : '';
  const badge = section.isArray 
    ? `<span class="section-badge section-badge--list">List Data</span>` 
    : `<span class="section-badge section-badge--active">Aktif</span>`;
  const ctaLabel = section.ctaLabel || 'Edit Konten';

  return `
    <div class="section-card ${heroClass}" id="card-${section.id}">
      ${buildPreviewImage(section, data)}
      <div class="section-card-body">
        <div class="section-card-top">
          <div class="section-card-name">
            <span class="section-card-name-icon">${section.icon || '📄'}</span>
            <h3>${section.title}</h3>
          </div>
          ${badge}
        </div>
        <div class="section-card-desc">${section.desc}</div>
        ${buildSnippetHtml(section, data)}
        ${buildInfoStrip(section, data)}
        <button class="section-card-cta" onclick="window.openEditModal('${pageKey}', '${section.id}')">
          ${ctaIcon()}
          ${ctaLabel}
        </button>
      </div>
    </div>
  `;
}

function renderSections(pageKey) {
  const schema = PAGE_SCHEMAS[pageKey];
  const data = loadedData[pageKey] || {};
  
  pageTitleDisplay.textContent = schema.title;
  pageDescDisplay.textContent = schema.desc;

  // Update view site button
  if (viewSiteBtn && schema.pageUrl) {
    viewSiteBtn.href = schema.pageUrl;
  }

  // Update section count
  const sectionCount = schema.sections ? schema.sections.length : 0;
  sectionCountText.textContent = `${sectionCount} section`;

  let heroHtml = '';
  let gridHtml = '';

  if (schema.sections) {
    schema.sections.forEach((section, index) => {
      const isHero = section.isHero || index === 0;
      if (isHero && index === 0) {
        heroHtml += buildSectionCard(section, pageKey, data, true);
      } else {
        gridHtml += buildSectionCard(section, pageKey, data, false);
      }
    });
  }
  
  heroGrid.innerHTML = heroHtml;
  sectionsGrid.innerHTML = gridHtml;
}

window.openEditModal = function(pageKey, sectionId) {
  currentSectionId = sectionId;
  const schema = PAGE_SCHEMAS[pageKey];
  const section = schema.sections.find(s => s.id === sectionId);
  const data = loadedData[pageKey] || {};

  modalTitle.textContent = `Edit: ${section.title}`;
  setStatus('');

  let html = '<form id="dynamic-form" class="content-form">';

  if (section.isArray) {
    // Render dynamic array form
    html += `<div id="dynamic-arrays" style="grid-column: 1 / -1;">`;
    html += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
        <label style="font-size:1rem; font-weight: 700;">${section.title}</label>
        <button type="button" class="btn-admin btn-admin--secondary" onclick="window.addArrayItem('${section.id}')">+ Tambah Item</button>
      </div>
      <div class="array-list" id="array-list-${section.id}"></div>
    `;
    html += `</div>`;
  } else {
    // Render static fields
    (section.fields || []).forEach(field => {
      const value = data[field.id] ?? '';
      const fullClass = field.type === 'textarea' || field.fullWidth ? 'content-field--full' : '';
      
      html += `<div class="content-field ${fullClass}">
        <label for="${field.id}">${field.label}</label>`;
        
      if (field.type === 'textarea') {
        html += `<textarea class="content-textarea" id="${field.id}" name="${field.id}" required>${escapeHtml(value)}</textarea>`;
      } else if (field.type === 'select') {
        html += `<select class="content-select" id="${field.id}" name="${field.id}">`;
        (field.options || []).forEach(opt => {
          const selected = opt.value === value ? 'selected' : '';
          html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
        });
        html += `</select>`;
      } else if (field.type === 'media') {
        html += `
          <div class="media-upload-wrapper" style="border: 1px dashed var(--admin-border); padding: 20px; border-radius: 12px; text-align: center; background: var(--admin-surface-2); margin-bottom: 8px; position: relative;">
            <div style="margin-bottom: 12px; max-height: 150px; overflow: hidden; border-radius: 8px; display: flex; justify-content: center; align-items: center;">
              <img src="${escapeHtml(value) || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23555%22 stroke-width=%222%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><polyline points=%2221 15 16 10 5 21%22/></svg>'}" style="max-width: 100%; max-height: 150px; object-fit: contain;" id="preview-${field.id}" />
            </div>
            <input class="content-input" type="file" accept="image/*,video/*" style="font-size: 0.9rem;" onchange="window.previewMedia(this, '${field.id}')">
            <input type="hidden" id="${field.id}" name="${field.id}" value="${escapeHtml(value)}">
          </div>
        `;
      } else {
        html += `<input class="content-input" type="${field.type}" id="${field.id}" name="${field.id}" value="${escapeHtml(value)}" required>`;
      }
      html += `</div>`;
    });
  }

  html += '</form>';
  modalBody.innerHTML = html;

  if (section.isArray) {
    const items = data[section.id] || [];
    window[`__arrayData_${section.id}`] = JSON.parse(JSON.stringify(items));
    renderArrayItems(section);
  }

  modalOverlay.classList.add('is-open');
};

function renderArrayItems(section) {
  const container = document.getElementById(`array-list-${section.id}`);
  if (!container) return;
  const items = window[`__arrayData_${section.id}`] || [];
  
  if (items.length === 0) {
    container.innerHTML = '<div style="color:var(--admin-text-muted); font-size:0.9rem; padding: 20px; text-align: center; border: 1px dashed var(--admin-border); border-radius: 12px;">Belum ada item. Klik Tambah Item.</div>';
    return;
  }

  let html = '';
  items.forEach((item, index) => {
    html += `<div class="array-item">
      <div class="array-item-header">
        <div class="array-item-title">Item ${index + 1}</div>
        <div class="array-item-actions">
          <button type="button" class="btn-icon" onclick="window.moveArrayItem('${section.id}', ${index}, -1)" title="Naik">⬆️</button>
          <button type="button" class="btn-icon" onclick="window.moveArrayItem('${section.id}', ${index}, 1)" title="Turun">⬇️</button>
          <button type="button" class="btn-icon danger" onclick="window.removeArrayItem('${section.id}', ${index})" title="Hapus">🗑️</button>
        </div>
      </div>
      <div class="content-form">`;
      
    section.itemFields.forEach(field => {
      const value = item[field.id] ?? (field.default ?? '');
      const fullClass = field.type === 'textarea' || field.fullWidth ? 'content-field--full' : '';
      
      html += `<div class="content-field ${fullClass}">
        <label>${field.label}</label>`;
      
      if (field.type === 'textarea') {
        html += `<textarea class="content-textarea" onchange="window.updateArrayItem('${section.id}', ${index}, '${field.id}', this.value)">${escapeHtml(value)}</textarea>`;
      } else if (field.type === 'checkbox') {
        const checked = value ? 'checked' : '';
        html += `<input type="checkbox" style="width:20px;height:20px;accent-color:var(--admin-primary);" onchange="window.updateArrayItem('${section.id}', ${index}, '${field.id}', this.checked)" ${checked}>`;
      } else if (field.type === 'select') {
        html += `<select class="content-select" onchange="window.updateArrayItem('${section.id}', ${index}, '${field.id}', this.value)">`;
        (field.options || []).forEach(opt => {
          const selected = opt.value === String(value) ? 'selected' : '';
          html += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
        });
        html += `</select>`;
      } else if (field.type === 'media') {
        html += `
          <div class="media-upload-wrapper" style="border: 1px dashed var(--admin-border); padding: 20px; border-radius: 12px; text-align: center; background: var(--admin-surface-2); margin-bottom: 8px; position: relative;">
            <div style="margin-bottom: 12px; max-height: 150px; overflow: hidden; border-radius: 8px; display: flex; justify-content: center; align-items: center;">
              <img src="${escapeHtml(value) || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23555%22 stroke-width=%222%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><polyline points=%2221 15 16 10 5 21%22/></svg>'}" style="max-width: 100%; max-height: 150px; object-fit: contain;" id="preview-${section.id}-${index}-${field.id}" />
            </div>
            <input class="content-input" type="file" accept="image/*,video/*" style="font-size: 0.9rem;" onchange="window.previewMedia(this, '${section.id}-${index}-${field.id}', '${section.id}', ${index}, '${field.id}')">
            <input type="hidden" value="${escapeHtml(value)}">
          </div>
        `;
      } else {
        html += `<input class="content-input" type="${field.type}" value="${escapeHtml(value)}" onchange="window.updateArrayItem('${section.id}', ${index}, '${field.id}', this.value)">`;
      }
      
      html += `</div>`;
    });
    
    html += `</div></div>`;
  });
  
  container.innerHTML = html;
}

// Handle file uploads directly in form
window.previewMedia = function(input, previewId, arraySectionId = null, arrayIndex = null, arrayFieldId = null) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
      // Update the preview image
      const previewImg = document.getElementById(`preview-${previewId}`);
      if (previewImg) previewImg.src = e.target.result;
      
      // Update the data
      if (arraySectionId !== null && arrayIndex !== null && arrayFieldId !== null) {
        // It's an array item, update the global array directly
        window.updateArrayItem(arraySectionId, arrayIndex, arrayFieldId, e.target.result);
      } else {
        // It's a static field, update the hidden input next to the file input
        const hiddenInput = document.getElementById(previewId); // previewId is the field.id for static
        if (hiddenInput) hiddenInput.value = e.target.result;
      }
    }
    
    reader.readAsDataURL(file);
  }
}

// Global functions for array manipulation
window.addArrayItem = function(sectionId) {
  const section = PAGE_SCHEMAS[currentTab].sections.find(s => s.id === sectionId);
  const newItem = {};
  section.itemFields.forEach(f => {
    newItem[f.id] = f.default ?? '';
  });
  window[`__arrayData_${sectionId}`].push(newItem);
  renderArrayItems(section);
};

window.removeArrayItem = function(sectionId, index) {
  if (!confirm('Hapus item ini?')) return;
  const section = PAGE_SCHEMAS[currentTab].sections.find(s => s.id === sectionId);
  window[`__arrayData_${sectionId}`].splice(index, 1);
  renderArrayItems(section);
};

window.moveArrayItem = function(sectionId, index, direction) {
  const arr = window[`__arrayData_${sectionId}`];
  if (index + direction < 0 || index + direction >= arr.length) return;
  
  const temp = arr[index];
  arr[index] = arr[index + direction];
  arr[index + direction] = temp;
  
  const section = PAGE_SCHEMAS[currentTab].sections.find(s => s.id === sectionId);
  renderArrayItems(section);
};

window.updateArrayItem = function(sectionId, index, fieldId, value) {
  window[`__arrayData_${sectionId}`][index][fieldId] = value;
};

function getModalFormData() {
  const form = document.getElementById('dynamic-form');
  const partialData = {};
  
  if (form) {
    const formData = new FormData(form);
    for (let [key, value] of formData.entries()) {
      partialData[key] = value.trim();
    }
  }

  // Add array data if current section is an array
  const section = PAGE_SCHEMAS[currentTab].sections.find(s => s.id === currentSectionId);
  if (section && section.isArray) {
    partialData[section.id] = window[`__arrayData_${section.id}`] || [];
  }

  return partialData;
}

async function saveModalContent() {
  setStatus('Menyimpan...', false);
  setButtonLoading(modalSave, true, 'Menyimpan...', 'Simpan Perubahan');

  try {
    const partialData = getModalFormData();
    
    // Merge partial data into full page data
    const fullData = { ...loadedData[currentTab], ...partialData };

    // Handle SEO special mapping
    let payload = fullData;
    if (currentTab === 'seo') {
      const seoData = {};
      const pages = ['homepage', 'layanan', 'produk', 'tentang', 'lokasi', 'konsultasi'];
      pages.forEach(p => {
        seoData[p] = {
          meta_title: fullData[`${p}_meta_title`],
          meta_description: fullData[`${p}_meta_description`],
        };
        if (fullData[`${p}_og_image`]) {
          seoData[p].og_image = fullData[`${p}_og_image`];
        }
      });
      payload = seoData;
    }
    
    const endpoint = currentTab === 'homepage' ? '/homepage-content' : `/page-content?page=${currentTab}`;
    const res = await apiCall(endpoint, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (res && res.data) {
      if (currentTab === 'seo') {
        const flatSeo = {};
        for (const [page, tags] of Object.entries(res.data)) {
          for (const [key, value] of Object.entries(tags)) {
            flatSeo[`${page}_${key}`] = value;
          }
        }
        loadedData[currentTab] = flatSeo;
      } else {
        loadedData[currentTab] = res.data;
      }
      
      // Re-render sections to show updated preview
      renderSections(currentTab);
      
      showToast('Perubahan berhasil disimpan.');
      modalOverlay.classList.remove('is-open');
    }
  } catch (err) {
    console.error(err);
    setStatus('Gagal menyimpan.', true);
  } finally {
    setButtonLoading(modalSave, false, 'Menyimpan...', 'Simpan Perubahan');
  }
}

// Listeners
modalClose.addEventListener('click', () => modalOverlay.classList.remove('is-open'));
modalCancel.addEventListener('click', () => modalOverlay.classList.remove('is-open'));
modalSave.addEventListener('click', saveModalContent);

// Init
async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam && PAGE_SCHEMAS[tabParam]) {
    currentTab = tabParam;
  } else {
    currentTab = 'homepage';
  }

  renderTabs();
  await loadPageData(currentTab);
  isBootstrapping = false;
  renderSections(currentTab);
}

init();
