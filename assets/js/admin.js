/* ================================================================
   Wanderly Admin Dashboard — Interactive Logic
   ================================================================
   Fully wired to backend REST APIs. No placeholder data.
   All fetch() calls use try/catch with toast error notifications.
   ================================================================ */

/* --- GLOBAL FETCH INTERCEPTOR FOR AUTHENTICATION & 401 HANDLING --- */
const originalFetch = window.fetch;
window.fetch = async function () {
    let [resource, config] = arguments;
    
    // Only inject headers for API calls
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
        config = config || {};
        config.headers = config.headers || {};
        
        const token = localStorage.getItem('token');
        if (token) {
            // Must strictly match Bearer token structure expected by authMiddleware.js
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    const response = await originalFetch(resource, config);
    
    // Globally handle 401 Unauthorized (Session expired or missing token)
    if (response.status === 401) {
        console.warn("Session expired or unauthorized. Redirecting to login...");
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user'); // Admin uses 'user' too
        window.location.replace('login.html');
        // Return a never-resolving promise so the calling code doesn't proceed
        return new Promise(() => {});
    }
    
    return response;
};

function enforceSecurity() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  // Check for both 'admin' and 'Admin' just to be safe
  const isAdmin = user.role === 'admin' || user.roleName === 'Admin';

  if (!token || !isAdmin) {
    console.warn("Security Alert: Unauthorized access attempt. Terminating session.");
    
    // 1. Completely freeze the page - stop all other scripts from fetching data
    window.stop(); 
    
    // 2. Create the un-bypassable overlay
    const shield = document.createElement('div');
    shield.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.9); z-index: 999999;
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        pointer-events: all; /* Captures and blocks ALL clicks */
        cursor: not-allowed;
    `;
    
    // 3. Create the Modal Box
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #fff; padding: 40px; border-radius: 12px;
        text-align: center; box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
        font-family: sans-serif; max-width: 400px;
    `;
    modal.innerHTML = `
        <div style="font-size: 50px; margin-bottom: 15px;">🚫</div>
        <h2 style="color: #dc3545; margin: 0 0 10px 0; font-size: 24px;">Access Denied</h2>
        <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">You do not have Administrator privileges. This unauthorized access attempt has been logged.</p>
        <p style="color: #666; font-size: 14px;">Redirecting securely in <span id="countdown" style="font-weight: bold; color: #dc3545;">5</span> seconds...</p>
    `;
    
    shield.appendChild(modal);
    document.body.appendChild(shield);

    // 4. Disable keyboard interactions (prevent Tab, Escape, etc.)
    document.addEventListener('keydown', (e) => {
        e.preventDefault();
        e.stopPropagation();
    }, { capture: true });

    // 5. Countdown and Kick out
    let timeLeft = 5;
    const countdownSpan = document.getElementById('countdown');
    const timer = setInterval(() => {
        timeLeft -= 1;
        if (countdownSpan) countdownSpan.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('currentUser');
            window.location.replace('index.html'); // Use replace to prevent 'Back' button bypassing
        }
    }, 1000);
    
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!enforceSecurity()) return;
  initSidebarToggle();
  initSidebarNavigation();
  initTopbarActions();
  initFilterModal();
  initExportButtons();
  initNewBookingModal();
  initMobileMenu();
  loadAdminDashboard();

  // Profile dropdown and logout logic
  const topbarUser = document.getElementById('topbar-user');
  const userDropdown = document.getElementById('user-dropdown');
  const btnLogout = document.getElementById('btn-logout');

  console.log('🔍 Checking Elements:', { topbarUserFound: !!topbarUser, userDropdownFound: !!userDropdown, btnLogoutFound: !!btnLogout });

  if (topbarUser && userDropdown) {
    topbarUser.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
      console.log('🖱️ User Profile Clicked, Dropdown shown:', userDropdown.classList.contains('show'));
    });
  }

  document.addEventListener('click', (e) => {
    if (userDropdown && userDropdown.classList.contains('show')) {
      if (!topbarUser.contains(e.target)) {
        userDropdown.classList.remove('show');
      }
    }
  });

  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🚪 Logout Button Clicked');
      
      // Clear all authentication credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      showToast('Successfully logged out. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    });
  }
});


/* ================================================================
   SIDEBAR COLLAPSE TOGGLE
   ================================================================ */
function initSidebarToggle() {
  const sidebar = document.getElementById('admin-sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');

  if (!collapseBtn || !sidebar) return;

  collapseBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  });

  // Restore saved state
  if (localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
  }
}


/* ================================================================
   SIDEBAR NAVIGATION — Active State & Page Switching
   Uses Event Delegation on the parent nav element instead of
   per-item listeners for better performance and maintainability.
   ================================================================ */
// Utility: dynamically hide all pages, show one
window.showPage = (pageId) => {
  // Find all sections with class 'admin-content' and hide them
  document.querySelectorAll('.admin-content').forEach(p => {
    p.style.display = 'none';
  });
  // Show the targeted section
  const targetEl = document.getElementById(pageId);
  if (targetEl) targetEl.style.display = '';
};

function initSidebarNavigation() {
  const sidebarNav     = document.getElementById('sidebar-nav');
  if (!sidebarNav) return;
  // Event delegation: listen on the nav container, not each item
  sidebarNav.addEventListener('click', (e) => {
    const item = e.target.closest('.sidebar-item');
    if (!item) return;

    e.preventDefault();

    // Toggle active class
    sidebarNav.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const id = item.id;

    if (id === 'nav-reports') {
      showPage('analytics-page');
      // Lazy-init: only fetch when the tab is first opened
      if (!document.getElementById('analytics-page').dataset.loaded) {
        document.getElementById('analytics-page').dataset.loaded = 'true';
        loadAdminAnalytics();
      }
    } else if (id === 'nav-hotels') {
      showPage('hotels-page');
      if (!document.getElementById('hotels-page').dataset.loaded) {
        document.getElementById('hotels-page').dataset.loaded = 'true';
        initHotelsPage();
      }
      loadHotels();
    } else if (id === 'nav-rooms') {
      showPage('rooms-page');
      if (!document.getElementById('rooms-page').dataset.loaded) {
        document.getElementById('rooms-page').dataset.loaded = 'true';
        initRoomsPage();
      }
    } else if (id === 'nav-amenities') {
      showPage('amenities-page');
      if (!document.getElementById('amenities-page').dataset.loaded) {
        document.getElementById('amenities-page').dataset.loaded = 'true';
        initAmenitiesPage();
      }
    } else if (id === 'nav-bookings') {
      showPage('bookings-page');
      if (!document.getElementById('bookings-page').dataset.loaded) {
        document.getElementById('bookings-page').dataset.loaded = 'true';
        initBookingsPage();
      }
      loadAdminBookings();
    } else if (id === 'nav-pricing') {
      showPage('pricing-page');
      if (!document.getElementById('pricing-page').dataset.loaded) {
        document.getElementById('pricing-page').dataset.loaded = 'true';
        initPricingPage();
      }
    } else if (id === 'nav-payments') {
      showPage('payments-section');
      if (!document.getElementById('payments-section').dataset.loaded) {
        document.getElementById('payments-section').dataset.loaded = 'true';
        initPaymentsSection();
      }
      loadAdminPayments();
    } else if (id === 'nav-coupons') {
      showPage('coupons-section');
      if (!document.getElementById('coupons-section').dataset.loaded) {
        document.getElementById('coupons-section').dataset.loaded = 'true';
        initCouponsSection();
      }
      loadCoupons();
    } else if (id === 'nav-customers') {
      showPage('customers-section');
      if (!document.getElementById('customers-section').dataset.loaded) {
        document.getElementById('customers-section').dataset.loaded = 'true';
        initCustomersSection();
      }
      loadCustomers();
    } else if (id === 'nav-roles') {
      showPage('roles-section');
      if (!document.getElementById('roles-section').dataset.loaded) {
        document.getElementById('roles-section').dataset.loaded = 'true';
        initRolesSection();
      }
      loadRoles();
      loadStaff();
    } else if (id === 'nav-cms') {
      showPage('cms-section');
      if (!document.getElementById('cms-section').dataset.loaded) {
        document.getElementById('cms-section').dataset.loaded = 'true';
        initCmsSection();
        showCmsFilters();
      }
      loadPosts();
    } else if (id === 'nav-reviews') {
      showPage('reviews-section');
      if (!document.getElementById('reviews-section').dataset.loaded) {
        document.getElementById('reviews-section').dataset.loaded = 'true';
        initReviewsSection();
        showReviewsFilters();
      }
      loadReviews();
    } else if (id === 'nav-media') {
      showPage('media-section');
      if (!document.getElementById('media-section').dataset.loaded) {
        document.getElementById('media-section').dataset.loaded = 'true';
        showMediaFilters();
        loadMediaFolders();
      }
      loadMedia();
    } else if (id === 'nav-settings') {
      showPage('settings-section');
      if (!document.getElementById('settings-section').dataset.loaded) {
        document.getElementById('settings-section').dataset.loaded = 'true';
      }
      loadSettings();
    } else if (id === 'nav-notifications') {
      showPage('notifications-section');
      if (!document.getElementById('notifications-section').dataset.loaded) {
        document.getElementById('notifications-section').dataset.loaded = 'true';
      }
      loadNotifications();
    } else if (id === 'nav-tickets') {
      showPage('tickets-section');
      if (!document.getElementById('tickets-section').dataset.loaded) {
        document.getElementById('tickets-section').dataset.loaded = 'true';
      }
      loadTickets();
    } else if (id === 'nav-audit') {
      showPage('audit-logs-section');
      if (!document.getElementById('audit-logs-section').dataset.loaded) {
        document.getElementById('audit-logs-section').dataset.loaded = 'true';
      }
      loadAuditLogs();
    } else {
      // All other nav items → show the main dashboard
      showPage('admin-content');
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-mobile-overlay');
    if (sidebar?.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      overlay?.classList.remove('active');
    }
  });
}


/* ================================================================
   DASHBOARD DATA — fetch real stats, charts & tables from the API
   ================================================================ */

/**
 * Fetches all dashboard endpoints in parallel and wires the results
 * into the KPI stat cards, charts, and tables.
 */
async function loadAdminDashboard() {
  try {
    const [statsRes, revenueChartRes, bookingChartRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/dashboard/revenue-chart'),
      fetch('/api/admin/dashboard/booking-chart')
    ]);

    if (!statsRes.ok) throw new Error(`API returned ${statsRes.status}: ${statsRes.statusText}`);
    
    const [json, revenueChartJson, bookingChartJson] = await Promise.all([
      statsRes.json(),
      revenueChartRes.json(),
      bookingChartRes.json()
    ]);

    if (json.success && json.data) {
      const data = json.data;
      
      // Populate overview cards
      if (data.overview) {
        populateStats(data.overview);
      }

      // Populate recent bookings table
      if (data.recentBookings) {
        populateRecentBookings(data.recentBookings);
      }

      // Populate top properties list
      if (data.topProperties) {
        populateDashboardTopProperties(data.topProperties);
      }
    }
    
    if (revenueChartJson.success) initRevenueChart(revenueChartJson.data);
    if (bookingChartJson.success) initBookingChart(bookingChartJson.data);

  } catch (err) {
    console.error('loadAdminDashboard error:', err);
    showToast('Failed to load dashboard data. Is the server running?', 'error');
  }
}

/**
 * Writes real values into the four main KPI stat card elements and
 * triggers the count-up animation from the actual DB figures.
 *
 * @param {{ totalUsers: number, totalProperties: number,
 *           totalRevenue: number, totalBookings: number }} data
 */
function populateStats(data) {
  const mapping = [
    { id: 'dash-revenue',    value: data.totalRevenue,    prefix: '$', suffix: '',  decimals: 0 },
    { id: 'dash-bookings',   value: data.totalBookings,   prefix: '',  suffix: '',  decimals: 0 },
    { id: 'dash-properties', value: data.totalProperties, prefix: '',  suffix: '',  decimals: 0 },
    { id: 'dash-users',      value: data.totalUsers,      prefix: '',  suffix: '',  decimals: 0 },
    { id: 'dash-cancelled',  value: data.cancelledBookings, prefix: '', suffix: '', decimals: 0 },
  ];

  mapping.forEach(({ id, value, prefix, suffix, decimals }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Set the real target on the element so the count-up function picks it up
    el.dataset.count    = value;
    el.dataset.prefix   = prefix;
    el.dataset.suffix   = suffix;
    el.dataset.decimals = decimals;

    // Kick off the animation immediately
    animateCountUp(el);
  });
}

/**
 * Populates the "New Bookings (Month)" and "Cancelled Bookings" stat cards
 * with real data from /api/admin/dashboard/extra-stats.
 */
function populateExtraStats(data) {
    // This function is obsolete since we handle everything in populateStats using the new mapping.
}

/**
 * Generic count-up animator — can be called directly on a single element.
 */
function animateCountUp(element) {
  const target   = parseFloat(element.dataset.count) || 0;
  const prefix   = element.dataset.prefix   || '';
  const suffix   = element.dataset.suffix   || '';
  const decimals = element.dataset.decimals ? parseInt(element.dataset.decimals) : 0;
  const duration = 1200;
  const startTime = performance.now();

  const update = (currentTime) => {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut  = 1 - Math.pow(1 - progress, 3);
    const current  = target * easeOut;

    element.textContent = prefix + formatNumber(current, decimals) + suffix;

    if (progress < 1) requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

function formatNumber(num, decimals = 0) {
  if (decimals > 0) {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Renders the most recent bookings into the table tbody.
 */
function populateRecentBookings(bookings) {
  const tbody = document.getElementById('admin-recent-bookings-list');
  if (!tbody) return;

  // Badge class map
  const badgeClass = {
    Pending:   'badge-warning',
    Confirmed: 'badge-success',
    Cancelled: 'badge-danger',
    Completed: 'badge-info',
    pending:   'badge-warning',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
    completed: 'badge-info',
  };

  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">
          No bookings found.
        </td>
      </tr>`;
    return;
  }

  // Generate avatar initials
  const getInitials = (name) => {
    if (!name) return '—';
    return name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  tbody.innerHTML = bookings.map(booking => {
    const initials    = getInitials(booking.customer_name);
    const paymentStatusStr = booking.payment_status || 'pending';
    const bookingStatusStr = booking.booking_status || 'pending';
    
    const paymentStatusClass = badgeClass[paymentStatusStr] || 'badge-warning';
    const statusClass = badgeClass[bookingStatusStr] || 'badge-warning';
    
    const checkIn     = formatDate(booking.check_in_date);
    const checkOut    = formatDate(booking.check_out_date);
    const amount      = `$${parseInt(booking.total_amount)}`;
    
    const statusText  = bookingStatusStr.charAt(0).toUpperCase() + bookingStatusStr.slice(1);
    const paymentText = paymentStatusStr.charAt(0).toUpperCase() + paymentStatusStr.slice(1);

    return `
      <tr>
        <td><strong style="font-variant-numeric:tabular-nums;">#${booking.id}</strong></td>
        <td>
          <div class="cell-guest">
            <div class="cell-guest-avatar">${initials}</div>
            <div class="cell-guest-info">
              <span class="cell-guest-name">${booking.customer_name || '—'}</span>
              <span class="cell-guest-email" style="font-size: 11px; color: var(--admin-text-muted); display: block;">${booking.customer_email || ''}</span>
            </div>
          </div>
        </td>
        <td>${checkIn}</td>
        <td>${checkOut}</td>
        <td class="cell-amount">${amount}</td>
        <td>
          <span class="badge ${paymentStatusClass}"><span class="badge-dot"></span> ${paymentText}</span>
          <span class="badge ${statusClass}" style="margin-left:4px;"><span class="badge-dot"></span> ${statusText}</span>
        </td>
      </tr>`;
  }).join('');
}


/**
 * Dynamically populates the Dashboard "Top-Performing Properties" sidebar list.
 * Replaces the removed hardcoded HTML with API-sourced data.
 */
function populateDashboardTopProperties(data) {
  const container = document.getElementById('admin-top-properties-list');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:2rem;">No property data available.</div>`;
    return;
  }

  const maxRevenue = Math.max(...data.map(d => Number(d.totalRevenue) || 0), 1);
  const rankClasses = ['gold', 'silver', 'bronze', '', ''];

  container.innerHTML = data.map((prop, idx) => {
    const rawRevenue = prop.totalRevenue || prop.revenue || prop.TOTAL_REVENUE || 0;
    const rawBookings = prop.totalBookings || prop.bookings || prop.bookingCount || 0;
    const city = prop.city || prop.location || '—';
    const country = prop.country || '—';
    const barPct = ((rawRevenue / maxRevenue) * 100).toFixed(1);
    const rank   = rankClasses[idx] || '';

    return `
      <div class="top-hotel-item">
        <div class="top-hotel-rank ${rank}">${idx + 1}</div>
        <div class="top-hotel-info">
          <div class="top-hotel-name">${prop.propertyName || '—'}</div>
          <div class="top-hotel-location">${city}, ${country}</div>
          <div class="top-hotel-bar"><div class="top-hotel-bar-fill" style="width: ${barPct}%"></div></div>
        </div>
        <div class="top-hotel-stats">
          <div class="top-hotel-revenue">$${formatNumber(rawRevenue, 0)}</div>
          <div class="top-hotel-bookings">${rawBookings} booking${rawBookings !== 1 ? 's' : ''}</div>
        </div>
      </div>`;
  }).join('');
}


/* ================================================================
   REVENUE CHART (Chart.js) — powered by API data
   ================================================================ */

/** @type {Chart|null} */
let dashboardRevenueChart = null;

function initRevenueChart(data) {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy previous instance if exists (prevents canvas reuse errors)
  if (dashboardRevenueChart) {
    dashboardRevenueChart.destroy();
    dashboardRevenueChart = null;
  }

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  dashboardRevenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: `Revenue ${data.currentYear}`,
          data: data.monthlyRevenueCurrent,
          borderColor: '#4f46e5',
          backgroundColor: gradient,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#4f46e5',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 3,
          fill: true,
          tension: 0.4,
        },
        {
          label: `Revenue ${data.previousYear}`,
          data: data.monthlyRevenuePrevious,
          borderColor: '#94a3b8',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#94a3b8',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { size: 12, family: "'Inter', sans-serif" },
            color: '#64748b',
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, family: "'Inter', sans-serif", weight: '600' },
          bodyFont: { size: 12, family: "'Inter', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
          callbacks: {
            label: (context) => `  ${context.dataset.label}: $${context.parsed.y.toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#94a3b8',
          },
          border: { display: false },
        },
        y: {
          grid: {
            color: '#f1f5f9',
            drawBorder: false,
          },
          ticks: {
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#94a3b8',
            callback: (value) => '$' + (value / 1000) + 'k',
            maxTicksLimit: 6,
          },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });

  // Chart tab switching (Monthly / Weekly / Daily visual toggle)
  document.querySelectorAll('#revenue-chart-tabs .chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#revenue-chart-tabs .chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Note: Weekly/Daily would need additional API endpoints to supply different data.
      // Currently only Monthly data is available from the backend.
    });
  });
}


/* ================================================================
   BOOKING TRENDS CHART — powered by API data
   ================================================================ */

/** @type {Chart|null} */
let dashboardBookingChart = null;

function initBookingChart(data) {
  const canvas = document.getElementById('booking-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (dashboardBookingChart) {
    dashboardBookingChart.destroy();
    dashboardBookingChart = null;
  }

  const ctx = canvas.getContext('2d');

  dashboardBookingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'Confirmed',
          data: data.confirmed,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7,
        },
        {
          label: 'Pending',
          data: data.pending,
          backgroundColor: '#f59e0b',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7,
        },
        {
          label: 'Cancelled',
          data: data.cancelled,
          backgroundColor: '#ef4444',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#64748b',
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, family: "'Inter', sans-serif", weight: '600' },
          bodyFont: { size: 12, family: "'Inter', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#94a3b8',
          },
          border: { display: false },
          stacked: true,
        },
        y: {
          grid: { color: '#f1f5f9', drawBorder: false },
          ticks: {
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#94a3b8',
            maxTicksLimit: 5,
          },
          border: { display: false },
          stacked: true,
          beginAtZero: true,
        },
      },
    },
  });
}


/* ================================================================
   FILTER MODAL
   ================================================================ */
function initFilterModal() {
  const filterBtn = document.getElementById('btn-filter-date');
  const modal = document.getElementById('filter-modal');
  const closeBtn = document.getElementById('filter-modal-close');
  const cancelBtn = document.getElementById('filter-modal-cancel');
  const applyBtn = document.getElementById('filter-modal-apply');

  if (!filterBtn || !modal) return;

  const openModal = () => modal.classList.add('active');
  const closeModal = () => modal.classList.remove('active');

  filterBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  applyBtn?.addEventListener('click', () => {
    closeModal();
    showToast('Filters applied successfully');
  });
}


/* ================================================================
   EXPORT BUTTONS — Real CSV downloads via fetch + Blob
   ================================================================ */
function initExportButtons() {
  // Dashboard export button
  const dashboardExportBtn = document.getElementById('btn-export-report');
  if (dashboardExportBtn) {
    dashboardExportBtn.addEventListener('click', () => {
      downloadCSV('/api/admin/export/dashboard-csv', 'wanderly-dashboard');
    });
  }

  // Analytics page export button
  const analyticsExportBtn = document.getElementById('btn-export-analytics');
  if (analyticsExportBtn) {
    analyticsExportBtn.addEventListener('click', () => {
      downloadCSV('/api/admin/export/analytics-csv', 'wanderly-analytics');
    });
  }
}

/**
 * Generic CSV download handler.
 * Fetches the CSV endpoint, creates a Blob, and triggers a browser download.
 *
 * @param {string} url      — API endpoint that returns text/csv
 * @param {string} basename — Filename base (date will be appended)
 */
async function downloadCSV(url, basename) {
  try {
    showToast('Generating report…');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const csvText = await response.text();
    const blob    = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);

    // Create a temporary <a> element to trigger the download
    const link = document.createElement('a');
    link.href     = blobUrl;
    link.download = `${basename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl);

    showToast('Report exported successfully!');
  } catch (err) {
    console.error('CSV export error:', err);
    showToast('Failed to export report. Check the console.', 'error');
  }
}


/* ================================================================
   NEW BOOKING MODAL
   ================================================================ */
function initNewBookingModal() {
  const openBtn   = document.getElementById('btn-quick-booking');
  const modal     = document.getElementById('new-booking-modal');
  const closeBtn  = document.getElementById('new-booking-modal-close');
  const cancelBtn = document.getElementById('new-booking-modal-cancel');
  const form      = document.getElementById('new-booking-form');

  if (!openBtn || !modal) return;

  const openModal  = () => {
    modal.classList.add('active');
    loadPropertyOptions();
    setDefaultDates();
  };
  const closeModal = () => {
    modal.classList.remove('active');
    form?.reset();
  };

  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Handle form submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleNewBookingSubmit(closeModal);
  });
}

/**
 * Fetches properties from the API and populates the property <select>.
 */
async function loadPropertyOptions() {
  const select = document.getElementById('nb-property');
  if (!select) return;

  // Only load once (check if options beyond the placeholder exist)
  if (select.options.length > 1) return;

  try {
    const res = await fetch('/api/properties');
    if (!res.ok) throw new Error('Failed to load properties');
    const json = await res.json();
    
    console.log('Fetched Properties:', json.data);

    if (json.success && json.data) {
      json.data.forEach(prop => {
        const opt   = document.createElement('option');
        opt.value   = prop.PropertyID;
        opt.textContent = `${prop.Name} — ${prop.City}, ${prop.Country}`;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('loadPropertyOptions error:', err);
  }
}

/**
 * Sets default check-in (tomorrow) and check-out (day after tomorrow) dates.
 */
function setDefaultDates() {
  const checkinEl  = document.getElementById('nb-checkin');
  const checkoutEl = document.getElementById('nb-checkout');
  if (!checkinEl || !checkoutEl) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  checkinEl.value  = tomorrow.toISOString().slice(0, 10);
  checkoutEl.value = dayAfter.toISOString().slice(0, 10);
  checkinEl.min    = tomorrow.toISOString().slice(0, 10);
}

/**
 * Handles the New Booking form submission.
 * Sends data to the backend and refreshes the dashboard.
 */
async function handleNewBookingSubmit(closeModalFn) {
  const propertyId = document.getElementById('nb-property')?.value;
  const guestEmail = document.getElementById('nb-guest-email')?.value;
  const checkin    = document.getElementById('nb-checkin')?.value;
  const checkout   = document.getElementById('nb-checkout')?.value;
  const guests     = document.getElementById('nb-guests')?.value;
  const status     = document.getElementById('nb-status')?.value;

  // Client-side validation
  if (!propertyId || !guestEmail || !checkin || !checkout) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (new Date(checkout) <= new Date(checkin)) {
    showToast('Check-out date must be after check-in date.', 'error');
    return;
  }

  try {
    const submitBtn = document.getElementById('new-booking-submit');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating…';
    }

    const res = await fetch('/api/admin/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: Number(propertyId),
        guestEmail,
        checkInDate:  checkin,
        checkOutDate: checkout,
        guestCount:   Number(guests) || 1,
        status:       status || 'Pending',
      }),
    });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
        Create Booking`;
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Server returned ${res.status}`);
    }

    const json = await res.json();
    if (json.success) {
      showToast('Booking created successfully!');
      closeModalFn();
      // Refresh dashboard data
      loadAdminDashboard();
    } else {
      showToast(json.message || 'Failed to create booking.', 'error');
    }
  } catch (err) {
    console.error('handleNewBookingSubmit error:', err);
    showToast(err.message || 'Failed to create booking.', 'error');
  }
}


