/* ================================================================
   Booking Controller — Operations for Bookings
   ================================================================ */

import pool from '../connection.js';

import payosPackage from '@payos/node';
const PayOS = payosPackage.PayOS || payosPackage.default || payosPackage;

const payos = new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY
});
/**
 * GET /api/bookings
 * Returns filtered bookings based on query params.
 */
export const getBookings = async (req, res) => {
  try {
    const { booking_id, customer_name, startDate, endDate, status, userId } = req.query;

    let sql = `
      SELECT 
        b.id as id, 
        COALESCE(u.FullName, b.guest_name) as customer_name, 
        COALESCE(u.Email, b.guest_email) as customer_email, 
        COALESCE(u.PhoneNumber, b.guest_phone) as customer_phone,
        b.check_in_date as check_in_date, 
        b.check_out_date as check_out_date, 
        b.total_amount as total_amount,
        b.payment_status as payment_status,
        b.payment_method as payment_method,
        LOWER(b.booking_status) as booking_status, 
        b.created_at as created_at,
        p.Name AS hotel_name
      FROM bookings b
      LEFT JOIN users u ON b.UserID = u.UserID
      LEFT JOIN booking_rooms br ON b.id = br.booking_id
      LEFT JOIN Rooms r ON br.room_id = r.RoomID
      LEFT JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID
      LEFT JOIN properties p ON b.hotel_id = p.PropertyID
    `;

    const conditions = [];
    const params = [];

    if (booking_id && booking_id.trim()) {
      conditions.push('b.id LIKE ?');
      params.push(`%${booking_id.trim()}%`);
    }

    if (customer_name && customer_name.trim()) {
      conditions.push('u.FullName LIKE ?');
      params.push(`%${customer_name.trim()}%`);
    }

    if (startDate && startDate.trim()) {
      conditions.push('b.check_in_date >= ?');
      params.push(startDate);
    }

    if (endDate && endDate.trim()) {
      conditions.push('b.check_in_date <= ?');
      params.push(endDate);
    }

    if (status && status.trim()) {
      conditions.push('b.booking_status = ?');
      params.push(status.toLowerCase());
    }

    if (userId && String(userId).trim()) {
      conditions.push('b.UserID = ?');
      params.push(String(userId).trim());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY b.id ORDER BY b.created_at DESC';

    const [rows] = await pool.query(sql, params);

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getBookings Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching bookings.' });
  }
};

/**
 * GET /api/bookings/guest
 * Public endpoint to look up bookings by guest email.
 */
export const getGuestBookings = async (req, res) => {
  try {
    const { guestEmail } = req.query;
    if (!guestEmail || !guestEmail.trim()) {
       return res.status(400).json({ success: false, message: 'guestEmail is required' });
    }

    let sql = `
      SELECT 
        b.id as id, 
        b.guest_name as customer_name, 
        b.guest_email as customer_email, 
        b.guest_phone as customer_phone,
        b.check_in_date as check_in_date, 
        b.check_out_date as check_out_date, 
        b.total_amount as total_amount,
        b.payment_status as payment_status,
        b.payment_method as payment_method,
        LOWER(b.booking_status) as booking_status, 
        b.created_at as created_at,
        p.Name AS hotel_name
      FROM bookings b
      LEFT JOIN properties p ON b.hotel_id = p.PropertyID
      WHERE b.guest_email = ?
      GROUP BY b.id ORDER BY b.created_at DESC
    `;

    const [rows] = await pool.query(sql, [guestEmail.trim()]);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('getGuestBookings Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching guest bookings.' });
  }
};

/**
 * GET /api/bookings/:id
 * Deep fetch returning core data, hotel data, physical rooms, and payment history.
 */
export const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch booking and hotel info
    const bookingSql = `
      SELECT 
        b.id as id, 
        u.FullName as customer_name, 
        u.Email as customer_email, 
        u.PhoneNumber as customer_phone,
        b.check_in_date as check_in_date, 
        b.check_out_date as check_out_date, 
        b.total_amount as total_amount,
        b.payment_status as payment_status,
        LOWER(b.booking_status) as booking_status, 
        b.created_at as created_at,
        p.PropertyID AS hotel_id, 
        p.Name AS hotel_name, 
        p.Address AS hotel_address
      FROM bookings b
      LEFT JOIN users u ON b.UserID = u.UserID
      LEFT JOIN booking_rooms br ON b.id = br.booking_id
      LEFT JOIN Rooms r ON br.room_id = r.RoomID
      LEFT JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID
      LEFT JOIN properties p ON b.hotel_id = p.PropertyID
      WHERE b.id = ?
    `;
    const [bookingRows] = await pool.query(bookingSql, [id]);

    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingRows[0];

    // Fetch allocated rooms
    const roomsSql = `
      SELECT br.room_id as room_id, br.price_at_booking as price_at_booking, r.RoomNumber AS room_number, rt.Name AS room_type_name
      FROM booking_rooms br
      LEFT JOIN Rooms r ON br.room_id = r.RoomID
      LEFT JOIN RoomTypes rt ON r.RoomTypeID = rt.RoomTypeID
      WHERE br.booking_id = ?
    `;
    const [roomRows] = await pool.query(roomsSql, [id]);
    booking.rooms = roomRows;

    // Fetch payment history
    const paymentsSql = `
      SELECT id as id, amount as amount, transaction_date as transaction_date, payment_method as payment_method
      FROM payment_history
      WHERE booking_id = ?
      ORDER BY transaction_date DESC
    `;
    const [paymentRows] = await pool.query(paymentsSql, [id]);
    booking.payments = paymentRows;

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('getBookingDetails Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching booking details.' });
  }
};

