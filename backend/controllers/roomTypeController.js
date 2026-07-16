import pool from '../connection.js';

/**
 * GET /api/room-types?hotel_id=1
 * Get all room types for a specific hotel.
 */
export const getRoomTypesByHotel = async (req, res) => {
    try {
        const { hotel_id } = req.query;
        
        if (!hotel_id) {
            return res.status(400).json({ success: false, message: 'hotel_id query parameter is required.' });
        }

        const [roomTypes] = await pool.query(
            `SELECT 
               rt.RoomTypeID as id,
               rt.PropertyID as hotel_id,
               rt.Name as name,
               rt.MaxGuests as max_occupancy,
               'Queen/King' as bed_size,
               rt.PricePerNight as base_price,
               rt.Description as description,
               'active' as status,
               (SELECT COUNT(*) FROM Rooms r WHERE r.RoomTypeID = rt.RoomTypeID) as total_rooms
             FROM RoomTypes rt 
             WHERE rt.PropertyID = ? 
             ORDER BY rt.Name ASC`,
            [hotel_id]
        );

        return res.status(200).json({ success: true, count: roomTypes.length, data: roomTypes });
    } catch (error) {
        console.error('getRoomTypesByHotel error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch room types.' });
    }
};

/**
 * POST /api/room-types
 * Create a new room type.
 */
export const createRoomType = async (req, res) => {
    try {
        const { hotel_id, name, max_occupancy, bed_size, base_price, description, status } = req.body;

        // Validation
        if (!hotel_id || !name || base_price === undefined) {
            return res.status(400).json({ success: false, message: 'hotel_id, name, and base_price are required.' });
        }

        // Verify Hotel exists
        const [hotelCheck] = await pool.query('SELECT PropertyID FROM Properties WHERE PropertyID = ?', [hotel_id]);
        if (hotelCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid hotel_id. Hotel does not exist.' });
        }

        const [result] = await pool.query(
            `INSERT INTO RoomTypes (PropertyID, Name, MaxGuests, PricePerNight, Description) 
             VALUES (?, ?, ?, ?, ?)`,
            [hotel_id, name.trim(), max_occupancy || 2, parseFloat(base_price), description]
        );

        return res.status(201).json({
            success: true,
            message: 'Room type created successfully.',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('createRoomType error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create room type.' });
    }
};

/**
 * PUT /api/room-types/:id
 * Update an existing room type.
 */
export const updateRoomType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, max_occupancy, bed_size, base_price, description, status } = req.body;

        // Check exists
        const [existing] = await pool.query('SELECT RoomTypeID FROM RoomTypes WHERE RoomTypeID = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Room type not found.' });
        }

        const setClauses = [];
        const params = [];

        if (name !== undefined) { setClauses.push('Name = ?'); params.push(name.trim()); }
        if (max_occupancy !== undefined) { setClauses.push('MaxGuests = ?'); params.push(max_occupancy); }
        if (base_price !== undefined) { setClauses.push('PricePerNight = ?'); params.push(parseFloat(base_price)); }
        if (description !== undefined) { setClauses.push('Description = ?'); params.push(description); }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update.' });
        }

        params.push(id);
        await pool.query(`UPDATE RoomTypes SET ${setClauses.join(', ')} WHERE RoomTypeID = ?`, params);

        return res.status(200).json({ success: true, message: 'Room type updated successfully.' });
    } catch (error) {
        console.error('updateRoomType error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update room type.' });
    }
};

/**
 * DELETE /api/room-types/:id
 * Delete a room type (will cascade delete rooms).
 */
export const deleteRoomType = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query('SELECT RoomTypeID FROM RoomTypes WHERE RoomTypeID = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Room type not found.' });
        }

        await pool.query('DELETE FROM RoomTypes WHERE RoomTypeID = ?', [id]);

        return res.status(200).json({ success: true, message: 'Room type deleted successfully.' });
    } catch (error) {
        console.error('deleteRoomType error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete room type.' });
    }
};
