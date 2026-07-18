import pool from '../connection.js';

// 1. GET /api/admin/posts (with pagination, search, filter)
export const getPosts = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 10);
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const search = req.query.search;

        let query = 'SELECT id, title, slug, status, updated_at, created_at FROM posts WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM posts WHERE 1=1';
        let params = [];

        // Filter by status
        if (status && ['draft', 'published', 'archived'].includes(status)) {
            query += ' AND status = ?';
            countQuery += ' AND status = ?';
            params.push(status);
        }

        // Search by title or slug
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query += ' AND (title LIKE ? OR slug LIKE ?)';
            countQuery += ' AND (title LIKE ? OR slug LIKE ?)';
            params.push(searchTerm, searchTerm);
        }

        // Get total count
        const [[{ total }]] = await pool.execute(countQuery, params);

        // Get paginated results
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        const paramsWithPagination = [...params, limit, offset];
        const [rows] = await pool.execute(query, paramsWithPagination);

        res.status(200).json({
            success: true,
            data: rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('SQL Error in getPosts:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. GET /api/admin/posts/:id
export const getPostDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('SQL Error in getPostDetails:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. POST /api/admin/posts
export const createPost = async (req, res) => {
    try {
        const { title, slug, content, status, meta_title, meta_description } = req.body;
        
        if (!title || !slug) {
            return res.status(400).json({ success: false, message: 'Title and Slug are required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO posts (title, slug, content, status, meta_title, meta_description) VALUES (?, ?, ?, ?, ?, ?)',
            [title, slug, content || '', status || 'draft', meta_title || '', meta_description || '']
        );
        
        res.status(201).json({ success: true, message: 'Post created successfully', id: result.insertId });
    } catch (error) {
        console.error('SQL Error in createPost:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Slug already exists. Please choose a unique slug.' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 4. PUT /api/admin/posts/:id
export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, content, status, meta_title, meta_description } = req.body;
        
        if (!title || !slug) {
            return res.status(400).json({ success: false, message: 'Title and Slug are required' });
        }

        const [result] = await pool.execute(
            'UPDATE posts SET title = ?, slug = ?, content = ?, status = ?, meta_title = ?, meta_description = ? WHERE id = ?',
            [title, slug, content || '', status || 'draft', meta_title || '', meta_description || '', id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        res.status(200).json({ success: true, message: 'Post updated successfully' });
    } catch (error) {
        console.error('SQL Error in updatePost:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Slug already exists. Please choose a unique slug.' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 5. PATCH /api/admin/posts/:id/status
export const togglePostStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const [result] = await pool.execute('UPDATE posts SET status = ? WHERE id = ?', [status, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        res.status(200).json({ success: true, message: 'Post status updated successfully' });
    } catch (error) {
        console.error('SQL Error in togglePostStatus:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 6. DELETE /api/admin/posts/:id
export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.execute('DELETE FROM posts WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('SQL Error in deletePost:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 7. POST /api/admin/posts/bulk-delete
export const bulkDeletePosts = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Post IDs are required' });
        }

        // Create placeholders for the IN clause
        const placeholders = ids.map(() => '?').join(',');
        const [result] = await pool.execute(
            `DELETE FROM posts WHERE id IN (${placeholders})`,
            ids
        );
        
        res.status(200).json({ 
            success: true, 
            message: `${result.affectedRows} post(s) deleted successfully`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('SQL Error in bulkDeletePosts:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 8. GET /api/admin/posts/stats
export const getPostStats = async (req, res) => {
    try {
        const [[stats]] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
            FROM posts
        `);
        
        res.status(200).json({ success: true, data: stats || {} });
    } catch (error) {
        console.error('SQL Error in getPostStats:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
