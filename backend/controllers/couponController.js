import pool from '../connection.js';

export const getAdminCoupons = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ SQL Error in getAdminCoupons:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createCoupon = async (req, res) => {
    try {
        const { code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_hotel_id } = req.body;
        
        const query = `
            INSERT INTO coupons (code, discount_type, discount_value, max_uses, valid_from, valid_until, applicable_hotel_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            code.toUpperCase(), 
            discount_type, 
            discount_value, 
            max_uses, 
            valid_from, 
            valid_until, 
            applicable_hotel_id || null
        ];
        
        await pool.execute(query, params);
        res.status(201).json({ success: true, message: 'Coupon created successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Coupon code already exists' });
        }
        console.error('❌ SQL Error in createCoupon:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'UPDATE coupons SET is_active = NOT is_active WHERE id = ?';
        const [result] = await pool.execute(query, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        
        res.status(200).json({ success: true, message: 'Coupon status updated' });
    } catch (error) {
        console.error('❌ SQL Error in toggleCouponStatus:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const validateCoupon = async (req, res) => {
    try {
        const { code, hotel_id, order_amount } = req.body;
        
        const [rows] = await pool.execute('SELECT * FROM coupons WHERE code = ?', [code.toUpperCase()]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }
        
        const coupon = rows[0];
        
        if (!coupon.is_active) {
            return res.status(400).json({ success: false, message: 'This coupon is no longer active' });
        }
        
        const now = new Date();
        if (now > new Date(coupon.valid_until)) {
            return res.status(400).json({ success: false, message: 'This coupon has expired' });
        }
        
        if (coupon.used_count >= coupon.max_uses) {
            return res.status(400).json({ success: false, message: 'This coupon has reached its maximum usage limit' });
        }
        
        if (coupon.applicable_hotel_id !== null && parseInt(coupon.applicable_hotel_id) !== parseInt(hotel_id)) {
            return res.status(400).json({ success: false, message: 'This coupon is not valid for the selected hotel' });
        }
        
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = (parseFloat(order_amount) * parseFloat(coupon.discount_value)) / 100;
        } else if (coupon.discount_type === 'fixed') {
            discount = parseFloat(coupon.discount_value);
        }
        
        // Prevent discount from being greater than order amount
        discount = Math.min(discount, parseFloat(order_amount));
        
        res.status(200).json({ 
            success: true, 
            discount: discount.toFixed(2),
            message: 'Coupon applied successfully!'
        });
        
    } catch (error) {
        console.error('❌ SQL Error in validateCoupon:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getPublicCoupons = async (req, res) => {
    try {
        const query = `
            SELECT code, discount_type AS type, discount_value AS value 
            FROM coupons 
            WHERE is_active = 1 AND valid_until >= CURRENT_DATE()
        `;
        const [rows] = await pool.execute(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ SQL Error in getPublicCoupons:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
