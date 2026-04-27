const CLOUD_ORIGIN = ''; // Contoh: 'https://ik.imagekit.io/deoksi/'

/**
 * Helper untuk mendapatkan URL aset dari Cloud atau Lokal
 * @param {string} path - Path aset (contoh: /assets/images/hero.jpg)
 * @param {string} transform - Transformasi ImageKit (contoh: tr=w-400,f-auto)
 */
function getAssetUrl(path, transform = '') {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const cleanPath = path.replace(/^\//, '');
  
  if (CLOUD_ORIGIN) {
    // Jika menggunakan ImageKit, kita bisa tambah transformasi otomatis
    const url = `${CLOUD_ORIGIN}${cleanPath}`;
    if (transform) {
      return url.includes('?') ? `${url}&${transform}` : `${url}?${transform}`;
    }
    // Default optimasi ImageKit: auto format & quality
    return `${url}?tr=f-auto,q-80`; 
  }
  
  return `/${cleanPath}`;
}

export async function initContent() {
  try {
    const previewMediaId = new URLSearchParams(window.location.search).get('preview_media_id');
    const siteContentHeaders = {};
    const siteContentUrl = new URL('/api/site-content', window.location.origin);

    if (previewMediaId) {
      siteContentUrl.searchParams.set('preview_media_id', previewMediaId);
    }
    siteContentUrl.searchParams.set('t', String(Date.now()));

    if (previewMediaId) {
      const adminToken = window.localStorage.getItem('deoksi_admin_token');
      if (adminToken) {
        siteContentHeaders.Authorization = `Bearer ${adminToken}`;
      }
    }

    // Menambahkan cache buster agar Vite selalu update JSON di browser
    const [contentResponse, siteContentResponse] = await Promise.all([
      fetch('/data/content.json?v=' + new Date().getTime()),
      fetch(siteContentUrl.toString(), {
        headers: siteContentHeaders,
        cache: 'no-store',
      }).catch(() => null),
    ]);

    const data = await contentResponse.json();
    const siteContentPayload = siteContentResponse?.ok ? await siteContentResponse.json() : null;

    applyManagedSections(data, siteContentPayload?.slots || {});
    renderContent(data);
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

function applyManagedSections(data, managedSlots) {
  const promoAssets = ['promo_banner_1', 'promo_banner_2']
    .map((slotKey) => managedSlots?.[slotKey])
    .filter(Boolean);

  if (promoAssets.length) {
    data.sections = data.sections || {};
    data.sections.promo = {
      isFlyer: true,
      items: promoAssets.map((asset) => ({
        title: asset.title,
        subtitle: 'Promo aktif dari Media Manager',
        image: asset.type === 'image' ? asset.url : '/assets/images/service_products.png',
        video: asset.type === 'video' ? asset.url : '',
        color: '#F7903E',
        link: asset.type === 'link' ? asset.url : '#',
        altText: asset.alt_text || asset.title,
      })),
    };
  }

  const galleryAssets = ['gallery_image_1', 'gallery_image_2', 'gallery_image_3']
    .map((slotKey, index) => {
      const asset = managedSlots?.[slotKey];
      if (!asset) return null;
      return {
        image: asset.url,
        label: asset.title || `Gallery Image ${index + 1}`,
        large: index === 0,
      };
    })
    .filter(Boolean);

  if (galleryAssets.length) {
    data.sections = data.sections || {};
    data.sections.gallery = data.sections.gallery || {};
    data.sections.gallery.items = galleryAssets;
  }
}

function renderContent(data) {
  // 1. Hero Section
  const heroContent = document.getElementById('hero-content');
  const heroBg = document.getElementById('hero-bg-container');
  
  if (data.hero && heroContent && heroBg) {
    if (data.hero.backgroundVideo) {
      heroBg.innerHTML = `
        <video autoplay muted loop playsinline class="hero-video video-hover-media" fetchpriority="high">
          <source src="${getAssetUrl(data.hero.backgroundVideo)}" type="video/mp4">
        </video>
        <div class="hero-overlay"></div>
      `;
    } else {
      heroBg.innerHTML = `
        <img src="${getAssetUrl(data.hero.backgroundImage)}" alt="Latar belakang Deoksi Clinic" loading="eager" fetchpriority="high" width="1920" height="1080">
        <div class="hero-overlay"></div>
      `;
    }
    
    heroContent.innerHTML = `
      <h1 class="hero-title animate-fade-up delay-1">
        ${data.hero.title}
      </h1>
      <p class="hero-subtitle animate-fade-up delay-2">
        ${data.hero.subtitle}
      </p>
      <a href="${data.hero.whatsappLink}"
        class="btn btn-primary hero-btn animate-fade-up delay-3" target="_blank" rel="noopener noreferrer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        ${data.hero.buttonText}
      </a>
    `;
  }


  // 1.5 Promo Section
  const promoGrid = document.getElementById('promo-grid');
  if (data.sections.promo && promoGrid) {
    const isFlyer = data.sections.promo.isFlyer;
    promoGrid.classList.toggle('promo-grid-flyer', Boolean(isFlyer));
    
    promoGrid.innerHTML = data.sections.promo.items.map((item, index) => {
      if (isFlyer) {
        return `
          <a href="${item.link || '#'}" class="promo-card promo-flyer animate-on-scroll" target="_blank" rel="noopener noreferrer" style="--delay: ${index * 0.1}s" aria-label="Ambil Promo: ${item.title}">
            <div class="flyer-image">
              ${
                item.video
                  ? `<video class="video-hover-media" src="${getAssetUrl(item.video)}" poster="${getAssetUrl(item.image)}" preload="metadata" muted loop playsinline></video>`
                  : `<img src="${getAssetUrl(item.image)}" alt="${item.altText || `Flyer Promo ${item.title}`}" loading="lazy" width="360" height="509">`
              }
            </div>
            <div class="flyer-overlay">
              <div class="promo-btn">
                Ambil Promo
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
        `;
      }
      
      return `
        <a href="${item.link || '#'}" class="promo-card animate-on-scroll" target="_blank" rel="noopener noreferrer" style="--delay: ${index * 0.1}s" aria-label="Ambil Promo: ${item.title}">
          <div class="promo-content">
            <span class="promo-label">SPECIAL OFFER</span>
            <h3 class="promo-title">${item.title}</h3>
            <p class="promo-subtitle">${item.subtitle}</p>
            <div class="promo-btn">
              Ambil Promo
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
          <div class="promo-image">
            ${
              item.video
                ? `<video class="video-hover-media" src="${getAssetUrl(item.video)}" poster="${getAssetUrl(item.image)}" preload="metadata" muted loop playsinline></video>`
                : `<img src="${getAssetUrl(item.image)}" alt="${item.altText || `Ilustrasi ${item.title}`}" loading="lazy" width="200" height="250">`
            }
          </div>
          <div class="promo-bg-shape" style="background: ${item.color}"></div>
        </a>
      `;
    }).join('');
  }

  // 2. Services Section
  const servicesHeader = document.getElementById('services-header');
  const servicesGrid = document.getElementById('services-grid');
  
  if (data.sections.services && servicesHeader && servicesGrid) {
    servicesHeader.innerHTML = `
      <span class="section-tag animate-on-scroll">${data.sections.services.tag}</span>
      <h2 class="section-title animate-on-scroll">${data.sections.services.title}</h2>
    `;
    
    const limit = parseInt(servicesGrid.getAttribute('data-limit')) || data.sections.services.items.length;
    const itemsToRender = data.sections.services.items.slice(0, limit);
    
    servicesGrid.innerHTML = itemsToRender.map(item => `
      <div class="service-card animate-on-scroll" id="service-${item.id}">
        <div class="service-img ${item.video ? 'service-img--has-video video-hover-surface' : ''}">
          <img src="${getAssetUrl(item.image)}" alt="${item.title}" loading="lazy" width="400" height="240">
          ${item.video ? `<video class="video-hover-media" src="${getAssetUrl(item.video)}" poster="${getAssetUrl(item.image)}" preload="metadata" muted loop playsinline></video>` : ''}
          <div class="service-img-overlay">
            ${item.video ? '<span class="video-hover-tint" aria-hidden="true"></span>' : ''}
          </div>
        </div>
        <div class="service-content">
          <div class="service-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <a href="${item.link}" class="service-link" target="_blank" rel="noopener noreferrer" aria-label="Konsultasikan layanan ${item.title}">
            Konsultasikan Treatment Ini
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    `).join('');
  }

  // 2.8 Gallery Section (Dedicated gallery page)
  const isGalleryPage = document.body?.dataset?.page === 'gallery';
  const galleryHeader = document.getElementById('gallery-page-header');
  const galleryGrid = document.getElementById('gallery-page-grid');
  const galleryNote = document.getElementById('gallery-page-note');

  if (isGalleryPage && data.sections.gallery && galleryHeader && galleryGrid && galleryNote) {
    galleryHeader.innerHTML = `
      <span class="section-tag animate-on-scroll">${data.sections.gallery.tag}</span>
      <h2 class="section-title animate-on-scroll">${data.sections.gallery.title}</h2>
      <p class="section-desc animate-on-scroll">${data.sections.gallery.description}</p>
    `;

    galleryGrid.innerHTML = data.sections.gallery.items.map((item, i) => `
      <figure class="gallery-item ${item.large ? 'gallery-item--large' : ''} animate-on-scroll" style="--delay: ${i * 0.06}s">
        <img src="${getAssetUrl(item.image)}" alt="${item.label}" loading="lazy" width="600" height="450">
        <figcaption class="gallery-caption">${item.label}</figcaption>
      </figure>
    `).join('');

    galleryNote.textContent = data.sections.gallery.note || '';
  }

  // 3.2 Products Section
  const productsHeader = document.getElementById('products-header');
  const productsGrid = document.getElementById('products-grid');
  
  if (data.sections.products && productsHeader && productsGrid) {
    productsHeader.innerHTML = `
      <span class="section-tag animate-on-scroll">${data.sections.products.tag}</span>
      <h2 class="section-title animate-on-scroll">${data.sections.products.title}</h2>
    `;
    
    const limit = parseInt(productsGrid.getAttribute('data-limit')) || data.sections.products.items.length;
    const itemsToRender = data.sections.products.items.slice(0, limit);
    
    productsGrid.innerHTML = itemsToRender.map(item => `
      <div class="product-card animate-on-scroll">
        <div class="product-badge">Best Seller</div>
        <div class="product-img">
          <img src="${getAssetUrl(item.image)}" alt="${item.name}" loading="lazy" width="250" height="250">
        </div>
        <div class="product-info">
          <h3>${item.name}</h3>
          <p>${item.desc}</p>
          <div class="product-footer">
            <span class="product-price">Rp ${item.price}</span>
            <a href="${data.hero.whatsappLink}" class="product-buy-btn" target="_blank" aria-label="Pesan produk ${item.name} via WhatsApp">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 4. About Section
  const aboutContainer = document.getElementById('about-container');
  if (data.sections.about && aboutContainer) {
    aboutContainer.innerHTML = `
      <div class="about-visual animate-on-scroll">
        <div class="about-img-wrapper">
          <img src="${getAssetUrl(data.sections.about.image)}" alt="Tentang Deoksi Clinic" loading="lazy" width="600" height="700">
        </div>
        ${data.sections.about.stats.map((stat, i) => `
          <div class="about-floating-card ${i === 1 ? 'card-2' : ''}">
            <div class="floating-stat">
              <span class="stat-number" data-target="${stat.number}">0</span><span class="stat-plus">+</span>
              <span class="stat-label">${stat.label}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="about-text animate-on-scroll">
        <span class="section-tag">${data.sections.about.tag}</span>
        <h2 class="section-title">${data.sections.about.title}</h2>
        <p class="about-desc">${data.sections.about.description1}</p>
        <p class="about-desc-2">${data.sections.about.description2}</p>
        <div class="about-features">
          ${data.sections.about.features.map(feature => `
            <div class="about-feature">
              <div class="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <span>${feature}</span>
            </div>
          `).join('')}
        </div>
        <a href="${data.sections.about.whatsappLink}" class="btn btn-primary" target="_blank" aria-label="Hubungi WhatsApp Deoksi Clinic">${data.sections.about.buttonText}</a>
      </div>
    `;
  }


  // 4.3 Trust Badges (Infinite Marquee)
  const certsTrack = document.getElementById('certs-track');
  if (data.sections.certs && certsTrack) {
    const certItems = data.sections.certs.items;
    // Duplicate items to create a seamless infinite loop
    const displayItems = [...certItems, ...certItems, ...certItems, ...certItems];
    
    certsTrack.innerHTML = displayItems.map(item => `
      <div class="cert-item" title="${item.name}">
        <img src="${getAssetUrl(item.image)}" alt="${item.name}" loading="lazy">
      </div>
    `).join('');
  }

  // 4.5 Reviews Section
  const reviewsHeader = document.getElementById('reviews-header');
  const reviewsSlider = document.getElementById('reviews-slider');
  const googleReviewLink = document.getElementById('google-review-link');
  const reviewUrl = data.sections?.reviews?.googleMapsLink?.trim();
  const isValidReviewUrl = reviewUrl && !reviewUrl.includes('/xxx');
  
  if (data.sections.reviews && reviewsHeader && reviewsSlider && googleReviewLink) {
    reviewsHeader.innerHTML = `
      <span class="section-tag animate-on-scroll">${data.sections.reviews.tag}</span>
      <h2 class="section-title animate-on-scroll">${data.sections.reviews.title}</h2>
    `;

    if (isValidReviewUrl) {
      googleReviewLink.closest('.reviews-footer')?.removeAttribute('hidden');
      googleReviewLink.href = reviewUrl;
    } else {
      googleReviewLink.closest('.reviews-footer')?.setAttribute('hidden', 'hidden');
    }

    const reviewItems = data.sections.reviews.items;
    const cardsPerView = window.innerWidth <= 768 ? 1 : 3;
    let reviewPage = 0;

    const renderReviewCards = () => {
      const totalPages = Math.max(1, Math.ceil(reviewItems.length / cardsPerView));
      const start = reviewPage * cardsPerView;
      const currentItems = reviewItems.slice(start, start + cardsPerView);

      reviewsSlider.innerHTML = currentItems.map(item => `
        <div class="review-card">
          <div class="review-stars">
            ${Array(item.rating).fill('<svg width="18" height="18" viewBox="0 0 24 24" fill="#F7903E"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>').join('')}
          </div>
          <p class="review-text">"${item.text}"</p>
          <div class="review-author">
            <div class="author-info">
              <h4>${item.name}</h4>
              <span>${item.treatment} • ${item.date}</span>
            </div>
            <div class="google-verify">
              <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" width="40">
            </div>
          </div>
        </div>
      `).join('');

      const prevBtn = document.querySelector('.rev-prev');
      const nextBtn = document.querySelector('.rev-next');
      if (prevBtn) prevBtn.disabled = totalPages <= 1;
      if (nextBtn) nextBtn.disabled = totalPages <= 1;
    };

    // Simple Slider Logic
    const prevBtn = document.querySelector('.rev-prev');
    const nextBtn = document.querySelector('.rev-next');

    if (prevBtn && nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(reviewItems.length / cardsPerView));
        reviewPage = (reviewPage + 1) % totalPages;
        renderReviewCards();
      });

      prevBtn.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(reviewItems.length / cardsPerView));
        reviewPage = (reviewPage - 1 + totalPages) % totalPages;
        renderReviewCards();
      });
    }

    renderReviewCards();
  }

  // 5. Location Section
  const locationHeader = document.getElementById('location-header');
  const locationMap = document.getElementById('location-map');
  const locationInfo = document.getElementById('location-info');
  
  if (data.sections.location && locationHeader && locationMap && locationInfo) {
    locationHeader.innerHTML = `
      <span class="section-tag animate-on-scroll">${data.sections.location.tag}</span>
      <h2 class="section-title animate-on-scroll">${data.sections.location.title}</h2>
      <p class="section-desc animate-on-scroll">${data.sections.location.description}</p>
    `;
    
    locationMap.innerHTML = `
      <iframe src="${data.sections.location.mapEmbed}" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Lokasi Deoksi Beauty Clinic di Google Maps"></iframe>
    `;
    
    locationInfo.innerHTML = data.sections.location.info.map(item => `
      <div class="info-card" id="info-${item.type}">
        <div class="info-icon">
          ${getIconForInfo(item.type)}
        </div>
        <div class="info-text">
          <h4>${item.label}</h4>
          <p>${item.value}</p>
        </div>
      </div>
    `).join('');
  }

  // 6. Footer
  const footer =
    document.getElementById('footer') ||
    document.querySelector('[data-footer]') ||
    document.querySelector('footer.footer');
  const allowFooterInject =
    Boolean(footer) &&
    !footer.hasAttribute('data-static-footer') &&
    (footer.id === 'footer' || footer.hasAttribute('data-footer') || footer.innerHTML.trim() === '');

  if (data.footer && footer && allowFooterInject) {
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="/" class="brand-logo footer-logo-override">
              <div class="brand-title">
                <span class="brand-orange">DEOKSI</span><span class="brand-dark">Clinic</span>
              </div>
              <div class="brand-subtitle">BEAUTY CENTER</div>
            </a>
            <p class="footer-desc">${data.footer.description}</p>
            <div class="footer-socials">
              <a href="${data.footer.socials.instagram}" class="social-link" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg></a>
              <a href="${data.footer.socials.tiktok}" class="social-link" aria-label="TikTok" target="_blank" rel="noopener noreferrer"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88A2.89 2.89 0 0 1 9.49 12.4a2.86 2.86 0 0 1 .89.14V9.05a6.33 6.33 0 0 0-1-.05A6.34 6.34 0 0 0 3 15.29a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.76a8.32 8.32 0 0 0 4.87 1.57V6.86a4.94 4.94 0 0 1-.96-.17z" /></svg></a>
              <a href="${data.footer.socials.whatsapp}" class="social-link" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg></a>
            </div>
          </div>
          <div class="footer-links">
            <h4>Menu</h4>
            <ul>
              <li><a href="/">Beranda</a></li>
              <li><a href="/layanan.html">Layanan</a></li>
              <li><a href="/produk.html">Produk</a></li>
              <li><a href="/berita.html">Berita</a></li>
              <li><a href="/galeri.html">Galeri</a></li>
              <li><a href="/tentang.html">Tentang</a></li>
              <li><a href="/lokasi.html">Lokasi</a></li>
              <li><a href="/konsultasi.html">Konsultasi</a></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Kontak</h4>
            <ul>
              <li>Jl. Puncak Borobudur Kav. 6, Kota Malang</li>
              <li><a href="tel:+6282333344919">+6282 3333 44919 (WA)</a></li>
              <li><a href="https://wa.me/6282333344919" target="_blank" rel="noopener noreferrer">Chat WhatsApp</a></li>
              <li>Senin - Sabtu, 09.00 - 20.00</li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2026 Deoksi Beauty Clinic. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  // Update Global WA Links
  const waUrl = new URL(data.hero.whatsappLink);
  const waNumber = waUrl.pathname.replace(/\//g, '');
  
  const getContextualLink = (message) => `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  // 1. Hero
  if (heroContent) {
    const heroBtn = heroContent.querySelector('.hero-btn');
    if (heroBtn) heroBtn.href = getContextualLink("Halo Deoksi Clinic, saya ingin konsultasi mengenai perawatan kulit.");
  }

  // 1.5 Promo
  if (promoGrid) {
    const promoButtons = promoGrid.querySelectorAll('.promo-card');
    promoButtons.forEach((btn, i) => {
      const promoTitle = data.sections.promo.items[i].title;
      const explicitLink = data.sections.promo.items[i].link;
      if (!explicitLink || explicitLink === '#') {
        btn.href = getContextualLink(`Halo Deoksi Clinic, saya tertarik dengan promo: ${promoTitle}. Mohon info lebih lanjut.`);
      }
    });
  }

  // 2. Services
  if (servicesGrid) {
    const serviceLinks = servicesGrid.querySelectorAll('.service-link');
    serviceLinks.forEach((link, i) => {
      const limit = parseInt(servicesGrid.getAttribute('data-limit')) || data.sections.services.items.length;
      if (i < limit) {
        const serviceTitle = data.sections.services.items[i].title;
        link.href = getContextualLink(`Halo Deoksi Clinic, saya ingin tanya detail mengenai layanan: ${serviceTitle}.`);
      }
    });
  }

  // 3.2 Products
  if (productsGrid) {
    const productBuyButtons = productsGrid.querySelectorAll('.product-buy-btn');
    productBuyButtons.forEach((btn, i) => {
      const limit = parseInt(productsGrid.getAttribute('data-limit')) || data.sections.products.items.length;
      if (i < limit) {
        const productName = data.sections.products.items[i].name;
        btn.href = getContextualLink(`Halo Deoksi Clinic, saya ingin pesan produk: ${productName}.`);
      }
    });
  }

  document.querySelectorAll('.wa-link').forEach(link => {
    link.href = getContextualLink("Halo Deoksi Clinic, saya ingin berkonsultasi mengenai perawatan kulit.");
  });

}

function getIconForInfo(type) {
  const icons = {
    address: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>',
    hours: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>',
    phone: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>',
    email: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>'
  };
  return icons[type] || '';
}
