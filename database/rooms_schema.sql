-- Room Types Table
CREATE TABLE IF NOT EXISTS room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    max_occupancy INT DEFAULT 2,
    bed_size VARCHAR(100),
    base_price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES Properties(PropertyID) ON DELETE CASCADE
);

-- Physical Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id INT NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    floor_number VARCHAR(20),
    status ENUM('available', 'maintenance', 'out_of_order') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Unique constraint: A hotel cannot have duplicate room numbers
    -- Since room -> room_type -> hotel, we ensure uniqueness by joining, but for simple DB level:
    -- Wait, we can't easily do a unique constraint across tables without denormalizing hotel_id.
    -- We will handle the "prevent duplicate room_number within the same hotel" logic in the backend Controller.
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
);
