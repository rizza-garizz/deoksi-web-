const PAGE_LABELS = {
  beranda: 'Beranda',
  galeri: 'Galeri',
  layanan: 'Layanan',
  produk: 'Produk',
  berita: 'Berita',
  tentang: 'Tentang',
  lokasi: 'Lokasi',
  promo: 'Promo',
  testimoni: 'Testimoni',
};

function buildPositions(prefix, total, labelPrefix) {
  return Array.from({ length: total }, (_, index) => ({
    key: `${prefix}_${index + 1}`,
    label: `${labelPrefix} ${index + 1}`,
  }));
}

function createSlots({
  pageKey,
  sectionKey,
  sectionLabel,
  mediaKind,
  type,
  sourceType,
  positions,
  replacePolicy = 'multiple',
  legacySlotKeyPrefix = null,
}) {
  const pageLabel = PAGE_LABELS[pageKey] || pageKey;
  return positions.map((position, index) => {
    const positionKey = position.key;
    const positionLabel = position.label;
    const isSingle = replacePolicy === 'single';
    const slotKey = isSingle
      ? (legacySlotKeyPrefix || `${sectionKey}`)
      : `${legacySlotKeyPrefix || sectionKey}__${positionKey}`;

    return {
      key: `${pageKey}:${sectionKey}:${positionKey}`,
      page_key: pageKey,
      page_label: pageLabel,
      section_key: sectionKey,
      section_label: sectionLabel,
      position_key: positionKey,
      position_label: positionLabel,
      media_kind: mediaKind,
      type,
      source_type: sourceType,
      replace_policy: replacePolicy,
      max_active: isSingle ? 1 : null,
      slot_key: slotKey,
      slot_name: `${sectionLabel} - ${positionLabel}`,
      section_name: sectionLabel,
      display_order: index + 1,
    };
  });
}

export const MEDIA_SLOT_DEFINITIONS = [
  ...createSlots({
    pageKey: 'beranda',
    sectionKey: 'hero_video',
    sectionLabel: 'Hero Video',
    mediaKind: 'video_cloudinary',
    type: 'video',
    sourceType: 'cloudinary',
    positions: [{ key: 'primary', label: 'Video Utama' }],
    replacePolicy: 'single',
    legacySlotKeyPrefix: 'hero_media',
  }),
  ...createSlots({
    pageKey: 'galeri',
    sectionKey: 'video_gallery',
    sectionLabel: 'Video Gallery',
    mediaKind: 'video_cloudinary',
    type: 'video',
    sourceType: 'cloudinary',
    positions: buildPositions('video', 12, 'Video'),
    replacePolicy: 'multiple',
  }),
  ...createSlots({
    pageKey: 'beranda',
    sectionKey: 'promo_cards',
    sectionLabel: 'Promo',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('promo', 3, 'Frame Promo'),
  }),
  ...createSlots({
    pageKey: 'galeri',
    sectionKey: 'photo_gallery',
    sectionLabel: 'Foto Gallery',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('photo', 24, 'Foto'),
  }),
  ...createSlots({
    pageKey: 'layanan',
    sectionKey: 'service_cards',
    sectionLabel: 'Kartu Layanan',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('service', 12, 'Layanan'),
  }),
  ...createSlots({
    pageKey: 'produk',
    sectionKey: 'product_cards',
    sectionLabel: 'Kartu Produk',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('product', 18, 'Produk'),
  }),
  ...createSlots({
    pageKey: 'berita',
    sectionKey: 'article_cover',
    sectionLabel: 'Cover Berita',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('article', 24, 'Artikel'),
  }),
  ...createSlots({
    pageKey: 'tentang',
    sectionKey: 'doctor_profiles',
    sectionLabel: 'Foto Dokter',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('doctor', 12, 'Dokter'),
  }),
  ...createSlots({
    pageKey: 'tentang',
    sectionKey: 'certificates',
    sectionLabel: 'Sertifikat',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('certificate', 18, 'Sertifikat'),
  }),
  ...createSlots({
    pageKey: 'lokasi',
    sectionKey: 'location_visual',
    sectionLabel: 'Visual Lokasi',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: [{ key: 'primary', label: 'Visual Utama' }],
    replacePolicy: 'single',
  }),
  ...createSlots({
    pageKey: 'promo',
    sectionKey: 'promo_banner',
    sectionLabel: 'Banner Promo',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('banner', 8, 'Banner'),
  }),
  ...createSlots({
    pageKey: 'testimoni',
    sectionKey: 'testimonial_cards',
    sectionLabel: 'Foto Testimoni',
    mediaKind: 'website_photo',
    type: 'image',
    sourceType: 'google_drive',
    positions: buildPositions('testimonial', 18, 'Testimoni'),
  }),
];

