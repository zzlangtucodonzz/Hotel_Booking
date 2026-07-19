import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Import database pool và hàm test kết nối
import pool, { testConnection } from './connection.js';

// 2. Import API Routes
import propertyRoutes from './routes/propertyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import roomTypeRoutes from './routes/roomTypeRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import amenityRoutes from './routes/amenityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import { getPublicCoupons } from './controllers/couponController.js';
import { getPublicPosts } from './controllers/cmsController.js';
import { verifyToken, verifyAdmin } from './middlewares/authMiddleware.js';

// Setup biến môi trường thư mục cho ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// Trust the reverse proxy (Ngrok/Nginx) to correctly read client IPs
app.set('trust proxy', true);

// Global anti-cache middleware for clean slate state management
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// --- Middleware ---
// Enable CORS for all routes to prevent cross-origin fetch errors on frontend
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh (HTML, CSS, JS) cho Frontend từ thư mục gốc
app.use(express.static(path.join(__dirname, '..')));

// Serve uploaded files (hotel images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- API Routes ---
app.use('/api/properties', propertyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/room-types', roomTypeRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/inventory', verifyToken, verifyAdmin, inventoryRoutes);
app.use('/api/payments', verifyToken, paymentRoutes);
app.use('/api/coupons', verifyToken, verifyAdmin, couponRoutes);

// --- Public API Routes ---
app.get('/api/public/coupons', getPublicCoupons);
app.get('/api/public/posts', getPublicPosts);

// --- Health Check Route ---
app.get('/api/health', async (_req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS status');
        res.json({ status: 'ok', database: 'connected', result: rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// --- Global Error Handler (Bắt mọi lỗi không mong muốn) ---
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    // Return structured JSON error response instead of crashing
    res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
});

// --- Khởi động Server ---
const startServer = async () => {
    try {
        // Đảm bảo Database kết nối thành công TRƯỚC KHI mở cổng server
        await testConnection();
        
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('\n💥 KHỞI ĐỘNG SERVER THẤT BẠI 💥');
        console.error('Vui lòng kiểm tra lại cấu hình kết nối Database trong file .env');
        console.error('Chi tiết lỗi:', error.message);
        process.exit(1); // Thoát ứng dụng an toàn
    }
};

startServer();