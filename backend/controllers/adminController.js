import pool from '../connection.js';

/**
 * GET /api/admin/dashboard/stats
 * Returns four KPI metrics sourced directly from the database.
 */
export const getUnifiedStats = async (_req, res) => {
    try {
        const [
            [usersResult],
            [propertiesResult],
            [revenueResult],
            [bookingsResult],
            [cancelledResult],
            [recentBookingsResult],
            [topPropertiesResult]
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) AS totalUsers FROM users'),
            pool.query('SELECT COUNT(*) AS totalProperties FROM properties'),
            pool.query(
                `SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
                 FROM bookings
                 WHERE payment_status IN ('paid', 'PAID', 'Paid')`
            ),
            pool.query('SELECT COUNT(*) AS totalBookings FROM bookings'),
            pool.query(
                `SELECT COUNT(*) AS cancelledBookings
                 FROM bookings
                 WHERE booking_status IN ('cancelled', 'Cancelled')`
            ),
            pool.query(
                `SELECT
                    b.id AS id,
                    u.FullName AS guest_name,
                    b.check_in_date AS check_in_date,
                    b.check_out_date AS check_out_date,
                    b.total_amount AS total_amount,
                    b.booking_status AS booking_status,
                    b.payment_status AS payment_status
                 FROM bookings b
                 LEFT JOIN users u ON b.UserID = u.UserID
                 ORDER BY b.created_at DESC
                 LIMIT 5`
            ),
            pool.query(
                `SELECT 
                    p.Name AS propertyName,
                    COALESCE(SUM(b.total_amount), 0) AS totalRevenue,
                    COUNT(b.id) AS totalBookings
                 FROM bookings b
                 JOIN properties p ON b.hotel_id = p.PropertyID
                 WHERE b.payment_status IN ('paid', 'PAID', 'Paid')
                 GROUP BY p.PropertyID, p.Name
                 ORDER BY totalRevenue DESC
                 LIMIT 5`
            )
        ]);

        return res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalRevenue: parseFloat(revenueResult[0].totalRevenue),
                    totalBookings: bookingsResult[0].totalBookings,
                    totalProperties: propertiesResult[0].totalProperties,
                    totalUsers: usersResult[0].totalUsers,
                    cancelledBookings: cancelledResult[0].cancelledBookings
                },
                recentBookings: recentBookingsResult,
                topProperties: topPropertiesResult
            }
        });
    } catch (error) {
        console.error("Unified Stats Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Database query failed",
            endpoint: "getUnifiedStats" 
        });
    }
};

export const getDashboardStats = async (_req, res) => {
    try {
        const [
            [usersResult],
            [propertiesResult],
            [revenueResult],
            [bookingsResult],
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) AS totalUsers FROM users'),
            pool.query('SELECT COUNT(*) AS totalProperties FROM properties'),
            pool.query(
                `SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue
                 FROM bookings
                 WHERE payment_status IN ('paid', 'PAID', 'Paid')`
            ),
            pool.query('SELECT COUNT(id) AS totalBookings FROM bookings'),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalUsers:      usersResult[0].totalUsers,
                totalProperties: propertiesResult[0].totalProperties,
                totalRevenue:    parseFloat(revenueResult[0].totalRevenue),
                totalBookings:   bookingsResult[0].totalBookings,
            },
        });
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "getDashboardStats" 
        });
    }
};

/**
 * GET /api/admin/dashboard/recent-bookings
 * Returns the 5 most recently created bookings.
 */
