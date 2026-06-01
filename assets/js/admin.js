/* ================================================================
   Wanderly Admin Dashboard — Interactive Logic
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initSidebarNavigation();
  initCountUpAnimations();
  initRevenueChart();
  initBookingChart();
  initFilterModal();
  initExportButton();
  initMobileMenu();
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
   SIDEBAR NAVIGATION — Active State
   ================================================================ */
function initSidebarNavigation() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}


/* ================================================================
   COUNT-UP ANIMATION for stat values
   ================================================================ */
function initCountUpAnimations() {
  const counters = document.querySelectorAll('[data-count]');

  const animateCounter = (element) => {
    const target = parseFloat(element.dataset.count);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';
    const decimals = element.dataset.decimals ? parseInt(element.dataset.decimals) : 0;
    const duration = 1200;
    const startTime = performance.now();

    const update = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = target * easeOut;

      element.textContent = prefix + formatNumber(currentValue, decimals) + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  };

  // IntersectionObserver for triggering when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(counter => observer.observe(counter));
}

function formatNumber(num, decimals = 0) {
  if (decimals > 0) {
    return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return Math.round(num).toLocaleString('en-US');
}


/* ================================================================
   REVENUE CHART (Chart.js)
   ================================================================ */
function initRevenueChart() {
  const canvas = document.getElementById('revenue-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

  const revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [
        {
          label: 'Revenue 2026',
          data: [42800, 38200, 51600, 47900, 58400, 65200, 71800, 68500, 74200, 69800, 78500, 84200],
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
          label: 'Revenue 2025',
          data: [31200, 28600, 35400, 40200, 44800, 48900, 52400, 49800, 55100, 58200, 62400, 67800],
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

  // Chart tab switching
  document.querySelectorAll('#revenue-chart-tabs .chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#revenue-chart-tabs .chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  return revenueChart;
}


/* ================================================================
   BOOKING TRENDS CHART
   ================================================================ */
function initBookingChart() {
  const canvas = document.getElementById('booking-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');

  const bookingChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Confirmed',
          data: [18, 22, 16, 25, 32, 38, 28],
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7,
        },
        {
          label: 'Pending',
          data: [6, 8, 5, 9, 12, 14, 10],
          backgroundColor: '#f59e0b',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7,
        },
        {
          label: 'Cancelled',
          data: [2, 3, 1, 2, 4, 3, 2],
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

  return bookingChart;
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
   EXPORT BUTTON
   ================================================================ */
function initExportButton() {
  const exportBtn = document.getElementById('btn-export-report');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    showToast('Report exported as CSV');
  });
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
