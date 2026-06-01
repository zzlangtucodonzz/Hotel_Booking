import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Import database pool và hàm test kết nối
import pool, { testConnection } from './connection.js';

// 2. Import API Routes
import propertyRoutes from './routes/propertyRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Setup biến môi trường thư mục cho ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 5000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ các file tĩnh (HTML, CSS, JS) cho Frontend từ thư mục gốc
app.use(express.static(path.join(__dirname, '..')));

// --- API Routes ---
app.use('/api/properties', propertyRoutes);
app.use('/api/auth', authRoutes);

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
    res.status(500).json({ success: false, message: 'Lỗi hệ thống (Internal Server Error)' });
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
        console.error('💥 Khởi động server thất bại:', error.message);
        process.exit(1); // Thoát ứng dụng nếu có lỗi nghiêm trọng
    }
};

startServer();