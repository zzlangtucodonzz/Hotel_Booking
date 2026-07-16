import pool from '../connection.js';

export const getAuditLogs = async (req, res) => {
    try {
        const { action, entity_type } = req.query;
        let query = `
            SELECT a.*, u.FullName as admin_name, u.Email as admin_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.UserID
            WHERE 1=1
        `;
        const params = [];

        if (action) {
            query += ` AND a.action = ?`;
            params.push(action);
        }
        if (entity_type) {
            query += ` AND a.entity_type = ?`;
            params.push(entity_type);
        }

        query += ` ORDER BY a.created_at DESC`;

        const [rows] = await pool.execute(query, params);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('SQL Error in getAuditLogs:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
