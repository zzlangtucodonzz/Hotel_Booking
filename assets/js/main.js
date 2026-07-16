/* =========================================================
   main.js — Wanderly Homepage Controller
   ========================================================= */

/* ─────────────────────────────────────────────────────────
   1. CONSTANTS & GLOBAL VARIABLES
───────────────────────────────────────────────────────── */
const API_BASE       = '/api/properties';
const SKELETON_COUNT = 5;
let allProperties    = []; // Biến lưu toàn bộ dữ liệu gốc để lọc client-side

/* ─────────────────────────────────────────────────────────
   2. HELPERS
───────────────────────────────────────────────────────── */
const ratingLabel = (rating) => {
  if (!rating) return '';
  if (rating >= 9.5) return 'Exceptional';
  if (rating >= 9.0) return 'Wonderful';
  if (rating >= 8.5) return 'Excellent';
  if (rating >= 8.0) return 'Very Good';
  return 'Good';
};

const formatPrice = (price) => {
  const n = parseFloat(price);
  if (isNaN(n)) return 'N/A';
  return `$${Math.round(n)}`;
};

const PIN_SVG = `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M7 1C4.8 1 3 2.8 3 5c0 3.5 4 7 4 7s4-3.5 4-7c0-2.2-1.8-4-4-4z"/>
  <circle cx="7" cy="5" r="1.5"/>
</svg>`;

const HEART_SVG = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
  <path d="M10 17s-7-4.5-7-9A4 4 0 0110 5.5 4 4 0 0117 8c0 4.5-7 9-7 9z"/>
</svg>`;

/* ─────────────────────────────────────────────────────────
   3. CARD RENDERER
───────────────────────────────────────────────────────── */
const buildPropertyCard = (property, index) => {
  const { PropertyID, Name, BasePrice, Rating, City, Country, TypeName, PrimaryImage } = property;
  const location = [City, Country].filter(Boolean).join(', ') || 'Vietnam';
  const imgSrc   = PrimaryImage || 'assets/images/hanoi-hotel.png';
  const price    = formatPrice(BasePrice);
  const label    = ratingLabel(Rating);
  const ratingDisplay = Rating ? parseFloat(Rating).toFixed(1) : '';

  let badge = '';
  if (index === 0)               badge = `<span class="card-badge">Top Rated</span>`;
  else if (Rating >= 9.5)        badge = `<span class="card-badge">Exceptional</span>`;
  else if (TypeName === 'Villa') badge = `<span class="card-badge">Insider Pick</span>`;

  const article = document.createElement('article');
  article.className = 'property-card';
  article.id = `property-db-${PropertyID ?? index}`;
  article.dataset.propertyId = PropertyID ?? '';
  article.innerHTML = `
    <div class="property-card-img">
      <img src="${imgSrc}" alt="${Name}" loading="lazy" onerror="this.src='assets/images/hanoi-hotel.png'">
      <button class="wishlist-btn" aria-label="Save ${Name} to wishlist">${HEART_SVG}</button>
      ${badge}
    </div>
    <div class="property-card-body">
      <h3 class="card-title">${Name}</h3>
      <div class="property-location">${PIN_SVG} ${location}</div>
      ${ratingDisplay ? `
      <div class="property-rating">
        <span class="rating-badge">${ratingDisplay}</span>
        <span class="rating-label">${label}</span>
      </div>` : ''}
      <div class="property-price">
        <span class="price-text">${price}</span>
        <span class="per-night">/ night</span>
      </div>
    </div>
  `;

  // Xử lý nút yêu thích
  const wishlistBtn = article.querySelector('.wishlist-btn');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      wishlistBtn.classList.toggle('active');
      wishlistBtn.style.transform = 'scale(1.3)';
      setTimeout(() => { wishlistBtn.style.transform = ''; }, 200);
    });
  }

  article.addEventListener('click', (e) => {
    if (e.target.closest('.wishlist-btn')) return; 
    if (typeof window.openBooking === 'function') {
        let finalPrice = parseFloat(BasePrice);
        if (isNaN(finalPrice) || finalPrice <= 0) finalPrice = 120;
        window.openBooking(Name, TypeName || 'Standard Room', finalPrice, PropertyID);
    }
  });

  article.style.cursor = 'pointer';
  return article;
};

/* ─────────────────────────────────────────────────────────
   4. SKELETON CARDS & EMPTY STATES
───────────────────────────────────────────────────────── */
const buildSkeletonCard = () => {
  const article = document.createElement('article');
  article.className = 'property-card property-card--skeleton';
  article.setAttribute('aria-hidden', 'true');
  article.innerHTML = `
    <div class="property-card-img skeleton-img"></div>
    <div class="property-card-body">
      <div class="skeleton-line skeleton-title"></div>
      <div class="skeleton-line skeleton-location"></div>
      <div class="skeleton-line skeleton-price"></div>
    </div>
  `;
  return article;
};

const showSkeletons = (container, count = SKELETON_COUNT) => {
  if (!container) return () => {};
  const skeletons = Array.from({ length: count }, buildSkeletonCard);
  skeletons.forEach((s) => container.appendChild(s));
  return () => skeletons.forEach((s) => s.remove());
};

const buildEmptyState = (message = 'No properties found.') => {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="22" cy="22" r="16"/><path d="M34 34l8 8"/>
      <path d="M16 22h12M22 16v12"/>
    </svg>
    <p>${message}</p>
  `;
  return div;
};

