import pool from '../connection.js';

export const getAdminCustomers = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.UserID, u.Email, u.FullName, u.PhoneNumber, 
                u.AvatarURL, u.IsActive, u.MembershipTier, u.CreatedAt,
                COUNT(b.id) AS total_bookings,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS total_spent
            FROM users u
            LEFT JOIN bookings b ON u.UserID = b.UserID
            GROUP BY u.UserID
            ORDER BY u.CreatedAt DESC
        `;
        const [rows] = await pool.execute(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('❌ SQL Error in getAdminCustomers:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getCustomerDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Get user profile
        const userQuery = `
            SELECT UserID, Email, FullName, PhoneNumber, AvatarURL, IsActive, MembershipTier, CreatedAt 
            FROM users WHERE UserID = ?
        `;
        const [users] = await pool.execute(userQuery, [id]);
        
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const user = users[0];
        
        // 2. Get booking history
        const bookingQuery = `
            SELECT id, hotel_id, check_in_date, check_out_date, total_amount, payment_status, booking_status, created_at 
            FROM bookings 
            WHERE UserID = ? 
            ORDER BY created_at DESC
        `;
        const [bookings] = await pool.execute(bookingQuery, [id]);
        
        // 3. Try to get reviews (wrap in try-catch in case reviews table doesn't exist)
        let reviews = [];
        try {
            const reviewQuery = `
                SELECT id, hotel_id, rating, comment, created_at 
                FROM reviews 
                WHERE UserID = ? 
                ORDER BY created_at DESC
            `;
            const [reviewRows] = await pool.execute(reviewQuery, [id]);
            reviews = reviewRows;
        } catch (e) {
            // reviews table might not exist yet, just ignore
            reviews = [];
        }
        
        res.status(200).json({ 
            success: true, 
            data: {
                profile: user,
                booking_history: bookings,
                reviews: reviews
            } 
        });
    } catch (error) {
        console.error('❌ SQL Error in getCustomerDetails:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const toggleCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'UPDATE users SET IsActive = NOT IsActive WHERE UserID = ?';
        const [result] = await pool.execute(query, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.status(200).json({ success: true, message: 'Customer status updated' });
    } catch (error) {
        console.error('❌ SQL Error in toggleCustomerStatus:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
