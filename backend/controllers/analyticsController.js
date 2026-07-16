import pool from '../connection.js';

/**
 * GET /api/admin/analytics/revenue-chart
 */
export const getRevenueChart = async (_req, res) => {
    try {
        const year = new Date().getFullYear();

        const [rows] = await pool.query(
            `SELECT
                MONTH(b.check_in_date)         AS month,
                COALESCE(SUM(p.amount), 0)     AS revenue
             FROM payment_history p
             INNER JOIN bookings b ON b.id = p.booking_id
             WHERE b.payment_status = 'paid'
               AND YEAR(b.check_in_date) = ?
             GROUP BY MONTH(b.check_in_date)
             ORDER BY month ASC`,
            [year]
        );

        const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
            const found = rows.find(r => Number(r.month) === i + 1);
            return found ? parseFloat(found.revenue) : 0;
        });

        return res.status(200).json({
            success: true,
            data: { year, monthlyRevenue },
        });
    } catch (error) {
        console.error('getRevenueChart error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to load revenue chart data.',
        });
    }
};

/**
 * GET /api/admin/analytics/top-properties
 */
export const getTopProperties = async (_req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                p.PropertyID,
                p.Name                           AS propertyName,
                l.City,
                l.Country,
                COUNT(DISTINCT b.id)             AS totalBookings,
                COALESCE(SUM(b.total_amount), 0) AS totalRevenue
             FROM properties p
             INNER JOIN locations l ON p.LocationID = l.LocationID
             INNER JOIN bookings b  ON b.hotel_id   = p.PropertyID
             WHERE b.booking_status IN ('confirmed', 'completed')
             GROUP BY p.PropertyID, p.Name, l.City, l.Country
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
        console.error('getTopProperties error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to load top properties data.',
        });
    }
};

/**
 * GET /api/admin/analytics/location-performance
 */
export const getLocationPerformance = async (_req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                l.LocationID,
                l.City,
                l.Country,
                COUNT(DISTINCT b.id) AS completedBookings
             FROM locations l
             INNER JOIN properties p ON p.LocationID = l.LocationID
             INNER JOIN bookings b   ON b.hotel_id   = p.PropertyID
             WHERE b.booking_status = 'completed'
             GROUP BY l.LocationID, l.City, l.Country
             ORDER BY completedBookings DESC
             LIMIT 8`
        );

        const data = rows.map(row => ({
            locationId:        row.LocationID,
            city:              row.City,
            country:           row.Country,
            completedBookings: Number(row.completedBookings),
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('getLocationPerformance error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to load location performance data.',
        });
    }
};

/**
 * GET /api/admin/analytics/satisfaction
 */
export const getSatisfaction = async (_req, res) => {
    try {
        // Table 'reviews' does not exist yet. Mocking the response.
        return res.status(200).json({
            success: true,
            data: {
                averageRating: 9.5,
                totalReviews:  0,
                distribution: {
                    '1-2':  0,
                    '3-4':  0,
                    '5-6':  0,
                    '7-8':  0,
                    '9-10': 0,
                },
            },
        });
    } catch (error) {
        console.error('getSatisfaction error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to load satisfaction data.',
        });
    }
};

/**
 * GET /api/admin/export/analytics-csv
 */
export const exportAnalyticsCSV = async (_req, res) => {
    try {
        const year = new Date().getFullYear();

        const [
            [revenueRows],
            [locationRows],
            [topPropsRows],
        ] = await Promise.all([
            pool.query(
                `SELECT
                    MONTH(b.check_in_date)         AS month,
                    COALESCE(SUM(p.amount), 0)     AS revenue
                 FROM payment_history p
                 INNER JOIN bookings b ON b.id = p.booking_id
                 WHERE b.payment_status = 'paid' AND YEAR(b.check_in_date) = ?
                 GROUP BY MONTH(b.check_in_date)
                 ORDER BY month ASC`,
                [year]
            ),
            pool.query(
                `SELECT l.City, l.Country, COUNT(DISTINCT b.id) AS completedBookings
                 FROM locations l
                 INNER JOIN properties p ON p.LocationID = l.LocationID
                 INNER JOIN bookings b   ON b.hotel_id   = p.PropertyID
                 WHERE b.booking_status = 'completed'
                 GROUP BY l.LocationID, l.City, l.Country
                 ORDER BY completedBookings DESC
                 LIMIT 8`
            ),
            pool.query(
                `SELECT p.Name AS propertyName, l.City, l.Country,
                        COUNT(DISTINCT b.id) AS totalBookings,
                        COALESCE(SUM(b.total_amount), 0) AS totalRevenue
                 FROM properties p
                 INNER JOIN locations l ON p.LocationID = l.LocationID
                 INNER JOIN bookings b  ON b.hotel_id   = p.PropertyID
                 WHERE b.booking_status IN ('confirmed', 'completed')
                 GROUP BY p.PropertyID, p.Name, l.City, l.Country
                 ORDER BY totalRevenue DESC
                 LIMIT 10`
            ),
        ]);

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const lines = [];

        // Section 1: Satisfaction
        lines.push('=== Guest Satisfaction Summary ===');
        lines.push('Metric,Value');
        lines.push(`Average Rating,9.5 (Mocked)`);
        lines.push(`Total Reviews,0 (Mocked)`);
        lines.push('');

        // Section 2: Monthly Revenue
        lines.push(`=== Monthly Revenue — ${year} ===`);
        lines.push('Month,Revenue');
        const monthlyMap = new Map(revenueRows.map(r => [Number(r.month), parseFloat(r.revenue)]));
        for (let i = 1; i <= 12; i++) {
            lines.push(`${monthNames[i - 1]},$${(monthlyMap.get(i) || 0).toFixed(2)}`);
        }
        lines.push('');

        // Section 3: Location Performance
        lines.push('=== Destination Performance ===');
        lines.push('City,Country,Completed Bookings');
        locationRows.forEach(r => {
            lines.push(`"${r.City}","${r.Country}",${r.completedBookings}`);
        });
        lines.push('');

        // Section 4: Top Properties
        lines.push('=== Top-Performing Properties ===');
        lines.push('Property,City,Country,Bookings,Revenue');
        topPropsRows.forEach(r => {
            lines.push(`"${r.propertyName}","${r.City}","${r.Country}",${r.totalBookings},$${parseFloat(r.totalRevenue).toFixed(2)}`);
        });

        const csv = lines.join('\n');
        const filename = `wanderly-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csv);
    } catch (error) {
        console.error('exportAnalyticsCSV error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to export analytics CSV.',
        });
    }
};