/* ─────────────────────────────────────────────────────────
   5. FETCH, FILTER & RENDER
───────────────────────────────────────────────────────── */
const renderCardsToContainer = (container, propertiesArray) => {
  if (!container) return;
  container.innerHTML = '';
  
  if (propertiesArray.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #64748b; font-weight: 500;">No properties match your filters. Try adjusting your search.</div>';
    return;
  }
  
  propertiesArray.forEach((prop, i) => {
    container.appendChild(buildPropertyCard(prop, i));
  });
};

const applyFiltersAndRender = () => {
  const discoverContainer = document.getElementById('hotel-listings-container');
  if (!discoverContainer) return;

  const searchQuery = document.getElementById('discover-dest')?.value.toLowerCase() || '';
  const priceFilters = Array.from(document.querySelectorAll('.price-filter:checked')).map(cb => cb.value);
  const typeFilters = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
  const sortVal = document.getElementById('sort-select')?.value || 'recommended';

  let filteredData = allProperties.filter(p => {
    // 1. Text Search
    const matchText = p.Name.toLowerCase().includes(searchQuery) || (p.City && p.City.toLowerCase().includes(searchQuery));
    if (!matchText) return false;

    // 2. Type Filter
    if (typeFilters.length > 0) {
      let matchType = false;
      typeFilters.forEach(type => {
        if (p.TypeName && p.TypeName.toLowerCase().includes(type.toLowerCase())) matchType = true;
      });
      if (!matchType) return false;
    }

    // 3. Price Filter
    if (priceFilters.length > 0) {
      let matchPrice = false;
      const price = parseFloat(p.BasePrice) || 120; 
      
      if (priceFilters.includes('under100') && price < 100) matchPrice = true;
      if (priceFilters.includes('100to200') && price >= 100 && price <= 200) matchPrice = true;
      if (priceFilters.includes('over200') && price > 200) matchPrice = true;
      
      if (!matchPrice) return false;
    }
    return true;
  });

  // 4. Sorting
  if (sortVal === 'price-asc') {
    filteredData.sort((a, b) => (parseFloat(a.BasePrice) || 120) - (parseFloat(b.BasePrice) || 120));
  } else if (sortVal === 'price-desc') {
    filteredData.sort((a, b) => (parseFloat(b.BasePrice) || 120) - (parseFloat(a.BasePrice) || 120));
  }

  renderCardsToContainer(discoverContainer, filteredData);
};

const fetchAndRenderHotels = async () => {
  const container = document.getElementById('featured-hotels-container');
  const discoverContainer = document.getElementById('hotel-listings-container');
  
  const clearContainer = showSkeletons(container);
  const clearDiscover = showSkeletons(discoverContainer);

  try {
    const response = await fetch(API_BASE);
    const json = await response.json();

    clearContainer();
    clearDiscover();

    if (json.success && Array.isArray(json.data)) {
      allProperties = json.data; 
      
      if (discoverContainer) {
        discoverContainer.style.display = 'grid';
        discoverContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        discoverContainer.style.gap = '24px';
      }

      // Render Trang chủ
      if (container) renderCardsToContainer(container, allProperties.slice(0, 10)); 
      
      // Render Trang Find Stays
      applyFiltersAndRender();
      
      if(typeof updateCarouselNav === 'function') updateCarouselNav();
    } else {
        if(container) container.appendChild(buildEmptyState());
        if(discoverContainer) discoverContainer.appendChild(buildEmptyState());
    }
  } catch (err) {
    clearContainer();
    clearDiscover();
    console.error('Fetch error:', err);
    const errBox = buildEmptyState('Could not load properties. Please refresh the page.');
    if(container) container.appendChild(errBox.cloneNode(true));
    if(discoverContainer) discoverContainer.appendChild(errBox.cloneNode(true));
  }
};

/* ─────────────────────────────────────────────────────────
   6. INIT SEARCH & FILTERS
───────────────────────────────────────────────────────── */
const initSearchAndFilters = () => {
  const heroForm = document.getElementById('search-form');
  const heroDest = document.getElementById('search-destination');
  
  if (heroForm && heroDest) {
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const discoverDest = document.getElementById('discover-dest');
      if (discoverDest) discoverDest.value = heroDest.value;
      if (typeof switchView === 'function') switchView('discover');
      applyFiltersAndRender();
    });
  }

  document.getElementById('discover-dest')?.addEventListener('input', applyFiltersAndRender);
  document.querySelectorAll('.price-filter').forEach(cb => cb.addEventListener('change', applyFiltersAndRender));
  document.querySelectorAll('.type-filter').forEach(cb => cb.addEventListener('change', applyFiltersAndRender));
  document.getElementById('sort-select')?.addEventListener('change', applyFiltersAndRender);
};

