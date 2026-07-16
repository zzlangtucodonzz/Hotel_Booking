/* ================================================================
   Inventory & Pricing Controller
   ================================================================ */

import pool from '../connection.js';

/**
 * GET /api/inventory/calendar
 * Returns the matrix data for the Tape Chart.
 */
export const getInventoryCalendar = async (req, res) => {
  try {
    console.log('Calendar API hit. Query params received:', req.query);
    const { hotel_id, month, year } = req.query;

    if (!hotel_id || !month || !year) {
      return res.status(400).json({ success: false, message: 'Missing required parameters.' });
    }

    const start_date = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // 1. Fetch Rooms & RoomTypes joined
    const [roomsJoin] = await pool.query(
      `SELECT 
         r.RoomID AS id, 
         r.RoomTypeID AS room_type_id, 
         r.RoomNumber AS room_number, 
         r.Status AS current_status, 
         rt.Name AS name, 
         rt.PricePerNight AS base_price, 
         rt.MaxGuests AS capacity
       FROM Rooms r 
       JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID 
       WHERE rt.PropertyID = ?
       ORDER BY rt.Name ASC, r.RoomNumber ASC`,
      [hotel_id]
    );

    if (roomsJoin.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Extract unique room_type_ids and room_ids
    const roomTypeIds = [...new Set(roomsJoin.map(r => r.room_type_id))];
    const roomIds = [...new Set(roomsJoin.map(r => r.id))];

    // 2. Fetch Price Overrides (applies to RoomType)
    let overrides = [];
    if (roomTypeIds.length > 0) {
      const [overrideRows] = await pool.query(
        `SELECT id, room_type_id, start_date, end_date, override_price, event_name
         FROM price_overrides
         WHERE room_type_id IN (?)
           AND start_date <= ? 
           AND end_date >= ?`,
        [roomTypeIds, end_date, start_date]
      );
      overrides = overrideRows;
    }

    // 3. Fetch Room Blocks (applies to Room)
    let blocks = [];
    if (roomIds.length > 0) {
      const [blockRows] = await pool.query(
        `SELECT id, room_id, start_date, end_date, reason, status
         FROM room_blocks
         WHERE room_id IN (?)
           AND status = 'active'
           AND start_date <= ? 
           AND end_date >= ?`,
        [roomIds, end_date, start_date]
      );
      blocks = blockRows;
    }

    // 4. Fetch Bookings (applies to Room)
    let bookings = [];
    if (roomIds.length > 0) {
      const [bookingRows] = await pool.query(
        `SELECT 
           br.room_id AS room_id, 
           b.id AS booking_id, 
           b.check_in_date AS check_in_date, 
           b.check_out_date AS check_out_date
         FROM booking_rooms br
         JOIN bookings b ON br.booking_id = b.id
         WHERE br.room_id IN (?)
           AND b.booking_status IN ('confirmed', 'completed')
           AND b.check_in_date <= ? 
           AND b.check_out_date >= ?`,
        [roomIds, end_date, start_date]
      );
      bookings = bookingRows;
    }

    // 5. Data Assembly
    const uniqueRoomTypesMap = new Map();
    roomsJoin.forEach(row => {
      if (!uniqueRoomTypesMap.has(row.room_type_id)) {
        uniqueRoomTypesMap.set(row.room_type_id, {
          id: row.room_type_id,
          name: row.name,
          base_price: row.base_price,
          capacity: row.capacity,
          rooms: []
        });
      }
      
      const rt = uniqueRoomTypesMap.get(row.room_type_id);
      rt.rooms.push({
        id: row.id,
        room_type_id: row.room_type_id,
        room_number: row.room_number,
        current_status: row.current_status,
        overrides: overrides.filter(o => o.room_type_id === row.room_type_id),
        blocks: blocks.filter(b => b.room_id === row.id),
        bookings: bookings.filter(b => b.room_id === row.id)
      });
    });

    const mappedData = Array.from(uniqueRoomTypesMap.values());
    res.status(200).json({ success: true, data: mappedData });

  } catch (error) {
    console.error("CRITICAL SQL ERROR IN INVENTORY CALENDAR:", error);
    return res.status(500).json({
        success: false,
        message: error.sqlMessage || error.message || String(error),
        fullErrorObject: error 
    });
  }
};

/**
 * POST /api/inventory/override-price
 * Upsert a price override for a specific room and date range.
 */
export const addPriceOverride = async (req, res) => {
  try {
    const { roomId, startDate, endDate, newPrice, reason } = req.body;

    if (!roomId || !startDate || !endDate || !newPrice) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'End date must be on or after start date.' });
    }

    await pool.query(
      `INSERT INTO price_overrides (room_id, date_start, date_end, override_price, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [roomId, startDate, endDate, newPrice, reason || null]
    );

    res.status(200).json({ success: true, message: 'Price override added successfully.' });
  } catch (error) {
    console.error('addPriceOverride Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error adding price override.' });
  }
};

/**
 * POST /api/inventory/block-room
 * Block a physical room for maintenance.
 */
export const blockRoom = async (req, res) => {
  try {
    const { roomId, startDate, endDate, reason } = req.body;

    if (!roomId || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'End date must be on or after start date.' });
    }

    // Validate if room is already booked in this timeframe
    const [conflicts] = await pool.query(
      `SELECT b.id 
       FROM booking_rooms br
       JOIN bookings b ON br.booking_id = b.id
       WHERE br.room_id = ?
         AND b.booking_status IN ('confirmed', 'completed')
         AND b.check_in_date <= ? 
         AND b.check_out_date >= ?`,
      [roomId, endDate, startDate]
    );

    if (conflicts.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot block room: There are active bookings in this date range.' });
    }

    await pool.query(
      `INSERT INTO room_blocks (room_id, date_start, date_end, reason)
       VALUES (?, ?, ?, ?)`,
      [roomId, startDate, endDate, reason]
    );

    res.status(200).json({ success: true, message: 'Room blocked successfully.' });
  } catch (error) {
    console.error('blockRoom Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error blocking room.' });
  }
};
