-- Drop old tables if they exist
DROP TABLE IF EXISTS propertyamenities;
DROP TABLE IF EXISTS hotel_amenities;
DROP TABLE IF EXISTS room_type_amenities;
DROP TABLE IF EXISTS amenities;

-- Master Amenities Catalog
CREATE TABLE amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    icon_class VARCHAR(100),
    category VARCHAR(100),
    scope ENUM('hotel', 'room', 'both') DEFAULT 'both',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pivot Table: Hotel <-> Amenities
CREATE TABLE hotel_amenities (
    hotel_id INT NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (hotel_id, amenity_id),
    FOREIGN KEY (hotel_id) REFERENCES Properties(PropertyID) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- Pivot Table: Room Type <-> Amenities
CREATE TABLE room_type_amenities (
    room_type_id INT NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (room_type_id, amenity_id),
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);
