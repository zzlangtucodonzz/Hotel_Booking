import pool from '../connection.js';

// 1. GET /api/admin/tickets
export const getTickets = async (req, res) => {
    try {
        const query = `
            SELECT t.*, u.FullName as customer_name, u.Email as customer_email
            FROM support_tickets t
            LEFT JOIN users u ON t.user_id = u.UserID
            ORDER BY t.updated_at DESC
        `;
        const [rows] = await pool.execute(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('SQL Error in getTickets:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. GET /api/admin/tickets/:id
export const getTicketDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch ticket details
        const tQuery = `
            SELECT t.*, u.FullName as customer_name, u.Email as customer_email
            FROM support_tickets t
            LEFT JOIN users u ON t.user_id = u.UserID
            WHERE t.id = ?
        `;
        const [tickets] = await pool.execute(tQuery, [id]);
        
        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        
        // Fetch messages
        const [messages] = await pool.execute(
            'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
            [id]
        );
        
        res.status(200).json({ 
            success: true, 
            data: { 
                ticket: tickets[0], 
                messages 
            } 
        });
    } catch (error) {
        console.error('SQL Error in getTicketDetails:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. PATCH /api/admin/tickets/:id/status
export const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority } = req.body;
        
        const updates = [];
        const params = [];
        
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        if (priority) {
            updates.push('priority = ?');
            params.push(priority);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }
        
        params.push(id);
        
        const query = `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`;
        await pool.execute(query, params);
        
        res.status(200).json({ success: true, message: 'Ticket updated successfully' });
    } catch (error) {
        console.error('SQL Error in updateTicketStatus:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 4. POST /api/admin/tickets/:id/reply
export const replyTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // Insert message
            await connection.execute(
                'INSERT INTO ticket_messages (ticket_id, sender_type, message) VALUES (?, ?, ?)',
                [id, 'admin', message]
            );
            
            // Trigger update_at change for ordering
            await connection.execute(
                'UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
            
            await connection.commit();
            res.status(201).json({ success: true, message: 'Reply sent successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('SQL Error in replyTicket:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
