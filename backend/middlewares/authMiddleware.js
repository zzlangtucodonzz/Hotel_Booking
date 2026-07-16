import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // Ensure NO authentication tokens, User IDs, or Session IDs are being passed, accepted, or stored via URL query strings
    if (req.query.session || req.query.token || req.query.session_id) {
        return res.status(401).json({ success: false, message: 'URL-based tokens are strictly prohibited for security reasons.' });
    }

    let token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access Denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

export const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.roleName !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Access Denied. Admin privileges required.' });
    }
    next();
};