/* ================================================================
   TOAST NOTIFICATION
   ================================================================ */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.admin-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${type === 'success' ? '<path d="M16 5l-9 9-4-4"/>' : '<circle cx="10" cy="10" r="8"/><path d="M10 6v4M10 14h.01"/>'}
    </svg>
    <span>${message}</span>
  `;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    background: type === 'success' ? '#0f172a' : '#ef4444',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    zIndex: '9999',
    animation: 'fadeInUp 0.3s ease forwards',
  });

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


/* ================================================================
   MOBILE MENU TOGGLE
   ================================================================ */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-mobile-overlay');

  if (!toggleBtn || !sidebar) return;

  const closeMobile = () => {
    sidebar.classList.remove('mobile-open');
    overlay?.classList.remove('active');
  };

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    overlay?.classList.toggle('active');
  });

  overlay?.addEventListener('click', closeMobile);
}

/* ================================================================
   TOPBAR ACTIONS (THEME, FULLSCREEN, NOTIFICATIONS)
   ================================================================ */
function initTopbarActions() {
  // --- 1. Theme Switcher Logic ---
  const themes = ['default', 'neon', 'rgb'];
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  
  // Load saved theme
  let currentTheme = localStorage.getItem('admin_theme') || 'default';
  if (!themes.includes(currentTheme)) currentTheme = 'default';
  document.documentElement.setAttribute('data-theme', currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      let currentIndex = themes.indexOf(currentTheme);
      let nextIndex = (currentIndex + 1) % themes.length;
      currentTheme = themes[nextIndex];
      
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('admin_theme', currentTheme);
    });
  }

  // --- 2. Fullscreen Logic ---
  const fullscreenBtn = document.getElementById('btn-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
        // Swap icon to compress
        fullscreenBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 01-2 2H3m14 0h-3a2 2 0 01-2-2V3m0 14v-3a2 2 0 012-2h3M3 12h3a2 2 0 012 2v3"/></svg>`;
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
        // Restore expand icon
        fullscreenBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V4a1 1 0 011-1h3M13 3h3a1 1 0 011 1v3M17 13v3a1 1 0 01-1 1h-3M7 17H4a1 1 0 01-1-1v-3"/></svg>`;
      }
    });
  }

  // --- 3. Notification Shortcut ---
  const navNotificationsBtn = document.getElementById('btn-navbar-notifications');
  if (navNotificationsBtn) {
    navNotificationsBtn.addEventListener('click', () => {
      showPage('notifications-section');
      
      const notifSection = document.getElementById('notifications-section');
      if (notifSection && !notifSection.dataset.loaded) {
        notifSection.dataset.loaded = 'true';
      }
      loadNotifications();
      
      // Update sidebar active state to match
      document.querySelectorAll('.sidebar-item').forEach(link => link.classList.remove('active'));
      const notifLink = document.getElementById('nav-notifications');
      if (notifLink) notifLink.parentElement.classList.add('active'); // nav-notifications is an <a>, parent is <li> with .sidebar-item
    });
  }
}


/* ================================================================
   ANALYTICS PAGE — fetch all 4 endpoints, render charts & table
   ================================================================ */

// Palette for the doughnut chart
const LOCATION_COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f43f5e',
];

/**
 * Fetches analytics data from the unified /api/admin/analytics endpoint.
 * Feeds the data into Chart.js instances and populates the DOM.
 */
async function loadAdminAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics');
    if (!res.ok) {
      throw new Error(`Analytics API returned ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Failed to load analytics data.');
    }

    const data = json.data;

    // Update KPI Cards
    const kpiRevEl = document.getElementById('analytics-annual-revenue');
    if (kpiRevEl) kpiRevEl.textContent = '$' + formatNumber(data.annualRevenue || 0, 0);

    const kpiDestEl = document.getElementById('analytics-top-destination');
    if (kpiDestEl) kpiDestEl.textContent = data.topDestination || '—';

    const kpiAvgEl = document.getElementById('analytics-avg-rating');
    if (kpiAvgEl) kpiAvgEl.textContent = data.reviews?.avgRating > 0 ? data.reviews.avgRating.toFixed(1) : 'N/A';

    const kpiReviewsEl = document.getElementById('analytics-total-reviews');
    if (kpiReviewsEl) kpiReviewsEl.textContent = (data.reviews?.totalReviews || 0).toLocaleString();

    // Update charts and tables
    renderAnalyticsRevenueChart(data.monthlyRevenue, new Date().getFullYear());
    renderTopPropertiesTable(data.topProperties);

    // Mock Location and Satisfaction (since data structure might differ or require new endpoints later)
    // If you add them to getAnalyticsData later, call them here.
    
  } catch (err) {
    console.error('loadAdminAnalytics error:', err);
    showToast('Failed to load analytics data. See console for details.', 'error');
  }
}


/* ── Analytics Revenue Line Chart ──────────────────────────────── */
let monthlyRevenueChartInstance = null;

function renderAnalyticsRevenueChart(monthlyRevenue, year) {
  const canvas = document.getElementById('revenueTrendChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destroy previous instance
  if (window.revenueChartInstance) {
    window.revenueChartInstance.destroy();
  }

  // Update subtitle with the year
  const subtitle = document.getElementById('analytics-revenue-subtitle');
  if (subtitle) subtitle.textContent = `Successful payments — ${year}`;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.18)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  window.revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [{
        label: `Revenue ${year}`,
        data: monthlyRevenue,
        borderColor: '#4f46e5',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#4f46e5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, family: "'Inter', sans-serif", weight: '600' },
          bodyFont:  { size: 12, family: "'Inter', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `  Revenue: $${ctx.parsed.y.toLocaleString('en-US')}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#94a3b8' },
          border: { display: false },
        },
        y: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#94a3b8',
            callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
            maxTicksLimit: 6,
          },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}


/* ── Location Doughnut Chart ───────────────────────────────────── */
let destinationPopularityChartInstance = null;

function renderLocationChart(data) {
  const canvas = document.getElementById('destinationPopularityChart');
  if (!canvas || typeof Chart === 'undefined' || !data.length) return;

  // Destroy previous instance
  if (destinationPopularityChartInstance) {
    destinationPopularityChartInstance.destroy();
  }

  // Populate "Top City" KPI
  const topCityEl = document.getElementById('top-destination-val');
  if (topCityEl && data[0]) topCityEl.textContent = data[0].city;

  const labels   = data.map(d => `${d.city}, ${d.country}`);
  const values   = data.map(d => d.completedBookings);
  const colors   = data.map((_, i) => LOCATION_COLORS[i % LOCATION_COLORS.length]);

  destinationPopularityChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11, family: "'Inter', sans-serif" },
            color: '#64748b',
            padding: 14,
            boxWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 12, family: "'Inter', sans-serif", weight: '600' },
          bodyFont:  { size: 12, family: "'Inter', sans-serif" },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => `  ${ctx.label}: ${ctx.parsed} bookings`,
          },
        },
      },
    },
  });
}


