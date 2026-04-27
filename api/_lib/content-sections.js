export const WEBSITE_CONTENT_SECTIONS = [
  'hero_homepage',
  'promo_section',
  'gallery_page',
  'banner_section',
  'service_section',
  'product_section',
  'article_thumbnail',
  'logo_brand',
  'floating_whatsapp',
];

export const WEBSITE_CONTENT_SECTION_DEFINITIONS = {
  hero_homepage: {
    label: 'Hero Homepage',
    slotKeys: ['hero_image', 'hero_badge', 'hero_cta_link', 'hero_card_image', 'hero_media'],
    allowTypes: ['image', 'video', 'link'],
    mode: 'multiple',
  },
  promo_section: {
    label: 'Promo Section',
    slotKeys: ['promo_banner_1', 'promo_banner_2', 'promo_featured'],
    allowTypes: ['image', 'video', 'link'],
    mode: 'multiple',
  },
  gallery_page: {
    label: 'Gallery Page',
    slotKeys: [
      'gallery_image_1',
      'gallery_image_2',
      'gallery_image_3',
      'gallery_highlight_video',
      'gallery_zone_1_primary',
      'gallery_zone_1_secondary',
      'gallery_zone_1_tertiary',
      'gallery_zone_2_primary',
      'gallery_zone_2_secondary',
      'gallery_zone_2_tertiary',
      'gallery_zone_3_primary',
      'gallery_zone_3_secondary',
      'gallery_zone_3_tertiary',
      'gallery_journey_consult',
      'gallery_journey_treatment',
      'gallery_journey_aftercare',
    ],
    allowTypes: ['image', 'video'],
    mode: 'multiple',
  },
  banner_section: {
    label: 'Banner Section',
    slotKeys: ['banner_media'],
    allowTypes: ['image', 'video'],
    mode: 'single',
  },
  service_section: {
    label: 'Service Section',
    slotKeys: ['service_section'],
    allowTypes: ['image', 'video', 'link'],
    mode: 'multiple',
  },
  product_section: {
    label: 'Product Section',
    slotKeys: ['product_section'],
    allowTypes: ['image', 'video', 'link'],
    mode: 'multiple',
  },
  article_thumbnail: {
    label: 'Article Thumbnail',
    slotKeys: ['article_thumbnail'],
    allowTypes: ['image'],
    mode: 'multiple',
  },
  logo_brand: {
    label: 'Logo Brand',
    slotKeys: ['logo_brand'],
    allowTypes: ['image'],
    mode: 'single',
  },
  floating_whatsapp: {
    label: 'Floating WhatsApp',
    slotKeys: ['floating_whatsapp'],
    allowTypes: ['link'],
    mode: 'single',
  },
};

const SLOT_TO_SECTION = Object.entries(WEBSITE_CONTENT_SECTION_DEFINITIONS)
  .flatMap(([section, config]) => (config.slotKeys || []).map((slotKey) => [slotKey, section]));

const SLOT_TO_SECTION_MAP = new Map(SLOT_TO_SECTION);
const SECTION_NAME_SET = new Set(WEBSITE_CONTENT_SECTIONS);
const SECTION_LABEL_MAP = new Map(
  Object.entries(WEBSITE_CONTENT_SECTION_DEFINITIONS).flatMap(([section, config]) => [
    [section, section],
    [String(config.label || '').trim().toLowerCase(), section],
  ])
);

export function getWebsiteSectionBySlotKey(slotKey) {
  return SLOT_TO_SECTION_MAP.get(String(slotKey || '').trim()) || null;
}

export function normalizeWebsiteSection(value) {
  const section = String(value || '').trim().toLowerCase();
  if (SECTION_NAME_SET.has(section)) return section;
  return SECTION_LABEL_MAP.get(section) || null;
}

export function resolveWebsiteSection(mediaItem = {}) {
  return (
    getWebsiteSectionBySlotKey(mediaItem.slot_key) ||
    normalizeWebsiteSection(mediaItem.section_name) ||
    null
  );
}

export function normalizeWebsiteAssetType(type) {
  if (type === 'image' || type === 'video' || type === 'link') {
    return type;
  }

  return 'link';
}

export function mapMediaToWebsiteAsset(mediaItem = {}) {
  const section = resolveWebsiteSection(mediaItem);
  if (!section) return null;
  const publicStatus = mediaItem.status === 'archived'
    ? 'inactive'
    : (mediaItem.status || 'draft');

  return {
    id: mediaItem.id,
    section,
    title: mediaItem.title || mediaItem.filename || 'Untitled Asset',
    type: normalizeWebsiteAssetType(mediaItem.type),
    url: mediaItem.optimized_url || mediaItem.url || mediaItem.original_url || '',
    alt_text: mediaItem.alt_text || '',
    status: publicStatus,
    created_at: mediaItem.uploaded_at || mediaItem.created_at || null,
    updated_at: mediaItem.updated_at || mediaItem.uploaded_at || mediaItem.created_at || null,
    slot_key: mediaItem.slot_key || null,
  };
}

export function groupWebsiteContentAssets(mediaItems = []) {
  const grouped = Object.fromEntries(WEBSITE_CONTENT_SECTIONS.map((section) => [section, []]));
  const sortedItems = [...mediaItems].sort((a, b) => {
    const updatedDiff = new Date(b.updated_at || b.uploaded_at || 0) - new Date(a.updated_at || a.uploaded_at || 0);
    if (updatedDiff !== 0) return updatedDiff;
    return new Date(b.created_at || b.uploaded_at || 0) - new Date(a.created_at || a.uploaded_at || 0);
  });

  for (const mediaItem of sortedItems) {
    const asset = mapMediaToWebsiteAsset(mediaItem);
    if (!asset || asset.status !== 'active') continue;
    grouped[asset.section].push(asset);
  }

  return grouped;
}

export function buildWebsiteSlotMap(mediaItems = []) {
  const slots = {};
  const grouped = groupWebsiteContentAssets(mediaItems);

  Object.values(grouped).flat().forEach((asset) => {
    if (!asset.slot_key) return;
    if (!slots[asset.slot_key]) {
      slots[asset.slot_key] = asset;
    }
  });

  return slots;
}
