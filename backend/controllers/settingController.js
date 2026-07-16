import pool from '../connection.js';

let settingsCache = null;

// Helper to mask sensitive data
const maskSensitiveData = (key, value) => {
    if (!value) return value;
    const lowerKey = key.toLowerCase();
    const isSensitive = lowerKey.includes('api_key') || 
                        lowerKey.includes('secret') || 
                        lowerKey.includes('password') || 
                        lowerKey.includes('token');
    
    if (isSensitive && value.length > 8) {
        return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
    } else if (isSensitive) {
        return '********';
    }
    return value;
};

// 1. GET /api/admin/settings
export const getSettings = async (req, res) => {
    try {
        if (settingsCache) {
            return res.status(200).json({ success: true, data: settingsCache });
        }

        const [rows] = await pool.execute('SELECT setting_key, setting_value FROM settings');
        
        // Convert to key-value object and mask sensitive fields
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = maskSensitiveData(row.setting_key, row.setting_value);
        });

        // Store in cache
        settingsCache = settings;

        res.status(200).json({ success: true, data: settings });
    } catch (error) {
        console.error('SQL Error in getSettings:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. PUT /api/admin/settings
export const bulkUpdateSettings = async (req, res) => {
    try {
        const settings = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const query = 'UPDATE settings SET setting_value = ? WHERE setting_key = ?';
            
            for (const [key, value] of Object.entries(settings)) {
                const strValue = String(value);
                // If value contains '*', it's masked and wasn't changed by user, skip updating
                if (strValue.includes('*')) {
                    continue;
                }
                
                // Only update existing keys to prevent injecting random data
                await connection.execute(query, [strValue, key]);
            }

            await connection.commit();
            
            // Invalidate the cache
            settingsCache = null;
            
            res.status(200).json({ success: true, message: 'Settings updated successfully' });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('SQL Error in bulkUpdateSettings:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
