import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../connection.js';

// Number of salt rounds for bcrypt hashing (12 balances security & performance)
const SALT_ROUNDS = 12;

// Default role for newly registered users (Customer = RoleID 3 per seed data)
const DEFAULT_CUSTOMER_ROLE_ID = 3;

/**
 * POST /api/auth/register
 * Registers a new user account and assigns the default Customer role.
 *
 * Flow:
 *   1. Validate required fields from req.body
 *   2. Check for duplicate email in the database
 *   3. Hash the password using bcrypt
 *   4. Use a DB transaction to:
 *      a. Insert the new user into the Users table
 *      b. Assign the default Customer role in the UserRoles table
 *   5. Return a success response with the new user's info
 */
export const registerUser = async (req, res) => {
    // --- Step 1: Extract and validate input fields ---
    const { FullName, Email, Password, PhoneNumber } = req.body;

    // PhoneNumber is optional — users can update it later in their profile
    const requiredFields = { FullName, Email, Password };
    const missingFields = Object.entries(requiredFields)
        .filter(([, value]) => !value || String(value).trim() === '')
        .map(([key]) => key);

    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            message: `Missing required fields: ${missingFields.join(', ')}`,
        });
    }

    // Acquire a dedicated connection for the transaction
    const connection = await pool.getConnection();

    try {
        // --- Step 2: Check if the email already exists ---
        const [existingUsers] = await connection.query(
            'SELECT UserID FROM Users WHERE Email = ?',
            [Email.trim()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.',
            });
        }

        // --- Step 3: Hash the password ---
        const passwordHash = await bcrypt.hash(Password, SALT_ROUNDS);

        // --- Step 4: Begin transaction to insert User + assign Role ---
        await connection.beginTransaction();

        // 4a. Insert new user into the Users table
        const phoneNumberValue = PhoneNumber?.trim() || null;
        const [insertResult] = await connection.query(
            `INSERT INTO Users (Email, PasswordHash, FullName, PhoneNumber, IsActive)
             VALUES (?, ?, ?, ?, TRUE)`,
            [Email.trim(), passwordHash, FullName.trim(), phoneNumberValue]
        );

        const newUserId = insertResult.insertId;

        // 4b. Assign the default Customer role in the UserRoles table
        await connection.query(
            'INSERT INTO UserRoles (UserID, RoleID) VALUES (?, ?)',
            [newUserId, DEFAULT_CUSTOMER_ROLE_ID]
        );

        // Commit both operations atomically
        await connection.commit();

        // --- Step 5: Return success response ---
        return res.status(201).json({
            success: true,
            message: 'Registration successful!',
            user: {
                userId: newUserId,
                fullName: FullName.trim(),
                email: Email.trim(),
            },
        });
    } catch (error) {
        // Rollback both inserts if anything fails
        await connection.rollback();

        console.error('Registration error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
        });
    } finally {
        // Always release the connection back to the pool
        connection.release();
    }
};

/**
 * POST /api/auth/login
 * Authenticates a user, returns a signed JWT and role-based redirect URL.
 *
 * Flow:
 *   1. Validate required fields (email, password)
 *   2. Look up the user + their role with a 3-table JOIN
 *   3. Verify password — supports both bcrypt hashes AND plain-text (dev mode)
 *   4. Sign a JWT containing userId, email, and roleName
 *   5. Return token, user info, and a redirectUrl for client-side navigation
 */
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // --- Step 1: Validate input ---
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required.',
        });
    }

    try {
        // --- Step 2: Fetch user + role via 3-table JOIN ---
        const [rows] = await pool.query(
            `SELECT
                u.UserID,
                u.Email,
                u.PasswordHash,
                u.FullName,
                u.IsActive,
                r.RoleName
             FROM Users u
             INNER JOIN UserRoles ur ON u.UserID = ur.UserID
             INNER JOIN Roles     r  ON ur.RoleID  = r.RoleID
             WHERE u.Email = ?
             ORDER BY r.RoleID ASC
             LIMIT 1`,
            [email.trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
        }

        const user = rows[0];

        // --- Step 3: Reject inactive accounts ---
        if (!user.IsActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.',
            });
        }

        // --- Step 4: Verify password (bcrypt OR plain-text fallback for dev data) ---
        let passwordMatch = false;

        const storedHash = user.PasswordHash || '';
        const isBcryptHash = storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$');

        if (isBcryptHash) {
            // Production path: compare against bcrypt hash
            passwordMatch = await bcrypt.compare(password, storedHash);
        } else {
            // Development fallback: plain-text comparison (remove once all data is hashed)
            passwordMatch = (password === storedHash);
        }

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.',
            });
        }

        // --- Step 5: Sign JWT ---
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('FATAL: JWT_SECRET is not set in environment variables.');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error. Please contact support.',
            });
        }

        const payload = {
            userId:   user.UserID,
            email:    user.Email,
            roleName: user.RoleName,
        };

        const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

        // --- Step 6: Determine redirect URL based on role ---
        const redirectUrl = user.RoleName === 'Admin' ? '/admin.html' : '/index.html';

        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            redirectUrl,
            user: {
                userId:   user.UserID,
                fullName: user.FullName,
                email:    user.Email,
                roleName: user.RoleName,
            },
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Please try again later.',
        });
    }
};
