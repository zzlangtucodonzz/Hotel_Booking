/* ================================================================
   Hotel Controller — CRUD operations for Properties (Hotels)
   ================================================================
   Works with the existing Properties table and PropertyImages.
   Uses parameterized queries throughout to prevent SQL injection.
   ================================================================ */

import pool from '../connection.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES Module __dirname workaround
const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = path.dirname(__filename_local);

// ── Multer Configuration ────────────────────────────────────────
const uploadDir = path.join(__dirname_local, '../../uploads/hotels');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hotel-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .jpg, .jpeg, .png, and .webp images are allowed.'), false);
  }
};

/** Multer middleware — single image field named "image" */
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});


// ── Validation Helpers ──────────────────────────────────────────

/**
 * Validates required hotel fields for create/update.
 * Returns an array of error messages (empty = valid).
 */
function validateHotelInput(body, isUpdate = false) {
  const errors = [];
  const { name, address, basePrice, locationId, typeId, status } = body;

  if (!isUpdate || name !== undefined) {
    if (!name || !name.trim()) errors.push('Hotel name is required.');
    else if (name.trim().length > 150) errors.push('Hotel name cannot exceed 150 characters.');
  }

  if (!isUpdate || address !== undefined) {
    if (!address || !address.trim()) errors.push('Address is required.');
    else if (address.trim().length > 200) errors.push('Address cannot exceed 200 characters.');
  }

  if (!isUpdate || basePrice !== undefined) {
    const price = parseFloat(basePrice);
    if (isNaN(price) || price < 0) errors.push('Base price must be a valid number ≥ 0.');
  }

  if (!isUpdate || locationId !== undefined) {
    if (!locationId || isNaN(Number(locationId))) errors.push('A valid location is required.');
  }

  if (!isUpdate || typeId !== undefined) {
    if (!typeId || isNaN(Number(typeId))) errors.push('A valid property type is required.');
  }

  if (status !== undefined && !['active', 'inactive'].includes(status)) {
    errors.push('Status must be "active" or "inactive".');
  }

  return errors;
}


// ── CRUD Controllers ────────────────────────────────────────────

/**
 * GET /api/hotels
 * Returns all hotels with location, type, host, and primary image.
 * Supports optional ?search= and ?status= query filters.
 */
export const getAllHotels = async (req, res) => {
  try {
    const { search, status } = req.query;

    let sql = `
      SELECT
        p.PropertyID   AS id,
        p.Name         AS name,
        p.Description  AS description,
        p.Address      AS address,
        p.BasePrice    AS basePrice,
        p.Rating       AS rating,
        p.Status       AS status,
        p.CreatedAt    AS createdAt,
        p.UpdatedAt    AS updatedAt,
        l.LocationID   AS locationId,
        l.City         AS city,
        l.Country      AS country,
        pt.TypeID      AS typeId,
        pt.TypeName    AS typeName,
        u.FullName     AS hostName,
        pi.ImageURL    AS imageUrl
      FROM Properties p
        LEFT JOIN Locations      l  ON p.LocationID  = l.LocationID
        LEFT JOIN PropertyTypes  pt ON p.TypeID      = pt.TypeID
        LEFT JOIN Users          u  ON p.HostID      = u.UserID
        LEFT JOIN PropertyImages pi ON pi.PropertyID = p.PropertyID AND pi.IsPrimary = TRUE
    `;

    const conditions = [];
    const params = [];

    // Search filter (name, city, country, address)
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push('(p.Name LIKE ? OR l.City LIKE ? OR l.Country LIKE ? OR p.Address LIKE ?)');
      params.push(term, term, term, term);
    }

    // Status filter
    if (status && ['active', 'inactive'].includes(status)) {
      conditions.push('p.Status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.PropertyID DESC';

    const [hotels] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      count: hotels.length,
      data: hotels,
    });
  } catch (error) {
    console.error('getAllHotels error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch hotels.',
    });
  }
};


