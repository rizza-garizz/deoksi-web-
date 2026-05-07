import '../css/style.css';
import { HOMEPAGE_PROMO_LIMIT, initContent, renderPromoGrid } from './render.js';
import { mergeHomepagePromos, shouldApplyHomepageHeroMedia } from './homepage-sync.js';
import { loadAndApplyPageContent, loadGlobalContent, loadTestimoniContent, loadHomepageAdditionalContent } from './page-renderer.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize dynamic content from content.json
  await initContent();



  const siteContentApiBase = '';
  const previewMediaId = new URLSearchParams(window.location.search).get('preview_media_id');
  let managedSectionsCache = {};
  let managedSlotsCache = {};

  function getManagedSiteContentRequest() {
    const url = new URL(`${siteContentApiBase}/api/site-content`, window.location.origin);
    const headers = {};

    if (previewMediaId) {
      url.searchParams.set('preview_media_id', previewMediaId);
      const adminToken = window.localStorage.getItem('deoksi_admin_token');
      if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
      }
    }

    url.searchParams.set('t', String(Date.now()));

    return {
      url: url.toString(),
      options: {
        headers,
        cache: 'no-store',
      },
    };
  }

  async function loadHomepageTextContent() {
    try {
      const response = await fetch(`${siteContentApiBase}/api/page-content?page=homepage&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return;

      const payload = await response.json();
      const data = payload?.data || {};
      const flatContent = { 
        ...(data.hero || {}), 
        ...(data.hero_benefits || {}),
        promos: data.promos || []
      };
      
      // If hero_media is present and it's a URL (usually starts with http or data:), apply it to video src if it's a video, or image
      // Note: we can map the hero_media later if needed. For now, the texts are the most important part of this function.
      
      applyHomepageTextContent(flatContent);
    } catch (error) {
      console.warn('Homepage text content fallback active.', error);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function extractWhatsappNumber(value) {
    if (!value) return '';

    try {
      const url = new URL(value, window.location.origin);
      if (url.hostname.includes('wa.me')) {
        return url.pathname.replace(/\//g, '');
      }

      if (url.hostname.includes('whatsapp.com')) {
        return url.searchParams.get('phone') || '';
      }
    } catch {
      return '';
    }

    return '';
  }

  function buildContextualWhatsappLink(baseHref, message) {
    const number = extractWhatsappNumber(baseHref);
    if (!number) return '#';
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function getPositionIndex(positionKey = '') {
    const match = String(positionKey).match(/(\d+)$/);
    return match ? Number(match[1]) : 1;
  }

  function injectManagedAssets(items = [], assets = [], fieldKey = 'image_url') {
    if (!Array.isArray(items) || !items.length || !Array.isArray(assets) || !assets.length) {
      return items;
    }

    const assetMap = [...assets]
      .filter((asset) => asset.status === 'active' && asset.url)
      .sort((a, b) => getPositionIndex(a.position_key) - getPositionIndex(b.position_key))
      .reduce((acc, asset) => {
        acc.set(getPositionIndex(asset.position_key), asset);
        return acc;
      }, new Map());

    return items.map((item, index) => {
      const asset = assetMap.get(index + 1);
      if (!asset) return item;
      return {
        ...item,
        [fieldKey]: asset.url,
      };
    });
  }

  function applyHomepageTextContent(content) {
    const badgeEl = document.getElementById('homepage-hero-badge');
    const headlineEl = document.getElementById('homepage-hero-headline');
    const descriptionEl = document.getElementById('homepage-hero-description');
    const ctaEl = document.getElementById('homepage-hero-cta');
    const ctaTextEl = document.getElementById('homepage-hero-cta-text');
    const benefit1El = document.getElementById('homepage-benefit-1');
    const benefit2El = document.getElementById('homepage-benefit-2');
    const benefit3El = document.getElementById('homepage-benefit-3');
    const cardTitleEl = document.getElementById('homepage-card-title');
    const cardDescriptionEl = document.getElementById('homepage-card-description');

    if (badgeEl && content.hero_badge) {
      badgeEl.textContent = content.hero_badge;
    }

    if (headlineEl && content.headline) {
      const highlight = content.highlight_text || '';
      const hasHighlight = highlight && content.headline.includes(highlight);
      const headlineWithoutHighlight = hasHighlight
        ? content.headline.replace(highlight, '').trim()
        : content.headline;

      headlineEl.innerHTML = hasHighlight
        ? `${escapeHtml(headlineWithoutHighlight)} <span id="homepage-hero-highlight">${escapeHtml(highlight)}</span>`
        : escapeHtml(content.headline);
    }

    if (descriptionEl && content.description) {
      descriptionEl.textContent = content.description;
    }

    if (ctaTextEl && content.cta_text) {
      ctaTextEl.textContent = content.cta_text;
    }

    if (ctaEl && content.cta_link) {
      ctaEl.href = content.cta_link;
    }

    if (benefit1El && content.bullet_benefit_1) {
      benefit1El.textContent = content.bullet_benefit_1;
    }

    if (benefit2El && content.bullet_benefit_2) {
      benefit2El.textContent = content.bullet_benefit_2;
    }

    if (benefit3El && content.bullet_benefit_3) {
      benefit3El.textContent = content.bullet_benefit_3;
    }

    if (cardTitleEl && content.consultation_card_title) {
      cardTitleEl.textContent = content.consultation_card_title;
    }

    if (cardDescriptionEl && content.consultation_card_description) {
      cardDescriptionEl.textContent = content.consultation_card_description;
    }

    if (shouldApplyHomepageHeroMedia(content.hero_media, managedSlotsCache)) {
      applyHomepageContentHeroMedia(content.hero_media);
    }

    if (content.promos && Array.isArray(content.promos)) {
      const promoGrid = document.getElementById('promo-grid');
      if (promoGrid) {
        const managedPromoAssets = managedSectionsCache['beranda:promo_cards'] || [];
        const mergedPromos = mergeHomepagePromos(content.promos, managedPromoAssets);
        const visiblePromos = mergedPromos
          .filter(p => p.is_visible !== false)
          .slice(0, HOMEPAGE_PROMO_LIMIT);
        if (visiblePromos.length > 0) {
          const fallbackWhatsAppBase = content.cta_link || ctaEl?.href || document.querySelector('.wa-link')?.href || '';
          renderPromoGrid(
            promoGrid,
            visiblePromos.map((item) => {
              const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(item.image_url || '');
              return {
                title: item.title,
                subtitle: item.description,
                price: item.price,
                image: isVideo ? '/assets/images/service_products.png' : (item.image_url || '/assets/images/service_products.png'),
                video: isVideo ? item.image_url : '',
                link: item.cta_link,
                color: 'var(--color-primary, var(--primary))',
              };
            }),
            {
              isFlyer: true,
              resolveLink: (item) => item.link || buildContextualWhatsappLink(
                fallbackWhatsAppBase,
                `Halo Deoksi Clinic, saya tertarik dengan promo: ${item.title}. Mohon info lebih lanjut.`,
              ),
            },
          );
        }
      }
    }
  }

  function applyHomepageContentHeroMedia(mediaUrl) {
    if (!mediaUrl) return;

    const heroShell = document.querySelector('.hero-science__image-shell');
    if (!heroShell) return;

    const badge = heroShell.querySelector('.hero-science__badge');
    const existingMedia = heroShell.querySelector('video, img');
    const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(mediaUrl);
    let nextMedia = existingMedia;

    if (isVideo) {
      if (!existingMedia || existingMedia.tagName !== 'VIDEO') {
        nextMedia = document.createElement('video');
        nextMedia.className = 'hero-science__video';
        nextMedia.autoplay = true;
        nextMedia.muted = true;
        nextMedia.loop = true;
        nextMedia.playsInline = true;
        nextMedia.preload = 'metadata';
        existingMedia?.replaceWith(nextMedia);
      }

      nextMedia.setAttribute('aria-label', 'Hero video Deoksi Clinic');
      nextMedia.poster = mediaUrl;
      nextMedia.innerHTML = `<source src="${escapeHtml(mediaUrl)}" type="video/mp4">`;
      nextMedia.load();
    } else {
      if (!existingMedia || existingMedia.tagName !== 'IMG') {
        nextMedia = document.createElement('img');
        nextMedia.className = 'hero-science__image';
        existingMedia?.replaceWith(nextMedia);
      }

      nextMedia.src = mediaUrl;
      nextMedia.alt = 'Hero image Deoksi Clinic';
      nextMedia.loading = 'eager';
      nextMedia.setAttribute('fetchpriority', 'high');
    }

    if (badge) {
      heroShell.appendChild(badge);
    }
  }

  async function loadManagedSiteContent() {
    try {
      const requestConfig = getManagedSiteContentRequest();
      const response = await fetch(requestConfig.url, requestConfig.options);
      if (!response.ok) return;

      const payload = await response.json();
      const slots = payload?.slots || {};
      managedSlotsCache = slots;
      managedSectionsCache = payload?.sections || {};

      applyManagedLogo(slots.logo_brand);
      applyManagedFloatingWhatsapp(slots.floating_whatsapp);
      applyManagedHero(slots.hero_image || slots.hero_media);
      applyManagedHeroBadge(slots.hero_badge);
      applyManagedHeroCta(slots.hero_cta_link);
      applyManagedHeroCardImage(slots.hero_card_image);
    } catch (error) {
      console.warn('Managed site content fallback active.', error);
    }
  }

  function applyManagedLogo(asset) {
    if (!asset || asset.type !== 'image' || !asset.url) return;

    document
      .querySelectorAll('link[rel="icon"]')
      .forEach((node) => node.setAttribute('href', asset.url));
  }

  function applyManagedFloatingWhatsapp(asset) {
    if (!asset || asset.type !== 'link' || !asset.url) return;

    document.querySelectorAll('.wa-link').forEach((link) => {
      link.href = asset.url;
    });
  }

  function applyManagedHero(asset) {
    if (!asset || !asset.url) return;

    const heroShell = document.querySelector('.hero-science__image-shell');
    if (!heroShell) return;

    const badge = heroShell.querySelector('.hero-science__badge');
    const existingMedia = heroShell.querySelector('video, img');
    let nextMedia = existingMedia;

    if (asset.type === 'video') {
      if (!existingMedia || existingMedia.tagName !== 'VIDEO') {
        nextMedia = document.createElement('video');
        nextMedia.className = 'hero-science__video';
        nextMedia.autoplay = true;
        nextMedia.muted = true;
        nextMedia.loop = true;
        nextMedia.playsInline = true;
        nextMedia.preload = 'metadata';
        existingMedia?.replaceWith(nextMedia);
      }

      nextMedia.setAttribute('aria-label', asset.alt_text || asset.title || 'Hero video Deoksi Clinic');
      nextMedia.poster = asset.url;
      nextMedia.innerHTML = `<source src="${asset.url}" type="video/mp4">`;
      nextMedia.load();
    } else if (asset.type === 'image') {
      if (!existingMedia || existingMedia.tagName !== 'IMG') {
        nextMedia = document.createElement('img');
        nextMedia.className = 'hero-science__image';
        existingMedia?.replaceWith(nextMedia);
      }

      nextMedia.src = asset.url;
      nextMedia.alt = asset.alt_text || asset.title || 'Hero image Deoksi Clinic';
      nextMedia.loading = 'eager';
    }

    if (badge) {
      heroShell.appendChild(badge);
    }
  }

  function applyManagedHeroBadge(asset) {
    if (!asset) return;
    const badgeEl = document.querySelector('.hero-science__eyebrow');
    if (!badgeEl) return;
    if (asset.title) {
      badgeEl.textContent = asset.title;
    }
  }

  function applyManagedHeroCta(asset) {
    if (!asset || asset.type !== 'link' || !asset.url) return;
    const ctaEl = document.querySelector('.hero-science__button');
    if (!ctaEl) return;
    ctaEl.href = asset.url;
    if (asset.title) {
      ctaEl.childNodes[0].textContent = `${asset.title} `;
    }
  }

  function applyManagedHeroCardImage(asset) {
    if (!asset || asset.type !== 'image' || !asset.url) return;
    const badgeEl = document.querySelector('.hero-science__badge');
    if (!badgeEl) return;

    let imageEl = badgeEl.querySelector('.hero-science__badge-image');
    if (!imageEl) {
      imageEl = document.createElement('img');
      imageEl.className = 'hero-science__badge-image';
      imageEl.style.width = '100%';
      imageEl.style.borderRadius = '16px';
      imageEl.style.marginBottom = '12px';
      badgeEl.prepend(imageEl);
    }

    imageEl.src = asset.url;
    imageEl.alt = asset.alt_text || asset.title || 'Hero card image';
  }

  await loadManagedSiteContent();
  await loadHomepageTextContent();
  await loadAndApplyPageContent();
  await loadGlobalContent();
  await loadTestimoniContent();
  await loadHomepageAdditionalContent();

  // === Performance Utility: Throttle ===
  const throttle = (callback, delay) => {
    let lastCall = 0;
    return (...args) => {
      const now = new Date().getTime();
      if (now - lastCall < delay) return;
      lastCall = now;
      return callback(...args);
    };
  };

  // === Navbar Scroll Effect ===
  const navbar = document.getElementById('navbar') || document.querySelector('nav.navbar');
  const currentPath = window.location.pathname;
  const heroSection = document.getElementById('hero-science') || document.getElementById('beranda');
  const isHomePage = currentPath === '/' || currentPath === '/index.html' || currentPath === '';

  const syncNavbarWithActiveSection = () => {
    if (!navbar) return;
    const sections = document.querySelectorAll('section, footer');
    const navHeight = navbar.offsetHeight;
    let activeSection = null;

    // Detect which section is under the navbar
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= navHeight / 2 && rect.bottom >= navHeight / 2) {
        activeSection = section;
      }
    });

    if (activeSection) {
      const styles = window.getComputedStyle(activeSection);
      const bg = styles.backgroundImage !== 'none' ? styles.backgroundImage : styles.backgroundColor;
      
      if (bg && bg !== 'none') {
        navbar.style.background = bg;
        
        // Special case for footer or dark sections
        const isDark = activeSection.classList.contains('footer') || activeSection.id === 'footer';
        navbar.classList.toggle('navbar-on-dark', isDark);
      }
    }
  };

  const handleNavScroll = () => {
    if (!navbar) return;
    const scrollY = window.scrollY;
    
    if (scrollY > 60) {
      navbar.classList.add('scrolled');
      syncNavbarWithActiveSection();
    } else {
      navbar.classList.remove('scrolled');
      navbar.style.background = ''; // Reset to transparent
      navbar.classList.remove('navbar-on-dark');
    }

    if (navbar.id === 'navbar' && isHomePage && heroSection) {
      const heroBottomTrigger = heroSection.offsetHeight - 120;
      navbar.classList.toggle('home-hero-active', scrollY < heroBottomTrigger);
    }
  };

  if (navbar) {
    window.addEventListener('scroll', throttle(handleNavScroll, 80), { passive: true });
    handleNavScroll();
  }

  // === Mobile Menu Toggle ===
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('open');
      document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
    });
  }

  // Close menu on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (navToggle) navToggle.classList.remove('active');
      if (navMenu) navMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // === Smart Active Nav Link Logic (Global Audit Update) ===
  const navLinks = document.querySelectorAll('.nav-link');
  
  const updateActiveLink = () => {
    navLinks.forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
      const href = link.getAttribute('href');
      
      if (isHomePage) {
        // On home page, use Scroll Spy for section links
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 200;
        
        sections.forEach(section => {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          const id = section.getAttribute('id');
          if (scrollPos >= top && scrollPos < top + height) {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            }
          }
        });
        
        // Fallback for home link
        if (href === '/' || href === '/index.html') {
          const firstSection = sections[0];
          if (window.scrollY < (firstSection ? firstSection.offsetTop : 100)) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
          }
        }
      } else {
        // On subpages, match the href filename
        const pageName = currentPath.split('/').pop() || 'index.html';
        const linkName = href.split('/').pop();
        if (pageName === linkName) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      }
    });
  };

  window.addEventListener('scroll', throttle(updateActiveLink, 150), { passive: true });
  updateActiveLink(); // Initial check

  // === Scroll Animations (Intersection Observer) ===
  window.initScrollAnimations = function() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll:not(.visible)');

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -80px 0px',
      threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger the animation
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 80);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
  };
  
  // Call it initially
  window.initScrollAnimations();

  // === Counter Animation ===
  const statNumbers = document.querySelectorAll('.stat-number');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-target'));
        animateCounter(entry.target, target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => counterObserver.observe(el));

  function animateCounter(el, target) {
    let current = 0;
    const increment = target / 60;
    const duration = 1500;
    const stepTime = duration / 60;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current);
    }, stepTime);
  }

  // === Smooth Scroll for Anchor Links ===
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const offset = 80;
        const position = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
          top: position,
          behavior: 'smooth'
        });
      }
    });
  });

  // === Optimized Parallax Effect (using rAF) ===
  const heroVisual = document.querySelector('.hero-bg img') || document.querySelector('.hero-video');
  let ticking = false;

  const updateParallax = () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight && heroVisual) {
      const parallax = scrollY * 0.3;
      heroVisual.style.transform = `scale(1.05) translateY(${parallax}px) translateZ(0)`;
    }
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  // === Back to Top Button ===
  const backToTop = document.createElement('button');
  backToTop.id = 'back-to-top';
  backToTop.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // === Certificate Carousel (Swiper) ===
  if (typeof Swiper !== 'undefined' && document.querySelector('.cert-swiper')) {
    new Swiper('.cert-swiper', {
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: 'auto',
      loop: true,
      coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 100,
        modifier: 2.5,
        slideShadows: false,
      },
      breakpoints: {
        320: { slidesPerView: 1.1, spaceBetween: 15 },
        768: { slidesPerView: 2, spaceBetween: 25 },
        1024: { slidesPerView: 2.5, spaceBetween: 35 }
      },
      navigation: {
        nextEl: '.cert-navigation .swiper-button-next',
        prevEl: '.cert-navigation .swiper-button-prev',
      },
      pagination: {
        el: '.cert-navigation .swiper-pagination',
        clickable: true,
      },
      autoplay: {
        delay: 3000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      },
      speed: 1000,
      on: {
        init: function () {
          // Refresh scroll animations for new elements
          if (typeof observer !== 'undefined') {
            document.querySelectorAll('.cert-swiper').forEach(el => observer.observe(el));
          }
        },
      }
    });
  }

  // === Certificate Lightbox ===
  const certLightbox = document.getElementById('cert-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');

  if (certLightbox && lightboxImg && lightboxCaption) {
    const openLightbox = (imageSrc, title) => {
      lightboxImg.src = imageSrc;
      lightboxCaption.textContent = title;
      certLightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      certLightbox.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => { lightboxImg.src = ''; }, 400); // Clear after transiton
    };

    // Card click events
    document.querySelectorAll('.cert-card').forEach(card => {
      card.addEventListener('click', () => {
        const fullImg = card.getAttribute('data-image');
        const title = card.getAttribute('data-title');
        openLightbox(fullImg, title);
      });
    });

    // Close events
    certLightbox.addEventListener('click', (e) => {
      if (e.target === certLightbox || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && certLightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }
});