/* ── Top Properties Table ──────────────────────────────────────── */
function renderTopPropertiesTable(data) {
  const tbody = document.getElementById('analytics-properties-list');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:2rem;">No property data found.</td></tr>`;
    return;
  }

  const maxRevenue = Math.max(...data.map(d => Number(d.totalRevenue) || 0), 1);
  const totalRevenue = data.reduce((sum, d) => sum + (Number(d.totalRevenue) || 0), 0);
  const rankClasses  = ['gold', 'silver', 'bronze', '', ''];

  tbody.innerHTML = data.map((prop, idx) => {
    const rawRevenue = prop.totalRevenue || prop.revenue || prop.TOTAL_REVENUE || 0;
    const rawBookings = prop.totalBookings || prop.bookings || prop.bookingCount || 0;
    const city = prop.city || prop.location || '—';
    const country = prop.country || '—';

    const pct    = totalRevenue > 0 ? ((rawRevenue / totalRevenue) * 100).toFixed(1) : 0;
    const barPct = ((rawRevenue / maxRevenue) * 100).toFixed(1);
    const rank   = rankClasses[idx] || '';

    return `
      <tr>
        <td><span class="rank-badge ${rank}">${idx + 1}</span></td>
        <td><strong>${prop.propertyName || '—'}</strong></td>
        <td style="color:var(--admin-text-secondary);font-size:13px;">${city}, ${country}</td>
        <td style="font-weight:600;">${Number(rawBookings).toLocaleString()}</td>
        <td class="cell-amount">$${formatNumber(rawRevenue, 0)}</td>
        <td>
          <div class="revenue-share-bar">
            <div class="revenue-share-track">
              <div class="revenue-share-fill" style="width:${barPct}%"></div>
            </div>
            <span class="revenue-share-pct">${pct}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');
}


/* ── Satisfaction / Rating Distribution ────────────────────────── */
/* eslint-disable no-unused-vars -- called from initSidebarNavigation */
function renderSatisfaction(data) {
  // KPI cards
  const avgEl         = document.getElementById('avg-rating-val');
  const reviewsEl     = document.getElementById('total-reviews-val');
  const scoreValueEl  = document.getElementById('analytics-score-value');

  if (avgEl)        avgEl.textContent        = data.averageRating > 0 ? data.averageRating.toFixed(1) : 'N/A';
  if (reviewsEl)    reviewsEl.textContent    = data.totalReviews.toLocaleString();
  if (scoreValueEl) scoreValueEl.textContent = data.averageRating > 0 ? data.averageRating.toFixed(1) : '—';

  // Rating distribution bars
  const barsEl = document.getElementById('analytics-rating-bars');
  if (!barsEl) return;

  const buckets = [
    { label: '1 – 2',  key: '1-2',  colorClass: 'low'  },
    { label: '3 – 4',  key: '3-4',  colorClass: 'mid'  },
    { label: '5 – 6',  key: '5-6',  colorClass: 'good' },
    { label: '7 – 8',  key: '7-8',  colorClass: 'high' },
    { label: '9 – 10', key: '9-10', colorClass: 'high' },
  ];

  const dist     = data.distribution;
  const maxCount = Math.max(...Object.values(dist), 1);

  barsEl.innerHTML = buckets.map(b => {
    const count  = dist[b.key] || 0;
    const widPct = ((count / maxCount) * 100).toFixed(1);
    return `
      <div class="rating-bar-row">
        <span class="rating-bar-label">${b.label}</span>
        <div class="rating-bar-track">
          <div class="rating-bar-fill ${b.colorClass}" style="width:${widPct}%"></div>
        </div>
        <span class="rating-bar-count">${count} review${count !== 1 ? 's' : ''}</span>
      </div>`;
  }).join('');
}


/* ================================================================
   HOTELS MANAGEMENT — Full CRUD Module
   ================================================================
   Handles: listing, search, filter, create, edit, delete.
   Uses the slide-out panel for create/edit and a modal for delete.
   All API calls use async/await with loading states.
   ================================================================ */

/** Debounce timer for search input */
let hotelsSearchTimer = null;

/** Currently selected hotel ID for delete */
let pendingDeleteHotelId = null;


/**
 * One-time initialization of Hotels page event listeners.
 * Called lazily when the Hotels nav item is first clicked.
 */
function initHotelsPage() {
  // "Add New Hotel" buttons
  document.getElementById('btn-add-hotel')?.addEventListener('click', () => openHotelSlideout('create'));
  document.getElementById('btn-add-hotel-empty')?.addEventListener('click', () => openHotelSlideout('create'));

  // Search with debounce
  document.getElementById('hotels-search-input')?.addEventListener('input', () => {
    clearTimeout(hotelsSearchTimer);
    hotelsSearchTimer = setTimeout(loadHotels, 300);
  });

  // Status filter
  document.getElementById('hotels-status-filter')?.addEventListener('change', loadHotels);

  // Slide-out panel controls
  document.getElementById('hotel-slideout-close')?.addEventListener('click', closeHotelSlideout);
  document.getElementById('hotel-form-cancel')?.addEventListener('click', closeHotelSlideout);
  document.getElementById('hotel-slideout-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'hotel-slideout-overlay') closeHotelSlideout();
  });

  // Form submission
  document.getElementById('hotel-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleHotelFormSubmit();
  });

  // Status toggle label update
  document.getElementById('hotel-status-checkbox')?.addEventListener('change', (e) => {
    const label = document.getElementById('hotel-status-label');
    if (label) label.textContent = e.target.checked ? 'Active' : 'Inactive';
  });

  // Image upload zone
  initImageUploadZone();

  // Delete modal controls
  document.getElementById('delete-hotel-cancel')?.addEventListener('click', closeDeleteModal);
  document.getElementById('delete-hotel-confirm')?.addEventListener('click', handleDeleteHotel);
  document.getElementById('delete-hotel-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'delete-hotel-modal') closeDeleteModal();
  });

  // Load dropdown data for the form
  loadFormDropdowns();
}


/**
 * Fetches hotels from the API with current search/filter values
 * and renders them into the table.
 */
async function loadHotels() {
  const searchInput  = document.getElementById('hotels-search-input');
  const statusFilter = document.getElementById('hotels-status-filter');
  const tbody        = document.getElementById('hotels-table-body');
  const tablePanel   = document.getElementById('hotels-table-panel');
  const emptyState   = document.getElementById('hotels-empty-state');

  // Build query string
  const params = new URLSearchParams();
  const search = searchInput?.value?.trim();
  const status = statusFilter?.value;
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  // Show loading skeleton
  if (tbody) {
    tbody.innerHTML = Array.from({ length: 4 }, () => `
      <tr>
        <td><div class="skeleton" style="width:44px;height:44px;border-radius:8px;"></div></td>
        <td><div class="skeleton" style="width:70%;height:14px;"></div></td>
        <td><div class="skeleton" style="width:60%;height:14px;"></div></td>
        <td><div class="skeleton" style="width:50%;height:14px;"></div></td>
        <td><div class="skeleton" style="width:40%;height:14px;"></div></td>
        <td><div class="skeleton" style="width:30%;height:14px;"></div></td>
        <td><div class="skeleton" style="width:60px;height:24px;border-radius:20px;"></div></td>
        <td><div class="skeleton" style="width:70px;height:14px;"></div></td>
      </tr>
    `).join('');
  }

  try {
    const res = await fetch(`/api/hotels?${params.toString()}`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const json = await res.json();

    if (!json.success) {
      throw new Error(json.message || 'Failed to load hotels.');
    }

    const hotels = json.data || [];

    // Toggle table vs empty state
    if (hotels.length === 0) {
      if (tablePanel) tablePanel.style.display = 'none';
      if (emptyState) emptyState.style.display = '';
    } else {
      if (tablePanel) tablePanel.style.display = '';
      if (emptyState) emptyState.style.display = 'none';
      renderHotelsTable(hotels);
    }

    // Update the sidebar badge count
    const badge = document.querySelector('#nav-hotels .sidebar-item-badge');
    if (badge) badge.textContent = json.count || hotels.length;

  } catch (err) {
    console.error('loadHotels error:', err);
    showToast('Failed to load hotels. Is the server running?', 'error');
    if (tbody) tbody.innerHTML = `
      <tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem;">Failed to load hotels.</td></tr>
    `;
  }
}


/**
 * Renders hotel rows into the table body.
 * @param {Array} hotels
 */
function renderHotelsTable(hotels) {
  const tbody = document.getElementById('hotels-table-body');
  if (!tbody) return;

  const placeholderSvg = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="16" height="14" rx="2"/><circle cx="7" cy="8" r="2"/><path d="M18 13l-4-4-6 6"/></svg>`;

  tbody.innerHTML = hotels.map(h => {
    const imgHtml = h.imageUrl
      ? `<div class="hotel-thumb"><img src="${h.imageUrl}" alt="${h.name}" loading="lazy"></div>`
      : `<div class="hotel-thumb"><div class="hotel-thumb-placeholder">${placeholderSvg}</div></div>`;

    const location = [h.city, h.country].filter(Boolean).join(', ') || '—';
    const price    = h.basePrice != null ? `$${parseFloat(h.basePrice).toFixed(2)}` : '—';
    const rating   = parseFloat(h.rating) || 0;

    const ratingHtml = rating > 0
      ? `<div class="hotel-rating"><svg viewBox="0 0 16 16"><polygon points="8,1 10,6 15.5,6.5 11.5,10 12.5,15.5 8,13 3.5,15.5 4.5,10 0.5,6.5 6,6"/></svg>${rating.toFixed(1)}</div>`
      : `<span style="color:var(--admin-text-muted);font-size:12px;">N/A</span>`;

    const statusBadge = h.status === 'active'
      ? `<span class="badge badge-success"><span class="badge-dot"></span> Active</span>`
      : `<span class="badge badge-neutral"><span class="badge-dot"></span> Inactive</span>`;

    return `
      <tr>
        <td>${imgHtml}</td>
        <td><strong>${h.name}</strong></td>
        <td style="color:var(--admin-text-secondary);font-size:13px;">${location}</td>
        <td style="font-size:13px;">${h.typeName || '—'}</td>
        <td class="cell-amount">${price}</td>
        <td>${ratingHtml}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon btn-icon-edit" data-tooltip="Edit" onclick="openHotelSlideout('edit', ${h.id})" aria-label="Edit ${h.name}">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"/></svg>
            </button>
            <button class="btn-icon btn-icon-delete" data-tooltip="Delete" onclick="confirmDeleteHotel(${h.id}, '${h.name.replace(/'/g, "\\'")}')"
              aria-label="Delete ${h.name}">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M13 4v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}


/* ── Slide-out Panel (Create / Edit) ────────────────────────────── */

/**
 * Opens the hotel slide-out panel in 'create' or 'edit' mode.
 * @param {'create'|'edit'} mode
 * @param {number} [hotelId]
 */
async function openHotelSlideout(mode, hotelId) {
  const overlay   = document.getElementById('hotel-slideout-overlay');
  const title     = document.getElementById('hotel-slideout-title');
  const formIdEl  = document.getElementById('hotel-form-id');
  const submitText = document.getElementById('hotel-form-submit-text');
  const form      = document.getElementById('hotel-form');

  // Reset form
  form?.reset();
  resetImagePreview();
  if (formIdEl) formIdEl.value = '';

  // Set status toggle default
  const statusCheckbox = document.getElementById('hotel-status-checkbox');
  const statusLabel    = document.getElementById('hotel-status-label');
  if (statusCheckbox) statusCheckbox.checked = true;
  if (statusLabel) statusLabel.textContent = 'Active';

  if (mode === 'create') {
    if (title) title.textContent = 'Add New Hotel';
    if (submitText) submitText.textContent = 'Save Hotel';
    await renderAmenitySelector('hotel-amenities-container', 'hotel');
  } else if (mode === 'edit' && hotelId) {
    if (title) title.textContent = 'Edit Hotel';
    if (submitText) submitText.textContent = 'Update Hotel';
    if (formIdEl) formIdEl.value = hotelId;

    // Fetch hotel data and populate form
    try {
      const res = await fetch(`/api/hotels/${hotelId}`);
      if (!res.ok) throw new Error('Failed to fetch hotel details.');
      const json = await res.json();
      if (json.success && json.data) {
        populateHotelForm(json.data);
      }
      await renderAmenitySelector('hotel-amenities-container', 'hotel', hotelId);
    } catch (err) {
      console.error('openHotelSlideout fetch error:', err);
      showToast('Failed to load hotel data.', 'error');
    }
  }

  overlay?.classList.add('active');
}

/**
 * Closes the hotel slide-out panel.
 */
function closeHotelSlideout() {
  const overlay = document.getElementById('hotel-slideout-overlay');
  overlay?.classList.remove('active');
}

/**
 * Populates the hotel form fields with existing data for editing.
 * @param {Object} hotel
 */
function populateHotelForm(hotel) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };

  setVal('hotel-name', hotel.name);
  setVal('hotel-address', hotel.address);
  setVal('hotel-description', hotel.description);
  setVal('hotel-price', hotel.basePrice);
  setVal('hotel-location', hotel.locationId);
  setVal('hotel-type', hotel.typeId);

  // Status toggle
  const statusCheckbox = document.getElementById('hotel-status-checkbox');
  const statusLabel    = document.getElementById('hotel-status-label');
  if (statusCheckbox) statusCheckbox.checked = (hotel.status === 'active');
  if (statusLabel) statusLabel.textContent = hotel.status === 'active' ? 'Active' : 'Inactive';

  // Show existing primary image if available
  const primaryImg = hotel.images?.find(img => img.IsPrimary) || hotel.images?.[0];
  if (primaryImg) {
    const previewEl = document.getElementById('hotel-image-preview');
    const previewImg = document.getElementById('hotel-image-preview-img');
    const placeholder = document.getElementById('hotel-image-placeholder');
    if (previewEl && previewImg && placeholder) {
      previewImg.src = primaryImg.ImageURL;
      previewEl.style.display = '';
      placeholder.style.display = 'none';
    }
  }
}


/**
 * Handles the hotel form submission (create or update).
 * Sends multipart/form-data to support image upload.
 */
async function handleHotelFormSubmit() {
  const formIdEl  = document.getElementById('hotel-form-id');
  const hotelId   = formIdEl?.value;
  const isEdit    = !!hotelId;

  // Gather form values
  const name        = document.getElementById('hotel-name')?.value?.trim();
  const address     = document.getElementById('hotel-address')?.value?.trim();
  const description = document.getElementById('hotel-description')?.value?.trim();
  const basePrice   = document.getElementById('hotel-price')?.value;
  const locationId  = document.getElementById('hotel-location')?.value;
  const typeId      = document.getElementById('hotel-type')?.value;
  const statusCb    = document.getElementById('hotel-status-checkbox');
  const status      = statusCb?.checked ? 'active' : 'inactive';
  const imageInput  = document.getElementById('hotel-image-input');

  // Client-side validation
  if (!name)       { showToast('Hotel name is required.', 'error'); return; }
  if (!address)    { showToast('Address is required.', 'error'); return; }
  if (!basePrice || parseFloat(basePrice) < 0) { showToast('Base price must be a valid number ≥ 0.', 'error'); return; }
  if (!locationId) { showToast('Please select a location.', 'error'); return; }
  if (!typeId)     { showToast('Please select a property type.', 'error'); return; }

  // Build FormData for multipart upload
  const formData = new FormData();
  formData.append('name', name);
  formData.append('address', address);
  formData.append('description', description || '');
  formData.append('basePrice', basePrice);
  formData.append('locationId', locationId);
  formData.append('typeId', typeId);
  formData.append('status', status);

  // Attach image file if selected
  if (imageInput?.files?.[0]) {
    formData.append('image', imageInput.files[0]);
  }

  // Show loading state
  const submitBtn  = document.getElementById('hotel-form-submit');
  const submitText = document.getElementById('hotel-form-submit-text');
  const originalText = submitText?.textContent;
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.innerHTML = '<span class="spinner-inline"></span> Saving…';

  try {
    const url    = isEdit ? `/api/hotels/${hotelId}` : '/api/hotels';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: formData });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to save hotel.');
    }

    const savedHotelId = isEdit ? hotelId : json.data.id;
    await syncSelectedAmenities('hotel-amenities-container', savedHotelId, 'hotel');

    showToast(json.message || (isEdit ? 'Hotel updated successfully!' : 'Hotel created successfully!'));
    closeHotelSlideout();
    loadHotels();

  } catch (err) {
    console.error('handleHotelFormSubmit error:', err);
    showToast(err.message || 'Failed to save hotel.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = originalText;
  }
}


/* ── Image Upload Zone — Drag & Drop + Click ───────────────────── */

function initImageUploadZone() {
  const zone        = document.getElementById('hotel-image-zone');
  const input       = document.getElementById('hotel-image-input');
  const placeholder = document.getElementById('hotel-image-placeholder');
  const previewEl   = document.getElementById('hotel-image-preview');
  const previewImg  = document.getElementById('hotel-image-preview-img');
  const removeBtn   = document.getElementById('hotel-image-remove');

  if (!zone || !input) return;

  // Click to open file dialog
  zone.addEventListener('click', (e) => {
    // Don't trigger if clicking the remove button
    if (e.target.closest('.image-upload-remove')) return;
    input.click();
  });

  // File selected via dialog
  input.addEventListener('change', () => {
    if (input.files?.[0]) {
      showImagePreview(input.files[0]);
    }
  });

  // Drag & drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file && /\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      // Transfer the dropped file to the hidden input
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      showImagePreview(file);
    } else {
      showToast('Only JPG, PNG, or WebP images are allowed.', 'error');
    }
  });

  // Remove image button
  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImagePreview();
  });

  function showImagePreview(file) {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size must be under 5 MB.', 'error');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (previewImg) previewImg.src = ev.target.result;
      if (previewEl) previewEl.style.display = '';
      if (placeholder) placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }
}

function resetImagePreview() {
  const input       = document.getElementById('hotel-image-input');
  const placeholder = document.getElementById('hotel-image-placeholder');
  const previewEl   = document.getElementById('hotel-image-preview');
  const previewImg  = document.getElementById('hotel-image-preview-img');

  if (input) input.value = '';
  if (previewEl) previewEl.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (placeholder) placeholder.style.display = '';
}


/* ── Delete Hotel ──────────────────────────────────────────────── */

/**
 * Shows the delete confirmation modal.
 * Called from table row action buttons.
 * @param {number} id
 * @param {string} name
 */
function confirmDeleteHotel(id, name) {
  pendingDeleteHotelId = id;
  const nameEl = document.getElementById('delete-hotel-name');
  if (nameEl) nameEl.textContent = name;
  document.getElementById('delete-hotel-modal')?.classList.add('active');
}

function closeDeleteModal() {
  pendingDeleteHotelId = null;
  document.getElementById('delete-hotel-modal')?.classList.remove('active');
}

/**
 * Sends the DELETE request for the pending hotel.
 */
async function handleDeleteHotel() {
  if (!pendingDeleteHotelId) return;

  const confirmBtn = document.getElementById('delete-hotel-confirm');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="spinner-inline"></span> Deleting…';
  }

  try {
    const res = await fetch(`/api/hotels/${pendingDeleteHotelId}`, { method: 'DELETE' });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to delete hotel.');
    }

    showToast(json.message || 'Hotel deleted successfully!');
    closeDeleteModal();
    loadHotels();

  } catch (err) {
    console.error('handleDeleteHotel error:', err);
    showToast(err.message || 'Failed to delete hotel.', 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 4h12M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M13 4v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4"/></svg>
        Delete Hotel`;
    }
  }
}


/* ── Form Dropdown Data ────────────────────────────────────────── */

/**
 * Fetches Locations and PropertyTypes from the API
 * and populates the select dropdowns in the hotel form.
 */
async function loadFormDropdowns() {
  try {
    const res = await fetch('/api/hotels/meta/dropdowns');
    if (!res.ok) throw new Error('Failed to load dropdown data.');
    const json = await res.json();

    if (!json.success) return;

    // Populate Locations select
    const locationSelect = document.getElementById('hotel-location');
    if (locationSelect && json.data.locations) {
      // Keep the first placeholder option
      json.data.locations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.id;
        opt.textContent = `${loc.city}, ${loc.country}`;
        locationSelect.appendChild(opt);
      });
    }

    // Populate PropertyTypes select
    const typeSelect = document.getElementById('hotel-type');
    if (typeSelect && json.data.types) {
      json.data.types.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type.id;
        opt.textContent = type.name;
        typeSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('loadFormDropdowns error:', err);
  }
}

/* ================================================================
   ROOM TYPES & ROOMS LOGIC
   ================================================================ */

function initRoomsPage() {
  loadRoomsHotelDropdown();
  
  const hotelSelect = document.getElementById('rooms-hotel-select');
  hotelSelect.addEventListener('change', () => {
    const hotelId = hotelSelect.value;
    const contentArea = document.getElementById('rooms-content-area');
    const btnAddPhysical = document.getElementById('btn-add-physical-rooms');
    
    if (hotelId) {
      contentArea.style.display = 'block';
      btnAddPhysical.style.display = 'inline-flex';
      loadRoomTypes(hotelId);
    } else {
      contentArea.style.display = 'none';
      btnAddPhysical.style.display = 'none';
    }
  });

  // Tab switching
  document.getElementById('tab-room-types').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tab-physical-rooms').classList.remove('active');
    document.getElementById('panel-room-types').style.display = 'block';
    document.getElementById('panel-physical-rooms').style.display = 'none';
    document.getElementById('btn-add-room-type').style.display = 'inline-flex';
    document.getElementById('btn-add-physical-rooms').style.display = 'none';
  });

  document.getElementById('tab-physical-rooms').addEventListener('click', (e) => {
    e.target.classList.add('active');
    document.getElementById('tab-room-types').classList.remove('active');
    document.getElementById('panel-room-types').style.display = 'none';
    document.getElementById('panel-physical-rooms').style.display = 'block';
    document.getElementById('btn-add-room-type').style.display = 'none';
    document.getElementById('btn-add-physical-rooms').style.display = 'inline-flex';
    
    const hotelId = document.getElementById('rooms-hotel-select').value;
    if(hotelId) {
      // populate room type filter
      populateRoomTypeFilter(hotelId);
      loadPhysicalRooms(document.getElementById('rooms-type-select').value, hotelId);
    }
  });

  document.getElementById('rooms-type-select').addEventListener('change', (e) => {
    const hotelId = document.getElementById('rooms-hotel-select').value;
    loadPhysicalRooms(e.target.value, hotelId);
  });

  initRoomTypeModal();
  initBulkRoomsModal();
}

async function loadRoomsHotelDropdown() {
  const select = document.getElementById('rooms-hotel-select');
  try {
    const res = await fetch('/api/properties');
    const json = await res.json();
    if (json.success && json.data) {
      json.data.forEach(prop => {
        const opt = document.createElement('option');
        opt.value = prop.PropertyID;
        opt.textContent = `${prop.Name}`;
        select.appendChild(opt);
      });
      // Auto-select first hotel and trigger fetch if no hotel currently selected
      if (json.data.length > 0 && !select.value) {
        select.value = json.data[0].PropertyID;
        select.dispatchEvent(new Event('change'));
      }
    }
  } catch (err) {
    console.error('loadRoomsHotelDropdown error', err);
  }
}

