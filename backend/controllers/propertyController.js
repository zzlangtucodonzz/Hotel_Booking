import pool from '../connection.js';

/**
 * GET /api/properties
 * Fetches all properties joined with location, type, host, and primary image.
 */
export const getAllProperties = async (_req, res) => {
  try {
    const [properties] = await pool.query(`
      SELECT
        p.PropertyID,
        p.Name,
        p.Description,
        p.Address,
        p.BasePrice,
        p.Rating,
        l.City,
        l.Country,
        pt.TypeName,
        u.FullName   AS HostName,
        pi.ImageURL  AS PrimaryImage
      FROM Properties p
        LEFT JOIN Locations     l  ON p.LocationID = l.LocationID
        LEFT JOIN PropertyTypes pt ON p.TypeID     = pt.TypeID
        LEFT JOIN Users         u  ON p.HostID     = u.UserID
        LEFT JOIN PropertyImages pi ON pi.PropertyID = p.PropertyID AND pi.IsPrimary = TRUE
      ORDER BY p.Rating DESC
    `);

    res.json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    console.error('Error fetching properties:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/properties/:id
 * Fetches a single property with all images and amenities.
 */
export const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    // Main property data
    const [propertyRows] = await pool.query(`
      SELECT
        p.*,
        l.City,
        l.Country,
        pt.TypeName,
        u.FullName AS HostName
      FROM Properties p
        LEFT JOIN Locations     l  ON p.LocationID = l.LocationID
        LEFT JOIN PropertyTypes pt ON p.TypeID     = pt.TypeID
        LEFT JOIN Users         u  ON p.HostID     = u.UserID
      WHERE p.PropertyID = ?
    `, [id]);

    if (propertyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // All images for this property
    const [images] = await pool.query(
      'SELECT ImageID, ImageURL, IsPrimary FROM PropertyImages WHERE PropertyID = ?',
      [id]
    );

    // All amenities for this property
    const [amenities] = await pool.query(`
      SELECT a.AmenityID, a.Name, a.IconURL
      FROM PropertyAmenities pa
        JOIN Amenities a ON pa.AmenityID = a.AmenityID
      WHERE pa.PropertyID = ?
    `, [id]);

    // Room types with available room count
    const [roomTypes] = await pool.query(`
      SELECT
        rt.RoomTypeID,
        rt.Name,
        rt.Description,
        rt.MaxGuests,
        rt.PricePerNight,
        COUNT(CASE WHEN r.Status = 'Available' THEN 1 END) AS AvailableRooms
      FROM RoomTypes rt
        LEFT JOIN Rooms r ON r.RoomTypeID = rt.RoomTypeID
      WHERE rt.PropertyID = ?
      GROUP BY rt.RoomTypeID
    `, [id]);

    res.json({
      success: true,
      data: {
        ...propertyRows[0],
        images,
        amenities,
        roomTypes,
      },
    });
  } catch (error) {
    console.error('Error fetching property:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
