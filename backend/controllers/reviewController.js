import pool from '../connection.js';

// Public/Customer POST /api/reviews
export const createReview = async (req, res) => {
    try {
        const { hotel_id, rating, comment } = req.body;
        // User ID fallback to 1 for guest bookings if no user is found
        const user_id = req.user?.userId || req.body.userId || 1; 
        
        if (!hotel_id || !rating) {
            return res.status(400).json({ success: false, message: 'Hotel ID and Rating are required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO reviews (hotel_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)',
            [hotel_id, user_id, rating, comment || '', 'pending']
        );

        res.status(201).json({ success: true, message: 'Review submitted successfully', reviewId: result.insertId });
    } catch (error) {
        console.error('SQL Error in createReview:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 1. GET /api/admin/reviews (with pagination, filter, search)
export const getAdminReviews = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const rating = req.query.rating;
        const search = req.query.search;

        let query = `
            SELECT r.id, r.hotel_id, r.user_id, r.rating, r.comment, r.status, r.admin_reply, r.created_at,
                   u.FullName as customer_name,
                   h.Name as hotel_name
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.UserID
            LEFT JOIN properties h ON r.hotel_id = h.PropertyID
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM reviews r LEFT JOIN users u ON r.user_id = u.UserID LEFT JOIN properties h ON r.hotel_id = h.PropertyID WHERE 1=1';
        let params = [];

        // Filter by status
        if (status && ['pending', 'approved', 'hidden'].includes(status)) {
            query += ' AND r.status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
        }

        // Filter by rating
        if (rating && !isNaN(rating)) {
            query += ' AND r.rating = ?';
            countQuery += ' AND rating = ?';
            params.push(parseInt(rating));
        }

        // Search by customer name, hotel name, or comment
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query += ' AND (u.FullName LIKE ? OR h.Name LIKE ? OR r.comment LIKE ?)';
            countQuery += ' AND (FullName LIKE ? OR Name LIKE ? OR comment LIKE ?)';
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Get total count
        const [[{ total }]] = await pool.execute(countQuery, params);

        // Get paginated results
        query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
        const paramsWithPagination = [...params, limit, offset];
        const [reviews] = await pool.execute(query, paramsWithPagination);

        // Fetch stats
        const [[stats]] = await pool.execute(`
            SELECT 
                COUNT(*) as total_reviews, 
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reviews,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_reviews,
                ROUND(AVG(rating), 1) as average_rating,
                MIN(rating) as min_rating,
                MAX(rating) as max_rating
            FROM reviews
        `);

        // Rating distribution
        const [ratingDist] = await pool.execute(`
            SELECT rating, COUNT(*) as count 
            FROM reviews 
            GROUP BY rating 
            ORDER BY rating DESC
        `);

        const ratingDistribution = {};
        ratingDist.forEach(row => {
            ratingDistribution[row.rating] = row.count;
        });

        res.status(200).json({
            success: true,
            data: reviews,
            stats: {
                ...stats,
                ratingDistribution
            },
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
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

// 4. POST /api/admin/reviews/bulk-update-status
export const bulkUpdateReviewStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Review IDs are required' });
        }

        if (!['pending', 'approved', 'hidden'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const [result] = await pool.execute(
            `UPDATE reviews SET status = ? WHERE id IN (${placeholders})`,
            [status, ...ids]
        );
        
        res.status(200).json({
            success: true,
            message: `${result.affectedRows} review(s) status updated successfully`,
            updatedCount: result.affectedRows
        });
    } catch (error) {
        console.error('SQL Error in bulkUpdateReviewStatus:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 5. GET /api/admin/reviews/export/csv
export const exportReviewsCSV = async (req, res) => {
    try {
        const { status, rating } = req.query;
        let query = `
            SELECT r.id, r.rating, r.comment, r.status, r.admin_reply, r.created_at,
                   u.FullName as customer_name,
                   h.Name as hotel_name
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.UserID
            LEFT JOIN properties h ON r.hotel_id = h.PropertyID
            WHERE 1=1
        `;
        let params = [];

        if (status && ['pending', 'approved', 'hidden'].includes(status)) {
            query += ' AND r.status = ?';
            params.push(status);
        }

        if (rating && !isNaN(rating)) {
            query += ' AND r.rating = ?';
            params.push(parseInt(rating));
        }

        query += ' ORDER BY r.created_at DESC';
        const [reviews] = await pool.execute(query, params);

        // Generate CSV
        const headers = ['ID', 'Hotel', 'Customer', 'Rating', 'Comment', 'Status', 'Admin Reply', 'Date'];
        const rows = reviews.map(r => [
            r.id,
            r.hotel_name || 'N/A',
            r.customer_name || 'N/A',
            r.rating,
            `"${(r.comment || '').replace(/"/g, '""')}"`,
            r.status,
            `"${(r.admin_reply || '').replace(/"/g, '""')}"`,
            new Date(r.created_at).toLocaleDateString()
        ]);

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="reviews.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Error in exportReviewsCSV:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 6. GET /api/admin/reviews/stats
export const getReviewStats = async (req, res) => {
    try {
        const [[stats]] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as hidden,
                ROUND(AVG(rating), 1) as average_rating
            FROM reviews
        `);

        res.status(200).json({ success: true, data: stats || {} });
    } catch (error) {
        console.error('SQL Error in getReviewStats:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