async function loadRoomTypes(hotelId) {
  try {
    const res = await fetch(`/api/room-types?hotel_id=${hotelId}`);
    const json = await res.json();
    const tbody = document.getElementById('room-types-tbody');
    
    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#94a3b8;">No room types found.</td></tr>`;
      return;
    }

    tbody.innerHTML = json.data.map(rt => `
      <tr>
        <td><strong>${rt.name}</strong></td>
        <td>${rt.max_occupancy} Guests</td>
        <td>${rt.bed_size || '-'}</td>
        <td>$${parseFloat(rt.base_price).toFixed(2)}</td>
        <td>${rt.total_rooms}</td>
        <td><span class="badge badge-${rt.status === 'active' ? 'success' : 'secondary'}">${rt.status}</span></td>
        <td>
          <button class="btn-table-action" onclick="editRoomType(${rt.id}, '${rt.name}', ${rt.max_occupancy}, '${rt.bed_size || ''}', ${rt.base_price}, '${rt.status}', '${rt.description || ''}')">Edit</button>
          <button class="btn-table-action" style="color:var(--admin-danger);" onclick="deleteRoomType(${rt.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('loadRoomTypes error:', err);
  }
}

async function populateRoomTypeFilter(hotelId) {
  const select = document.getElementById('rooms-type-select');
  const bulkSelect = document.getElementById('bulk-room-type');
  
  select.innerHTML = '<option value="">-- All Room Types --</option>';
  bulkSelect.innerHTML = '<option value="">-- Choose a Type --</option>';
  
  try {
    const res = await fetch(`/api/room-types?hotel_id=${hotelId}`);
    const json = await res.json();
    if (json.success) {
      json.data.forEach(rt => {
        select.insertAdjacentHTML('beforeend', `<option value="${rt.id}">${rt.name}</option>`);
        bulkSelect.insertAdjacentHTML('beforeend', `<option value="${rt.id}">${rt.name}</option>`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadPhysicalRooms(roomTypeId, hotelId) {
  try {
    // If no specific room type selected, we need to fetch for all types of this hotel.
    // The API currently expects room_type_id. Let's fetch all room types and their rooms, 
    // or just iterate. For simplicity, if not selected, fetch all types.
    let typesToFetch = [];
    if (roomTypeId) {
      typesToFetch.push(roomTypeId);
    } else {
      const res = await fetch(`/api/room-types?hotel_id=${hotelId}`);
      const json = await res.json();
      if(json.success) typesToFetch = json.data.map(rt => rt.id);
    }

    const tbody = document.getElementById('physical-rooms-tbody');
    let allRooms = [];
    
    for (const tid of typesToFetch) {
      const rRes = await fetch(`/api/rooms?room_type_id=${tid}`);
      const rJson = await rRes.json();
      if (rJson.success) {
        allRooms = allRooms.concat(rJson.data);
      }
    }

    if (allRooms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No physical rooms found.</td></tr>`;
      return;
    }

    tbody.innerHTML = allRooms.map(r => `
      <tr>
        <td><strong>${r.room_number}</strong></td>
        <td>${r.room_type_name}</td>
        <td>${r.floor_number || '-'}</td>
        <td><span class="badge badge-${r.status === 'available' ? 'success' : (r.status === 'maintenance' ? 'warning' : 'danger')}">${r.status}</span></td>
        <td>
          <button class="btn-table-action" style="color:var(--admin-danger);" onclick="deletePhysicalRoom(${r.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('loadPhysicalRooms error:', err);
  }
}

function initRoomTypeModal() {
  const modal = document.getElementById('room-type-slideout-overlay');
  const btnAdd = document.getElementById('btn-add-room-type');
  const btnClose = document.getElementById('room-type-slideout-close');
  const btnCancel = document.getElementById('room-type-form-cancel');
  const form = document.getElementById('room-type-form');

  const openModal = async () => {
    const hotelId = document.getElementById('rooms-hotel-select').value;
    if (!hotelId) {
      showToast('Please select a hotel first.', 'warning');
      return;
    }
    document.getElementById('room-type-hotel-id').value = hotelId;
    modal.classList.add('active');
    await renderAmenitySelector('room-type-amenities-container', 'room_type');
  };
  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
    document.getElementById('room-type-form-id').value = '';
    document.getElementById('room-type-slideout-title').textContent = 'Add Room Type';
  };

  btnAdd.addEventListener('click', openModal);
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('room-type-form-id').value;
    const hotelId = document.getElementById('room-type-hotel-id').value;
    
    const payload = {
      hotel_id: hotelId,
      name: document.getElementById('rt-name').value,
      max_occupancy: document.getElementById('rt-occupancy').value,
      bed_size: document.getElementById('rt-bed-size').value,
      base_price: document.getElementById('rt-price').value,
      status: document.getElementById('rt-status').value,
      description: document.getElementById('rt-description').value,
    };

    try {
      const url = id ? `/api/room-types/${id}` : '/api/room-types';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        const savedId = id || json.data.id;
        await syncSelectedAmenities('room-type-amenities-container', savedId, 'room_type');

        showToast(json.message);
        closeModal();
        loadRoomTypes(hotelId);
      } else {
        showToast(json.message, 'error');
      }
    } catch (err) {
      showToast('Error saving room type', 'error');
    }
  });
}

window.editRoomType = async function(id, name, occ, bed, price, status, desc) {
  document.getElementById('room-type-form-id').value = id;
  document.getElementById('room-type-slideout-title').textContent = 'Edit Room Type';
  document.getElementById('rt-name').value = name;
  document.getElementById('rt-occupancy').value = occ;
  document.getElementById('rt-bed-size').value = bed;
  document.getElementById('rt-price').value = price;
  document.getElementById('rt-status').value = status;
  document.getElementById('rt-description').value = desc !== 'null' ? desc : '';
  
  document.getElementById('room-type-hotel-id').value = document.getElementById('rooms-hotel-select').value;
  document.getElementById('room-type-slideout-overlay').classList.add('active');
  await renderAmenitySelector('room-type-amenities-container', 'room_type', id);
};

window.deleteRoomType = async function(id) {
  if(!confirm('Are you sure you want to delete this room type? This will also delete all physical rooms associated with it.')) return;
  try {
    const res = await fetch(`/api/room-types/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Room type deleted.');
      loadRoomTypes(document.getElementById('rooms-hotel-select').value);
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
};

function initBulkRoomsModal() {
  const modal = document.getElementById('bulk-add-rooms-modal');
  const btnAdd = document.getElementById('btn-add-physical-rooms');
  const btnClose = document.getElementById('bulk-rooms-close');
  const btnCancel = document.getElementById('bulk-rooms-cancel');
  const form = document.getElementById('bulk-rooms-form');

  const openModal = () => {
    const hotelId = document.getElementById('rooms-hotel-select').value;
    if (!hotelId) {
      showToast('Please select a hotel first.', 'warning');
      return;
    }
    populateRoomTypeFilter(hotelId);
    modal.classList.add('active');
  };
  const closeModal = () => {
    modal.classList.remove('active');
    form.reset();
  };

  btnAdd.addEventListener('click', openModal);
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const typeId = document.getElementById('bulk-room-type').value;
    const numbersRaw = document.getElementById('bulk-room-numbers').value;

    // Parse logic: comma separated or range (e.g. 101-105)
    let numbersArr = [];
    const parts = numbersRaw.split(',');
    for (let p of parts) {
      p = p.trim();
      if (p.includes('-')) {
        const bounds = p.split('-');
        if (bounds.length === 2 && !isNaN(bounds[0]) && !isNaN(bounds[1])) {
          let start = parseInt(bounds[0]);
          let end = parseInt(bounds[1]);
          if (start <= end) {
            for (let i = start; i <= end; i++) {
              numbersArr.push(i.toString());
            }
          }
        } else {
          numbersArr.push(p);
        }
      } else if (p.length > 0) {
        numbersArr.push(p);
      }
    }

    if (numbersArr.length === 0) {
      showToast('No valid room numbers parsed.', 'warning');
      return;
    }

    try {
      const res = await fetch('/api/rooms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_type_id: typeId, room_numbers: numbersArr })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message);
        closeModal();
        const hotelId = document.getElementById('rooms-hotel-select').value;
        loadPhysicalRooms(document.getElementById('rooms-type-select').value, hotelId);
        // refresh room types to update count
        loadRoomTypes(hotelId);
      } else {
        showToast(json.message, 'error');
      }
    } catch (err) {
      showToast('Error adding rooms', 'error');
    }
  });
}

window.deletePhysicalRoom = async function(id) {
  if(!confirm('Are you sure you want to delete this room?')) return;
  try {
    const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Room deleted.');
      const hotelId = document.getElementById('rooms-hotel-select').value;
      loadPhysicalRooms(document.getElementById('rooms-type-select').value, hotelId);
      loadRoomTypes(hotelId);
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
};

/* ================================================================
   AMENITIES MANAGEMENT (Master Catalog) & PILL TAG SELECTOR
   ================================================================ */

function initAmenitiesPage() {
  document.getElementById('btn-add-amenity')?.addEventListener('click', () => openAmenitySlideout('create'));
  document.getElementById('amenities-search-input')?.addEventListener('input', loadAmenities);
  document.getElementById('amenities-scope-filter')?.addEventListener('change', loadAmenities);
  document.getElementById('amenity-slideout-close')?.addEventListener('click', closeAmenitySlideout);
  document.getElementById('amenity-form-cancel')?.addEventListener('click', closeAmenitySlideout);
  
  document.getElementById('amenity-icon')?.addEventListener('input', (e) => {
    const preview = document.getElementById('amenity-icon-preview');
    const val = e.target.value.trim();
    if (preview) preview.innerHTML = val ? `<i class="${val}"></i>` : `<i class="fa-solid fa-star"></i>`;
  });

  document.getElementById('amenity-form')?.addEventListener('submit', handleAmenitySubmit);
  
  loadAmenities();
}

async function loadAmenities() {
  const searchInput = document.getElementById('amenities-search-input');
  const scopeFilter = document.getElementById('amenities-scope-filter');
  
  const params = new URLSearchParams();
  if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
  if (scopeFilter && scopeFilter.value) params.append('scope', scopeFilter.value);
  
  try {
    const res = await fetch(`/api/amenities?${params.toString()}`);
    const json = await res.json();
    
    const tbody = document.getElementById('amenities-table-body');
    if (!tbody) return;

    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:2rem;">No amenities found.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = json.data.map(am => `
      <tr>
        <td><div class="icon-preview-box" style="margin:0;width:36px;height:36px;font-size:16px;color:var(--admin-primary);border-color:transparent;background:var(--admin-primary-subtle);"><i class="${am.icon_class}"></i></div></td>
        <td><strong>${am.name}</strong></td>
        <td style="color:var(--admin-text-secondary);font-size:13px;">${am.category || '—'}</td>
        <td><span class="badge badge-neutral" style="text-transform: capitalize;">${am.scope === 'both' ? 'Hotel & Room' : am.scope}</span></td>
        <td><span class="badge badge-${am.status === 'active' ? 'success' : 'secondary'}">${am.status}</span></td>
        <td>
          <button class="btn-table-action" onclick="editAmenity(${am.id}, '${am.name.replace(/'/g, "\\'")}', '${am.icon_class.replace(/'/g, "\\'")}', '${(am.category || '').replace(/'/g, "\\'")}', '${am.scope}', '${am.status}')">Edit</button>
          <button class="btn-table-action" style="color:var(--admin-danger);" onclick="deleteAmenity(${am.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

function openAmenitySlideout(mode) {
  const form = document.getElementById('amenity-form');
  const title = document.getElementById('amenity-slideout-title');
  const overlay = document.getElementById('amenity-slideout-overlay');
  
  if (mode === 'create') {
    form.reset();
    document.getElementById('amenity-form-id').value = '';
    document.getElementById('amenity-icon-preview').innerHTML = `<i class="fa-solid fa-star"></i>`;
    if(title) title.textContent = 'Add Amenity';
  }
  if(overlay) overlay.classList.add('active');
}

function closeAmenitySlideout() {
  document.getElementById('amenity-slideout-overlay')?.classList.remove('active');
}

window.editAmenity = function(id, name, icon, category, scope, status) {
  document.getElementById('amenity-form-id').value = id;
  document.getElementById('amenity-name').value = name;
  document.getElementById('amenity-icon').value = icon;
  document.getElementById('amenity-category').value = category !== 'null' ? category : '';
  document.getElementById('amenity-scope').value = scope;
  document.getElementById('amenity-status').value = status;
  
  const preview = document.getElementById('amenity-icon-preview');
  if(preview) preview.innerHTML = `<i class="${icon}"></i>`;
  const title = document.getElementById('amenity-slideout-title');
  if(title) title.textContent = 'Edit Amenity';
  
  document.getElementById('amenity-slideout-overlay')?.classList.add('active');
};

async function handleAmenitySubmit(e) {
  e.preventDefault();
  const id = document.getElementById('amenity-form-id').value;
  const payload = {
    name: document.getElementById('amenity-name').value.trim(),
    icon_class: document.getElementById('amenity-icon').value.trim(),
    category: document.getElementById('amenity-category').value.trim(),
    scope: document.getElementById('amenity-scope').value,
    status: document.getElementById('amenity-status').value
  };
  
  try {
    const url = id ? `/api/amenities/${id}` : '/api/amenities';
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      closeAmenitySlideout();
      loadAmenities();
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Failed to save amenity', 'error');
  }
}

window.deleteAmenity = async function(id) {
  if(!confirm('Delete this amenity? This removes it from all properties/rooms.')) return;
  try {
    const res = await fetch(`/api/amenities/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Amenity deleted.');
      loadAmenities();
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
};

/* ── Pill Tags Selector (Reusable) ──────────────────────────────── */
window.renderAmenitySelector = async function(containerId, targetType, targetId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '<span class="spinner-inline"></span> Loading amenities...';
  
  try {
    console.log('Fetching amenities from API...');
    
    // Map targetType to API scope and route ('room_type' -> 'room', 'room-type')
    const apiScope = targetType === 'room_type' ? 'room' : targetType;
    const apiRoute = targetType === 'room_type' ? 'room-type' : targetType;

    // Fetch all available amenities for the scope
    const resAll = await fetch(`/api/amenities?scope=${apiScope}`);
    const jsonAll = await resAll.json();
    console.log('API Response:', jsonAll);
    const allAmenities = jsonAll.success ? jsonAll.data : [];
    
    // Fetch currently assigned amenities if targetId is provided
    let assignedIds = [];
    if (targetId) {
      const resAssigned = await fetch(`/api/amenities/${apiRoute}/${targetId}`);
      if (resAssigned.ok) {
        const jsonAssigned = await resAssigned.json();
        if (jsonAssigned.success) {
          assignedIds = jsonAssigned.data.map(a => a.id);
        }
      }
    }
    
    if (allAmenities.length === 0) {
      container.innerHTML = `<div style="font-size:13px;color:var(--admin-text-muted);">No amenities available. Add them in the Amenities catalog.</div>`;
      return;
    }
    
    container.innerHTML = allAmenities.map(am => {
      const isSelected = assignedIds.includes(am.id);
      return `
        <div class="amenity-pill ${isSelected ? 'selected' : ''}" data-id="${am.id}" onclick="this.classList.toggle('selected')">
          <i class="${am.icon_class}"></i>
          ${am.name}
        </div>
      `;
    }).join('');
    
  } catch (err) {
    container.innerHTML = '<div style="color:var(--admin-danger);font-size:13px;">Error loading amenities.</div>';
    console.error('Failed to load amenities:', err);
  }
};

window.syncSelectedAmenities = async function(containerId, targetId, targetType) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const selectedPills = Array.from(container.querySelectorAll('.amenity-pill.selected'));
  const amenityIds = selectedPills.map(pill => parseInt(pill.dataset.id, 10));
  
  const apiRoute = targetType === 'room_type' ? 'room-type' : targetType;

  try {
    await fetch(`/api/amenities/${apiRoute}/${targetId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amenity_ids: amenityIds })
    });
  } catch (err) {
    console.error('Failed to sync amenities', err);
  }
};
/* ================================================================
   BOOKINGS MANAGEMENT
   ================================================================ */

function initBookingsPage() {
  document.getElementById('btn-filter-bookings')?.addEventListener('click', loadAdminBookings);
  document.getElementById('btn-clear-bookings-filter')?.addEventListener('click', () => {
    document.getElementById('filter-booking-id').value = '';
    document.getElementById('filter-customer-name').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    document.getElementById('filter-status').value = '';
    loadAdminBookings();
  });

  document.getElementById('booking-slideout-close')?.addEventListener('click', closeBookingSlideout);
  
  // Close slideout when clicking the overlay background
  document.getElementById('booking-slideout-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'booking-slideout-overlay') {
      closeBookingSlideout();
    }
  });

  // Tab switching logic for booking details
  const tabBtns = document.querySelectorAll('.booking-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.booking-tab-content').forEach(c => c.style.display = 'none');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).style.display = 'block';
    });
  });

  // Handle Property Dropdown Change in New Booking Modal
  const nbPropertySelect = document.getElementById('nb-property');
  const nbRoomSelect = document.getElementById('nb-room');
  if (nbPropertySelect && nbRoomSelect) {
    nbPropertySelect.addEventListener('change', async (e) => {
      const hotelId = e.target.value;
      // Guard clause: Ensure hotelId is a valid truthy value and not string 'undefined'
      if (!hotelId || hotelId === 'undefined' || hotelId === 'null') {
        nbRoomSelect.innerHTML = '<option value="">Select a property first...</option>';
        nbRoomSelect.disabled = true;
        return;
      }
      nbRoomSelect.innerHTML = '<option value="">Loading rooms...</option>';
      nbRoomSelect.disabled = true;
      try {
        const res = await fetch(`/api/rooms/hotel/${hotelId}`);
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          nbRoomSelect.innerHTML = '<option value="">Select a room...</option>' + 
            json.data.map(r => `<option value="${r.id}">${r.room_number} - ${r.room_type_name}</option>`).join('');
          nbRoomSelect.disabled = false;
        } else {
          nbRoomSelect.innerHTML = '<option value="">No available rooms found</option>';
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
        nbRoomSelect.innerHTML = '<option value="">Error loading rooms</option>';
      }
    });
  }

  // Handle New Booking Form Submission
  const newBookingForm = document.getElementById('new-booking-form');
  if (newBookingForm) {
    newBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        propertyId: document.getElementById('nb-property').value,
        roomId: document.getElementById('nb-room').value,
        guestEmail: document.getElementById('nb-guest-email').value,
        checkIn: document.getElementById('nb-checkin').value,
        checkOut: document.getElementById('nb-checkout').value,
        guests: document.getElementById('nb-guests').value,
        status: document.getElementById('nb-status').value,
        notes: document.getElementById('nb-notes').value
      };
      
      console.log('Payload being sent:', payload);
      
      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        console.log('API Response:', json);
        
        if (res.status === 201 || json.success) {
          showToast('Booking created successfully');
          document.getElementById('new-booking-modal').classList.remove('active');
          newBookingForm.reset();
          if (nbRoomSelect) {
            nbRoomSelect.innerHTML = '<option value="">Select a property first...</option>';
            nbRoomSelect.disabled = true;
          }
          loadAdminBookings();
        } else {
          showToast(json.message || 'Failed to create booking', 'error');
        }
      } catch (err) {
        console.error('Error submitting booking:', err);
        showToast('Server error creating booking', 'error');
      }
    });
  }
}

