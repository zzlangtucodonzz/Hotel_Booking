/* ===== Scroll-triggered Animations ===== */
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

/* ===== Carousel Controller ===== */
const initCarousel = () => {
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (!track || !prevBtn || !nextBtn) return;

  const getScrollAmount = () => {
    const card = track.querySelector('.property-card');
    return card ? card.offsetWidth + 20 : 310;
  };

  const updateNavVisibility = () => {
    const maxScroll = track.scrollWidth - track.parentElement.offsetWidth;
    prevBtn.style.opacity = track.scrollLeft <= 10 ? '0.3' : '1';
    prevBtn.style.pointerEvents = track.scrollLeft <= 10 ? 'none' : 'auto';
    nextBtn.style.opacity = track.scrollLeft >= maxScroll - 10 ? '0.3' : '1';
    nextBtn.style.pointerEvents = track.scrollLeft >= maxScroll - 10 ? 'none' : 'auto';
  };

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
  });

  track.addEventListener('scroll', updateNavVisibility);
  updateNavVisibility();
};

/* ===== Work Travel Toggle ===== */
const initToggle = () => {
  const toggle = document.getElementById('work-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
  });
};

/* ===== Wishlist Heart Buttons ===== */
const initWishlistButtons = () => {
  document.querySelectorAll('.wishlist-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => { btn.style.transform = ''; }, 200);
    });
  });
};

/* ===== Smooth Header Shadow on Scroll ===== */
const initHeaderScroll = () => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        header.style.boxShadow = window.scrollY > 20
          ? '0 2px 16px rgba(124, 100, 72, 0.08)'
          : 'none';
        ticking = false;
      });
      ticking = true;
    }
  });
};

/* ===== Staggered Card Animations ===== */
const initStaggeredAnimations = () => {
  document.querySelectorAll('.curated-grid, .destinations-grid, .types-grid').forEach((grid) => {
    const children = grid.children;
    Array.from(children).forEach((child, index) => {
      child.style.transitionDelay = `${index * 0.1}s`;
    });
  });
};

/* ===== Subnav Active State ===== */
const initSubnav = () => {
  document.querySelectorAll('.subnav-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.subnav-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
};

/* ===== Auth Header — Conditional Rendering ===== */
/**
 * initAuthHeader()
 *
 * Reads authentication state from localStorage and renders
 * the correct header UI:
 *
 *   isLoggedIn == false  →  body has NO `.is-logged-in` class
 *                           → #auth-guest-block is visible (Register + Sign In)
 *                           → #auth-user-block is hidden
 *
 *   isLoggedIn == true   →  body GETS `.is-logged-in` class
 *                           → #auth-guest-block is hidden
 *                           → #auth-user-block is visible (Avatar + Greeting + Dropdown)
 *
 * The actual show/hide is driven purely by CSS rules in style.css
 * that target `body.is-logged-in`. JavaScript only manages state.
 */
const initAuthHeader = () => {
  /* ── 1. Read auth data from localStorage ─────────────────────────── */
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  // Determine login state: both token AND user data must exist
  const isLoggedIn = Boolean(token && userRaw);

  if (!isLoggedIn) {
    // No auth data → ensure guest UI is shown (default state)
    document.body.classList.remove('is-logged-in');
    return; // Nothing more to set up
  }

  /* ── 2. Parse user data safely ────────────────────────────────────── */
  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    // Corrupted data in localStorage → clear and show guest UI
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.body.classList.remove('is-logged-in');
    return;
  }

  /* ── 3. Activate authenticated UI ────────────────────────────────── */
  // Adding this class to <body> triggers all CSS conditional rules
  document.body.classList.add('is-logged-in');

  /* ── 4. Populate user-specific content ───────────────────────────── */
  const fullName   = user.fullName || 'Traveller';
  // Extract first name only for the greeting (e.g. "Alex" from "Alex Nguyen")
  const firstName  = fullName.split(' ')[0];
  // Build initials: up to 2 characters from the name words (e.g. "AN")
  const initials   = fullName
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  const greetingEl = document.getElementById('user-greeting');
  const avatarEl   = document.getElementById('user-avatar');

  if (greetingEl) greetingEl.textContent = `Hello, ${firstName}`;
  if (avatarEl)   avatarEl.textContent   = initials;

  /* ── 5. Dropdown toggle logic ─────────────────────────────────────── */
  const userBlock   = document.getElementById('auth-user-block');
  const triggerBtn  = document.getElementById('user-profile-trigger');
  const dropdown    = document.getElementById('user-dropdown');

  if (!userBlock || !triggerBtn || !dropdown) return;

  /**
   * openDropdown / closeDropdown manage aria-expanded attribute.
   * CSS uses [aria-expanded="true"] to show the dropdown panel
   * and rotate the chevron icon — no JS class toggling needed.
   */
  const openDropdown  = () => userBlock.setAttribute('aria-expanded', 'true');
  const closeDropdown = () => userBlock.setAttribute('aria-expanded', 'false');
  const isOpen        = () => userBlock.getAttribute('aria-expanded') === 'true';

  // Toggle dropdown on trigger click
  triggerBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent immediate close by the outside-click listener
    isOpen() ? closeDropdown() : openDropdown();
  });

  // Close dropdown when clicking anywhere outside the user block
  document.addEventListener('click', (e) => {
    if (isOpen() && !userBlock.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close dropdown on Escape key (accessibility)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      closeDropdown();
      triggerBtn.focus(); // Return focus to trigger
    }
  });

  /* ── 6. Log Out button ───────────────────────────────────────────── */
  const logoutBtn = document.getElementById('dropdown-logout');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Clear all authentication data from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Revert header UI back to guest state
      document.body.classList.remove('is-logged-in');

      // Ensure dropdown is closed
      closeDropdown();

      // Redirect to home page to reflect logged-out state cleanly
      window.location.href = 'index.html';
    });
  }
};

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCarousel();
  initToggle();
  initWishlistButtons();
  initHeaderScroll();
  initStaggeredAnimations();
  initSubnav();
  initAuthHeader(); // ← Conditional auth rendering must run after DOM is ready

  // Use native scrolling for carousel instead of transform
  const track = document.getElementById('carousel-track');
  if (track) {
    track.style.overflowX = 'auto';
    track.style.scrollbarWidth = 'none';
    track.style.msOverflowStyle = 'none';
    track.style.webkitOverflowScrolling = 'touch';
  }
});