/**
 * GET /api/hotels/:id
 * Returns a single hotel with all its images.
 */
export const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT
         p.PropertyID  AS id,
         p.Name        AS name,
         p.Description AS description,
         p.Address     AS address,
         p.BasePrice   AS basePrice,
         p.Rating      AS rating,
         p.Status      AS status,
         p.HostID      AS hostId,
         p.CreatedAt   AS createdAt,
         p.UpdatedAt   AS updatedAt,
         l.LocationID  AS locationId,
         l.City        AS city,
         l.Country     AS country,
         pt.TypeID     AS typeId,
         pt.TypeName   AS typeName,
         u.FullName    AS hostName
       FROM Properties p
         LEFT JOIN Locations      l  ON p.LocationID  = l.LocationID
         LEFT JOIN PropertyTypes  pt ON p.TypeID      = pt.TypeID
         LEFT JOIN Users          u  ON p.HostID      = u.UserID
       WHERE p.PropertyID = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found.',
      });
    }

    // Fetch all images for this hotel
    const [images] = await pool.query(
      'SELECT ImageID, ImageURL, IsPrimary FROM PropertyImages WHERE PropertyID = ?',
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...rows[0], images },
    });
  } catch (error) {
    console.error('getHotelById error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel details.',
    });
  }
};


/**
 * POST /api/hotels
 * Creates a new hotel (property) with optional image upload.
 * Expects multipart/form-data with fields + optional "image" file.
 */
export const createHotel = async (req, res) => {
  try {
    const { name, address, description, basePrice, locationId, typeId, status } = req.body;

    // ── Validate input ──
    const errors = validateHotelInput(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(' '),
        errors,
      });
    }

    // ── Verify foreign keys exist ──
    const [locRows] = await pool.query('SELECT LocationID FROM Locations WHERE LocationID = ?', [locationId]);
    if (locRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected location does not exist.' });
    }

    const [typeRows] = await pool.query('SELECT TypeID FROM PropertyTypes WHERE TypeID = ?', [typeId]);
    if (typeRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected property type does not exist.' });
    }

    // ── Insert property ──
    // Use HostID = 1 as default admin user (can be changed when auth is wired)
    const [result] = await pool.query(
      `INSERT INTO Properties (HostID, LocationID, TypeID, Name, Description, Address, BasePrice, Rating, Status)
       VALUES (1, ?, ?, ?, ?, ?, ?, 0.0, ?)`,
      [
        Number(locationId),
        Number(typeId),
        name.trim(),
        (description || '').trim(),
        address.trim(),
        parseFloat(basePrice),
        status || 'active',
      ]
    );

    const newId = result.insertId;

    // ── Handle uploaded image ──
    if (req.file) {
      const imageUrl = `/uploads/hotels/${req.file.filename}`;
      await pool.query(
        'INSERT INTO PropertyImages (PropertyID, ImageURL, IsPrimary) VALUES (?, ?, TRUE)',
        [newId, imageUrl]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Hotel created successfully.',
      data: { id: newId },
    });
  } catch (error) {
    console.error('createHotel error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create hotel.',
    });
  }
};


/**
 * PUT /api/hotels/:id
 * Updates an existing hotel. Supports optional new image upload.
 */
