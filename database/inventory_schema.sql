-- ================================================================
-- INVENTORY & PRICING SCHEMA
-- ================================================================

USE hotel_booking;

-- Optional: Drop if exists to ensure clean run
DROP TABLE IF EXISTS price_overrides;
DROP TABLE IF EXISTS room_blocks;

-- 1. Table: price_overrides (Dynamic Pricing at Room Type level)
CREATE TABLE price_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    override_price DECIMAL(10, 2) NOT NULL,
    event_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);

-- 2. Table: room_blocks (Maintenance / Out of Order at Physical Room level)
CREATE TABLE room_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('active', 'resolved') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(RoomID) ON DELETE CASCADE
);
