function getPositionIndex(positionKey = '') {
  const match = String(positionKey).match(/(\d+)$/);
  return match ? Number(match[1]) : 1;
}

export function shouldApplyHomepageHeroMedia(contentHeroMedia, managedSlots = {}) {
  if (!contentHeroMedia) return false;
  return true;
}

export function mergeHomepagePromos(promos = [], assets = []) {
  const basePromos = Array.isArray(promos) ? [...promos] : [];
  const activeAssets = Array.isArray(assets)
    ? [...assets]
      .filter((asset) => asset?.status === 'active' && asset?.url)
      .sort((a, b) => getPositionIndex(a.position_key) - getPositionIndex(b.position_key))
    : [];

  const maxItems = Math.max(basePromos.length, activeAssets.length);
  if (maxItems === 0) return [];

  return Array.from({ length: maxItems }, (_, index) => {
    const promo = basePromos[index] || {};
    const asset = activeAssets[index] || null;
    const fallbackTitle = asset?.title || `Promo ${index + 1}`;

    return {
      title: promo.title || fallbackTitle,
      description: promo.description || 'Promo aktif dari Deoksi Clinic.',
      price: promo.price || '',
      image_url: asset?.url || promo.image_url || '',
      cta_link: promo.cta_link || '#',
      is_visible: promo.is_visible !== false && (asset ? asset.status === 'active' : true),
    };
  });
}
