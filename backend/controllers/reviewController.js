import pool from '../connection.js';

// 1. GET /api/admin/reviews
export const getAdminReviews = async (req, res) => {
    try {
        // Fetch all reviews with user and hotel info
        const query = `
            SELECT r.id, r.hotel_id, r.user_id, r.rating, r.comment, r.status, r.admin_reply, r.created_at,
                   u.FullName as customer_name,
                   h.Name as hotel_name
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.UserID
            LEFT JOIN hotels h ON r.hotel_id = h.HotelID
            ORDER BY r.created_at DESC
        `;
        const [reviews] = await pool.execute(query);

        // Fetch stats
        const [[{ total_reviews, pending_reviews }]] = await pool.execute(`
            SELECT 
                COUNT(*) as total_reviews, 
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reviews 
            FROM reviews
        `);

        // Fetch average ratings per hotel
        const [avgRatings] = await pool.execute(`
            SELECT h.Name as hotel_name, AVG(r.rating) as average_rating 
            FROM reviews r
            LEFT JOIN hotels h ON r.hotel_id = h.HotelID
            GROUP BY r.hotel_id, h.Name
        `);

        const stats = {
            totalReviews: total_reviews || 0,
            pendingReviews: pending_reviews || 0,
            averageRatings: avgRatings
        };

        // Calculate overall average rating
        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, curr) => acc + Number(curr.rating), 0);
            stats.overallAverage = (sum / reviews.length).toFixed(1);
        } else {
            stats.overallAverage = 0;
        }

        res.status(200).json({ success: true, data: reviews, stats });
    } catch (error) {
        console.error('SQL Error in getAdminReviews:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. PATCH /api/admin/reviews/:id/status
export const updateReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['pending', 'approved', 'hidden'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const [result] = await pool.execute('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        res.status(200).json({ success: true, message: 'Review status updated successfully' });
    } catch (error) {
        console.error('SQL Error in updateReviewStatus:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. POST /api/admin/reviews/:id/reply
export const updateReviewReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_reply, status } = req.body;
        
        let query = 'UPDATE reviews SET admin_reply = ?';
        let params = [admin_reply];
        
        if (status) {
            query += ', status = ?';
            params.push(status);
        }
        
        query += ' WHERE id = ?';
        params.push(id);

        const [result] = await pool.execute(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        res.status(200).json({ success: true, message: 'Review reply saved successfully' });
    } catch (error) {
        console.error('SQL Error in updateReviewReply:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
