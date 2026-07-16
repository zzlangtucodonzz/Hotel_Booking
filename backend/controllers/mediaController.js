import pool from '../connection.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup multer storage
const uploadDir = path.join(__dirname, '../../uploads/media');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

export const uploadMediaMiddleware = multer({ storage: storage }).array('files', 10);

// 1. GET /api/admin/media
export const getMedia = async (req, res) => {
    try {
        const { folder } = req.query;
        let query = 'SELECT * FROM media';
        let params = [];
        
        if (folder && folder !== 'all') {
            query += ' WHERE folder = ?';
            params.push(folder);
        }
        
        query += ' ORDER BY created_at DESC';
        const [rows] = await pool.execute(query, params);
        
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('SQL Error in getMedia:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. POST /api/admin/media/upload
export const uploadMedia = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const folder = req.body.folder || 'root';
        const uploadedFiles = [];

        for (const file of req.files) {
            const filePath = `/uploads/media/${file.filename}`;
            const [result] = await pool.execute(
                'INSERT INTO media (filename, original_name, file_path, folder, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)',
                [file.filename, file.originalname, filePath, folder, file.mimetype, file.size]
            );
            uploadedFiles.push({
                id: result.insertId,
                filename: file.filename,
                original_name: file.originalname,
                file_path: filePath,
                folder,
                mime_type: file.mimetype,
                size_bytes: file.size
            });
        }

        res.status(201).json({ success: true, message: 'Files uploaded successfully', data: uploadedFiles });
    } catch (error) {
        console.error('Error in uploadMedia:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. PUT /api/admin/media/:id/rename
export const renameMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { original_name, folder } = req.body;
        
        if (!original_name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const [result] = await pool.execute(
            'UPDATE media SET original_name = ?, folder = COALESCE(?, folder) WHERE id = ?',
            [original_name, folder || null, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }
        
        res.status(200).json({ success: true, message: 'Media updated successfully' });
    } catch (error) {
        console.error('SQL Error in renameMedia:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 4. DELETE /api/admin/media/:id
export const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute('SELECT filename FROM media WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }
        
        const filename = rows[0].filename;
        const fullPath = path.join(__dirname, '../../uploads/media', filename);
        
        // Remove from db
        await pool.execute('DELETE FROM media WHERE id = ?', [id]);
        
        // Remove from filesystem
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
        
        res.status(200).json({ success: true, message: 'Media deleted successfully' });
    } catch (error) {
        console.error('Error in deleteMedia:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
