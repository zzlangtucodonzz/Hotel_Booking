-- ============================================================
-- Wanderly CMS Posts Setup
-- Run this script to initialize the posts table in your database
-- ============================================================

-- Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content LONGTEXT NULL,
    voucher_code VARCHAR(100) NULL COMMENT 'Promotional voucher code (e.g., SUMMER20)',
    voucher_description VARCHAR(500) NULL COMMENT 'Description of the voucher benefit',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    featured_image VARCHAR(255) NULL,
    author_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at DATETIME NULL,
    view_count INT DEFAULT 0,
    FULLTEXT INDEX ft_title_content (title, content),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert a sample post for demonstration
INSERT INTO posts (title, slug, content, voucher_code, voucher_description, status) VALUES
(
    'Summer Discount - Book Your Getaway Today!',
    'summer-discount-2024',
    '<p><strong>🌞 Beat the Heat with Wanderly!</strong></p><p>This summer, enjoy <strong>20% off</strong> on all room bookings across our curated collection of hotels and resorts throughout Vietnam.</p><p>Whether you are looking for beachfront villas in Phu Quoc, charming stays in Hoi An, or mountain retreats in Da Lat, we have the perfect summer escape for you.</p><p><strong>What is included:</strong></p><ul><li>20% discount on room rates</li><li>Free breakfast upgrade on select properties</li><li>Complimentary airport transfer for bookings 5+ nights</li></ul><p><strong>Valid until: August 31, 2024</strong></p>',
    'SUMMER20',
    'Get 20% off on room bookings! Plus free breakfast upgrade and complimentary airport transfer on 5+ night stays.',
    'published'
);