export const getRecentBookings = async (_req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                b.id AS id,
                u.FullName AS guest_name,
                u.Email AS guest_email,
                b.check_in_date AS check_in_date,
                b.check_out_date AS check_out_date,
                b.total_amount AS total_amount,
                b.booking_status AS booking_status
             FROM bookings b
             JOIN users u ON b.UserID = u.UserID
             ORDER BY b.created_at DESC, b.id DESC
             LIMIT 5`
        );

        return res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "getRecentBookings" 
        });
    }
};

/* ================================================================
   NEW ENDPOINTS — Dashboard Charts & Extra Stats
   ================================================================ */

/**
 * GET /api/admin/dashboard/revenue-chart
 *
 * Monthly revenue for the DASHBOARD revenue line chart.
 * Returns two datasets: current year and previous year.
 */
export const getDashboardRevenueChart = async (_req, res) => {
    try {
        const currentYear  = new Date().getFullYear();
        const previousYear = currentYear - 1;

        const buildMonthlyArray = (rows) =>
            Array.from({ length: 12 }, (_, i) => {
                const found = rows.find(r => Number(r.month) === i + 1);
                return found ? parseFloat(found.revenue) : 0;
            });

        const [currentRows, previousRows] = await Promise.all([
            pool.query(
                `SELECT
                    MONTH(check_in_date)           AS month,
                    COALESCE(SUM(total_amount), 0) AS revenue
                 FROM bookings
                 WHERE payment_status = 'paid'
                   AND YEAR(check_in_date) = ?
                 GROUP BY MONTH(check_in_date)
                 ORDER BY month ASC`,
                [currentYear]
            ),
            pool.query(
                `SELECT
                    MONTH(check_in_date)           AS month,
                    COALESCE(SUM(total_amount), 0) AS revenue
                 FROM bookings
                 WHERE payment_status = 'paid'
                   AND YEAR(check_in_date) = ?
                 GROUP BY MONTH(check_in_date)
                 ORDER BY month ASC`,
                [previousYear]
            ),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                currentYear,
                previousYear,
                monthlyRevenueCurrent:  buildMonthlyArray(currentRows),
                monthlyRevenuePrevious: buildMonthlyArray(previousRows),
            },
        });
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "getDashboardRevenueChart" 
        });
    }
};

/**
 * GET /api/admin/dashboard/booking-chart
 *
 * Booking counts for the current week grouped by day-of-week and status.
 */
export const getDashboardBookingChart = async (_req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                DAYOFWEEK(check_in_date)  AS dow,
                LOWER(booking_status)     AS Status,
                COUNT(id)                 AS cnt
             FROM bookings
             GROUP BY DAYOFWEEK(check_in_date), LOWER(booking_status)
             ORDER BY dow ASC`
        );

        const labels    = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const confirmed = new Array(7).fill(0);
        const pending   = new Array(7).fill(0);
        const cancelled = new Array(7).fill(0);

        const dowToIndex = (dow) => (dow === 1 ? 6 : dow - 2);

        rows.forEach(r => {
            const idx = dowToIndex(Number(r.dow));
            if (idx < 0 || idx > 6) return;
            const count = Number(r.cnt);
            switch (r.Status) {
                case 'confirmed': 
                case 'completed': confirmed[idx] += count; break;
                case 'pending':   pending[idx]   += count; break;
                case 'cancelled': cancelled[idx] += count; break;
            }
        });

        return res.status(200).json({
            success: true,
            data: { labels, confirmed, pending, cancelled },
        });
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "getDashboardBookingChart" 
        });
    }
};

/**
 * GET /api/admin/dashboard/top-properties
 *
 * Top 5 properties ranked by total completed revenue.
 */
export const getDashboardTopProperties = async (_req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                p.PropertyID,
                p.Name                           AS propertyName,
                'N/A'                            AS City,
                'N/A'                            AS Country,
                COUNT(DISTINCT b.id)             AS totalBookings,
                COALESCE(SUM(b.total_amount), 0) AS totalRevenue
             FROM properties p
             INNER JOIN bookings b ON p.PropertyID = b.hotel_id
             WHERE b.booking_status IN ('confirmed', 'completed')
             GROUP BY p.PropertyID, p.Name
             ORDER BY totalRevenue DESC
             LIMIT 5`
        );

        const data = rows.map(row => ({
            propertyId:    row.PropertyID,
            propertyName:  row.propertyName,
            city:          row.City,
            country:       row.Country,
            totalBookings: Number(row.totalBookings),
            totalRevenue:  parseFloat(row.totalRevenue),
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "getDashboardTopProperties" 
        });
    }
};

/**
 * GET /api/admin/dashboard/extra-stats
 */
export const getExtraStats = async (_req, res) => {
    try {
        const now   = new Date();
        const year  = now.getFullYear();
        const month = now.getMonth() + 1;

        const [[newBookingsResult], [cancelledResult]] = await Promise.all([
            pool.query(
                `SELECT COUNT(id) AS newBookings
                 FROM bookings
                 WHERE YEAR(check_in_date) = ? AND MONTH(check_in_date) = ?`,
                [year, month]
            ),
            pool.query(
                `SELECT COUNT(id) AS cancelledBookings
                 FROM bookings
                 WHERE booking_status = 'cancelled'`
            ),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                newBookingsThisMonth: Number(newBookingsResult[0].newBookings),
                cancelledBookings:    Number(cancelledResult[0].cancelledBookings),
            },
        });
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "getExtraStats" 
        });
    }
};

/**
 * GET /api/admin/export/dashboard-csv
 */
export const exportDashboardCSV = async (_req, res) => {
    try {
        const [
            [statsUsers],
            [statsProperties],
            [statsRevenue],
            [statsBookings],
            [recentBookings],
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) AS val FROM users'),
            pool.query('SELECT COUNT(*) AS val FROM properties'),
            pool.query(`SELECT COALESCE(SUM(total_amount), 0) AS val FROM bookings WHERE booking_status IN ('completed', 'confirmed')`),
            pool.query('SELECT COUNT(id) AS val FROM bookings'),
            pool.query(
                `SELECT b.id as id, u.FullName as customer_name, b.check_in_date as check_in_date, b.check_out_date as check_out_date,
                        b.total_amount as total_amount, b.booking_status as booking_status
                 FROM bookings b
                 JOIN users u ON b.UserID = u.UserID
                 ORDER BY b.created_at DESC`
            ),
        ]);

        const lines = [];

        lines.push('=== Dashboard KPI Summary ===');
        lines.push('Metric,Value');
        lines.push(`Total Users,${statsUsers[0].val}`);
        lines.push(`Total Properties,${statsProperties[0].val}`);
        lines.push(`Total Revenue (Completed),$${parseFloat(statsRevenue[0].val).toFixed(2)}`);
        lines.push(`Total Bookings,${statsBookings[0].val}`);
        lines.push('');

        lines.push('=== All Bookings ===');
        lines.push('Booking ID,Guest,Check-in,Check-out,Amount,Status');
        recentBookings.forEach(b => {
            const name = `"${b.customer_name}"`;
            const checkIn  = new Date(b.check_in_date).toISOString().slice(0, 10);
            const checkOut = new Date(b.check_out_date).toISOString().slice(0, 10);
            lines.push(`${b.id},${name},${checkIn},${checkOut},$${parseFloat(b.total_amount).toFixed(2)},${b.booking_status}`);
        });

        const csv = lines.join('\n');
        const filename = `wanderly-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csv);
    } catch (error) {
        console.error("Dashboard Endpoint Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: error.sqlMessage || error.message || "Database query failed",
            endpoint: "exportDashboardCSV" 
        });
    }
};