/* ─────────────────────────────────────────────────────────
   7. UI CONTROLLERS (Carousel, Animations, Toggles)
───────────────────────────────────────────────────────── */
let updateCarouselNav = () => {};

const initCarousel = () => {
  const track   = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (!track || !prevBtn || !nextBtn) return;

  const getScrollAmount = () => {
    const card = track.querySelector('.property-card');
    return card ? card.offsetWidth + 20 : 310;
  };

  updateCarouselNav = () => {
    const maxScroll = track.scrollWidth - track.parentElement.offsetWidth;
    prevBtn.style.opacity       = track.scrollLeft <= 10 ? '0.3' : '1';
    prevBtn.style.pointerEvents = track.scrollLeft <= 10 ? 'none' : 'auto';
    nextBtn.style.opacity       = track.scrollLeft >= maxScroll - 10 ? '0.3' : '1';
    nextBtn.style.pointerEvents = track.scrollLeft >= maxScroll - 10 ? 'none' : 'auto';
  };

  prevBtn.addEventListener('click', () => { track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' }); });
  nextBtn.addEventListener('click', () => { track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' }); });

  track.addEventListener('scroll', updateCarouselNav);
  updateCarouselNav();
};

const initScrollAnimations = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
  );
  document.querySelectorAll('.animate-in').forEach((el) => observer.observe(el));
};

const initToggle = () => {
  const toggle = document.getElementById('work-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => toggle.classList.toggle('active'));
};

const initHeaderScroll = () => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.style.boxShadow = window.scrollY > 20 ? '0 2px 16px rgba(124, 100, 72, 0.08)' : 'none';
        ticking = false;
      });
      ticking = true;
    }
  });
};

const initStaggeredAnimations = () => {
  document.querySelectorAll('.curated-grid, .destinations-grid, .types-grid').forEach((grid) => {
    Array.from(grid.children).forEach((child, i) => { child.style.transitionDelay = `${i * 0.1}s`; });
  });
};

const initSubnav = () => {
  document.querySelectorAll('.subnav-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.subnav-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
};

const initAuthHeader = () => {
  const token   = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  if (!token || !userRaw) {
    document.body.classList.remove('is-logged-in');
    return;
  }
  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.body.classList.remove('is-logged-in');
    return;
  }
  document.body.classList.add('is-logged-in');
  const fullName  = user.fullName || 'Traveller';
  const firstName = fullName.split(' ')[0];
  const initials  = fullName.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
  const greetingEl = document.getElementById('user-greeting');
  const avatarEl   = document.getElementById('user-avatar');
  if (greetingEl) greetingEl.textContent = `Hello, ${firstName}`;
  if (avatarEl)   avatarEl.textContent   = initials;
  const userBlock  = document.getElementById('auth-user-block');
  const triggerBtn = document.getElementById('user-profile-trigger');
  if (!userBlock || !triggerBtn) return;
  
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = userBlock.getAttribute('aria-expanded') === 'true';
    userBlock.setAttribute('aria-expanded', !isOpen);
  });
  
  document.addEventListener('click', (e) => {
    if (userBlock.getAttribute('aria-expanded') === 'true' && !userBlock.contains(e.target)) {
      userBlock.setAttribute('aria-expanded', 'false');
    }
  });
};

const showComingSoonToast = () => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; color: #f59e0b;">
      <circle cx="10" cy="10" r="9"/><line x1="10" y1="6" x2="10" y2="10"/><line x1="10" y1="14" x2="10.01" y2="14"/>
    </svg>
    <span>This feature is currently in development. Stay tuned!</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
};

const initComingSoonToasts = () => {
  const targetIds = ['nav-journeys', 'nav-experiences', 'nav-eats', 'work-toggle'];
  targetIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        showComingSoonToast();
      });
    }
  });
};



/* ─────────────────────────────────────────────────────────
   8. INIT APP
───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  sessionStorage.removeItem('checkoutFormData');
  // Guests are allowed, so we do not enforceSecurity() globally on the main frontend anymore
  initScrollAnimations();
  initCarousel();
  initToggle();
  initHeaderScroll();
  initStaggeredAnimations();
  initSubnav();
  initAuthHeader(); 
  initSearchAndFilters(); // Đã gộp Form tìm kiếm và Bộ lọc
  initComingSoonToasts();
  
  // Gọi Data
  fetchAndRenderHotels();

  // Scrollbar Style for Carousel
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.overflowX = 'auto';
    track.style.scrollbarWidth = 'none';
    track.style.msOverflowStyle = 'none';
    track.style.webkitOverflowScrolling = 'touch';
  }
});