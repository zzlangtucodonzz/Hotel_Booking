import pool from '../connection.js';

// 1. GET /api/admin/posts
export const getPosts = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, title, slug, status, updated_at, created_at FROM posts ORDER BY created_at DESC');
        res.status(200).json({ success: true, data: rows });
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
