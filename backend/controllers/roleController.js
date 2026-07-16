import pool from '../connection.js';

// 1. GET /api/admin/roles
export const getRoles = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT RoleID, RoleName, permissions FROM roles ORDER BY RoleID ASC');
        // Parse permissions if they are stringified
        const parsedRows = rows.map(r => ({
            ...r,
            permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '[]') : (r.permissions || [])
        }));
        res.status(200).json({ success: true, data: parsedRows });
    } catch (error) {
        console.error('SQL Error in getRoles:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 2. POST /api/admin/roles
export const createRole = async (req, res) => {
    try {
        const { roleName, permissions } = req.body;
        if (!roleName) {
            return res.status(400).json({ success: false, message: 'RoleName is required' });
        }
        
        const permsStr = JSON.stringify(permissions || []);
        const [result] = await pool.execute('INSERT INTO roles (RoleName, permissions) VALUES (?, ?)', [roleName, permsStr]);
        
        res.status(201).json({ success: true, message: 'Role created successfully', roleId: result.insertId });
    } catch (error) {
        console.error('SQL Error in createRole:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 3. PUT /api/admin/roles/:id
export const updateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const { permissions } = req.body;
        
        const permsStr = JSON.stringify(permissions || []);
        const [result] = await pool.execute('UPDATE roles SET permissions = ? WHERE RoleID = ?', [permsStr, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        
        res.status(200).json({ success: true, message: 'Role permissions updated successfully' });
    } catch (error) {
        console.error('SQL Error in updateRolePermissions:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 4. GET /api/admin/staff
export const getStaff = async (req, res) => {
    try {
        // Fetch users who are assigned to a role
        const query = `
            SELECT u.UserID, u.FullName, u.Email, u.IsActive, r.RoleID, r.RoleName 
            FROM users u
            JOIN userroles ur ON u.UserID = ur.UserID
            JOIN roles r ON ur.RoleID = r.RoleID
        `;
        const [rows] = await pool.execute(query);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('SQL Error in getStaff:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// 5. POST /api/admin/staff/assign
export const assignRole = async (req, res) => {
    try {
        const { userId, roleId } = req.body;
        if (!userId || !roleId) {
            return res.status(400).json({ success: false, message: 'UserID and RoleID are required' });
        }
        
        // We will do an INSERT ON DUPLICATE KEY UPDATE.
        // Wait, UserID and RoleID are both PRIMARY KEYS in userroles table.
        // If a user can have multiple roles, we just insert.
        // If a user has ONE role, we should clear their roles first and then insert.
        // Let's assume a simple 1 user = 1 role for the UI, or we can just REPLACE.
        // Actually, userroles has PK on (UserID, RoleID). So a user CAN have multiple roles.
        // But the requirements said "dropdown to select a Role", which implies a single role replacement for simplicity,
        // or adding a role. Let's do clear and insert for simplicity of management in this view.
        
        await pool.execute('DELETE FROM userroles WHERE UserID = ?', [userId]);
        await pool.execute('INSERT INTO userroles (UserID, RoleID) VALUES (?, ?)', [userId, roleId]);
        
        res.status(200).json({ success: true, message: 'Role assigned successfully' });
    } catch (error) {
        console.error('SQL Error in assignRole:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