async function loadAdminBookings() {
  const tbody = document.getElementById('admin-bookings-list');
  if (!tbody) return;

  const bookingId = document.getElementById('filter-booking-id')?.value.trim();
  const customerName = document.getElementById('filter-customer-name')?.value.trim();
  const startDate = document.getElementById('filter-start-date')?.value;
  const endDate = document.getElementById('filter-end-date')?.value;
  const status = document.getElementById('filter-status')?.value;

  const params = new URLSearchParams();
  if (bookingId) params.append('booking_id', bookingId);
  if (customerName) params.append('customer_name', customerName);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (status) params.append('status', status);

  try {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem;">Loading bookings...</td></tr>`;
    
    const res = await fetch(`/api/bookings?${params.toString()}`);
    const json = await res.json();

    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:2rem;">No bookings found.</td></tr>`;
      return;
    }

    tbody.innerHTML = json.data.map(b => {
      const checkIn = new Date(b.check_in_date).toLocaleDateString();
      const checkOut = new Date(b.check_out_date).toLocaleDateString();
      
      const badgeClass = {
        Pending:   'badge-warning',
        Confirmed: 'badge-success',
        Cancelled: 'badge-danger',
        Completed: 'badge-info',
        pending:   'badge-warning',
        confirmed: 'badge-success',
        cancelled: 'badge-danger',
        completed: 'badge-info',
      };
      
      let bookingStatusStr = b.booking_status || 'pending';
      const isConfirmed = (bookingStatusStr.toLowerCase() === 'confirmed') || 
                          (b.payment_status && b.payment_status.toLowerCase() === 'paid');
      if (isConfirmed) {
          bookingStatusStr = 'confirmed';
      }

      const statusClass = badgeClass[bookingStatusStr.toLowerCase()] || 'badge-warning';
      const statusText = bookingStatusStr.charAt(0).toUpperCase() + bookingStatusStr.slice(1);
      
      let adminPaymentBadge = '';
      const isPaidAdmin = b.payment_status && b.payment_status.toLowerCase() === 'paid';
      if (isPaidAdmin) {
          adminPaymentBadge = `<span class="badge" style="background-color: #28a745; color: white; padding: 5px 10px; border-radius: 4px;">Paid (Bank Transfer)</span>`;
      } else {
          adminPaymentBadge = `<span class="badge" style="background-color: #ffc107; color: black; padding: 5px 10px; border-radius: 4px;">Pending</span>`;
      }
      
      return `
        <tr>
          <td><strong style="font-variant-numeric:tabular-nums;">#${b.id}</strong></td>
          <td>${b.customer_name}</td>
          <td>${b.hotel_name || '—'}</td>
          <td style="font-size:13px;color:var(--admin-text-secondary);">${checkIn} &rarr; ${checkOut}</td>
          <td class="cell-amount">$${parseInt(b.total_amount)}</td>
          <td style="text-transform:capitalize;">${adminPaymentBadge}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
          <td style="text-align:center;">
            <button class="btn-table-action" onclick="openBookingSlideout('${b.id}')">View</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--admin-danger);padding:2rem;">Failed to load bookings.</td></tr>`;
  }
}

window.openBookingSlideout = async function(id) {
  const overlay = document.getElementById('booking-slideout-overlay');
  const title = document.getElementById('booking-slideout-title');
  const summaryContent = document.getElementById('booking-summary-content');
  const roomsContent = document.getElementById('booking-rooms-content');
  const paymentsContent = document.getElementById('booking-payments-content');
  const actionButtons = document.getElementById('booking-action-buttons');
  const currentId = document.getElementById('booking-current-id');

  if (title) title.textContent = `Booking: ${id}`;
  if (currentId) currentId.value = id;

  summaryContent.innerHTML = 'Loading...';
  roomsContent.innerHTML = 'Loading...';
  paymentsContent.innerHTML = 'Loading...';
  actionButtons.innerHTML = '';

  overlay?.classList.add('active');

  try {
    const res = await fetch(`/api/bookings/${id}`);
    const json = await res.json();

    if (!json.success) {
      summaryContent.innerHTML = `<div style="color:var(--admin-danger);">${json.message}</div>`;
      return;
    }

    const b = json.data;

    // --- Render Summary ---
    const checkIn = new Date(b.check_in_date).toLocaleDateString();
    const checkOut = new Date(b.check_out_date).toLocaleDateString();
    
    summaryContent.innerHTML = `
      <div class="booking-detail-grid">
        <div class="booking-detail-item">
          <label>Customer Name</label>
          <div>${b.customer_name}</div>
        </div>
        <div class="booking-detail-item">
          <label>Email / Phone</label>
          <div>${b.customer_email}<br>${b.customer_phone || 'N/A'}</div>
        </div>
        <div class="booking-detail-item">
          <label>Hotel</label>
          <div>${b.hotel_name || 'N/A'}<br><span style="font-size:12px;font-weight:normal;">${b.hotel_address || ''}</span></div>
        </div>
        <div class="booking-detail-item">
          <label>Stay Dates</label>
          <div>${checkIn} to ${checkOut}</div>
        </div>
        <div class="booking-detail-item">
          <label>Status</label>
          <div style="text-transform:capitalize; color:var(--admin-primary);">${b.booking_status}</div>
        </div>
        <div class="booking-detail-item">
          <label>Total Amount</label>
          <div>$${parseFloat(b.total_amount).toFixed(2)}</div>
        </div>
      </div>
    `;

    // --- Render Allocated Rooms ---
    if (b.rooms && b.rooms.length > 0) {
      roomsContent.innerHTML = `
        <table class="data-table" style="margin-top: 0;">
          <thead>
            <tr>
              <th>Room #</th>
              <th>Type</th>
              <th>Locked Price</th>
            </tr>
          </thead>
          <tbody>
            ${b.rooms.map(r => `
              <tr>
                <td><strong>${r.room_number || 'N/A'}</strong></td>
                <td>${r.room_type_name || 'N/A'}</td>
                <td>$${parseFloat(r.price_at_booking).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      roomsContent.innerHTML = `<div style="color:var(--admin-text-muted);">No physical rooms allocated for this booking.</div>`;
    }

    // --- Render Payment History ---
    if (b.payments && b.payments.length > 0) {
      paymentsContent.innerHTML = `
        <table class="data-table" style="margin-top: 0;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${b.payments.map(p => `
              <tr>
                <td>${new Date(p.transaction_date).toLocaleString()}</td>
                <td>${p.payment_method}</td>
                <td>$${parseFloat(p.amount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      paymentsContent.innerHTML = `<div style="color:var(--admin-text-muted);">No payment records found.</div>`;
    }

    // --- Render Action Buttons ---
    let actionsHtml = '';
    if (b.booking_status === 'pending') {
      actionsHtml += `<button class="btn btn-primary" onclick="updateBookingStatus('${id}', 'confirmed')">Confirm Booking</button>`;
      actionsHtml += `<button class="btn btn-secondary" style="color:var(--admin-danger);" onclick="updateBookingStatus('${id}', 'cancelled')">Cancel Booking</button>`;
    } else if (b.booking_status === 'confirmed') {
      actionsHtml += `<button class="btn btn-primary" style="background:#16a34a;border-color:#16a34a;" onclick="updateBookingStatus('${id}', 'completed')">Mark Completed</button>`;
      actionsHtml += `<button class="btn btn-secondary" style="color:var(--admin-danger);" onclick="updateBookingStatus('${id}', 'cancelled')">Cancel Booking</button>`;
    }
    
    actionButtons.innerHTML = actionsHtml;

  } catch (err) {
    console.error(err);
    summaryContent.innerHTML = `<div style="color:var(--admin-danger);">Failed to load booking details.</div>`;
  }
}

function closeBookingSlideout() {
  document.getElementById('booking-slideout-overlay')?.classList.remove('active');
}

window.updateBookingStatus = async function(id, newStatus) {
  if (newStatus === 'cancelled') {
    if (!confirm('Are you sure you want to cancel this booking? This action will release the allocated rooms back to available inventory.')) {
      return;
    }
  } else if (newStatus === 'completed') {
    if (!confirm('Mark this booking as completed?')) {
      return;
    }
  }

  try {
    const res = await fetch(`/api/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    
    const json = await res.json();
    
    if (json.success) {
      showToast(json.message);
      openBookingSlideout(id); // reload the details view
      loadAdminBookings(); // reload table
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to update booking status.', 'error');
  }
}

/* ================================================================
   PRICE & INVENTORY MANAGEMENT
   ================================================================ */
let currentInventoryData = [];
let currentInventoryYear = new Date().getFullYear();
let currentInventoryMonth = new Date().getMonth() + 1;

async function initPricingPage() {
  // Populate Hotels Dropdown
  const hotelSelects = [
    document.getElementById('pricing-hotel-select'),
    document.getElementById('override-hotel'),
    document.getElementById('block-hotel')
  ];
  
  try {
    const res = await fetch('/api/hotels');
    const json = await res.json();
    if (json.success) {
      const options = `<option value="">Select a Hotel...</option>` + 
        json.data.map(h => `<option value="${h.id}">${h.name}</option>`).join('');
      hotelSelects.forEach(select => { if(select) select.innerHTML = options; });
    }
  } catch (err) {
    console.error('Failed to load hotels for pricing', err);
  }

  // Populate Month/Year
  const monthSelect = document.getElementById('pricing-month-select');
  const yearSelect = document.getElementById('pricing-year-select');
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (monthSelect) {
    monthSelect.innerHTML = months.map((m, i) => `<option value="${i + 1}" ${i + 1 === currentInventoryMonth ? 'selected' : ''}>${m}</option>`).join('');
  }
  if (yearSelect) {
    const y = currentInventoryYear;
    yearSelect.innerHTML = [y - 1, y, y + 1, y + 2].map(year => `<option value="${year}" ${year === y ? 'selected' : ''}>${year}</option>`).join('');
  }

  document.getElementById('btn-load-calendar')?.addEventListener('click', loadInventoryCalendar);

  // Form submits
  document.getElementById('form-price-override')?.addEventListener('submit', handlePriceOverrideSubmit);
  document.getElementById('form-block-room')?.addEventListener('submit', handleBlockRoomSubmit);

  // Cascade dropdowns for modals
  document.getElementById('override-hotel')?.addEventListener('change', async (e) => {
    const hotelId = e.target.value;
    const rSelect = document.getElementById('override-room-id');
    if (!hotelId) { rSelect.innerHTML = '<option value="">Select Hotel First</option>'; return; }
    try {
      const res = await fetch(`/api/room-types?hotel_id=${hotelId}`);
      const json = await res.json();
      if (json.success) {
        let options = '';
        json.data.forEach(rt => {
           if(rt.rooms) {
             rt.rooms.forEach(room => {
               options += `<option value="${room.id}">${rt.name} - Room ${room.room_number}</option>`;
             });
           }
        });
        rSelect.innerHTML = options || '<option value="">No rooms found</option>';
      }
    } catch(err) {}
  });

  document.getElementById('block-hotel')?.addEventListener('change', async (e) => {
    const hotelId = e.target.value;
    const rSelect = document.getElementById('block-room-id');
    if (!hotelId) { rSelect.innerHTML = '<option value="">Select Hotel First</option>'; return; }
    try {
      // Fetch room types, then extract physical rooms
      const res = await fetch(`/api/room-types?hotel_id=${hotelId}`);
      const json = await res.json();
      if (json.success) {
        let options = '';
        json.data.forEach(rt => {
           if(rt.rooms) {
             rt.rooms.forEach(room => {
               options += `<option value="${room.id}">${rt.name} - Room ${room.room_number}</option>`;
             });
           }
        });
        rSelect.innerHTML = options || '<option value="">No rooms found</option>';
      }
    } catch(err) {}
  });
}

async function loadInventoryCalendar() {
  const hotelId = document.getElementById('pricing-hotel-select')?.value;
  const month = parseInt(document.getElementById('pricing-month-select')?.value);
  const year = parseInt(document.getElementById('pricing-year-select')?.value);

  if (!hotelId) {
    showToast('Please select a hotel first.', 'error');
    return;
  }

  const lastDay = new Date(year, month, 0).getDate();

  const container = document.getElementById('inventory-calendar');
  container.innerHTML = `<div style="padding: 2rem; text-align: center;">Loading calendar data...</div>`;

  console.log('Sending Calendar Request with Hotel ID:', hotelId);

  try {
    const res = await fetch(`/api/inventory/calendar?hotel_id=${hotelId}&month=${month}&year=${year}`);
    const json = await res.json();
    
    console.log('Calendar API Response:', json);

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = `<div style="padding: 2rem; text-align: center;">No room types found for this hotel.</div>`;
      return;
    }

    currentInventoryData = json.data;
    renderCalendarGrid(year, month, lastDay);
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--admin-danger);">Failed to load calendar.</div>`;
  }
}

function renderCalendarGrid(year, month, daysInMonth) {
  const container = document.getElementById('inventory-calendar');
  
  let html = `<div class="gantt-grid" style="grid-template-columns: 200px repeat(${daysInMonth}, minmax(40px, 1fr));">`;
  
  // Header Row (Dates)
  html += `<div class="gantt-header-cell sticky-left">Room Type / Room</div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    html += `<div class="gantt-header-cell ${isWeekend ? 'weekend' : ''}">${d}<br><small>${dayName}</small></div>`;
  }

  // Body Rows
  currentInventoryData.forEach(rt => {
    // Room Type Row (Just a header, no data cells)
    html += `<div class="gantt-row-header sticky-left" onclick="toggleGanttGroup('rt-${rt.id}')" style="cursor:pointer; font-weight:bold; background: var(--admin-bg-elevated); grid-column: 1 / -1;">
               <i class="fa-solid fa-chevron-down" style="font-size:10px; margin-right:5px;"></i> ${rt.name} <small style="margin-left:8px; font-weight:normal;">(Base: $${parseFloat(rt.base_price).toFixed(2)})</small>
             </div>`;

    // Physical Room Rows
    if (rt.rooms && rt.rooms.length > 0) {
      rt.rooms.forEach(room => {
        html += `<div class="gantt-row-header sticky-left sub-row rt-group-${rt.id}" style="padding-left: 24px; font-size:13px; color:var(--admin-text-secondary);">
                   &#x21B3; Room ${room.room_number}
                 </div>`;
        
        for (let d = 1; d <= daysInMonth; d++) {
          const cellDateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const cellDateObj = new Date(cellDateStr);
          const isWeekend = cellDateObj.getDay() === 0 || cellDateObj.getDay() === 6;
          
          let cellStatus = 'available';
          let tooltip = 'Available';
          let displayPrice = parseFloat(rt.base_price);
          let isOverride = false;
          let cellContent = '';

          // 1. Check Blocks
          if (room.blocks) {
            const block = room.blocks.find(b => {
              const s = new Date(b.start_date); s.setHours(0,0,0,0);
              const e = new Date(b.end_date); e.setHours(23,59,59,999);
              return cellDateObj >= s && cellDateObj <= e;
            });
            if (block) { cellStatus = 'blocked'; tooltip = `Blocked: ${block.reason}`; }
          }

          // 2. Check Bookings
          if (cellStatus === 'available' && room.bookings) {
            const booking = room.bookings.find(b => {
              const s = new Date(b.check_in_date); s.setHours(0,0,0,0);
              const e = new Date(b.check_out_date); e.setHours(0,0,0,0);
              return cellDateObj >= s && cellDateObj < e; 
            });
            if (booking) { cellStatus = 'booked'; tooltip = `Booked${booking.customer_name ? ': ' + booking.customer_name : ''}`; }
          }

          // 3. Check Price Overrides (Only matters if not blocked)
          if (cellStatus !== 'blocked') {
             if (room.overrides) {
               const override = room.overrides.find(o => {
                 const s = new Date(o.start_date); s.setHours(0,0,0,0);
                 const e = new Date(o.end_date); e.setHours(23,59,59,999);
                 return cellDateObj >= s && cellDateObj <= e;
               });
               if (override) {
                 displayPrice = parseFloat(override.override_price);
                 isOverride = true;
                 tooltip += ` (Override: ${override.reason || 'Custom Price'})`;
               }
             }
             cellContent = `$${Math.round(displayPrice)}`;
          } else {
             cellContent = '<i class="fa-solid fa-ban"></i>';
          }

          html += `<div class="gantt-cell status-cell cell-${cellStatus} ${isWeekend ? 'weekend' : ''} ${isOverride && cellStatus === 'available' ? 'has-override' : ''}" title="${tooltip}" style="font-size: 11px; display: flex; align-items: center; justify-content: center; ${isOverride && cellStatus === 'available' ? 'background: #dcfce7; color: #166534; font-weight: bold; border-color: #86efac;' : ''}" data-room-id="${room.id}" data-date="${cellDateStr}">
                     ${cellContent}
                   </div>`;
        }
      });
    }
  });

  html += `</div>`;
  container.innerHTML = html;

  // Map bookings visually onto the grid
  currentInventoryData.forEach(rt => {
    if (rt.rooms && rt.rooms.length > 0) {
      rt.rooms.forEach(room => {
        if (room.bookings && room.bookings.length > 0) {
          room.bookings.forEach(booking => {
            let currentDate = new Date(booking.check_in_date);
            let endDate = new Date(booking.check_out_date);

            while (currentDate < endDate) {
                let y = currentDate.getFullYear();
                let m = String(currentDate.getMonth() + 1).padStart(2, '0');
                let d = String(currentDate.getDate()).padStart(2, '0');
                let dateString = `${y}-${m}-${d}`; 

                let cell = document.querySelector(`div[data-room-id="${booking.room_id}"][data-date="${dateString}"]`);

                if (cell) {
                    cell.style.backgroundColor = '#f8d7da'; 
                    cell.style.color = '#721c24'; 
                    cell.style.borderColor = '#f5c6cb';
                    cell.style.fontWeight = 'bold';
                    cell.style.pointerEvents = 'none'; 
                    cell.innerHTML = 'Booked';
                    if (booking.customer_name) cell.title = `Booked: ${booking.customer_name}`;
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
          });
        }
      });
    }
  });
}

window.toggleGanttGroup = function(groupId) {
  const rows = document.querySelectorAll(`.rt-group-${groupId.split('-')[1]}`);
  rows.forEach(r => {
    r.style.display = r.style.display === 'none' ? 'flex' : 'none';
  });
};

// Modals
window.openPriceOverrideModal = function() { document.getElementById('modal-price-override')?.classList.add('active'); };
window.closePriceOverrideModal = function() { document.getElementById('modal-price-override')?.classList.remove('active'); };
window.openBlockRoomModal = function() { document.getElementById('modal-block-room')?.classList.add('active'); };
window.closeBlockRoomModal = function() { document.getElementById('modal-block-room')?.classList.remove('active'); };

async function handlePriceOverrideSubmit(e) {
  e.preventDefault();
  const payload = {
    roomId: document.getElementById('override-room-id').value,
    startDate: document.getElementById('override-start').value,
    endDate: document.getElementById('override-end').value,
    newPrice: document.getElementById('override-price').value,
    reason: document.getElementById('override-reason').value
  };

  try {
    const res = await fetch('/api/inventory/override-price', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Price override saved!');
      closePriceOverrideModal();
      loadInventoryCalendar(); // Refresh matrix
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Server error saving override.', 'error');
  }
}

async function handleBlockRoomSubmit(e) {
  e.preventDefault();
  const payload = {
    roomId: document.getElementById('block-room-id').value,
    startDate: document.getElementById('block-start').value,
    endDate: document.getElementById('block-end').value,
    reason: document.getElementById('block-reason').value
  };

  try {
    const res = await fetch('/api/inventory/block-room', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Room blocked successfully!');
      closeBlockRoomModal();
      loadInventoryCalendar(); // Refresh matrix
    } else {
      showToast(json.message, 'error');
    }
  } catch (err) {
    showToast('Server error blocking room.', 'error');
  }
}

/* ================================================================
   PAYMENTS SECTION LOGIC
   ================================================================ */
function initPaymentsSection() {
  const searchInput = document.getElementById('payment-search');
  const statusFilter = document.getElementById('payment-status-filter');
  const filterBtn = document.getElementById('btn-filter-payments');

  if (filterBtn) {
    filterBtn.addEventListener('click', loadAdminPayments);
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadAdminPayments();
    });
  }
}

let currentPaymentsData = [];

async function loadAdminPayments() {
  const tbody = document.getElementById('admin-payments-list');
  const search = document.getElementById('payment-search')?.value || '';
  const statusFilter = document.getElementById('payment-status-filter')?.value || '';

  if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:2rem;">Loading...</td></tr>';

  try {
    const res = await fetch('/api/bookings');
    
    if (!res.ok) throw new Error('Failed to load bookings for payments');
    const json = await res.json();

    if (json.success) {
      let bookings = json.data;
      
      // Client-side filtering for payments search
      if (search) {
          bookings = bookings.filter(b => 
              String(b.id).includes(search) || 
              String(b.payos_order_code || '').includes(search)
          );
      }
      if (statusFilter) {
          bookings = bookings.filter(b => 
              String(b.payment_status || '').toUpperCase() === statusFilter.toUpperCase()
          );
      }

      currentPaymentsData = bookings;
      
      let totalRevenue = 0;
      let successCount = 0;
      let pendingCount = 0;
      let failedCount = 0;

      bookings.forEach(b => {
        const status = (b.payment_status || '').toLowerCase();
        if (status === 'paid') {
          totalRevenue += parseFloat(b.total_amount) || 0;
          successCount++;
        } else if (status === 'pending') {
          pendingCount++;
        } else if (status === 'failed' || status === 'refunded' || status === 'cancelled') {
          failedCount++;
        }
      });

      const revEl = document.getElementById('admin-pay-revenue');
      if (revEl) {
          revEl.dataset.count = totalRevenue;
          animateCountUp(revEl);
      }
      
      const successEl = document.getElementById('admin-pay-success');
      if (successEl) {
          successEl.dataset.count = successCount;
          animateCountUp(successEl);
      }

      const pendingEl = document.getElementById('admin-pay-pending');
      if (pendingEl) {
          pendingEl.dataset.count = pendingCount;
          animateCountUp(pendingEl);
      }

      const failedEl = document.getElementById('admin-pay-failed');
      if (failedEl) {
          failedEl.dataset.count = failedCount;
          animateCountUp(failedEl);
      }

      renderPaymentsTable(bookings);
    } else {
      throw new Error(json.message);
    }
  } catch (err) {
    console.error("Frontend Render Error:", err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;padding:2rem;">Error loading data.</td></tr>';
    showToast('Failed to load payments', 'error');
  }
}

function renderPaymentsTable(payments) {
  const tbody = document.getElementById('admin-payments-list');
  if (!tbody) return;

  if (!payments || payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:2rem;">No payments found.</td></tr>';
    return;
  }

  const badgeClass = {
    PAID: 'badge-success',
    PENDING: 'badge-warning',
    FAILED: 'badge-danger',
    REFUNDED: 'badge-danger',
    paid: 'badge-success',
    pending: 'badge-warning',
    failed: 'badge-danger',
    refunded: 'badge-danger'
  };

  tbody.innerHTML = payments.map(p => {
    const statusCls = badgeClass[p.payment_status] || 'badge-info';
    const amount = `$${parseInt(p.total_amount || 0)}`;
    const date = new Date(p.created_at).toLocaleString('en-US');
    const gateway = 'PayOS'; // For now, all are PayOS based on previous logic unless specified
    const statusText = p.payment_status ? p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1) : 'Unknown';
    
    return `
      <tr>
        <td><strong style="font-variant-numeric:tabular-nums;">#${p.id}</strong></td>
        <td>#${p.id}</td>
        <td class="cell-amount">${amount}</td>
        <td>${gateway}</td>
        <td><span class="badge ${statusCls}"><span class="badge-dot"></span> ${statusText}</span></td>
        <td>${date}</td>
        <td style="text-align:center;">
          <button class="btn btn-secondary btn-sm" onclick="openPaymentSidePanel('${p.id}')">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openPaymentSidePanel(id) {
  const p = currentPaymentsData.find(x => String(x.id) === String(id));
  if (!p) return;

  document.getElementById('panel-pay-order-code').textContent = p.payos_order_code || '—';
  document.getElementById('panel-pay-booking-id').textContent = p.booking_id;
  document.getElementById('panel-pay-amount').textContent = parseInt(p.amount || 0).toLocaleString('vi-VN') + ' đ';
  document.getElementById('panel-pay-gateway').textContent = p.gateway;
  document.getElementById('panel-pay-status').textContent = p.status;
  document.getElementById('panel-pay-date').textContent = new Date(p.created_at).toLocaleString('en-US');

  // Set up the archive button with the correct ID
  const archiveBtn = document.getElementById('btn-archive-payment');
  archiveBtn.onclick = () => archivePayment(id);

  const panel = document.getElementById('payment-side-panel');
  const overlay = document.getElementById('payment-panel-overlay');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('active');
}

function closePaymentSidePanel() {
  const panel = document.getElementById('payment-side-panel');
  const overlay = document.getElementById('payment-panel-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

async function archivePayment(id) {
  if (!confirm('Are you sure you want to hide this record?')) return;
  
  try {
    const res = await fetch(`/api/admin/payments/${id}/archive`, { method: 'PATCH' });
    const json = await res.json();
    if (json.success) {
      showToast('Payment archived successfully');
      closePaymentSidePanel();
      loadAdminPayments();
    } else {
      showToast(json.message || 'Failed to archive payment', 'error');
    }
  } catch (err) {
    console.error("Archive Error:", err);
    showToast('An error occurred while archiving', 'error');
  }
}

// Close panel when pressing Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePaymentSidePanel();
  }
});

/* ================================================================
   COUPONS / PROMOS SECTION
   ================================================================ */
let currentCoupons = [];

function initCouponsSection() {
  const form = document.getElementById('coupon-form');
  if (form) {
    form.addEventListener('submit', handleCouponSubmit);
  }
}

async function loadCoupons() {
  try {
    const res = await fetch('/api/admin/coupons');
    const json = await res.json();
    
    const tbody = document.getElementById('coupons-table-body');
    if (!tbody) return;

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--admin-text-muted);padding:2rem;">No coupons found.</td></tr>`;
      return;
    }

    currentCoupons = json.data;
    
    tbody.innerHTML = json.data.map(c => {
      const isExpired = new Date(c.valid_until) < new Date();
      
      let statusCls = c.is_active ? 'success' : 'secondary';
      let statusText = c.is_active ? 'Active' : 'Inactive';
      
      if (isExpired && c.is_active) {
          statusCls = 'danger';
          statusText = 'Expired';
      }

      let valDisplay = '';
      if (c.discount_type === 'percentage') {
          valDisplay = parseFloat(c.discount_value) + '%';
      } else {
          valDisplay = '$' + parseFloat(c.discount_value).toLocaleString();
      }

      const dateStr = new Date(c.valid_until).toLocaleDateString('en-GB');

      return `
        <tr>
          <td><strong>${c.code}</strong></td>
          <td><span class="badge badge-outline">${c.discount_type}</span> <br/> ${valDisplay}</td>
          <td>${c.used_count || 0} / ${c.max_uses || '∞'}</td>
          <td>${dateStr}</td>
          <td><span class="badge badge-${statusCls}">${statusText}</span></td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="toggleCouponStatus('${c.id}')">${c.is_active ? 'Deactivate' : 'Activate'}</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    showToast('Failed to load coupons', 'error');
  }
}

async function handleCouponSubmit(e) {
  e.preventDefault();
  
  const payload = {
    code: document.getElementById('coupon-code').value,
    discount_type: document.getElementById('coupon-discount-type').value,
    discount_value: document.getElementById('coupon-discount-value').value,
    max_uses: document.getElementById('coupon-max-uses').value,
    valid_from: document.getElementById('coupon-valid-from').value || new Date().toISOString().split('T')[0],
    valid_until: document.getElementById('coupon-valid-until').value,
    applicable_hotel_id: document.getElementById('coupon-hotel-id').value || null
  };

  try {
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    if (json.success) {
      showToast('Coupon created successfully', 'success');
      closeCouponModal();
      loadCoupons();
    } else {
      showToast(json.message || 'Failed to create coupon', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function toggleCouponStatus(id) {
  try {
    const res = await fetch(`/api/admin/coupons/${id}/toggle`, {
      method: 'PATCH'
    });
    const json = await res.json();
    if (json.success) {
      showToast('Coupon status updated', 'success');
      loadCoupons();
    } else {
      showToast(json.message || 'Failed to update status', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

function openCouponModal() {
  const panel = document.getElementById('coupon-slideout-panel');
  const overlay = document.getElementById('coupon-slideout-overlay');
  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('active');
  
  // Populate hotels dropdown if not already populated
  const hotelSelect = document.getElementById('coupon-hotel-id');
  if (hotelSelect && hotelSelect.options.length <= 1) {
    fetch('/api/properties')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          json.data.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.PropertyID;
            opt.textContent = h.Name;
            hotelSelect.appendChild(opt);
          });
        }
      }).catch(console.error);
  }
}

function closeCouponModal() {
  const panel = document.getElementById('coupon-slideout-panel');
  const overlay = document.getElementById('coupon-slideout-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  
  const form = document.getElementById('coupon-form');
  if (form) form.reset();
}

/* ================================================================
   CUSTOMERS SECTION
   ================================================================ */
let currentCustomers = [];
let selectedCustomerId = null;

function initCustomersSection() {
  // Initialization if needed
}

async function loadCustomers() {
  try {
    const res = await fetch('/api/admin/customers');
    const json = await res.json();
    
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--admin-text-muted);padding:2rem;">No customers found.</td></tr>`;
      document.getElementById('cust-stat-total').textContent = 0;
      document.getElementById('cust-stat-active').textContent = 0;
      return;
    }

    currentCustomers = json.data;
    
    document.getElementById('cust-stat-total').textContent = currentCustomers.length;
    document.getElementById('cust-stat-active').textContent = currentCustomers.filter(c => c.IsActive).length;

    tbody.innerHTML = json.data.map(c => {
      let statusCls = c.IsActive ? 'success' : 'danger';
      let statusText = c.IsActive ? 'Active' : 'Banned';
      
      const totalSpent = parseFloat(c.total_spent || 0).toLocaleString();

      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;border-radius:50%;background:var(--admin-primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;">
                ${c.FullName ? c.FullName.charAt(0).toUpperCase() : '?'}
              </div>
              <strong style="color:var(--admin-text);">${c.FullName || 'Unknown'}</strong>
            </div>
          </td>
          <td>
            <div>${c.Email || '—'}</div>
            <div style="font-size:0.8rem;color:var(--admin-text-muted);">${c.PhoneNumber || '—'}</div>
          </td>
          <td><span class="badge badge-outline">${c.MembershipTier || 'Standard'}</span></td>
          <td>${c.total_bookings}</td>
          <td style="color:var(--admin-primary);font-weight:600;">$${totalSpent}</td>
          <td><span class="badge badge-${statusCls}">${statusText}</span></td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="openCustomerProfile('${c.UserID}')">View Profile</button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    showToast('Failed to load customers', 'error');
  }
}

async function openCustomerProfile(userId) {
  selectedCustomerId = userId;
  
  const panel = document.getElementById('customer-slideout-panel');
  const overlay = document.getElementById('customer-slideout-overlay');
  
  try {
    const res = await fetch(`/api/admin/customers/${userId}/details`);
    const json = await res.json();
    
    if (json.success) {
      const p = json.data.profile;
      
      document.getElementById('cust-profile-avatar').textContent = p.FullName ? p.FullName.charAt(0).toUpperCase() : '?';
      document.getElementById('cust-profile-name').textContent = p.FullName || 'Unknown';
      document.getElementById('cust-profile-email').textContent = p.Email || '—';
      document.getElementById('cust-profile-membership').innerHTML = `<span class="badge badge-outline">${p.MembershipTier || 'Standard'}</span>`;
      
      document.getElementById('cust-profile-phone').textContent = p.PhoneNumber || '—';
      document.getElementById('cust-profile-join').textContent = new Date(p.CreatedAt).toLocaleDateString('en-US');
      
      const btnToggle = document.getElementById('btn-toggle-customer');
      if (p.IsActive) {
        btnToggle.className = 'btn btn-danger';
        btnToggle.textContent = 'Ban User';
      } else {
        btnToggle.className = 'btn btn-success';
        btnToggle.textContent = 'Unban User';
      }
      
      const bookingsDiv = document.getElementById('cust-profile-bookings');
      if (json.data.booking_history && json.data.booking_history.length > 0) {
        bookingsDiv.innerHTML = json.data.booking_history.map(b => {
          return `<div style="padding:12px;border:1px solid var(--admin-border-light);border-radius:8px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <strong style="color:var(--admin-text);">#${b.id}</strong>
              <span class="badge badge-outline">${b.booking_status}</span>
            </div>
            <div style="font-size:0.9rem;color:var(--admin-text-muted);">
              $${parseFloat(b.total_amount).toLocaleString()} • ${new Date(b.created_at).toLocaleDateString()}
            </div>
          </div>`;
        }).join('');
      } else {
        bookingsDiv.innerHTML = '<div style="color: var(--admin-text-muted); font-size: 0.9rem;">No bookings found.</div>';
      }
      
      const reviewsDiv = document.getElementById('cust-profile-reviews');
      if (json.data.reviews && json.data.reviews.length > 0) {
        reviewsDiv.innerHTML = json.data.reviews.map(r => {
          return `<div style="padding:12px;border:1px solid var(--admin-border-light);border-radius:8px;">
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;color:#fbbf24;">
              ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}
            </div>
            <div style="font-size:0.9rem;color:var(--admin-text);">${r.comment || 'No comment'}</div>
          </div>`;
        }).join('');
      } else {
        reviewsDiv.innerHTML = '<div style="color: var(--admin-text-muted); font-size: 0.9rem;">No reviews found.</div>';
      }

      if (panel) panel.classList.add('open');
      if (overlay) overlay.classList.add('active');
    } else {
      showToast('Failed to load profile details', 'error');
    }
  } catch(err) {
    console.error(err);
    showToast('Error loading profile', 'error');
  }
}

function closeCustomerModal() {
  const panel = document.getElementById('customer-slideout-panel');
  const overlay = document.getElementById('customer-slideout-overlay');
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  selectedCustomerId = null;
}

async function toggleCustomerStatus(userId) {
  try {
    const res = await fetch(`/api/admin/customers/${userId}/toggle-status`, {
      method: 'PATCH'
    });
    const json = await res.json();
    if (json.success) {
      showToast('Customer status updated', 'success');
      loadCustomers();
    } else {
      showToast(json.message || 'Failed to update status', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function toggleCustomerStatusFromPanel() {
  if (!selectedCustomerId) return;
  await toggleCustomerStatus(selectedCustomerId);
  // Re-fetch profile to update UI
  openCustomerProfile(selectedCustomerId);
}

/* ================================================================
   ROLES & PERMISSIONS SECTION
   ================================================================ */

function initRolesSection() {
  const roleForm = document.getElementById('role-form');
  if (roleForm) {
    roleForm.addEventListener('submit', handleRoleSubmit);
  }

  const assignForm = document.getElementById('assign-staff-form');
  if (assignForm) {
    assignForm.addEventListener('submit', handleAssignStaffSubmit);
  }
}

async function loadRoles() {
  try {
    const res = await fetch('/api/admin/roles');
    const json = await res.json();
    const tbody = document.getElementById('roles-table-body');
    const roleSelect = document.getElementById('assign-role-id');
    
    if (!tbody || !roleSelect) return;

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--admin-text-muted);padding:2rem;">No roles found.</td></tr>`;
      roleSelect.innerHTML = '<option value="">Select Role</option>';
      return;
    }

    tbody.innerHTML = json.data.map(r => {
      const perms = r.permissions && r.permissions.length > 0 
        ? r.permissions.map(p => `<span class="badge badge-outline" style="margin-right:4px;margin-bottom:4px;display:inline-block;">${p}</span>`).join('') 
        : '<span style="color:var(--admin-text-muted);">None</span>';
        
      return `
        <tr>
          <td><strong>${r.RoleName}</strong></td>
          <td>${perms}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick='openRoleModal(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Edit</button>
          </td>
        </tr>
      `;
    }).join('');

    // Populate dropdown
    roleSelect.innerHTML = '<option value="">Select Role</option>' + json.data.map(r => {
      return `<option value="${r.RoleID}">${r.RoleName}</option>`;
    }).join('');

  } catch (err) {
    console.error(err);
    showToast('Failed to load roles', 'error');
  }
}

async function loadStaff() {
  try {
    const res = await fetch('/api/admin/staff');
    const json = await res.json();
    const tbody = document.getElementById('staff-table-body');
    
    if (!tbody) return;

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;color:var(--admin-text-muted);padding:2rem;">No staff found.</td></tr>`;
      return;
    }

    tbody.innerHTML = json.data.map(s => {
      return `
        <tr>
          <td>
            <div style="font-weight:600;">${s.FullName || 'Unknown'} (ID: ${s.UserID})</div>
            <div style="font-size:0.8rem;color:var(--admin-text-muted);">${s.Email || ''}</div>
          </td>
          <td><span class="badge badge-success">${s.RoleName}</span></td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    showToast('Failed to load staff', 'error');
  }
}

function openRoleModal(role = null) {
  const modal = document.getElementById('role-modal');
  const form = document.getElementById('role-form');
  
  if (form) {
    form.reset();
    document.getElementById('role-id').value = '';
    document.getElementById('role-modal-title').textContent = 'Create Role';
    document.getElementById('role-name').readOnly = false;
    
    // Uncheck all
    document.querySelectorAll('input[name="permissions"]').forEach(cb => cb.checked = false);

    if (role) {
      document.getElementById('role-id').value = role.RoleID;
      document.getElementById('role-name').value = role.RoleName;
      document.getElementById('role-modal-title').textContent = 'Edit Role Permissions';
      document.getElementById('role-name').readOnly = true; // prevent changing role name if it's edit
      
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissions.forEach(p => {
          const cb = document.querySelector(`input[name="permissions"][value="${p}"]`);
          if (cb) cb.checked = true;
        });
      }
    }
  }
  
  if (modal) modal.classList.add('active');
}

function closeRoleModal() {
  const modal = document.getElementById('role-modal');
  if (modal) modal.classList.remove('active');
}

async function handleRoleSubmit(e) {
  e.preventDefault();
  
  const roleId = document.getElementById('role-id').value;
  const roleName = document.getElementById('role-name').value;
  
  const checkedPerms = Array.from(document.querySelectorAll('input[name="permissions"]:checked')).map(cb => cb.value);
  
  try {
    const isEdit = !!roleId;
    const url = isEdit ? `/api/admin/roles/${roleId}` : '/api/admin/roles';
    const method = isEdit ? 'PUT' : 'POST';
    const payload = isEdit ? { permissions: checkedPerms } : { roleName, permissions: checkedPerms };

    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    if (json.success) {
      showToast(isEdit ? 'Role updated' : 'Role created', 'success');
      closeRoleModal();
      loadRoles();
    } else {
      showToast(json.message || 'Failed to save role', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

function openAssignStaffModal() {
  const modal = document.getElementById('assign-staff-modal');
  const form = document.getElementById('assign-staff-form');
  if (form) form.reset();
  if (modal) modal.classList.add('active');
}

function closeAssignStaffModal() {
  const modal = document.getElementById('assign-staff-modal');
  if (modal) modal.classList.remove('active');
}

async function handleAssignStaffSubmit(e) {
  e.preventDefault();
  
  const userId = document.getElementById('assign-user-id').value;
  const roleId = document.getElementById('assign-role-id').value;
  
  try {
    const res = await fetch('/api/admin/staff/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roleId })
    });
    
    const json = await res.json();
    if (json.success) {
      showToast('Role assigned successfully', 'success');
      closeAssignStaffModal();
      loadStaff();
    } else {
      showToast(json.message || 'Failed to assign role', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

/* ================================================================
   CMS (PAGES / BLOGS) SECTION
   ================================================================ */

let quillEditor = null;

function initCmsSection() {
  // Initialize Quill editor only if it hasn't been initialized
  if (!quillEditor) {
    quillEditor = new Quill('#editor-container', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image', 'video'],
          ['clean']
        ]
      },
      placeholder: 'Write your content here...'
    });
  }
}

// CMS Pagination & Filter State
window.cmsState = {
  currentPage: 1,
  currentLimit: 10,
  currentStatus: '',
  currentSearch: ''
};

async function loadPosts(page = 1) {
  try {
    window.cmsState.currentPage = page;
    const params = new URLSearchParams({
      page: window.cmsState.currentPage,
      limit: window.cmsState.currentLimit,
      ...(window.cmsState.currentStatus && { status: window.cmsState.currentStatus }),
      ...(window.cmsState.currentSearch && { search: window.cmsState.currentSearch })
    });

    const res = await fetch(`/api/admin/posts?${params}`);
    const json = await res.json();
    const tbody = document.getElementById('cms-table-body');
    
    if (!tbody) return;

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--admin-text-muted);padding:2rem;">No posts found.</td></tr>`;
      updateCmsPagination(0);
      return;
    }

    tbody.innerHTML = json.data.map(p => {
      let statusBadge = '';
      if (p.status === 'published') statusBadge = '<span class="badge badge-success">Published</span>';
      else if (p.status === 'draft') statusBadge = '<span class="badge badge-warning">Draft</span>';
      else statusBadge = '<span class="badge badge-error">Archived</span>';

      return `
        <tr>
          <td><input type="checkbox" class="cms-bulk-check" value="${p.id}"></td>
          <td><strong>${p.title}</strong></td>
          <td><code style="background: var(--admin-bg-hover); padding: 2px 6px; border-radius: 4px; font-size: 0.85rem;">${p.slug}</code></td>
          <td>${statusBadge}</td>
          <td>${new Date(p.updated_at).toLocaleDateString()}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="editPost(${p.id})">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="togglePostStatus(${p.id}, '${p.status === 'published' ? 'draft' : 'published'}')">${p.status === 'published' ? 'Unpublish' : 'Publish'}</button>
            <button class="btn btn-secondary btn-sm" style="color:#ef4444;" onclick="deletePost(${p.id})">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    // Update pagination
    if (json.pagination) {
      updateCmsPagination(json.pagination);
    }

  } catch (err) {
    console.error(err);
    showToast('Failed to load posts', 'error');
  }
}

function updateCmsPagination(pagination) {
  let paginationHTML = '';
  if (pagination && pagination.pages > 1) {
    paginationHTML = `
      <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
        ${window.cmsState.currentPage > 1 ? `<button class="btn btn-secondary btn-sm" onclick="loadPosts(${window.cmsState.currentPage - 1})">← Previous</button>` : ''}
        <span style="color: var(--admin-text-muted); font-size: 0.9rem;">Page <strong>${window.cmsState.currentPage}</strong> of <strong>${pagination.pages}</strong></span>
        ${window.cmsState.currentPage < pagination.pages ? `<button class="btn btn-secondary btn-sm" onclick="loadPosts(${window.cmsState.currentPage + 1})">Next →</button>` : ''}
      </div>
    `;
  }
  document.getElementById('cms-table-body').insertAdjacentHTML('afterend', paginationHTML);
}

function showCmsFilters() {
  const filterHTML = `
    <div style="background: var(--admin-surface); padding: 16px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <input type="text" id="cms-search-input" placeholder="Search posts..." style="padding: 8px 12px; border: 1px solid var(--admin-border); border-radius: 6px; width: 200px;" onkeyup="setTimeout(() => { window.cmsState.currentSearch = this.value; loadPosts(1); }, 500)">
      <select id="cms-status-filter" style="padding: 8px 12px; border: 1px solid var(--admin-border); border-radius: 6px;" onchange="window.cmsState.currentStatus = this.value; loadPosts(1);">
        <option value="">All Status</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <button class="btn btn-danger btn-sm" id="cms-bulk-delete-btn" style="display:none;" onclick="bulkDeleteCMSPosts()">Delete Selected</button>
    </div>
  `;
  const table = document.getElementById('cms-table');
  table.parentNode.insertBefore(Object.assign(document.createElement('div'), { innerHTML: filterHTML }).firstElementChild, table);
}

async function deletePost(id) {
  if (!confirm('Are you sure? This action cannot be undone.')) return;
  try {
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('Post deleted successfully', 'success');
      loadPosts(window.cmsState.currentPage);
    } else {
      showToast(json.message || 'Failed to delete', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function bulkDeleteCMSPosts() {
  const checked = document.querySelectorAll('.cms-bulk-check:checked');
  if (checked.length === 0) {
    showToast('No posts selected', 'warning');
    return;
  }
  if (!confirm(`Delete ${checked.length} post(s)? This action cannot be undone.`)) return;
  
  const ids = Array.from(checked).map(c => parseInt(c.value));
  try {
    const res = await fetch('/api/admin/posts/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`${json.deletedCount} post(s) deleted successfully`, 'success');
      loadPosts(window.cmsState.currentPage);
    } else {
      showToast(json.message || 'Failed to delete', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

function openCmsForm() {
  document.getElementById('cms-list-view').classList.add('hidden');
  document.getElementById('cms-form-view').classList.remove('hidden');
  
  // Reset Form
  document.getElementById('cms-form').reset();
  document.getElementById('cms-post-id').value = '';
  document.getElementById('cms-form-title').textContent = 'Create Post';
  if (quillEditor) {
    quillEditor.root.innerHTML = '';
  }
  document.getElementById('cms-slug').value = '';
  document.getElementById('cms-meta-title').value = '';
  document.getElementById('cms-meta-description').value = '';
  document.getElementById('cms-voucher-code').value = '';
  document.getElementById('cms-voucher-description').value = '';
  document.getElementById('cms-status').value = 'draft';
}

function closeCmsForm() {
  document.getElementById('cms-form-view').classList.add('hidden');
  document.getElementById('cms-list-view').classList.remove('hidden');
  loadPosts(window.cmsState?.currentPage || 1);
}

async function editPost(id) {
  try {
    const res = await fetch(`/api/admin/posts/${id}`);
    const json = await res.json();
    if (json.success && json.data) {
      const p = json.data;
      openCmsForm();
      document.getElementById('cms-form-title').textContent = 'Edit Post';
      document.getElementById('cms-post-id').value = p.id;
      document.getElementById('cms-title').value = p.title;
      document.getElementById('cms-slug').value = p.slug;
      document.getElementById('cms-status').value = p.status;
      document.getElementById('cms-meta-title').value = p.meta_title || '';
      document.getElementById('cms-meta-description').value = p.meta_description || '';
      document.getElementById('cms-voucher-code').value = p.voucher_code || '';
      document.getElementById('cms-voucher-description').value = p.voucher_description || '';
      
      if (quillEditor) {
        quillEditor.root.innerHTML = p.content || '';
      }
    } else {
      showToast('Failed to fetch post details', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function togglePostStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/posts/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Post status updated`, 'success');
      loadPosts();
    } else {
      showToast(json.message || 'Failed to update status', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

function generateSlugFromTitle() {
  // Only auto-generate if we are creating a new post
  const isEdit = document.getElementById('cms-post-id').value !== '';
  if (isEdit) return; // Don't override existing slugs on edit unless user types in slug field manually
  
  const title = document.getElementById('cms-title').value;
  const slugField = document.getElementById('cms-slug');
  
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  slugField.value = slug;
}

async function submitCmsForm() {
  const id = document.getElementById('cms-post-id').value;
  const title = document.getElementById('cms-title').value;
  const slug = document.getElementById('cms-slug').value;
  const status = document.getElementById('cms-status').value;
  const meta_title = document.getElementById('cms-meta-title').value;
  const meta_description = document.getElementById('cms-meta-description').value;
  const voucher_code = document.getElementById('cms-voucher-code').value;
  const voucher_description = document.getElementById('cms-voucher-description').value;
  
  let content = '';
  if (quillEditor) {
    content = quillEditor.root.innerHTML;
  }
  
  if (!title || !slug) {
    showToast('Title and Slug are required', 'error');
    return;
  }
  
  const payload = { title, slug, content, status, meta_title, meta_description, voucher_code, voucher_description };
  const isEdit = !!id;
  const url = isEdit ? `/api/admin/posts/${id}` : '/api/admin/posts';
  const method = isEdit ? 'PUT' : 'POST';
  
  try {
    document.getElementById('cms-save-btn').disabled = true;
    document.getElementById('cms-save-btn').textContent = 'Saving...';
    
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    
    if (json.success) {
      showToast(isEdit ? 'Post updated' : 'Post created', 'success');
      closeCmsForm();
      loadPosts();
    } else {
      showToast(json.message || 'Failed to save post', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  } finally {
    document.getElementById('cms-save-btn').disabled = false;
    document.getElementById('cms-save-btn').textContent = 'Save Post';
  }
}

/* ================================================================
   REVIEWS (MODERATION & STATISTICS) SECTION
   ================================================================ */

function initReviewsSection() {
  const form = document.getElementById('review-moderation-form');
  if (form) {
    form.addEventListener('submit', handleReviewSubmit);
  }
}

// Reviews Pagination & Filter State
window.reviewsState = {
  currentPage: 1,
  currentLimit: 10,
  currentStatus: '',
  currentRating: '',
  currentSearch: ''
};

async function loadReviews(page = 1) {
  try {
    window.reviewsState.currentPage = page;
    const params = new URLSearchParams({
      page: window.reviewsState.currentPage,
      limit: window.reviewsState.currentLimit,
      ...(window.reviewsState.currentStatus && { status: window.reviewsState.currentStatus }),
      ...(window.reviewsState.currentRating && { rating: window.reviewsState.currentRating }),
      ...(window.reviewsState.currentSearch && { search: window.reviewsState.currentSearch })
    });

    const res = await fetch(`/api/admin/reviews?${params}`);
    const json = await res.json();
    const tbody = document.getElementById('reviews-table-body');
    
    if (!tbody) return;

    if (!json.success || !json.data || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--admin-text-muted);padding:2rem;">No reviews found.</td></tr>`;
      document.getElementById('review-stat-overall').textContent = '0.0';
      document.getElementById('review-stat-total').textContent = '0';
      document.getElementById('review-stat-pending').textContent = '0';
      updateReviewsPagination(0);
      return;
    }

    // Update Overview Cards
    if (json.stats) {
      document.getElementById('review-stat-overall').textContent = json.stats.average_rating || '0.0';
      document.getElementById('review-stat-total').textContent = json.stats.total_reviews || '0';
      document.getElementById('review-stat-pending').textContent = json.stats.pending_reviews || '0';
    }

    // Render Table
    tbody.innerHTML = json.data.map(r => {
      let statusBadge = '';
      if (r.status === 'approved') statusBadge = '<span class="badge badge-success">Approved</span>';
      else if (r.status === 'pending') statusBadge = '<span class="badge badge-warning">Pending</span>';
      else statusBadge = '<span class="badge badge-error">Hidden</span>';

      const snippet = r.comment ? (r.comment.length > 50 ? r.comment.substring(0, 50) + '...' : r.comment) : '';
      const ratingStars = '⭐'.repeat(r.rating);

      return `
        <tr>
          <td><input type="checkbox" class="review-bulk-check" value="${r.id}"></td>
          <td><strong>${r.hotel_name || 'N/A'}</strong></td>
          <td>${r.customer_name || 'Anonymous'}</td>
          <td style="color:#f59e0b; font-size:1.1rem;">${ratingStars}</td>
          <td style="color:var(--admin-text-muted); font-size:0.9rem;">${snippet}</td>
          <td>${statusBadge}</td>
          <td>${new Date(r.created_at).toLocaleDateString()}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick='openReviewPanel(${JSON.stringify(r).replace(/'/g, "&#39;")})'>Moderate</button>
          </td>
        </tr>
      `;
    }).join('');

    // Update pagination
    if (json.pagination) {
      updateReviewsPagination(json.pagination);
    }

  } catch (err) {
    console.error(err);
    showToast('Failed to load reviews', 'error');
  }
}

function updateReviewsPagination(pagination) {
  let paginationHTML = '';
  if (pagination && pagination.pages > 1) {
    paginationHTML = `
      <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
        ${window.reviewsState.currentPage > 1 ? `<button class="btn btn-secondary btn-sm" onclick="loadReviews(${window.reviewsState.currentPage - 1})">← Previous</button>` : ''}
        <span style="color: var(--admin-text-muted); font-size: 0.9rem;">Page <strong>${window.reviewsState.currentPage}</strong> of <strong>${pagination.pages}</strong></span>
        ${window.reviewsState.currentPage < pagination.pages ? `<button class="btn btn-secondary btn-sm" onclick="loadReviews(${window.reviewsState.currentPage + 1})">Next →</button>` : ''}
      </div>
    `;
  }
  document.getElementById('reviews-table-body').insertAdjacentHTML('afterend', paginationHTML);
}

function showReviewsFilters() {
  const filterHTML = `
    <div style="background: var(--admin-surface); padding: 16px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <input type="text" id="review-search-input" placeholder="Search reviews..." style="padding: 8px 12px; border: 1px solid var(--admin-border); border-radius: 6px; width: 200px;" onkeyup="setTimeout(() => { window.reviewsState.currentSearch = this.value; loadReviews(1); }, 500)">
      <select id="review-status-filter" style="padding: 8px 12px; border: 1px solid var(--admin-border); border-radius: 6px;" onchange="window.reviewsState.currentStatus = this.value; loadReviews(1);">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="hidden">Hidden</option>
      </select>
      <select id="review-rating-filter" style="padding: 8px 12px; border: 1px solid var(--admin-border); border-radius: 6px;" onchange="window.reviewsState.currentRating = this.value; loadReviews(1);">
        <option value="">All Ratings</option>
        <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
        <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
        <option value="3">⭐⭐⭐ (3 Stars)</option>
        <option value="2">⭐⭐ (2 Stars)</option>
        <option value="1">⭐ (1 Star)</option>
      </select>
      <button class="btn btn-secondary btn-sm" onclick="exportReviews()">📥 Export CSV</button>
      <button class="btn btn-danger btn-sm" id="review-bulk-update-btn" style="display:none;" onclick="bulkUpdateReviewStatus()">Bulk Update</button>
    </div>
  `;
  const table = document.querySelector('#reviews-table');
  if (table && !document.getElementById('review-filters')) {
    const filterDiv = document.createElement('div');
    filterDiv.id = 'review-filters';
    filterDiv.innerHTML = filterHTML;
    table.parentNode.insertBefore(filterDiv, table);
  }
}

async function exportReviews() {
  const params = new URLSearchParams({
    ...(window.reviewsState.currentStatus && { status: window.reviewsState.currentStatus }),
    ...(window.reviewsState.currentRating && { rating: window.reviewsState.currentRating })
  });

  try {
    const res = await fetch(`/api/admin/reviews/export/csv?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reviews-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Reviews exported successfully', 'success');
    } else {
      showToast('Failed to export reviews', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function bulkUpdateReviewStatus() {
  const checked = document.querySelectorAll('.review-bulk-check:checked');
  if (checked.length === 0) {
    showToast('No reviews selected', 'warning');
    return;
  }

  const status = prompt('Enter new status (pending/approved/hidden):');
  if (!status || !['pending', 'approved', 'hidden'].includes(status)) {
    showToast('Invalid status', 'error');
    return;
  }

  const ids = Array.from(checked).map(c => parseInt(c.value));
  try {
    const res = await fetch('/api/admin/reviews/bulk-update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`${json.updatedCount} review(s) updated successfully`, 'success');
      loadReviews(window.reviewsState.currentPage);
    } else {
      showToast(json.message || 'Failed to update', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

function openReviewPanel(review) {
  const panel = document.getElementById('review-slide-panel');
  const overlay = document.getElementById('review-panel-overlay');
  const detailsDiv = document.getElementById('review-details-content');
  
  // Populate form fields
  document.getElementById('mod-review-id').value = review.id;
  document.getElementById('mod-admin-reply').value = review.admin_reply || '';
  
  // Select the correct radio button for status
  const radios = document.querySelectorAll('input[name="mod_status"]');
  radios.forEach(r => {
    if (r.value === review.status) {
      r.checked = true;
    }
  });

  // Populate details view
  const ratingStars = '⭐'.repeat(review.rating);
  detailsDiv.innerHTML = `
    <div style="font-size: 0.85rem; color: var(--admin-text-muted); margin-bottom: 8px;">
      ${new Date(review.created_at).toLocaleDateString()} &middot; ${new Date(review.created_at).toLocaleTimeString()}
    </div>
    <div style="font-weight: 600; font-size: 1.1rem; margin-bottom: 4px;">${review.hotel_name || 'N/A'}</div>
    <div style="font-size: 0.9rem; margin-bottom: 12px;">By <strong>${review.customer_name || 'Anonymous'}</strong></div>
    <div style="margin-bottom: 12px;">
      <span style="color:#f59e0b; font-size:1.1rem; margin-right: 8px;">${ratingStars}</span> 
      <span style="font-weight:600;">${review.rating} / 5</span>
    </div>
    <div style="padding: 12px; background: rgba(0,0,0,0.1); border-radius: 6px; font-style: italic; font-size: 0.95rem; line-height: 1.5;">
      "${review.comment || 'No comment provided.'}"
    </div>
  `;

  if (panel) panel.classList.add('open');
  if (overlay) overlay.classList.add('active');
}

function closeReviewPanel() {
  const panel = document.getElementById('review-slide-panel');
  const overlay = document.getElementById('review-panel-overlay');
  
  if (panel) panel.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  const reviewId = document.getElementById('mod-review-id').value;
  const adminReply = document.getElementById('mod-admin-reply').value;
  const statusEl = document.querySelector('input[name="mod_status"]:checked');
  const status = statusEl ? statusEl.value : null;
  
  if (!reviewId) return;

  try {
    const res = await fetch(`/api/admin/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_reply: adminReply, status: status })
    });
    
    const json = await res.json();
    
    if (json.success) {
      showToast('Review updated successfully', 'success');
      closeReviewPanel();
      loadReviews();
    } else {
      showToast(json.message || 'Failed to update review', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

// Close review panel if overlay is clicked
document.getElementById('review-panel-overlay')?.addEventListener('click', closeReviewPanel);

/* ================================================================
   MEDIA MANAGER SECTION
   ================================================================ */

// Media Pagination & Filter State
window.mediaState = {
  currentPage: 1,
  currentLimit: 20,
  currentFolder: 'all',
  currentSearch: ''
};

async function loadMedia(page = 1) {
  const gallery = document.getElementById('media-gallery');
  
  if (!gallery) return;

  window.mediaState.currentPage = page;

  try {
    gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--admin-text-muted);">Loading media...</div>';
    
    const params = new URLSearchParams({
      page: window.mediaState.currentPage,
      limit: window.mediaState.currentLimit,
      ...(window.mediaState.currentFolder && window.mediaState.currentFolder !== 'all' && { folder: window.mediaState.currentFolder }),
      ...(window.mediaState.currentSearch && { search: window.mediaState.currentSearch })
    });

    const res = await fetch(`/api/admin/media?${params}`);
    const json = await res.json();
    
    if (!json.success || !json.data || json.data.length === 0) {
      gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--admin-text-muted);">No media files found.</div>';
      updateMediaPagination(0);
      return;
    }

    gallery.innerHTML = json.data.map(m => {
      const displayTitle = m.original_name.length > 20 ? m.original_name.substring(0, 17) + '...' : m.original_name;
      const sizeKB = (m.size_bytes / 1024).toFixed(1);
      
      return `
        <div class="media-card" style="border: 1px solid var(--admin-border); border-radius: 8px; overflow: hidden; background: var(--admin-bg-hover); position: relative; display: flex; flex-direction: column;">
          <div style="height: 120px; width: 100%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
            <input type="checkbox" class="media-bulk-check" value="${m.id}" style="position: absolute; top: 8px; left: 8px; cursor: pointer; z-index: 10;">
            ${m.mime_type?.startsWith('image/') 
              ? `<img src="${m.file_path}" alt="${m.original_name}" style="width: 100%; height: 100%; object-fit: cover;">`
              : `<i class="fa-solid fa-file" style="font-size: 2rem; color: #9ca3af;"></i>`
            }
          </div>
          <div style="padding: 12px; font-size: 0.85rem; flex-grow: 1;">
            <div style="font-weight: 600; margin-bottom: 4px;" title="${m.original_name}">${displayTitle}</div>
            <div style="color: var(--admin-text-muted); font-size: 0.75rem; display: flex; justify-content: space-between;">
              <span>${sizeKB} KB</span>
              <span>${m.folder}</span>
            </div>
          </div>
          <div style="padding: 8px; border-top: 1px solid var(--admin-border); display: flex; gap: 8px; justify-content: center; background: rgba(0,0,0,0.02);">
            <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.8rem;" onclick="copyMediaUrl('${m.file_path}')" title="Copy URL"><i class="fa-solid fa-link"></i></button>
            <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.8rem;" onclick="renameMedia(${m.id}, '${m.original_name.replace(/'/g, "\\'")}', '${m.folder}')" title="Rename"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 0.8rem; color: #ef4444;" onclick="deleteMedia(${m.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');

    // Update pagination
    if (json.pagination) {
      updateMediaPagination(json.pagination);
    }

  } catch (err) {
    console.error(err);
    gallery.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ef4444;">Failed to load media.</div>';
  }
}

function updateMediaPagination(pagination) {
  // Remove old pagination if exists
  const oldPagination = document.querySelector('#media-gallery + div[style*="margin-top"]');
  if (oldPagination) oldPagination.remove();

  let paginationHTML = '';
  if (pagination && pagination.pages > 1) {
    paginationHTML = `
      <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
        ${window.mediaState.currentPage > 1 ? `<button class="btn btn-secondary btn-sm" onclick="loadMedia(${window.mediaState.currentPage - 1})">← Previous</button>` : ''}
        <span style="color: var(--admin-text-muted); font-size: 0.9rem;">Page <strong>${window.mediaState.currentPage}</strong> of <strong>${pagination.pages}</strong></span>
        ${window.mediaState.currentPage < pagination.pages ? `<button class="btn btn-secondary btn-sm" onclick="loadMedia(${window.mediaState.currentPage + 1})">Next →</button>` : ''}
      </div>
    `;
    document.getElementById('media-gallery').insertAdjacentHTML('afterend', paginationHTML);
  }
}

function showMediaFilters() {
  const filterHTML = `
    <div style="background: var(--admin-surface); padding: 16px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
      <input type="text" id="media-search-input" placeholder="Search files..." style="padding: 8px 12px; border: 1px solid var(--admin-border); border-radius: 6px; width: 200px;" onkeyup="setTimeout(() => { window.mediaState.currentSearch = this.value; loadMedia(1); }, 500)">
      <button class="btn btn-secondary btn-sm" onclick="showFolderModal()">📁 Create Folder</button>
      <button class="btn btn-danger btn-sm" id="media-bulk-delete-btn" style="display:none;" onclick="bulkDeleteMedia()">Delete Selected</button>
    </div>
  `;
  const panel = document.querySelector('#media-section .table-panel');
  if (panel && !document.getElementById('media-filters')) {
    const filterDiv = document.createElement('div');
    filterDiv.id = 'media-filters';
    filterDiv.innerHTML = filterHTML;
    panel.insertBefore(filterDiv, panel.firstChild);
  }
}

async function handleMediaUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // Validate files
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  for (let file of files) {
    if (!validTypes.includes(file.type)) {
      showToast(`❌ ${file.name}: Invalid file type. Only images, PDF, and DOC are allowed.`, 'error');
      event.target.value = '';
      return;
    }
    if (file.size > maxSize) {
      showToast(`❌ ${file.name}: File too large (max 10MB).`, 'error');
      event.target.value = '';
      return;
    }
  }

  const folder = document.getElementById('media-folder-filter').value;
  const uploadFolder = folder === 'all' ? 'root' : folder;
  
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  formData.append('folder', uploadFolder);

  try {
    showToast(`Uploading ${files.length} file(s)...`, 'info');
    
    const res = await fetch('/api/admin/media/upload', {
      method: 'POST',
      body: formData
    });
    
    const json = await res.json();
    if (json.success) {
      showToast(`✅ Successfully uploaded ${json.data.length} file(s)`, 'success');
      loadMedia();
    } else {
      showToast(json.message || 'Upload failed', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred during upload', 'error');
  } finally {
    event.target.value = '';
  }
}

async function bulkDeleteMedia() {
  const checked = document.querySelectorAll('.media-bulk-check:checked');
  if (checked.length === 0) {
    showToast('No files selected', 'warning');
    return;
  }
  if (!confirm(`Delete ${checked.length} file(s)? This action cannot be undone.`)) return;
  
  const ids = Array.from(checked).map(c => parseInt(c.value));
  try {
    const res = await fetch('/api/admin/media/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`${json.deletedCount} file(s) deleted successfully`, 'success');
      loadMedia(window.mediaState.currentPage);
    } else {
      showToast(json.message || 'Failed to delete', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

function showFolderModal() {
  const folderName = prompt('Enter folder name (e.g., hotels, products):');
  if (!folderName || !folderName.trim()) return;
  
  const parentFolder = prompt('Enter parent folder (leave empty for root):');
  createMediaFolder(folderName.trim(), parentFolder?.trim() || '');
}

async function createMediaFolder(folderName, parentFolder) {
  try {
    const res = await fetch('/api/admin/media/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_name: folderName,
        parent_folder: parentFolder || null
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`✅ Folder "${json.folder}" created successfully`, 'success');
      // Reload folder filter dropdown
      loadMediaFolders();
    } else {
      showToast(json.message || 'Failed to create folder', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function loadMediaFolders() {
  try {
    const res = await fetch('/api/admin/media/folders/list');
    const json = await res.json();
    if (json.success && json.data) {
      const select = document.getElementById('media-folder-filter');
      const currentValue = select.value;
      select.innerHTML = json.data.map(f => `<option value="${f}">${f}</option>`).join('');
      select.value = currentValue;
    }
  } catch (err) {
    console.error('Failed to load folders', err);
  }
}

function copyMediaUrl(url) {
  // Construct absolute URL based on current origin
  const fullUrl = window.location.origin + url;
  navigator.clipboard.writeText(fullUrl).then(() => {
    showToast('URL copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy: ', err);
    showToast('Failed to copy URL', 'error');
  });
}

async function renameMedia(id, currentName, currentFolder) {
  const newName = prompt("Enter new filename:", currentName);
  if (newName === null) return; // User cancelled
  
  const newFolder = prompt("Enter folder (e.g., root, hotels, posts):", currentFolder);
  if (newFolder === null) return;

  if (newName.trim() === '') {
    showToast('Filename cannot be empty', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/media/${id}/rename`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ original_name: newName.trim(), folder: newFolder.trim() || 'root' })
    });
    
    const json = await res.json();
    if (json.success) {
      showToast('Media updated', 'success');
      loadMedia();
    } else {
      showToast(json.message || 'Failed to rename', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function deleteMedia(id) {
  if (!confirm('Are you sure you want to completely delete this file? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/media/${id}`, {
      method: 'DELETE'
    });
    
    const json = await res.json();
    if (json.success) {
      showToast('File deleted', 'success');
      loadMedia();
    } else {
      showToast(json.message || 'Failed to delete', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

/* ================================================================
   SYSTEM SETTINGS SECTION
   ================================================================ */

function switchSettingsTab(tabName) {
  // Update Buttons
  document.querySelectorAll('.settings-tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // Update Content
  document.querySelectorAll('.settings-tab-content').forEach(content => content.style.display = 'none');
  document.getElementById('settings-tab-' + tabName).style.display = 'block';
}

async function loadSettings() {
  try {
    const res = await fetch('/api/admin/settings');
    const json = await res.json();
    
    if (json.success && json.data) {
      const form = document.getElementById('settings-form');
      
      // Auto-fill all inputs based on 'name' attribute matching the setting_key
      for (const [key, value] of Object.entries(json.data)) {
        const input = form.elements[key];
        if (input) {
          if (input.type === 'checkbox') {
            input.checked = (value === 'true' || value === '1');
          } else {
            input.value = value;
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
    showToast('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const btn = document.getElementById('settings-save-btn');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const form = document.getElementById('settings-form');
    
    const settingsPayload = {};
    
    // Grab all explicit form elements
    Array.from(form.elements).forEach(element => {
      if (element.name && !element.disabled) {
        if (element.type === 'checkbox') {
          settingsPayload[element.name] = element.checked ? 'true' : 'false';
        } else {
          settingsPayload[element.name] = element.value;
        }
      }
    });

    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsPayload)
    });
    
    const json = await res.json();
    if (json.success) {
      showToast('Settings updated successfully', 'success');
      loadSettings(); // Reload to ensure sync
    } else {
      showToast(json.message || 'Failed to update settings', 'error');
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
    showToast('An error occurred while saving', 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

/* ================================================================
   NOTIFICATIONS SECTION
   ================================================================ */

async function loadNotifications() {
  const list = document.getElementById('notifications-list');
  const badge = document.getElementById('sidebar-notifications-badge');
  
  if (!list) return;

  try {
    list.innerHTML = '<div style="text-align: center; color: var(--admin-text-muted);">Loading notifications...</div>';
    
    const res = await fetch('/api/admin/notifications');
    const json = await res.json();
    
    if (!json.success) {
      list.innerHTML = '<div style="text-align: center; color: #ef4444;">Failed to load notifications.</div>';
      return;
    }

    // Update Sidebar Badge
    if (json.unreadCount > 0) {
      if (badge) {
        badge.textContent = json.unreadCount;
        badge.style.display = 'inline-block';
      }
      const navbarDot = document.getElementById('navbar-notification-dot');
      if (navbarDot) navbarDot.style.display = 'inline-block';
    } else {
      if (badge) badge.style.display = 'none';
      
      const badgeHotels = document.getElementById('badge-hotels');
      if (badgeHotels) badgeHotels.style.display = 'none';
      
      const badgeBookings = document.getElementById('badge-bookings');
      if (badgeBookings) badgeBookings.style.display = 'none';
      
      const navbarDot = document.getElementById('navbar-notification-dot');
      if (navbarDot) navbarDot.style.display = 'none';
    }

    if (!json.data || json.data.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--admin-text-muted); padding: 24px;">No notifications found.</div>';
      return;
    }

    list.innerHTML = json.data.map(n => {
      let icon = 'fa-bell';
      let iconColor = '#94a3b8';
      
      if (n.type === 'booking') { icon = 'fa-calendar-check'; iconColor = '#3b82f6'; }
      if (n.type === 'payment') { icon = 'fa-credit-card'; iconColor = '#10b981'; }
      if (n.type === 'review') { icon = 'fa-star'; iconColor = '#f59e0b'; }
      if (n.type === 'system') { icon = 'fa-gear'; iconColor = '#8b5cf6'; }

      const isUnread = !n.is_read || n.is_read === 0;
      
      return `
        <div class="notification-card" id="notif-card-${n.id}" style="
          display: flex; 
          align-items: flex-start; 
          padding: 16px; 
          border: 1px solid var(--admin-border); 
          border-radius: 8px; 
          background: ${isUnread ? 'var(--admin-primary-subtle)' : 'var(--admin-surface)'};
          transition: background 0.3s;
        ">
          <div style="
            width: 40px; height: 40px; 
            border-radius: 50%; 
            background: ${iconColor}20; 
            color: ${iconColor}; 
            display: flex; align-items: center; justify-content: center; 
            font-size: 1.1rem; 
            margin-right: 16px;
            flex-shrink: 0;
          ">
            <i class="fa-solid ${icon}"></i>
          </div>
          
          <div style="flex-grow: 1;">
            <div style="font-weight: ${isUnread ? '600' : '500'}; margin-bottom: 4px;">${n.title}</div>
            <div style="font-size: 0.9rem; color: ${isUnread ? 'var(--admin-text)' : 'var(--admin-text-secondary)'}; margin-bottom: 8px;">
              ${n.message}
            </div>
            <div style="font-size: 0.8rem; color: var(--admin-text-muted);">
              ${new Date(n.created_at).toLocaleString()}
            </div>
          </div>
          
          ${isUnread ? `
            <button class="btn btn-secondary btn-sm" style="margin-left: 16px; flex-shrink: 0;" onclick="markAsRead(${n.id})" title="Mark as read">
              <i class="fa-solid fa-check"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    list.innerHTML = '<div style="text-align: center; color: #ef4444;">Failed to load notifications.</div>';
  }
}

async function markAsRead(id) {
  try {
    const res = await fetch(`/api/admin/notifications/${id}/read`, {
      method: 'PATCH'
    });
    const json = await res.json();
    
    if (json.success) {
      // Visually update the card without reloading everything
      const card = document.getElementById(`notif-card-${id}`);
      if (card) {
        card.style.background = 'var(--admin-surface)';
        const title = card.querySelector('div[style*="font-weight: 600"]');
        if (title) title.style.fontWeight = '500';
        const msg = card.querySelector('div[style*="font-size: 0.9rem"]');
        if (msg) msg.style.color = 'var(--admin-text-secondary)';
        
        const btn = card.querySelector('button');
        if (btn) btn.remove();
      }
      
      // Decrement sidebar badge visually
      const badge = document.getElementById('sidebar-notifications-badge');
      if (badge && badge.style.display !== 'none') {
        let currentCount = parseInt(badge.textContent, 10);
        if (!isNaN(currentCount) && currentCount > 1) {
          badge.textContent = currentCount - 1;
        } else {
          badge.style.display = 'none';
        }
      }
    } else {
      showToast('Failed to mark as read', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function markAllAsRead() {
  try {
    const res = await fetch('/api/admin/notifications/mark-all-read', {
      method: 'PATCH'
    });
    const json = await res.json();
    
    if (json.success) {
      showToast('All notifications marked as read', 'success');
      // Set badges to 0 immediately
      const badge = document.getElementById('sidebar-notifications-badge');
      if (badge) badge.style.display = 'none';
      
      const badgeHotels = document.getElementById('badge-hotels');
      if (badgeHotels) badgeHotels.style.display = 'none';
      
      const badgeBookings = document.getElementById('badge-bookings');
      if (badgeBookings) badgeBookings.style.display = 'none';
      
      const navbarDot = document.getElementById('navbar-notification-dot');
      if (navbarDot) navbarDot.style.display = 'none';
      
      // Reload list to update visuals
      loadNotifications();
    } else {
      showToast('Failed to mark all as read', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

/* ================================================================
   SUPPORT TICKETS SECTION
   ================================================================ */

let currentTicketId = null;

async function loadTickets() {
  const tbody = document.getElementById('tickets-table-body');
  if (!tbody) return;

  const searchQuery = document.getElementById('ticket-search')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('ticket-status-filter')?.value || '';

  try {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading...</td></tr>';
    
    const res = await fetch('/api/admin/tickets');
    const json = await res.json();
    
    if (json.success && json.data) {
      let filtered = json.data;

      if (searchQuery) {
        filtered = filtered.filter(t => 
          (t.id && t.id.toLowerCase().includes(searchQuery)) ||
          (t.subject && t.subject.toLowerCase().includes(searchQuery)) ||
          (t.customer_name && t.customer_name.toLowerCase().includes(searchQuery))
        );
      }

      if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No tickets found.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(t => {
        let statusBadge = '';
        if (t.status === 'open') statusBadge = '<span class="status-badge status-pending">Open</span>';
        else if (t.status === 'in_progress') statusBadge = '<span class="status-badge status-approved" style="background:#3b82f620; color:#3b82f6;">In Progress</span>';
        else if (t.status === 'resolved') statusBadge = '<span class="status-badge status-approved">Resolved</span>';
        else statusBadge = '<span class="status-badge" style="background:#e2e8f0; color:#64748b;">Closed</span>';

        let priorityColor = 'var(--admin-text)';
        if (t.priority === 'urgent') priorityColor = '#ef4444';
        else if (t.priority === 'high') priorityColor = '#f59e0b';
        else if (t.priority === 'low') priorityColor = '#94a3b8';

        return `
          <tr>
            <td style="font-weight: 600;">${t.id}</td>
            <td>
              <div style="font-weight:500;">${t.customer_name || 'Unknown'}</div>
              <div style="font-size:0.85rem; color:var(--admin-text-secondary);">${t.customer_email || ''}</div>
            </td>
            <td>${t.subject}</td>
            <td style="color: ${priorityColor}; font-weight:500; text-transform:capitalize;">${t.priority}</td>
            <td>${statusBadge}</td>
            <td style="font-size:0.9rem; color:var(--admin-text-secondary);">${new Date(t.updated_at).toLocaleString()}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="openTicketPanel('${t.id}')">View</button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Failed to load.</td></tr>';
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading tickets.</td></tr>';
  }
}

function closeTicketPanel() {
  document.getElementById('ticket-panel').classList.remove('open');
  document.getElementById('ticket-panel-overlay').classList.remove('open');
  currentTicketId = null;
}

async function openTicketPanel(id) {
  currentTicketId = id;
  const chatBody = document.getElementById('tp-chat-body');
  
  try {
    chatBody.innerHTML = '<div style="text-align:center; padding: 20px;">Loading conversation...</div>';
    
    // Open panel immediately for better UX
    document.getElementById('ticket-panel').classList.add('open');
    document.getElementById('ticket-panel-overlay').classList.add('open');

    const res = await fetch(`/api/admin/tickets/${id}`);
    const json = await res.json();
    
    if (json.success) {
      const ticket = json.data.ticket;
      const messages = json.data.messages;

      // Update Header
      document.getElementById('tp-subject').textContent = ticket.subject;
      document.getElementById('tp-customer').textContent = `${ticket.customer_name || 'Unknown'} (${ticket.id})`;
      
      // Update Selects
      document.getElementById('tp-id').value = ticket.id;
      document.getElementById('tp-status').value = ticket.status;
      document.getElementById('tp-priority').value = ticket.priority;

      // Render Chat Bubbles
      if (messages.length === 0) {
        chatBody.innerHTML = '<div style="text-align:center; color:var(--admin-text-muted);">No messages yet.</div>';
      } else {
        chatBody.innerHTML = messages.map(m => {
          const isAdmin = m.sender_type === 'admin';
          return `
            <div style="display: flex; justify-content: ${isAdmin ? 'flex-end' : 'flex-start'};">
              <div style="
                max-width: 80%;
                padding: 12px 16px;
                border-radius: 12px;
                background: ${isAdmin ? 'var(--admin-primary)' : 'white'};
                color: ${isAdmin ? 'white' : 'var(--admin-text)'};
                border: ${isAdmin ? 'none' : '1px solid var(--admin-border)'};
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
              ">
                <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 4px; opacity: ${isAdmin ? '0.9' : '0.6'};">
                  ${isAdmin ? 'Support Team' : (ticket.customer_name || 'Customer')}
                </div>
                <div style="line-height: 1.5; font-size: 0.95rem;">
                  ${m.message.replace(/\n/g, '<br>')}
                </div>
                <div style="font-size: 0.75rem; margin-top: 6px; text-align: right; opacity: ${isAdmin ? '0.8' : '0.5'};">
                  ${new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Auto scroll to bottom
      chatBody.scrollTop = chatBody.scrollHeight;

    } else {
      chatBody.innerHTML = `<div style="text-align:center; color:red;">${json.message || 'Failed to load ticket'}</div>`;
    }
  } catch (err) {
    console.error(err);
    chatBody.innerHTML = '<div style="text-align:center; color:red;">An error occurred.</div>';
  }
}

async function replyTicket() {
  if (!currentTicketId) return;
  
  const textarea = document.getElementById('tp-reply-text');
  const message = textarea.value.trim();
  
  if (!message) {
    showToast('Please type a reply', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/admin/tickets/${currentTicketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const json = await res.json();
    
    if (json.success) {
      textarea.value = '';
      // Reload chat seamlessly
      openTicketPanel(currentTicketId);
      loadTickets(); // Refresh background table timestamp
    } else {
      showToast(json.message || 'Failed to send reply', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

async function updateTicketStatus() {
  if (!currentTicketId) return;
  
  const status = document.getElementById('tp-status').value;
  const priority = document.getElementById('tp-priority').value;

  try {
    const res = await fetch(`/api/admin/tickets/${currentTicketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, priority })
    });
    const json = await res.json();
    
    if (json.success) {
      showToast('Ticket updated', 'success');
      loadTickets(); // Refresh background table
    } else {
      showToast(json.message || 'Failed to update', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('An error occurred', 'error');
  }
}

/* ================================================================
   AUDIT LOGS SECTION
   ================================================================ */

let allAuditLogs = [];

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-logs-table-body');
  if (!tbody) return;

  const entityFilter = document.getElementById('audit-entity-filter')?.value || '';
  const actionFilter = document.getElementById('audit-action-filter')?.value || '';

  try {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    
    let url = '/api/admin/audit-logs?';
    if (entityFilter) url += `entity_type=${encodeURIComponent(entityFilter)}&`;
    if (actionFilter) url += `action=${encodeURIComponent(actionFilter)}`;

    const res = await fetch(url);
    const json = await res.json();
    
    if (json.success && json.data) {
      allAuditLogs = json.data;
      if (allAuditLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No logs found.</td></tr>';
        return;
      }

      tbody.innerHTML = allAuditLogs.map((log, index) => {
        let actionBadge = '';
        if (log.action.includes('CREATE')) actionBadge = '<span class="status-badge status-approved" style="background:#dcfce7; color:#16a34a;">' + log.action + '</span>';
        else if (log.action.includes('UPDATE')) actionBadge = '<span class="status-badge status-approved" style="background:#fef3c7; color:#d97706;">' + log.action + '</span>';
        else if (log.action.includes('DELETE')) actionBadge = '<span class="status-badge status-approved" style="background:#fee2e2; color:#dc2626;">' + log.action + '</span>';
        else actionBadge = '<span class="status-badge" style="background:#e2e8f0; color:#475569;">' + log.action + '</span>';

        return `
          <tr>
            <td style="font-size:0.9rem; color:var(--admin-text-secondary);">${new Date(log.created_at).toLocaleString()}</td>
            <td>
              <div style="font-weight:500;">${log.admin_name || 'System'}</div>
              <div style="font-size:0.85rem; color:var(--admin-text-secondary);">${log.admin_email || ''}</div>
            </td>
            <td>${actionBadge}</td>
            <td style="font-weight:500; text-transform:capitalize;">${log.entity_type}</td>
            <td style="font-family: monospace;">${log.entity_id}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="openAuditPanel(${index})">View JSON</button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Failed to load logs.</td></tr>';
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error loading logs.</td></tr>';
  }
}

function openAuditPanel(index) {
  const log = allAuditLogs[index];
  if (!log) return;

  document.getElementById('ap-summary').textContent = `${log.action} - ${log.entity_type}`;
  document.getElementById('ap-date').textContent = new Date(log.created_at).toLocaleString();
  document.getElementById('ap-admin').value = log.admin_name ? `${log.admin_name} (${log.admin_email})` : 'System';
  document.getElementById('ap-entity-type').value = log.entity_type;
  document.getElementById('ap-entity-id').value = log.entity_id;
  
  // Format JSON
  let detailsText = '';
  if (log.details) {
    try {
      detailsText = JSON.stringify(log.details, null, 2);
    } catch (e) {
      detailsText = log.details;
    }
  } else {
    detailsText = 'No details provided.';
  }
  document.getElementById('ap-details').textContent = detailsText;

  document.getElementById('audit-panel').classList.add('open');
  document.getElementById('audit-panel-overlay').classList.add('open');
}

function closeAuditPanel() {
  document.getElementById('audit-panel').classList.remove('open');
  document.getElementById('audit-panel-overlay').classList.remove('open');
}
