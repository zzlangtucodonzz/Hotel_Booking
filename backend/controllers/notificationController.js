import pool from '../connection.js';

// 1. GET /api/admin/notifications
export const getNotifications = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM notifications ORDER BY created_at DESC');
        
        let unreadCount = 0;
        rows.forEach(row => {
            // MySQL BOOLEAN is usually TINYINT(1) so it returns 0 or 1
            if (!row.is_read || row.is_read === 0) {
                unreadCount++;
            }
        });

        res.status(200).json({ success: true, data: rows, unreadCount });
    } catch (error) {
        console.error('SQL Error in getNotifications:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. PATCH /api/admin/notifications/:id/read
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('SQL Error in markAsRead:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. PATCH /api/admin/notifications/mark-all-read
export const markAllAsRead = async (req, res) => {
    try {
        await pool.execute('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
        res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('SQL Error in markAllAsRead:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
