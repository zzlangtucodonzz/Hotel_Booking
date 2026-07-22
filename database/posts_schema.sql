-- ============================================================
-- Wanderly CMS Posts Table
-- For managing blog posts, announcements, and promotions
-- ============================================================

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
    FULLTEXT INDEX ft_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
