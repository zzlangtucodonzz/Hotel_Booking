import pool from '../connection.js';

/**
 * GET /api/rooms?room_type_id=1
 * Get all rooms for a specific room type.
 */
export const getRoomsByType = async (req, res) => {
    try {
        const { room_type_id } = req.query;
        
        if (!room_type_id) {
            return res.status(400).json({ success: false, message: 'room_type_id query parameter is required.' });
        }

        const [rooms] = await pool.query(
            `SELECT 
               r.RoomID as id,
               r.RoomTypeID as room_type_id,
               r.RoomNumber as room_number,
               '-' as floor_number,
               LOWER(r.Status) as status,
               rt.Name as room_type_name 
             FROM Rooms r 
             JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID 
             WHERE r.RoomTypeID = ? 
             ORDER BY r.RoomNumber ASC`,
            [room_type_id]
        );

        return res.status(200).json({ success: true, count: rooms.length, data: rooms });
    } catch (error) {
        console.error('getRoomsByType error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
    }
};

/**
 * GET /api/rooms/hotel/:hotelId
 * Get all available rooms for a hotel.
 */
export const getRoomsByHotel = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const [rooms] = await pool.query(
            `SELECT r.RoomID as id, r.RoomNumber as room_number, rt.Name as room_type_name
             FROM Rooms r
             JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID
             WHERE rt.PropertyID = ? AND r.Status = 'Available'
             ORDER BY rt.Name, r.RoomNumber`,
            [hotelId]
        );
        return res.status(200).json({ success: true, count: rooms.length, data: rooms });
    } catch (error) {
        console.error('getRoomsByHotel error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
    }
};

/**
 * POST /api/rooms
 * Create a single room.
 */
export const createRoom = async (req, res) => {
    try {
        const { room_type_id, room_number, floor_number, status } = req.body;

        if (!room_type_id || !room_number) {
            return res.status(400).json({ success: false, message: 'room_type_id and room_number are required.' });
        }

        // Verify room type exists and get hotel_id
        const [typeCheck] = await pool.query('SELECT PropertyID as hotel_id FROM RoomTypes WHERE RoomTypeID = ?', [room_type_id]);
        if (typeCheck.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid room_type_id. Room type does not exist.' });
        }
        
        const hotel_id = typeCheck[0].hotel_id;

        // Verify duplicate room_number within the same hotel
        const [duplicateCheck] = await pool.query(
            `SELECT r.RoomID as id FROM Rooms r 
             JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID 
             WHERE rt.PropertyID = ? AND r.RoomNumber = ?`,
            [hotel_id, room_number.trim()]
        );

        if (duplicateCheck.length > 0) {
            return res.status(400).json({ success: false, message: `Room number ${room_number} already exists in this hotel.` });
        }

        const [result] = await pool.query(
            `INSERT INTO Rooms (RoomTypeID, RoomNumber, Status) VALUES (?, ?, ?)`,
            [room_type_id, room_number.trim(), status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Available']
        );

        return res.status(201).json({
            success: true,
            message: 'Room created successfully.',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('createRoom error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to create room.' });
    }
};

/**
 * POST /api/rooms/bulk
 * Bulk insert rooms by parsing an array of room numbers.
 */
export const bulkCreateRooms = async (req, res) => {
    // Obtain connection for transaction
    const connection = await pool.getConnection();
    try {
        const { room_type_id, room_numbers } = req.body; // room_numbers should be an array of strings

        if (!room_type_id || !Array.isArray(room_numbers) || room_numbers.length === 0) {
            return res.status(400).json({ success: false, message: 'room_type_id and a non-empty room_numbers array are required.' });
        }

        // Verify room type exists and get hotel_id
        const [typeCheck] = await connection.query('SELECT PropertyID as hotel_id FROM RoomTypes WHERE RoomTypeID = ?', [room_type_id]);
        if (typeCheck.length === 0) {
            connection.release();
            return res.status(400).json({ success: false, message: 'Invalid room_type_id. Room type does not exist.' });
        }
        
        const hotel_id = typeCheck[0].hotel_id;

        // Clean array
        const cleanedNumbers = room_numbers.map(n => String(n).trim()).filter(n => n.length > 0);
        if (cleanedNumbers.length === 0) {
            connection.release();
            return res.status(400).json({ success: false, message: 'No valid room numbers provided.' });
        }

        await connection.beginTransaction();

        // Verify duplicates within the same hotel
        const [existingRooms] = await connection.query(
            `SELECT r.RoomNumber as room_number FROM Rooms r 
             JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID 
             WHERE rt.PropertyID = ? AND r.RoomNumber IN (?)`,
            [hotel_id, cleanedNumbers]
        );

        if (existingRooms.length > 0) {
            await connection.rollback();
            connection.release();
            const duplicates = existingRooms.map(r => r.room_number).join(', ');
            return res.status(400).json({ 
                success: false, 
                message: `Duplicate room numbers found in this hotel: ${duplicates}. Bulk insert cancelled.` 
            });
        }

        // Prepare bulk insert data
        const insertData = cleanedNumbers.map(num => [room_type_id, num, 'Available']);
        
        await connection.query(
            `INSERT INTO Rooms (RoomTypeID, RoomNumber, Status) VALUES ?`,
            [insertData]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({
            success: true,
            message: `Successfully added ${cleanedNumbers.length} rooms.`,
            count: cleanedNumbers.length
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('bulkCreateRooms error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to bulk create rooms.' });
    }
};

/**
 * PUT /api/rooms/:id
 * Update an existing room.
 */
export const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_number, floor_number, status } = req.body;

        // Check exists
        const [existing] = await pool.query(
            `SELECT r.RoomID as id, r.RoomTypeID as room_type_id, rt.PropertyID as hotel_id 
             FROM Rooms r 
             JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID 
             WHERE r.RoomID = ?`, 
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        const hotel_id = existing[0].hotel_id;

        // Check for duplicate room_number if it's being updated
        if (room_number !== undefined && room_number.trim() !== '') {
            const [duplicateCheck] = await pool.query(
                `SELECT r.RoomID as id FROM Rooms r 
                 JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID 
                 WHERE rt.PropertyID = ? AND r.RoomNumber = ? AND r.RoomID != ?`,
                [hotel_id, room_number.trim(), id]
            );

            if (duplicateCheck.length > 0) {
                return res.status(400).json({ success: false, message: `Room number ${room_number} already exists in this hotel.` });
            }
        }

        const setClauses = [];
        const params = [];

        if (room_number !== undefined) { setClauses.push('RoomNumber = ?'); params.push(room_number.trim()); }
        if (status !== undefined) { setClauses.push('Status = ?'); params.push(status.charAt(0).toUpperCase() + status.slice(1)); }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields provided for update.' });
        }

        params.push(id);
        await pool.query(`UPDATE Rooms SET ${setClauses.join(', ')} WHERE RoomID = ?`, params);

        return res.status(200).json({ success: true, message: 'Room updated successfully.' });
    } catch (error) {
        console.error('updateRoom error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to update room.' });
    }
};

/**
 * DELETE /api/rooms/:id
 * Delete a physical room.
 */
export const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query('SELECT RoomID FROM Rooms WHERE RoomID = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Room not found.' });
        }

        await pool.query('DELETE FROM Rooms WHERE RoomID = ?', [id]);

        return res.status(200).json({ success: true, message: 'Room deleted successfully.' });
    } catch (error) {
        console.error('deleteRoom error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete room.' });
    }
};
