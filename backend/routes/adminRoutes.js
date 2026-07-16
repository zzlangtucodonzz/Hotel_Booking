import { Router } from 'express';
import {
    getUnifiedStats,
    getDashboardStats,
    getRecentBookings,
    getDashboardRevenueChart,
    getDashboardBookingChart,
    getDashboardTopProperties,
    getExtraStats,
    exportDashboardCSV,
    getAnalyticsData
} from '../controllers/adminController.js';
import {
    getRevenueChart,
    getTopProperties,
    getLocationPerformance,
    getSatisfaction,
    exportAnalyticsCSV,
} from '../controllers/analyticsController.js';
import { getAdminPayments, archivePayment } from '../controllers/paymentController.js';
import { getAdminCoupons, createCoupon, toggleCouponStatus } from '../controllers/couponController.js';
import { getAdminCustomers, getCustomerDetails, toggleCustomerStatus } from '../controllers/customerController.js';
import { getRoles, createRole, updateRolePermissions, getStaff, assignRole } from '../controllers/roleController.js';
import { getPosts, getPostDetails, createPost, updatePost, togglePostStatus } from '../controllers/cmsController.js';
import { getAdminReviews, updateReviewStatus, updateReviewReply } from '../controllers/reviewController.js';
import { getMedia, uploadMedia, renameMedia, deleteMedia, uploadMediaMiddleware } from '../controllers/mediaController.js';
import { getSettings, bulkUpdateSettings } from '../controllers/settingController.js';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { getTickets, getTicketDetails, updateTicketStatus, replyTicket } from '../controllers/ticketController.js';
import { getAuditLogs } from '../controllers/auditLogController.js';

const router = Router();

// ── Dashboard ────────────────────────────────────────────────────
router.get('/stats', getUnifiedStats);

// GET /api/admin/dashboard/stats
router.get('/dashboard/stats', getDashboardStats);

// GET /api/admin/dashboard/recent-bookings
router.get('/dashboard/recent-bookings', getRecentBookings);

// GET /api/admin/dashboard/revenue-chart
router.get('/dashboard/revenue-chart', getDashboardRevenueChart);

// GET /api/admin/dashboard/booking-chart
router.get('/dashboard/booking-chart', getDashboardBookingChart);

// ── Analytics ────────────────────────────────────────────────────
// GET /api/admin/analytics
router.get('/analytics', getAnalyticsData);

// GET /api/admin/dashboard/top-properties
router.get('/dashboard/top-properties', getDashboardTopProperties);

// GET /api/admin/dashboard/extra-stats
router.get('/dashboard/extra-stats', getExtraStats);

// ── Payments ─────────────────────────────────────────────────────
// GET /api/admin/payments
router.get('/payments', getAdminPayments);

// PATCH /api/admin/payments/:id/archive
router.patch('/payments/:id/archive', archivePayment);

// ── Coupons ──────────────────────────────────────────────────────
router.get('/coupons', getAdminCoupons);
router.post('/coupons', createCoupon);
router.patch('/coupons/:id/toggle', toggleCouponStatus);

// ── Customers ────────────────────────────────────────────────────
router.get('/customers', getAdminCustomers);
router.get('/customers/:id/details', getCustomerDetails);
router.patch('/customers/:id/toggle-status', toggleCustomerStatus);

// ── Roles & Permissions ──────────────────────────────────────────
router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRolePermissions);
router.get('/staff', getStaff);
router.post('/staff/assign', assignRole);

// ── CMS (Pages/Blogs) ──────────────────────────────────────────
router.get('/posts', getPosts);
router.get('/posts/:id', getPostDetails);
router.post('/posts', createPost);
router.put('/posts/:id', updatePost);
router.patch('/posts/:id/status', togglePostStatus);

// ── Reviews (Moderation & Stats) ─────────────────────────────────
router.get('/reviews', getAdminReviews);
router.patch('/reviews/:id/status', updateReviewStatus);
router.post('/reviews/:id/reply', updateReviewReply);

// ── Media Manager ────────────────────────────────────────────────
router.get('/media', getMedia);
router.post('/media/upload', uploadMediaMiddleware, uploadMedia);
router.put('/media/:id/rename', renameMedia);
router.delete('/media/:id', deleteMedia);

// ── System Settings ──────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings', bulkUpdateSettings);

// ── Notifications ────────────────────────────────────────────────
router.get('/notifications', getNotifications);
router.patch('/notifications/mark-all-read', markAllAsRead);
router.patch('/notifications/:id/read', markAsRead);

// ── Tickets ──────────────────────────────────────────────────────
router.get('/tickets', getTickets);
router.get('/tickets/:id', getTicketDetails);
router.patch('/tickets/:id/status', updateTicketStatus);
router.post('/tickets/:id/reply', replyTicket);

// ── Audit Logs ───────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogs);

// ── Analytics ────────────────────────────────────────────────────
// GET /api/admin/analytics/revenue-chart
router.get('/analytics/revenue-chart', getRevenueChart);

// GET /api/admin/analytics/top-properties
router.get('/analytics/top-properties', getTopProperties);

// GET /api/admin/analytics/location-performance
router.get('/analytics/location-performance', getLocationPerformance);

// GET /api/admin/analytics/satisfaction
router.get('/analytics/satisfaction', getSatisfaction);

// ── Exports ──────────────────────────────────────────────────────
// GET /api/admin/export/dashboard-csv
router.get('/export/dashboard-csv', exportDashboardCSV);

// GET /api/admin/export/analytics-csv
router.get('/export/analytics-csv', exportAnalyticsCSV);

export default router;