const SLOT_KEY_MAP = new Map(MEDIA_SLOT_DEFINITIONS.map((item) => [item.slot_key, item]));
const COMPOSITE_MAP = new Map(MEDIA_SLOT_DEFINITIONS.map((item) => [item.key, item]));

export function extractGoogleDriveFileId(rawUrl = '') {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  try {
    const parsed = new URL(value);
    const idParam = parsed.searchParams.get('id');
    if (idParam) return idParam;

    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/i)
      || parsed.pathname.match(/\/d\/([^/]+)/i);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

export function normalizeGoogleDriveUrl(rawUrl = '') {
  const fileId = extractGoogleDriveFileId(rawUrl);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000` : String(rawUrl || '').trim();
}

export function normalizePublicMediaUrl(rawUrl = '') {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  if (/drive\.google\.com|docs\.google\.com/i.test(value)) {
    return normalizeGoogleDriveUrl(value);
  }
  return value;
}

export function inferExternalMediaSourceType(rawUrl = '') {
  const value = String(rawUrl || '').trim();
  if (!value) return null;
  if (/drive\.google\.com|docs\.google\.com/i.test(value)) {
    return 'google_drive';
  }
  return /^https?:\/\//i.test(value) ? 'external_url' : null;
}

export function isGoogleDriveFileUrl(rawUrl = '') {
  return Boolean(extractGoogleDriveFileId(rawUrl));
}

export function getMediaSlotDefinitions({ mediaKind, pageKey, sectionKey } = {}) {
  return MEDIA_SLOT_DEFINITIONS.filter((item) => {
    if (mediaKind && item.media_kind !== mediaKind) return false;
    if (pageKey && item.page_key !== pageKey) return false;
    if (sectionKey && item.section_key !== sectionKey) return false;
    return true;
  });
}

export function findMediaSlotDefinition({ slotKey, pageKey, sectionKey, positionKey } = {}) {
  if (slotKey && SLOT_KEY_MAP.has(slotKey)) {
    return SLOT_KEY_MAP.get(slotKey);
  }

  if (pageKey && sectionKey && positionKey) {
    return COMPOSITE_MAP.get(`${pageKey}:${sectionKey}:${positionKey}`) || null;
  }

  return null;
}

export function buildUsageLabel(item = {}) {
  const definition = findMediaSlotDefinition({
    slotKey: item.slot_key,
    pageKey: item.page_key,
    sectionKey: item.section_key,
    positionKey: item.position_key,
  });

  if (!definition) return '-';

  if (definition.page_key === 'beranda' && definition.section_key === 'promo_cards') {
    return `${definition.page_label} > Promo > ${definition.position_label}`;
  }

  return `${definition.page_label} > ${definition.section_label} > ${definition.position_label}`;
}

export function normalizeMediaPlacement(item = {}) {
  const normalizedUrl = normalizePublicMediaUrl(item.url || item.optimized_url || item.original_url);
  const normalizedOptimizedUrl = normalizePublicMediaUrl(item.optimized_url || item.url || item.original_url);
  const normalizedThumbUrl = normalizePublicMediaUrl(item.thumb_url || item.optimized_url || item.url || item.original_url);
  const definition = findMediaSlotDefinition({
    slotKey: item.slot_key,
    pageKey: item.page_key,
    sectionKey: item.section_key,
    positionKey: item.position_key,
  });

  if (!definition) {
    return {
      ...item,
      media_kind: item.media_kind || null,
      source_type: item.source_type || inferExternalMediaSourceType(item.original_url || item.url) || null,
      page_key: item.page_key || null,
      page_label: PAGE_LABELS[item.page_key] || item.page_key || null,
      section_key: item.section_key || null,
      section_label: item.section_label || item.section_name || null,
      position_key: item.position_key || null,
      position_label: item.position_label || null,
      original_url: String(item.original_url || item.url || '').trim() || null,
      url: normalizedUrl || '',
      optimized_url: normalizedOptimizedUrl || normalizedUrl || '',
      thumb_url: normalizedThumbUrl || normalizedOptimizedUrl || normalizedUrl || '',
      replace_policy: item.replace_policy || 'multiple',
      usage_label: '-',
    };
  }

  return {
    ...item,
    media_kind: item.media_kind || definition.media_kind,
    source_type: item.source_type || inferExternalMediaSourceType(item.original_url || item.url) || definition.source_type,
    page_key: item.page_key || definition.page_key,
    page_label: definition.page_label,
    section_key: item.section_key || definition.section_key,
    section_label: item.section_label || definition.section_label,
    position_key: item.position_key || definition.position_key,
    position_label: item.position_label || definition.position_label,
    original_url: String(item.original_url || item.url || '').trim() || null,
    url: normalizedUrl || '',
    optimized_url: normalizedOptimizedUrl || normalizedUrl || '',
    thumb_url: normalizedThumbUrl || normalizedOptimizedUrl || normalizedUrl || '',
    slot_key: item.slot_key || definition.slot_key,
    slot_name: item.slot_name || definition.slot_name,
    section_name: item.section_name || definition.section_name,
    replace_policy: item.replace_policy || definition.replace_policy,
    usage_label: buildUsageLabel({
      slot_key: item.slot_key || definition.slot_key,
      page_key: item.page_key || definition.page_key,
      section_key: item.section_key || definition.section_key,
      position_key: item.position_key || definition.position_key,
    }),
  };
}

export function normalizeMediaPayload(body = {}) {
  const definition = findMediaSlotDefinition({
    slotKey: body.slot_key,
    pageKey: body.page_key,
    sectionKey: body.section_key,
    positionKey: body.position_key,
  });

  const rawOriginalUrl = String(body.original_url ?? body.url ?? '').trim();
  const normalizedUrl = normalizePublicMediaUrl(body.url || rawOriginalUrl);
  const normalizedOptimizedUrl = normalizePublicMediaUrl(body.optimized_url || normalizedUrl || rawOriginalUrl);
  const normalizedThumbUrl = normalizePublicMediaUrl(body.thumb_url || normalizedOptimizedUrl || normalizedUrl || rawOriginalUrl);
  const inferredSourceType = inferExternalMediaSourceType(rawOriginalUrl || normalizedUrl);

  return {
    ...body,
    media_kind: body.media_kind || definition?.media_kind || null,
    page_key: body.page_key || definition?.page_key || null,
    section_key: body.section_key || definition?.section_key || null,
    position_key: body.position_key || definition?.position_key || null,
    section_name: body.section_name || definition?.section_name || null,
    slot_key: body.slot_key || definition?.slot_key || null,
    slot_name: body.slot_name || definition?.slot_name || null,
    replace_policy: body.replace_policy || definition?.replace_policy || 'multiple',
    type: body.type || definition?.type || null,
    source_type: body.source_type || inferredSourceType || definition?.source_type || null,
    original_url: rawOriginalUrl || null,
    url: normalizedUrl || '',
    optimized_url: normalizedOptimizedUrl || normalizedUrl || '',
    thumb_url: normalizedThumbUrl || normalizedOptimizedUrl || normalizedUrl || '',
  };
}

export function isSinglePlacement(payload = {}) {
  const definition = findMediaSlotDefinition({
    slotKey: payload.slot_key,
    pageKey: payload.page_key,
    sectionKey: payload.section_key,
    positionKey: payload.position_key,
  });

  return (definition?.replace_policy || payload.replace_policy) === 'single';
}

export function getCloudinaryUrlPattern() {
  return /^https?:\/\/(?:res\.cloudinary\.com|cloudinary\.com)\//i;
}

export function getExpectedSourceTypeForMediaKind(mediaKind) {
  if (mediaKind === 'website_photo') return 'google_drive';
  if (mediaKind === 'video_cloudinary') return 'cloudinary';
  return null;
}

export function getExpectedMediaSourceRule(payload = {}) {
  const definition = findMediaSlotDefinition({
    slotKey: payload.slot_key,
    pageKey: payload.page_key,
    sectionKey: payload.section_key,
    positionKey: payload.position_key,
  });

  const mediaKind = payload.media_kind || definition?.media_kind || null;
  const type = payload.type || definition?.type || null;
  const sourceType = definition?.source_type || getExpectedSourceTypeForMediaKind(mediaKind);

  return {
    definition,
    mediaKind,
    type,
    sourceType,
  };
}
