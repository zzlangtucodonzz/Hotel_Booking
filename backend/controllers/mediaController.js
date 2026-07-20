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

// File validation
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folder = req.body.folder || 'root';
        const folderPath = path.join(uploadDir, folder);
        
        // Create folder if it doesn't exist
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        
        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
    }
    cb(null, true);
};

export const uploadMediaMiddleware = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: fileFilter
}).array('files', 10);

// 1. GET /api/admin/media (with pagination, search, filter)
export const getMedia = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const folder = req.query.folder;
        const search = req.query.search;

        let query = 'SELECT * FROM media WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM media WHERE 1=1';
        let params = [];

        if (folder && folder !== 'all') {
            query += ' AND folder = ?';
            countQuery += ' AND folder = ?';
            params.push(folder);
        }

        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query += ' AND original_name LIKE ?';
            countQuery += ' AND original_name LIKE ?';
            params.push(searchTerm);
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
            const filePath = `/uploads/media/${folder}/${file.filename}`;
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
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
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
        
        const [rows] = await pool.execute('SELECT filename, folder FROM media WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Media not found' });
        }
        
        const { filename, folder } = rows[0];
        const fullPath = path.join(__dirname, '../../uploads/media', folder || 'root', filename);
        
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

// 5. POST /api/admin/media/bulk-delete
export const bulkDeleteMedia = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'Media IDs are required' });
        }

        // Get files info
        const placeholders = ids.map(() => '?').join(',');
        const [files] = await pool.execute(
            `SELECT filename, folder FROM media WHERE id IN (${placeholders})`,
            ids
        );

        // Delete from filesystem
        files.forEach(file => {
            const fullPath = path.join(__dirname, '../../uploads/media', file.folder || 'root', file.filename);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        });

        // Delete from database
        const [result] = await pool.execute(
            `DELETE FROM media WHERE id IN (${placeholders})`,
            ids
        );

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} file(s) deleted successfully`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('SQL Error in bulkDeleteMedia:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 6. POST /api/admin/media/folder (create folder)
export const createFolder = async (req, res) => {
    try {
        const { folder_name, parent_folder } = req.body;
        
        if (!folder_name || !folder_name.trim()) {
            return res.status(400).json({ success: false, message: 'Folder name is required' });
        }

        // Sanitize folder name
        const sanitizedName = folder_name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fullFolderPath = parent_folder 
            ? `${parent_folder}/${sanitizedName}`
            : sanitizedName;

        const fullPath = path.join(uploadDir, fullFolderPath);

        // Check if folder already exists
        if (fs.existsSync(fullPath)) {
            return res.status(400).json({ success: false, message: 'Folder already exists' });
        }

        // Create folder
        fs.mkdirSync(fullPath, { recursive: true });

        res.status(201).json({
            success: true,
            message: 'Folder created successfully',
            folder: fullFolderPath
        });
    } catch (error) {
        console.error('Error in createFolder:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 7. GET /api/admin/media/folders/list
export const listFolders = async (req, res) => {
    try {
        const folders = [];

        const getAllFolders = (dirPath, prefix = '') => {
            const files = fs.readdirSync(dirPath);
            
            files.forEach(file => {
                const fullPath = path.join(dirPath, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    const folderName = prefix ? `${prefix}/${file}` : file;
                    folders.push(folderName);
                    getAllFolders(fullPath, folderName);
                }
            });
        };

        getAllFolders(uploadDir);
        folders.unshift('root');

        res.status(200).json({ success: true, data: folders });
    } catch (error) {
        console.error('Error in listFolders:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 8. GET /api/admin/media/stats
export const getMediaStats = async (req, res) => {
    try {
        const [[stats]] = await pool.execute(`
            SELECT 
                COUNT(*) as total_files,
                SUM(size_bytes) as total_size,
                COUNT(DISTINCT folder) as total_folders,
                COUNT(DISTINCT SUBSTRING_INDEX(mime_type, '/', 1)) as file_types
            FROM media
        `);

        // Get file type distribution
        const [typeDistribution] = await pool.execute(`
            SELECT mime_type, COUNT(*) as count 
            FROM media 
            GROUP BY mime_type
        `);

        res.status(200).json({
            success: true,
            data: {
                ...stats,
                typeDistribution
            }
        });
    } catch (error) {
        console.error('SQL Error in getMediaStats:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
