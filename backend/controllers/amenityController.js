import pool from '../connection.js';

/**
 * GET /api/amenities
 * Get all master amenities. Supports optional ?scope= query filter.
 */
export const getAllAmenities = async (req, res) => {
    try {
        const { scope } = req.query;
        let query = 'SELECT * FROM amenities';
        const params = [];

        if (scope && ['hotel', 'room', 'both'].includes(scope)) {
            // If scope is 'hotel', return amenities scoped for 'hotel' or 'both'
            // If scope is 'room', return amenities scoped for 'room' or 'both'
            query += ' WHERE scope IN (?, "both")';
            params.push(scope);
        }

        query += ' ORDER BY category ASC, name ASC';

        const [amenities] = await pool.query(query, params);

        return res.status(200).json({ success: true, count: amenities.length, data: amenities });
    } catch (error) {
        console.error('getAllAmenities error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch amenities.' });
    }
};

/**
 * POST /api/amenities
 * Create a new master amenity.
 */
export const createAmenity = async (req, res) => {
    try {
        const { name, icon_class, category, scope, status } = req.body;

        if (!name || !icon_class) {
            return res.status(400).json({ success: false, message: 'Name and icon_class are required.' });
        }

        const [result] = await pool.query(
            `INSERT INTO amenities (name, icon_class, category, scope, status) VALUES (?, ?, ?, ?, ?)`,
            [name.trim(), icon_class.trim(), category ? category.trim() : null, scope || 'both', status || 'active']
        );

        return res.status(201).json({
            success: true,
            message: 'Amenity created successfully.',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('createAmenity error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create amenity.' });
    }
};

/**
 * PUT /api/amenities/:id
 * Update an existing amenity.
 */
export const updateAmenity = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, icon_class, category, scope, status } = req.body;

        const [existing] = await pool.query('SELECT id FROM amenities WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Amenity not found.' });
        }

        const setClauses = [];
        const params = [];

        if (name !== undefined) { setClauses.push('name = ?'); params.push(name.trim()); }
        if (icon_class !== undefined) { setClauses.push('icon_class = ?'); params.push(icon_class.trim()); }
        if (category !== undefined) { setClauses.push('category = ?'); params.push(category ? category.trim() : null); }
        if (scope !== undefined) { setClauses.push('scope = ?'); params.push(scope); }
        if (status !== undefined) { setClauses.push('status = ?'); params.push(status); }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update.' });
        }

        params.push(id);
        await pool.query(`UPDATE amenities SET ${setClauses.join(', ')} WHERE id = ?`, params);

        return res.status(200).json({ success: true, message: 'Amenity updated successfully.' });
    } catch (error) {
        console.error('updateAmenity error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update amenity.' });
    }
};

/**
 * DELETE /api/amenities/:id
 * Delete a master amenity.
 */
export const deleteAmenity = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query('SELECT id FROM amenities WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Amenity not found.' });
        }

        await pool.query('DELETE FROM amenities WHERE id = ?', [id]);

        return res.status(200).json({ success: true, message: 'Amenity deleted successfully.' });
    } catch (error) {
        console.error('deleteAmenity error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete amenity.' });
    }
};

/**
 * GET /api/hotels/:hotelId/amenities
 * Get assigned amenities for a hotel
 */
export const getHotelAmenities = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const [amenities] = await pool.query(
            `SELECT a.* FROM amenities a
             JOIN hotel_amenities ha ON a.id = ha.amenity_id
             WHERE ha.hotel_id = ?`,
             [hotelId]
        );
        return res.status(200).json({ success: true, data: amenities });
    } catch(err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/hotels/:hotelId/amenities
 * Sync amenities for a hotel. Accepts an array of amenity_ids.
 */
export const syncHotelAmenities = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { hotelId } = req.params;
        const { amenity_ids } = req.body;

        if (!Array.isArray(amenity_ids)) {
            connection.release();
            return res.status(400).json({ success: false, message: 'amenity_ids must be an array.' });
        }

        await connection.beginTransaction();

        // Clear existing
        await connection.query('DELETE FROM hotel_amenities WHERE hotel_id = ?', [hotelId]);

        // Insert new
        if (amenity_ids.length > 0) {
            const insertData = amenity_ids.map(id => [hotelId, id]);
            await connection.query('INSERT INTO hotel_amenities (hotel_id, amenity_id) VALUES ?', [insertData]);
        }

        await connection.commit();
        connection.release();

        return res.status(200).json({ success: true, message: 'Hotel amenities synced successfully.' });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('syncHotelAmenities error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to sync hotel amenities.' });
    }
};

/**
 * GET /api/room-types/:roomTypeId/amenities
 * Get assigned amenities for a room type
 */
export const getRoomTypeAmenities = async (req, res) => {
    try {
        const { roomTypeId } = req.params;
        const [amenities] = await pool.query(
            `SELECT a.* FROM amenities a
             JOIN room_type_amenities rta ON a.id = rta.amenity_id
             WHERE rta.room_type_id = ?`,
             [roomTypeId]
        );
        return res.status(200).json({ success: true, data: amenities });
    } catch(err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/room-types/:roomTypeId/amenities
 * Sync amenities for a room type. Accepts an array of amenity_ids.
 */
export const syncRoomTypeAmenities = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { roomTypeId } = req.params;
        const { amenity_ids } = req.body;

        if (!Array.isArray(amenity_ids)) {
            connection.release();
            return res.status(400).json({ success: false, message: 'amenity_ids must be an array.' });
        }

        await connection.beginTransaction();

        // Clear existing
        await connection.query('DELETE FROM room_type_amenities WHERE room_type_id = ?', [roomTypeId]);

        // Insert new
        if (amenity_ids.length > 0) {
            const insertData = amenity_ids.map(id => [roomTypeId, id]);
            await connection.query('INSERT INTO room_type_amenities (room_type_id, amenity_id) VALUES ?', [insertData]);
        }

        await connection.commit();
        connection.release();

        return res.status(200).json({ success: true, message: 'Room type amenities synced successfully.' });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('syncRoomTypeAmenities error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to sync room type amenities.' });
    }
};
