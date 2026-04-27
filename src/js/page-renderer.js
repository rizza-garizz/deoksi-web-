const siteContentApiBase = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function loadAndApplyPageContent() {
  const path = window.location.pathname;
  let pageKey = '';
  
  if (path.includes('layanan.html')) pageKey = 'layanan';
  else if (path.includes('produk.html')) pageKey = 'produk';
  else if (path.includes('tentang.html')) pageKey = 'tentang';
  else if (path.includes('lokasi.html')) pageKey = 'lokasi';
  else if (path.includes('konsultasi.html')) pageKey = 'konsultasi';
  else if (path.includes('galeri.html')) pageKey = 'galeri';
  else if (path.includes('berita.html')) pageKey = 'berita';
  else return; // Homepage is handled by loadHomepageTextContent, and others don't have dynamic page content yet

  try {
    const response = await fetch(`${siteContentApiBase}/api/page-content?page=${pageKey}&t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return;

    const payload = await response.json();
    const data = payload?.data;
    if (!data) return;

    // Apply header text
    const pageTagEl = document.querySelector('.section-tag');
    const pageTitleEl = document.querySelector('.section-title');
    const pageDescEl = document.querySelector('.page-hero p:not(.section-tag):not(.section-title)');
    
    if (pageTagEl && data.page_tag) pageTagEl.textContent = data.page_tag;
    if (pageTitleEl && data.page_title) pageTitleEl.textContent = data.page_title;
    if (pageDescEl && data.page_description) pageDescEl.textContent = data.page_description;

    // Apply page specific lists
    if (pageKey === 'layanan' && data.services) applyServices(data.services);
    if (pageKey === 'produk' && data.products) applyProducts(data.products);
    if (pageKey === 'tentang') applyTentang(data);
    if (pageKey === 'lokasi') applyLokasi(data);
    if (pageKey === 'konsultasi') applyKonsultasi(data);
    if (pageKey === 'galeri' && data.media_items) applyGaleri(data.media_items);
    if (pageKey === 'berita' && data.articles) applyBerita(data.articles);

  } catch (error) {
    console.warn(`Fallback active for ${pageKey} content.`, error);
  }
}

function applyServices(services) {
  const container = document.querySelector('.services-grid');
  if (!container) return;
  
  const visibleServices = services.filter(s => s.is_visible).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (visibleServices.length === 0) return;

  container.innerHTML = visibleServices.map(service => `
    <article class="service-card animate-on-scroll visible">
      <div class="service-image-frame">
        ${service.image_url 
          ? `<img src="${escapeHtml(service.image_url)}" alt="${escapeHtml(service.name)}" loading="lazy">`
          : `<div class="service-image-placeholder">${escapeHtml(service.icon || '✨')}</div>`
        }
      </div>
      <h3 class="service-title">${escapeHtml(service.name)}</h3>
      <p class="service-desc">${escapeHtml(service.description)}</p>
    </article>
  `).join('');
}

function applyProducts(products) {
  const container = document.querySelector('.products-grid');
  if (!container) return;
  
  const visibleProducts = products.filter(p => p.is_visible).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (visibleProducts.length === 0) return;

  container.innerHTML = visibleProducts.map(product => {
    // Determine stars text
    const r = Math.round(product.rating || 5);
    const starsText = '★'.repeat(r) + '☆'.repeat(5 - r);

    return `
      <article class="product-card animate-on-scroll visible" data-category="${escapeHtml(product.category || 'all')}">
        <div class="product-image">
          ${product.image_url 
            ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
            : `<div class="product-image-placeholder">🧴</div>`
          }
        </div>
        <div class="product-top">
          <h3 class="product-name">${escapeHtml(product.name)}</h3>
          ${product.has_bpom ? '<span class="bpom-badge"><span class="bpom-dot"></span>BPOM</span>' : ''}
        </div>
        <div class="product-price">${escapeHtml(product.price)}</div>
        <div class="rating-row" aria-label="Rating ${product.rating || 5} dari 5">
          <span class="stars" aria-hidden="true">${starsText}</span>
          <span>${product.rating || 5}</span>
        </div>
      </article>
    `;
  }).join('');

  // Re-wire filter buttons after dynamic render
  rewireProductFilter();
}

function rewireProductFilter() {
  const filterButtons = document.querySelectorAll('[data-filter]');
  const productCards = document.querySelectorAll('[data-category]');
  if (!filterButtons.length || !productCards.length) return;

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const category = btn.getAttribute('data-filter');
      productCards.forEach(card => {
        const show = category === 'all' || card.getAttribute('data-category') === category;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });
}

function applyTentang(data) {
  // Visi Misi
  const infoCards = document.querySelectorAll('.info-card');
  if (infoCards.length >= 2) {
    const visiTitleEl = infoCards[0].querySelector('.info-title');
    const visiTextEl = infoCards[0].querySelector('.info-text');
    const misiTitleEl = infoCards[1].querySelector('.info-title');
    const misiTextEl = infoCards[1].querySelector('.info-text');
    
    if (visiTitleEl && data.visi_title) visiTitleEl.textContent = data.visi_title;
    if (visiTextEl && data.visi_text) visiTextEl.textContent = data.visi_text;
    if (misiTitleEl && data.misi_title) misiTitleEl.textContent = data.misi_title;
    if (misiTextEl && data.misi_text) misiTextEl.textContent = data.misi_text;
  }

  // Doctors
  if (data.doctors && data.doctors.length > 0) {
    const doctorsContainer = document.querySelector('.doctor-grid');
    if (doctorsContainer) {
      const sortedDocs = [...data.doctors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      doctorsContainer.innerHTML = sortedDocs.map(doc => `
        <article class="doctor-card animate-on-scroll visible">
          <div class="doctor-photo">
            <img src="${escapeHtml(doc.photo_url || '/assets/images/logo.png')}" alt="${escapeHtml(doc.name)}" loading="lazy">
          </div>
          <div class="doctor-body">
            <div class="doctor-name">${escapeHtml(doc.name)}</div>
            <div class="doctor-spec">${escapeHtml(doc.specialization)}</div>
            <p class="doctor-desc">${escapeHtml(doc.description)}</p>
          </div>
        </article>
      `).join('');
    }
  }

  // Certificates
  if (data.certificates && data.certificates.length > 0) {
    const certContainer = document.querySelector('.cert-track');
    if (certContainer) {
      const sortedCerts = [...data.certificates].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      certContainer.innerHTML = sortedCerts.map(cert => `
        <div class="cert-item">
          <div>
            <div class="cert-name">${escapeHtml(cert.name)}</div>
            <div class="cert-desc">${escapeHtml(cert.description)}</div>
          </div>
          <div class="cert-badge">${escapeHtml(cert.badge_code || '✓')}</div>
        </div>
      `).join('');
    }
  }
}

function applyLokasi(data) {
  const addressEl = document.getElementById('lokasi-address');
  const hoursEl = document.getElementById('lokasi-hours');
  const phoneEl = document.getElementById('lokasi-phone');
  const waBtnEl = document.getElementById('lokasi-wa-btn');
  const mapIframeEl = document.getElementById('lokasi-map-iframe');

  if (addressEl && data.address) addressEl.textContent = data.address;
  if (hoursEl && data.operating_hours) hoursEl.textContent = data.operating_hours;
  if (phoneEl && data.phone) phoneEl.textContent = data.phone;
  if (waBtnEl && data.whatsapp_link) waBtnEl.href = data.whatsapp_link;
  if (mapIframeEl && data.maps_embed_url) mapIframeEl.src = data.maps_embed_url;
}

function applyKonsultasi(data) {
  const formTitleEl = document.querySelector('.form-header h2');
  const formSubtitleEl = document.querySelector('.form-header p');
  const privacyTextEl = document.getElementById('privacy-text');
  
  if (formTitleEl && data.form_title) formTitleEl.textContent = data.form_title;
  if (formSubtitleEl && data.form_subtitle) formSubtitleEl.textContent = data.form_subtitle;
  if (privacyTextEl && data.privacy_text) privacyTextEl.textContent = data.privacy_text;

  if (data.concern_options && data.concern_options.length > 0) {
    const concernsContainer = document.querySelector('.checkbox-grid');
    if (concernsContainer) {
      concernsContainer.innerHTML = data.concern_options.map((opt, i) => `
        <label class="checkbox-label">
          <input type="checkbox" name="concerns" value="${escapeHtml(opt.text)}">
          <span class="custom-checkbox"></span>
          ${escapeHtml(opt.text)}
        </label>
      `).join('');
    }
  }
}

function applyGaleri(mediaItems) {
  const container = document.getElementById('gallery-page-grid');
  if (!container) return;

  const visibleItems = mediaItems.filter(m => m.is_visible !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (visibleItems.length === 0) return;

  container.innerHTML = visibleItems.map((item, i) => `
    <figure class="gallery-item animate-on-scroll visible" style="--delay: ${i * 0.06}s">
      ${item.media_type === 'video' || item.media_url?.match(/\.(mp4|webm)$/i)
        ? `<video src="${escapeHtml(item.media_url)}" controls loading="lazy" width="600" height="450"></video>`
        : `<img src="${escapeHtml(item.media_url || '/assets/images/logo.png')}" alt="${escapeHtml(item.title)}" loading="lazy" width="600" height="450">`
      }
      <figcaption class="gallery-caption">${escapeHtml(item.title)}</figcaption>
    </figure>
  `).join('');
}

function applyBerita(articles) {
  const container = document.querySelector('.news-grid');
  if (!container) return;

  const visibleArticles = articles.filter(a => a.is_published !== false).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (visibleArticles.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;">Belum ada berita.</div>';
    return;
  }

  container.innerHTML = visibleArticles.map((article, i) => `
    <article class="news-card animate-on-scroll visible" style="animation-delay: ${i * 0.1}s">
      <div class="news-img">
        <span class="news-tag">${escapeHtml(article.author || 'Tim Medis')}</span>
        <img src="${escapeHtml(article.image_url || '/assets/images/logo.png')}" alt="${escapeHtml(article.title)}" loading="lazy">
      </div>
      <div class="news-content">
        <span class="news-date">${escapeHtml(article.publish_date || '')}</span>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="news-excerpt">${escapeHtml(article.excerpt)}</p>
        <a href="#" class="news-link">Baca Selengkapnya <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
      </div>
    </article>
  `).join('');
}

// Homepage Additional Content (Doctors, Certificates, Lokasi)
export async function loadHomepageAdditionalContent() {
  const path = window.location.pathname;
  const isHomePage = path === '/' || path === '/index.html' || path === '';
  if (!isHomePage) return;

  try {
    const resTentang = await fetch(`${siteContentApiBase}/api/page-content?page=tentang&t=${Date.now()}`, { cache: 'no-store' });
    if (resTentang.ok) {
      const payload = await resTentang.json();
      if (payload?.data) applyHomepageTentang(payload.data);
    }
    
    const resLokasi = await fetch(`${siteContentApiBase}/api/page-content?page=lokasi&t=${Date.now()}`, { cache: 'no-store' });
    if (resLokasi.ok) {
      const payload = await resLokasi.json();
      if (payload?.data) applyHomepageLokasi(payload.data);
    }
  } catch (error) {
    console.warn('Homepage additional content fallback active.', error);
  }

  if (window.initScrollAnimations) {
    window.initScrollAnimations();
  }
}

function applyHomepageTentang(data) {
  // Doctors (limit 2)
  if (data.doctors && data.doctors.length > 0) {
    const doctorsContainer = document.querySelector('.doctor-grid');
    if (doctorsContainer) {
      const sortedDocs = [...data.doctors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).slice(0, 2);
      const gradients = [
        'linear-gradient(180deg, #FFF4EC 0%, #F7EAE3 100%)',
        'linear-gradient(180deg, #FDF0F4 0%, #F7EAE3 100%)'
      ];
      
      doctorsContainer.innerHTML = sortedDocs.map((doc, idx) => `
        <div class="doctor-spotlight-card animate-on-scroll visible">
          <div class="doctor-spotlight-media" style="background: ${gradients[idx % gradients.length]};">
            <img src="${escapeHtml(doc.photo_url || '/assets/images/logo.png')}" alt="${escapeHtml(doc.name)}" class="doctor-spotlight-image" loading="lazy">
          </div>
          <div class="doctor-spotlight-body">
            <h3 class="doctor-spotlight-name">${escapeHtml(doc.name)}</h3>
            <p class="doctor-spotlight-role">${escapeHtml(doc.specialization)}</p>
            <p class="doctor-spotlight-desc">${escapeHtml(doc.description)}</p>
          </div>
        </div>
      `).join('');
    }
  }

  // Certificates
  if (data.certificates && data.certificates.length > 0) {
    const certWrapper = document.querySelector('.cert-swiper .swiper-wrapper');
    if (certWrapper) {
      const sortedCerts = [...data.certificates].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      certWrapper.innerHTML = sortedCerts.map(cert => `
        <div class="swiper-slide">
          <div class="cert-card" data-image="${escapeHtml(cert.image_url || '/assets/images/logo.png')}" data-title="${escapeHtml(cert.name)}">
            <div class="cert-image-wrapper">
              <img src="${escapeHtml(cert.image_url || '/assets/images/logo.png')}" alt="${escapeHtml(cert.name)}" class="cert-image" loading="lazy">
              <div class="cert-zoom-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
              </div>
            </div>
            <div class="cert-info">
              <h3 class="cert-title">${escapeHtml(cert.name)}</h3>
              <p class="cert-issuer">${escapeHtml(cert.issuer || cert.description || '')}</p>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

function applyHomepageLokasi(data) {
  const lokasiInfo = document.querySelector('.lokasi-kami-info');
  if (lokasiInfo && data.address) {
    const parts = data.address.split(',');
    // We'll leave lokasi-name as is (e.g. Deoksi Beauty Clinic) and set lokasi-city to the full address,
    // or if the address is long, we can just use the full address in lokasi-city.
    const cityEl = lokasiInfo.querySelector('.lokasi-city');
    if (cityEl) cityEl.textContent = data.address;
  }
  
  if (data.maps_embed_url) {
    const iframe = document.querySelector('.lokasi-kami-map iframe');
    if (iframe) iframe.src = data.maps_embed_url;
  }
  
  if (data.google_maps_link) {
    const btn = document.querySelector('.lokasi-kami-btn');
    if (btn) btn.href = data.google_maps_link;
  }
}

// Testimoni renderer (called from homepage)
export async function loadTestimoniContent() {
  const path = window.location.pathname;
  const isHomePage = path === '/' || path === '/index.html' || path === '';
  if (!isHomePage) return;

  try {
    const response = await fetch(`${siteContentApiBase}/api/page-content?page=testimoni&t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return;

    const payload = await response.json();
    const data = payload?.data;
    if (!data) return;

    applyTestimoni(data);
  } catch (error) {
    console.warn('Testimoni content fallback active.', error);
  }
}

function applyTestimoni(data) {
  // Section header
  const reviewsHeader = document.getElementById('reviews-header');
  if (reviewsHeader) {
    const tag = data.section_tag || 'Dipercaya Pelanggan';
    const title = data.section_title || 'Pengalaman Pelanggan Deoksi Clinic';
    reviewsHeader.innerHTML = `
      <span class="section-tag animate-on-scroll visible">${escapeHtml(tag)}</span>
      <h2 class="section-title animate-on-scroll visible">${escapeHtml(title)}</h2>
    `;
  }

  // Google Maps link
  const googleReviewLink = document.getElementById('google-review-link');
  const reviewUrl = (data.google_maps_link || '').trim();
  if (googleReviewLink) {
    if (reviewUrl) {
      googleReviewLink.closest('.reviews-footer')?.removeAttribute('hidden');
      googleReviewLink.href = reviewUrl;
    } else {
      googleReviewLink.closest('.reviews-footer')?.setAttribute('hidden', 'hidden');
    }
  }

  // Review cards
  const reviewsSlider = document.getElementById('reviews-slider');
  if (!reviewsSlider || !data.reviews) return;

  const visibleReviews = data.reviews
    .filter(r => r.is_visible !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (visibleReviews.length === 0) return;

  const cardsPerView = window.innerWidth <= 768 ? 1 : 3;
  let reviewPage = 0;

  const renderReviewCards = () => {
    const totalPages = Math.max(1, Math.ceil(visibleReviews.length / cardsPerView));
    const start = reviewPage * cardsPerView;
    const currentItems = visibleReviews.slice(start, start + cardsPerView);

    reviewsSlider.innerHTML = currentItems.map(item => `
      <div class="review-card">
        <div class="review-stars">
          ${Array(Math.round(item.rating || 5)).fill('<svg width="18" height="18" viewBox="0 0 24 24" fill="#F7903E"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>').join('')}
        </div>
        <p class="review-text">"${escapeHtml(item.text)}"</p>
        <div class="review-author">
          <div class="author-info">
            <h4>${escapeHtml(item.name)}</h4>
            <span>${escapeHtml(item.treatment || '')} • ${escapeHtml(item.date || '')}</span>
          </div>
          <div class="google-verify">
            <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" width="40">
          </div>
        </div>
      </div>
    `).join('');
  };

  // Slider navigation
  const prevBtn = document.querySelector('.rev-prev');
  const nextBtn = document.querySelector('.rev-next');

  if (prevBtn && nextBtn) {
    const totalPages = Math.max(1, Math.ceil(visibleReviews.length / cardsPerView));
    // Remove old listeners by cloning
    const newPrev = prevBtn.cloneNode(true);
    const newNext = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);

    newNext.addEventListener('click', () => {
      const tp = Math.max(1, Math.ceil(visibleReviews.length / cardsPerView));
      reviewPage = (reviewPage + 1) % tp;
      renderReviewCards();
    });
    newPrev.addEventListener('click', () => {
      const tp = Math.max(1, Math.ceil(visibleReviews.length / cardsPerView));
      reviewPage = (reviewPage - 1 + tp) % tp;
      renderReviewCards();
    });
  }

  renderReviewCards();
}

// Global & SEO logic
export async function loadGlobalContent() {
  try {
    const response = await fetch(`${siteContentApiBase}/api/page-content?page=global&t=${Date.now()}`, { cache: 'no-store' });
    const responseSeo = await fetch(`${siteContentApiBase}/api/page-content?page=seo&t=${Date.now()}`, { cache: 'no-store' });
    
    if (response.ok) {
      const payload = await response.json();
      const global = payload?.data;
      if (global) applyGlobal(global);
    }
    
    if (responseSeo.ok) {
      const payload = await responseSeo.json();
      const seo = payload?.data;
      if (seo) applySeo(seo);
    }
  } catch (error) {
    console.warn(`Fallback active for global/seo content.`, error);
  }
}

function applyGlobal(global) {
  // Footer
  const footerDesc = document.querySelector('.footer-desc');
  if (footerDesc && global.footer_description) footerDesc.textContent = global.footer_description;

  const footerAddress = document.querySelector('.footer-contact li:nth-child(1)');
  if (footerAddress && global.address) footerAddress.innerHTML = `📍 ${escapeHtml(global.address)}`;

  const footerPhone = document.querySelector('.footer-contact li:nth-child(2)');
  if (footerPhone && global.phone) footerPhone.innerHTML = `📞 ${escapeHtml(global.phone)}`;

  const footerHours = document.querySelector('.footer-contact li:nth-child(3)');
  if (footerHours && global.operating_hours) footerHours.innerHTML = `⏰ ${escapeHtml(global.operating_hours)}`;

  const copyrightEl = document.querySelector('.footer-bottom p');
  if (copyrightEl && global.copyright_text) copyrightEl.textContent = global.copyright_text;

  // Socials
  if (global.instagram_url) {
    document.querySelectorAll('a[href*="instagram.com"]').forEach(el => el.href = global.instagram_url);
  }
  if (global.tiktok_url) {
    document.querySelectorAll('a[href*="tiktok.com"]').forEach(el => el.href = global.tiktok_url);
  }
  if (global.whatsapp_number) {
    document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
      const url = new URL(el.href);
      url.pathname = `/${global.whatsapp_number}`;
      el.href = url.toString();
    });
  }
}

function applySeo(seo) {
  const path = window.location.pathname;
  let pageKey = 'homepage';
  
  if (path.includes('layanan.html')) pageKey = 'layanan';
  else if (path.includes('produk.html')) pageKey = 'produk';
  else if (path.includes('tentang.html')) pageKey = 'tentang';
  else if (path.includes('lokasi.html')) pageKey = 'lokasi';
  else if (path.includes('konsultasi.html')) pageKey = 'konsultasi';

  const pageSeo = seo[pageKey];
  if (!pageSeo) return;

  if (pageSeo.meta_title) {
    document.title = pageSeo.meta_title;
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = pageSeo.meta_title;
  }

  if (pageSeo.meta_description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = pageSeo.meta_description;
    
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = pageSeo.meta_description;
  }

  if (pageSeo.og_image) {
    let ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.content = pageSeo.og_image;
  }
}