/**
 * PUT /api/bookings/:id/status
 * Implements the state machine for booking status using a MySQL transaction.
 */
export const updateBookingStatus = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    await connection.beginTransaction();

    // 1. Fetch current status
    const [bookingRows] = await connection.query('SELECT booking_status FROM bookings WHERE id = ? FOR UPDATE', [id]);
    
    if (bookingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const currentStatus = bookingRows[0].booking_status.toLowerCase();
    const newStatusLower = status.toLowerCase();

    // 2. Validate state transitions
    if (currentStatus === 'cancelled' && status !== 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot change status of a cancelled booking.' });
    }
    if (currentStatus === 'completed' && status !== 'completed') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot change status of a completed booking.' });
    }
    if (currentStatus === status) {
      await connection.rollback();
      return res.status(200).json({ success: true, message: 'Status is already set to ' + status });
    }

    // 3. Update the booking status
    await connection.query('UPDATE bookings SET booking_status = ? WHERE id = ?', [newStatusLower, id]);

    // 4. Handle "cancelled" logic: Release allocated rooms
    if (status === 'cancelled') {
      // Find all room IDs for this booking
      const [roomRows] = await connection.query('SELECT room_id FROM booking_rooms WHERE booking_id = ?', [id]);
      const roomIds = roomRows.map(r => r.room_id);

      if (roomIds.length > 0) {
        // Update physical rooms back to 'Available'
        await connection.query('UPDATE Rooms SET Status = "Available" WHERE RoomID IN (?)', [roomIds]);
      }
    }

    await connection.commit();

    res.status(200).json({ success: true, message: `Booking status updated to ${status}.` });
  } catch (error) {
    await connection.rollback();
    console.error('updateBookingStatus Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating booking status.' });
  } finally {
    connection.release();
  }
};

/**
 * POST /api/bookings
 * Create a new booking.
 */