/**
 * GET /api/admin/analytics
 * Returns comprehensive deep analytics data.
 */
export const getAnalyticsData = async (_req, res) => {
    try {
        const year = new Date().getFullYear();

        const [
            [annualRevenueResult],
            [monthlyRevenueRows],
            [topDestinationRows],
            [topPropertiesRows]
        ] = await Promise.all([
            // Query 1 - Annual Revenue
            pool.query(
                `SELECT COALESCE(SUM(total_amount), 0) AS annualRevenue
                 FROM bookings
                 WHERE payment_status IN ('paid', 'PAID', 'Paid')
                   AND YEAR(created_at) = ?`,
                [year]
            ),
            // Query 2 - Monthly Revenue Array
            pool.query(
                `SELECT MONTH(created_at) AS month, COALESCE(SUM(total_amount), 0) AS revenue
                 FROM bookings
                 WHERE payment_status IN ('paid', 'PAID', 'Paid')
                   AND YEAR(created_at) = ?
                 GROUP BY MONTH(created_at)
                 ORDER BY month ASC`,
                [year]
            ),
            // Query 3 - Top Destination
            pool.query(
                `SELECT l.City AS location, COUNT(b.id) AS bookingCount
                 FROM properties p
                 JOIN bookings b ON p.PropertyID = b.hotel_id
                 JOIN locations l ON p.LocationID = l.LocationID
                 GROUP BY l.City
                 ORDER BY bookingCount DESC
                 LIMIT 1`
            ),
            // Query 4 - Top Properties Details
            pool.query(
                `SELECT p.Name AS propertyName, l.City AS city, l.Country AS country,
                        COUNT(b.id) AS totalBookings, 
                        COALESCE(SUM(b.total_amount), 0) AS totalRevenue
                 FROM properties p
                 JOIN locations l ON p.LocationID = l.LocationID
                 LEFT JOIN bookings b ON p.PropertyID = b.hotel_id AND b.payment_status IN ('paid', 'PAID', 'Paid')
                 GROUP BY p.PropertyID, p.Name, l.City, l.Country
                 ORDER BY totalRevenue DESC
                 LIMIT 5`
            )
        ]);

        const monthlyRevenue = Array(12).fill(0);
        monthlyRevenueRows.forEach(row => {
            const idx = Number(row.month) - 1;
            if (idx >= 0 && idx < 12) {
                monthlyRevenue[idx] = parseFloat(row.revenue);
            }
        });

        const topDestination = topDestinationRows.length > 0 ? topDestinationRows[0].location : '—';
        const annualRevenue = parseFloat(annualRevenueResult[0].annualRevenue);

        return res.status(200).json({
            success: true,
            data: {
                annualRevenue,
                monthlyRevenue,
                topDestination,
                topProperties: topPropertiesRows,
                reviews: {
                    avgRating: 0,
                    totalReviews: 0
                }
            }
        });
    } catch (error) {
        console.error("Analytics Endpoint Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load analytics data",
            endpoint: "getAnalyticsData"
        });
    }
};