export const updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, description, basePrice, locationId, typeId, status } = req.body;

    // ── Check if hotel exists ──
    const [existing] = await pool.query('SELECT PropertyID FROM Properties WHERE PropertyID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found.' });
    }

    // ── Validate input ──
    const errors = validateHotelInput(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors.join(' '),
        errors,
      });
    }

    // ── Build dynamic UPDATE query ──
    const setClauses = [];
    const params = [];

    if (name !== undefined && name.trim()) {
      setClauses.push('Name = ?');
      params.push(name.trim());
    }
    if (address !== undefined && address.trim()) {
      setClauses.push('Address = ?');
      params.push(address.trim());
    }
    if (description !== undefined) {
      setClauses.push('Description = ?');
      params.push(description.trim());
    }
    if (basePrice !== undefined) {
      setClauses.push('BasePrice = ?');
      params.push(parseFloat(basePrice));
    }
    if (locationId !== undefined) {
      // Verify FK
      const [locRows] = await pool.query('SELECT LocationID FROM Locations WHERE LocationID = ?', [locationId]);
      if (locRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Selected location does not exist.' });
      }
      setClauses.push('LocationID = ?');
      params.push(Number(locationId));
    }
    if (typeId !== undefined) {
      // Verify FK
      const [typeRows] = await pool.query('SELECT TypeID FROM PropertyTypes WHERE TypeID = ?', [typeId]);
      if (typeRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Selected property type does not exist.' });
      }
      setClauses.push('TypeID = ?');
      params.push(Number(typeId));
    }
    if (status !== undefined) {
      setClauses.push('Status = ?');
      params.push(status);
    }

    if (setClauses.length === 0 && !req.file) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    // Execute UPDATE if there are field changes
    if (setClauses.length > 0) {
      params.push(id);
      await pool.query(
        `UPDATE Properties SET ${setClauses.join(', ')} WHERE PropertyID = ?`,
        params
      );
    }

    // ── Handle uploaded image (replace primary) ──
    if (req.file) {
      const imageUrl = `/uploads/hotels/${req.file.filename}`;

      // Remove old primary image flag
      await pool.query(
        'UPDATE PropertyImages SET IsPrimary = FALSE WHERE PropertyID = ? AND IsPrimary = TRUE',
        [id]
      );

      // Insert new primary image
      await pool.query(
        'INSERT INTO PropertyImages (PropertyID, ImageURL, IsPrimary) VALUES (?, ?, TRUE)',
        [id, imageUrl]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Hotel updated successfully.',
    });
  } catch (error) {
    console.error('updateHotel error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update hotel.',
    });
  }
};


/**
 * DELETE /api/hotels/:id
 * Deletes a hotel and its associated images (cascade).
 * PropertyImages has ON DELETE CASCADE, so images auto-delete.
 */
export const deleteHotel = async (req, res) => {
  try {
    const { id } = req.params;

    // ── Check if hotel exists ──
    const [existing] = await pool.query('SELECT PropertyID, Name FROM Properties WHERE PropertyID = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found.' });
    }

    // ── Delete image files from disk ──
    const [images] = await pool.query(
      'SELECT ImageURL FROM PropertyImages WHERE PropertyID = ?',
      [id]
    );

    for (const img of images) {
      if (img.ImageURL && img.ImageURL.startsWith('/uploads/hotels/')) {
        const filePath = path.join(__dirname_local, '../..', img.ImageURL);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    // ── Delete from DB (cascades to PropertyImages, PropertyAmenities, etc.) ──
    await pool.query('DELETE FROM Properties WHERE PropertyID = ?', [id]);

    return res.status(200).json({
      success: true,
      message: `Hotel "${existing[0].Name}" deleted successfully.`,
    });
  } catch (error) {
    console.error('deleteHotel error:', error.message);

    // Handle FK constraint violations gracefully
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this hotel because it has active bookings or related records. Deactivate it instead.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete hotel.',
    });
  }
};


/**
 * GET /api/hotels/meta/dropdowns
 * Returns Locations and PropertyTypes for form select dropdowns.
 */
export const getFormDropdowns = async (_req, res) => {
  try {
    const [locations, types] = await Promise.all([
      pool.query('SELECT LocationID AS id, City AS city, Country AS country FROM Locations ORDER BY City ASC'),
      pool.query('SELECT TypeID AS id, TypeName AS name FROM PropertyTypes ORDER BY TypeName ASC'),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        locations: locations[0],
        types: types[0],
      },
    });
  } catch (error) {
    console.error('getFormDropdowns error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to load form dropdown data.',
    });
  }
};
