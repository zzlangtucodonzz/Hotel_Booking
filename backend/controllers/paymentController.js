import crypto from 'crypto';
import payos from '../config/payos.js';
import { createPayment, updatePaymentStatus } from '../models/paymentModel.js';
import pool from '../connection.js';

export const createPaymentLink = async (req, res) => {
    try {
        const { booking_id, amount, description, cancelUrl, returnUrl } = req.body;

        // 1. Validate fields
        if (!booking_id || !amount || !description || !cancelUrl || !returnUrl) {
            return res.status(400).json({ error: 'Missing required fields for payment.' });
        }

        // 2. Generate orderCode
        const orderCode = Number(String(Date.now()).slice(-6)) + Math.floor(Math.random() * 1000);
        const transaction_code = crypto.randomUUID();

        // 3. Save to database
        await createPayment({
            booking_id,
            transaction_code,
            amount,
            gateway: 'payOS',
            payos_order_code: orderCode
        });

        // 4. Cấu trúc Payload
        const payload = {
            orderCode: orderCode,
            amount: Number(amount),
            description: description.substring(0, 25),
            cancelUrl: cancelUrl,
            returnUrl: returnUrl,
            items: [
                {
                    name: "Hotel Booking",
                    quantity: 1,
                    price: Number(amount)
                }
            ]
        };

        console.log("PAYLOAD GỬI ĐẾN PAYOS:", JSON.stringify(payload, null, 2));

        // 5. Gọi hàm chuẩn SDK mới: paymentRequests.create
        const paymentLink = await payos.paymentRequests.create(payload);

        return res.status(200).json({
            success: true,
            checkoutUrl: paymentLink.checkoutUrl,
            orderCode: orderCode
        });

    } catch (error) {
        console.error('❌ Error in createPaymentLink:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create payment link.'
        });
    }
};

export const handlePayOSWebhook = async (req, res) => {
    try {
        const webhookData = req.body;
        console.log("🔥 WEBHOOK ĐÃ VỀ TỚI SERVER:", JSON.stringify(webhookData, null, 2));

        let verifiedData;
        try {
            // Xác thực Webhook bằng hàm chuẩn SDK mới
            verifiedData = payos.webhooks.verify(webhookData);
        } catch (verificationError) {
            console.error("❌ Webhook Signature Invalid:", verificationError.message);
            return res.status(200).json({ success: false, message: "Invalid signature" });
        }

        // 2. Lấy orderCode cực kỳ an toàn (Dò tìm ở nhiều cấp độ object)
        const orderCode = verifiedData?.orderCode || webhookData.data?.orderCode;

        if (!orderCode) {
            console.error("❌ Lỗi: Không trích xuất được orderCode từ Webhook!");
            return res.status(200).json({ success: false, message: "Missing orderCode" });
        }

        // 3. Database Update
        await updatePaymentStatus(orderCode, 'SUCCESS');

        const updateBookingQuery = `
            UPDATE bookings 
            SET payment_status = 'paid', booking_status = 'confirmed' 
            WHERE id = (SELECT booking_id FROM payments WHERE payos_order_code = ?)
        `;

        await pool.execute(updateBookingQuery, [orderCode]);

        console.log(`✅ DATABASE ĐÃ CẬP NHẬT THÀNH CÔNG CHO ĐƠN HÀNG: ${orderCode}`);
        return res.status(200).json({ success: true, message: "Webhook received and processed" });

    } catch (error) {
        console.error('❌ Error in handlePayOSWebhook:', error);
        return res.status(200).json({ success: false, message: "Internal server error" });
    }
};

export const getAdminPayments = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = `
            SELECT p.id, p.payos_order_code, p.booking_id, p.amount, p.gateway, p.status, p.created_at 
            FROM payments p 
            LEFT JOIN bookings b ON p.booking_id = b.id
            WHERE p.is_archived = FALSE
        `;
        const queryParams = [];

        if (status) {
            query += ` AND p.status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (p.payos_order_code LIKE ? OR p.booking_id LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }
        
        query += ` ORDER BY p.created_at DESC`;

        const [payments] = await pool.execute(query, queryParams);

        // Calculate aggregated totals
        let totalRevenue = 0;
        let totalSuccessful = 0;
        let pendingTransactions = 0;
        let failedRefunded = 0;

        payments.forEach(payment => {
            if (payment.status === 'SUCCESS') {
                totalRevenue += Number(payment.amount);
                totalSuccessful++;
            } else if (payment.status === 'PENDING') {
                pendingTransactions++;
            } else if (payment.status === 'FAILED' || payment.status === 'REFUNDED') {
                failedRefunded++;
            }
        });

        res.status(200).json({
            success: true,
            data: payments,
            stats: {
                totalRevenue,
                totalSuccessful,
                pendingTransactions,
                failedRefunded
            }
        });
    } catch (error) {
        // Detailed error logging
        console.error('❌ SQL Error in getAdminPayments:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const archivePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'UPDATE payments SET is_archived = TRUE WHERE id = ?';
        const [result] = await pool.execute(query, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        res.status(200).json({ success: true, message: 'Payment archived successfully' });
    } catch (error) {
        console.error('❌ SQL Error in archivePayment:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};