export const createBooking = async (req, res) => {
  console.log("INCOMING BOOKING PAYLOAD:", req.body);
  const connection = await pool.getConnection();
  try {
    const { propertyId, roomId, guestEmail, checkIn, checkOut, guests, status, notes, promo_code, payment_method, total_amount, guest_name, guest_phone } = req.body;

    if (!propertyId || !roomId || !guestEmail || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 2. BEGIN TRANSACTION
    await connection.beginTransaction();

    // 3. FIND USER OR VALIDATE GUEST
    let [users] = await connection.query('SELECT UserID FROM users WHERE Email = ?', [guestEmail]);
    let userId = null;
    if (users.length > 0) {
      userId = users[0].UserID;
    } else {
      if (!guest_name || !guestEmail || !guest_phone) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'Guest details (Name, Email, Phone) are required for guest checkout.' });
      }
    }

    // 4. GET PRICE
    const [roomTypeRows] = await connection.query(
      `SELECT rt.PricePerNight FROM RoomTypes rt JOIN Rooms r ON rt.RoomTypeID = r.RoomTypeID WHERE r.RoomID = ?`,
      [roomId]
    );
    
    if (roomTypeRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    const pricePerNight = roomTypeRows[0].PricePerNight;

    // 5. CALCULATE TOTAL
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (nights <= 0) nights = 1;
    // Sử dụng total_amount từ frontend nếu có (đã trừ promo), nếu không tự tính
    const finalTotalAmount = (total_amount !== undefined && !isNaN(total_amount)) ? parseInt(total_amount) : (pricePerNight * nights);

    // 6. INSERT BOOKING
    const orderCode = Math.floor(Date.now() / 1000);
    const bookingId = String(orderCode); // Use orderCode as booking ID so PayOS can sync back
    const guestCount = parseInt(guests, 10) || 1;
    const bookingStatus = (status || 'pending').toLowerCase();
    
    const sqlQuery = `INSERT INTO bookings (id, UserID, hotel_id, check_in_date, check_out_date, total_amount, guest_count, booking_status, guest_name, guest_email, guest_phone, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const valuesArray = [bookingId, userId, propertyId, checkIn, checkOut, finalTotalAmount, guestCount, bookingStatus, guest_name || null, guestEmail || null, guest_phone || null, payment_method];
    
    console.log("Executing SQL:", sqlQuery);
    console.log("With Values:", valuesArray);

    await connection.query(sqlQuery, valuesArray);

    // 7. INSERT BOOKING_ROOM
    await connection.query(
      `INSERT INTO booking_rooms (booking_id, room_id, price_at_booking) VALUES (?, ?, ?)`,
      [bookingId, roomId, pricePerNight]
    );

    // Update Room Status
    if (status === 'Confirmed') {
      await connection.query(`UPDATE Rooms SET Status = 'Booked' WHERE RoomID = ?`, [roomId]);
    }

    // Process Promo Code
    if (promo_code) {
      try {
        await connection.query(
          `UPDATE coupons SET used_count = used_count + 1 WHERE code = ?`,
          [promo_code.toUpperCase()]
        );
        console.log(`Successfully updated used_count for promo code: ${promo_code}`);
      } catch (sqlErr) {
        console.error(`SQL Error updating coupon usage for ${promo_code}:`, sqlErr);
        // Note: Decided not to throw here so booking still completes even if coupon update fails
      }
    }

    // 8. COMMIT
    await connection.commit();

    // 9. CREATE PAYOS LINK IF BANK TRANSFER
    if (payment_method === 'Bank Transfer') {
      try {
        // orderCode already generated above
        const amountValue = finalTotalAmount > 0 ? parseInt(Math.round(Number(finalTotalAmount))) : 10000;
        // Dynamically get the frontend origin (e.g., the ngrok URL)
        const clientDomain = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const requestData = {
          orderCode: orderCode,
          amount: amountValue, // payOS amount must be strictly an integer > 0
          description: "Thanh toan phong", // Strictly <= 25 characters
          returnUrl: `${clientDomain}/index.html#bookings`,
          cancelUrl: `${clientDomain}/index.html#home`
        };
        // Official v2 execution
        const paymentLinkResponse = await payos.paymentRequests.create(requestData);
        console.log("PAYOS LINK GENERATED:", paymentLinkResponse.checkoutUrl); // Debug log

        return res.status(201).json({ 
          success: true, 
          message: 'Booking created successfully.', 
          data: { id: bookingId },
          checkoutUrl: paymentLinkResponse.checkoutUrl // CRITICAL: Send back to frontend
        });
      } catch (payOsErr) {
        console.error("PAYOS DETAILED ERROR:", payOsErr.response ? payOsErr.response.data : payOsErr);
        return res.status(500).json({ 
            success: false, 
            message: payOsErr.message || "Failed to generate PayOS link" 
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Booking created successfully.', data: { id: bookingId } });

  } catch (error) {
    await connection.rollback();
    // 1. BETTER ERROR HANDLING
    console.error("Booking Creation Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/bookings/sync-payment
 * Sync PayOS payment return status
 */
export const syncPaymentStatus = async (req, res) => {
  try {
    const { orderCode, status } = req.body;
    
    if (!orderCode || !status) {
      return res.status(400).json({ success: false, message: 'Missing orderCode or status.' });
    }

    if (status === 'PAID') {
      console.log("PAYOS SYNC TRIGGERED FOR ORDER:", orderCode);
      const sql = `UPDATE bookings SET payment_status = 'Paid', booking_status = 'Confirmed' WHERE id = ?`;
      const [result] = await pool.query(sql, [orderCode]);
      console.log("PAYOS SYNC SQL RESULT:", result);
      
      return res.status(200).json({ success: true, message: 'Payment status synced to PAID' });
    } else {
      return res.status(200).json({ success: true, message: 'Status is not PAID, ignored' });
    }
  } catch (error) {
    console.error('syncPaymentStatus Error:', error);
    return res.status(500).json({ success: false, message: 'Server error syncing payment status.' });
  }
};

/**
 * POST /api/bookings/verify-payment
 * Robust PayOS Return Interceptor Verification
 */
export const verifyPayment = async (req, res) => {
    const { orderCode } = req.body;
    if (!orderCode) return res.status(400).json({ success: false });

    try {
        console.log("PAYOS RETURN VERIFICATION TRIGGERED FOR ORDER:", orderCode);
        // We know 'id' holds the string format of orderCode
        const sql = `UPDATE bookings SET payment_status = 'Paid', booking_status = 'Confirmed' WHERE id = ?`;
        const [result] = await pool.query(sql, [String(orderCode)]);
        console.log("PAYOS RETURN SQL UPDATE RESULT:", result);

        return res.json({ success: true, message: "Payment confirmed and DB updated." });
    } catch (error) {
        console.error("verifyPayment Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
