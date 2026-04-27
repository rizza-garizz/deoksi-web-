/**
 * Deoksi News - Dynamic Content Renderer
 * Fetches articles from the API and renders them in the grid with pagination and filtering
 */

document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.querySelector('.news-grid');
    if (!newsGrid) return;

    let currentPage = 1;
    let currentCategory = '';
    const limitAttr = newsGrid.getAttribute('data-limit');
    const limit = limitAttr ? parseInt(limitAttr) : 9;

    const filterBtns = document.querySelectorAll('.news-section .btn-outline');
    const paginationContainer = document.getElementById('news-pagination');
    const showingText = document.getElementById('news-showing');

    // Bind category filters
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const text = btn.textContent.trim().toLowerCase();
                if (text === 'semua') currentCategory = '';
                else if (text === 'edukasi') currentCategory = 'edukasi';
                else if (text === 'tips skincare') currentCategory = 'tips';
                else if (text.includes('promo')) currentCategory = 'promo';
                else currentCategory = text;

                currentPage = 1;
                loadNews();
            });
        });
    }

    async function loadNews() {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                <div class="spinner" style="margin-bottom: 20px;"></div>
                Memuat berita terbaru...
            </div>
        `;

        try {
            let endpoint = `/api/articles?page=${currentPage}&limit=${limit}`;
            if (currentCategory) {
                endpoint += `&category=${currentCategory}`;
            }

            const response = await fetch(endpoint);
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Gagal memuat berita');

            const articles = result.data;
            const pagination = result.pagination || { total: articles.length, page: 1, limit };

            if (articles.length === 0) {
                newsGrid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">
                        Belum ada berita atau edukasi yang dipublikasikan di kategori ini.
                    </div>
                `;
                if (paginationContainer) paginationContainer.style.display = 'none';
                return;
            }

            // Render articles
            newsGrid.innerHTML = articles.map((article, index) => {
                const date = new Date(article.published_at || article.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });

                let displayCategory = 'Edukasi';
                if (article.category === 'tips') displayCategory = 'Tips Skincare';
                else if (article.category === 'promo') displayCategory = 'Promo & Event';
                else if (article.category) displayCategory = article.category.charAt(0).toUpperCase() + article.category.slice(1);

                return `
                    <article class="news-card animate-on-scroll" style="animation-delay: ${index * 0.1}s">
                        <div class="news-img">
                            <span class="news-tag">${displayCategory}</span>
                            <img src="${article.cover_image || '/assets/images/hero_clinic.png'}" alt="${article.title}" loading="lazy">
                        </div>
                        <div class="news-content">
                            <span class="news-date">${date}</span>
                            <h3>${article.title}</h3>
                            <p class="news-excerpt">${article.excerpt || 'Klik baca selengkapnya untuk mempelajari topik ini lebih lanjut...'}</p>
                            <a href="/berita-detail.html?slug=${article.slug}" class="news-link">Baca Selengkapnya 
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </a>
                        </div>
                    </article>
                `;
            }).join('');

            // Render pagination
            if (paginationContainer && !limitAttr) {
                const totalPages = Math.ceil(pagination.total / pagination.limit);
                if (totalPages > 1) {
                    paginationContainer.style.display = 'block';
                    if (showingText) {
                        const start = (pagination.page - 1) * pagination.limit + 1;
                        const end = Math.min(pagination.page * pagination.limit, pagination.total);
                        showingText.textContent = `Menampilkan ${start}–${end} dari ${pagination.total} Berita`;
                    }

                    const pageBtnsContainer = paginationContainer.querySelector('div');
                    if (pageBtnsContainer) {
                        let btnsHTML = '';
                        for (let i = 1; i <= totalPages; i++) {
                            btnsHTML += `<button class="btn btn-outline ${i === pagination.page ? 'active' : ''}" data-page="${i}" style="min-width: 44px; height: 44px; padding:0; border-radius: 12px;">${i}</button>`;
                        }
                        pageBtnsContainer.innerHTML = btnsHTML;

                        // Bind clicks
                        pageBtnsContainer.querySelectorAll('button').forEach(btn => {
                            btn.addEventListener('click', () => {
                                currentPage = parseInt(btn.getAttribute('data-page'));
                                loadNews();
                                // Scroll to top of news grid smoothly
                                const yOffset = -100; 
                                const y = newsGrid.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                window.scrollTo({top: y, behavior: 'smooth'});
                            });
                        });
                    }
                } else {
                    paginationContainer.style.display = 'none';
                }
            }

            // Re-trigger scroll animations if needed
            if (window.initScrollAnimations) window.initScrollAnimations();

        } catch (error) {
            console.error('News Load Error:', error);
            newsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
                    Gagal memuat berita. Silakan coba lagi nanti.
                </div>
            `;
        }
    }

    // Initial load disabled. Content is now rendered via page-renderer.js and the page-based CMS.
    // loadNews();
});
