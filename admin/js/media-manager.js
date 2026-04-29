import { renderSidebar, requireLogin, apiCall, showToast } from './admin.js';

if (!requireLogin()) throw new Error('redirect');

renderSidebar('media');

const fileUpload = document.getElementById('file-upload');
const uploadArea = document.getElementById('upload-area');
const mediaGrid = document.getElementById('media-grid');
const searchInput = document.getElementById('search-input');
const mediaStats = document.getElementById('media-stats');
const mediaLoading = document.getElementById('media-loading');

// Modal Elements
const mediaModal = document.getElementById('media-detail-modal');
const modalClose = document.getElementById('modal-close');
const modalPreview = document.getElementById('modal-preview');
const detailName = document.getElementById('detail-name');
const detailUrl = document.getElementById('detail-url');
const detailDate = document.getElementById('detail-date');
const modalFilename = document.getElementById('modal-filename');
const copyUrlBtn = document.getElementById('copy-url-btn');
const detailDeleteBtn = document.getElementById('detail-delete-btn');

let mediaItems = [];
let currentSelectedMedia = null;

async function loadMedia() {
    mediaGrid.innerHTML = '';
    mediaLoading.style.display = 'block';
    
    try {
        const res = await apiCall('/media?limit=100');
        if (res && res.data) {
            mediaItems = res.data;
            renderMedia(mediaItems);
        }
    } catch (err) {
        console.error('Failed to load media:', err);
        showToast('Gagal memuat media', true);
    } finally {
        mediaLoading.style.display = 'none';
    }
}

function renderMedia(items) {
    mediaStats.textContent = `${items.length} item ditemukan`;
    
    if (items.length === 0) {
        mediaGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--admin-text-muted); padding: 40px;">Belum ada media. Silakan upload file pertama Anda.</div>';
        return;
    }

    mediaGrid.innerHTML = items.map(item => {
        const isVideo = item.url && item.url.match(/\.(mp4|webm|ogg)$/i);
        const previewHtml = isVideo 
            ? `<video src="${item.url}" muted style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<img src="${item.url}" alt="${item.filename}" loading="lazy">`;

        return `
            <div class="media-item" onclick="window.openMediaDetail('${item.id}')">
                ${previewHtml}
                <div class="media-info">${item.filename}</div>
                <div class="media-actions">
                    <button class="media-btn danger" onclick="event.stopPropagation(); window.deleteMedia('${item.id}')" title="Hapus">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

window.openMediaDetail = function(id) {
    const item = mediaItems.find(m => m.id === id);
    if (!item) return;

    currentSelectedMedia = item;
    modalFilename.textContent = item.title || item.filename;
    detailName.textContent = item.filename;
    detailUrl.textContent = item.url;
    
    const date = new Date(item.uploaded_at);
    detailDate.textContent = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const isVideo = item.url && item.url.match(/\.(mp4|webm|ogg)$/i);
    modalPreview.innerHTML = isVideo 
        ? `<video src="${item.url}" controls style="max-width:100%;max-height:400px;"></video>`
        : `<img src="${item.url}" alt="${item.filename}">`;

    mediaModal.classList.add('is-open');
}

window.deleteMedia = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus media ini? (Tindakan ini tidak akan menghapus file fisik di mode lokal, hanya referensi)')) return;

    try {
        await apiCall(`/media?id=${id}`, { method: 'DELETE' });
        showToast('Media berhasil dihapus');
        mediaModal.classList.remove('is-open');
        await loadMedia();
    } catch (err) {
        showToast('Gagal menghapus media', true);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        showToast('Mengunggah file...', false);
        
        // 1. Upload file physics
        const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.localStorage.getItem('deoksi_admin_token')}`
            },
            body: formData
        });

        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();

        // 2. Save metadata to DB
        const metaRes = await apiCall('/media', {
            method: 'POST',
            body: JSON.stringify({
                filename: uploadData.filename,
                title: file.name,
                url: uploadData.url,
                type: file.type.startsWith('video') ? 'video' : 'image',
                size_bytes: uploadData.size,
                status: 'active'
            })
        });

        showToast('File berhasil diunggah');
        await loadMedia();

    } catch (err) {
        console.error('Upload error:', err);
        showToast('Gagal mengunggah file', true);
    }
}

// Event Listeners
uploadArea.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        Array.from(e.target.files).forEach(uploadFile);
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach(uploadFile);
    }
});

searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = mediaItems.filter(m => 
        (m.filename && m.filename.toLowerCase().includes(q)) || 
        (m.title && m.title.toLowerCase().includes(q))
    );
    renderMedia(filtered);
});

modalClose.addEventListener('click', () => mediaModal.classList.remove('is-open'));
mediaModal.addEventListener('click', (e) => {
    if (e.target === mediaModal) mediaModal.classList.remove('is-open');
});

copyUrlBtn.addEventListener('click', () => {
    if (currentSelectedMedia) {
        navigator.clipboard.writeText(currentSelectedMedia.url);
        const originalText = copyUrlBtn.innerHTML;
        copyUrlBtn.innerHTML = '✅ Tersalin!';
        setTimeout(() => copyUrlBtn.innerHTML = originalText, 2000);
    }
});

detailDeleteBtn.addEventListener('click', () => {
    if (currentSelectedMedia) {
        window.deleteMedia(currentSelectedMedia.id);
    }
});

// Init
loadMedia();
