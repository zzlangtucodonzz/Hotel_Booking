-- ============================================================
-- Wanderly Hotel Booking — MySQL Seed Data
-- Compatible with XAMPP phpMyAdmin (InnoDB / utf8mb4)
-- Run this AFTER creating all tables.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_MODE = 'STRICT_TRANS_TABLES';

-- ==========================================
-- 1. ROLES (independent)
-- ==========================================
INSERT INTO Roles (RoleName) VALUES
('Admin'),
('Customer'),
('Host');

-- ==========================================
-- 2. USERS (independent)
-- Password '123456' → mock bcrypt hash
-- ==========================================
INSERT INTO Users (Email, PasswordHash, FullName, PhoneNumber, AvatarURL, IsActive) VALUES
('admin@wanderly.com',    '$2b$10$6A2h5GIXpoficlAHAHJ8/eQlqXNwZu7NvDF.jqJxtI/YvK/htpDwC', 'Tran Vu Duc',      '0987654321', '/assets/images/avatars/admin.jpg',    TRUE),
('host@wanderly.com',     '$2b$10$6A2h5GIXpoficlAHAHJ8/eQlqXNwZu7NvDF.jqJxtI/YvK/htpDwC', 'Nguyen Minh Tuan',  '0912345678', '/assets/images/avatars/host.jpg',     TRUE),
('guest01@gmail.com',     '$2b$10$6A2h5GIXpoficlAHAHJ8/eQlqXNwZu7NvDF.jqJxtI/YvK/htpDwC', 'Le Thanh Mai',      '0901234567', '/assets/images/avatars/guest01.jpg',  TRUE),
('guest02@gmail.com',     '$2b$10$6A2h5GIXpoficlAHAHJ8/eQlqXNwZu7NvDF.jqJxtI/YvK/htpDwC', 'Pham Hoang Long',   '0938765432', '/assets/images/avatars/guest02.jpg',  TRUE);

-- ==========================================
-- 3. USER ROLES (depends on Users, Roles)
-- ==========================================
INSERT INTO UserRoles (UserID, RoleID) VALUES
(1, 1),  -- Tran Vu Duc  → Admin
(1, 3),  -- Tran Vu Duc  → Host (admin can also host)
(2, 3),  -- Nguyen Minh Tuan → Host
(3, 2),  -- Le Thanh Mai  → Customer
(4, 2);  -- Pham Hoang Long → Customer

-- ==========================================
-- 4. LOCATIONS (independent)
-- ==========================================
INSERT INTO Locations (City, Country, ThumbnailImage) VALUES
('Hanoi',           'Vietnam',    '/assets/images/locations/hanoi.jpg'),
('Bali',            'Indonesia',  '/assets/images/locations/bali.jpg'),
('Paris',           'France',     '/assets/images/locations/paris.jpg'),
('Da Nang',         'Vietnam',    '/assets/images/locations/danang.jpg'),
('Tokyo',           'Japan',      '/assets/images/locations/tokyo.jpg');

-- ==========================================
-- 5. PROPERTY TYPES (independent)
-- ==========================================
INSERT INTO PropertyTypes (TypeName) VALUES
('Hotel'),
('Villa'),
('Loft'),
('Cabin'),
('Resort');

-- ==========================================
-- 6. AMENITIES (independent)
-- ==========================================
INSERT INTO Amenities (Name, IconURL) VALUES
('Free WiFi',           '/assets/images/icons/wifi.svg'),
('Swimming Pool',       '/assets/images/icons/pool.svg'),
('Gym & Fitness',       '/assets/images/icons/gym.svg'),
('Spa & Wellness',      '/assets/images/icons/spa.svg'),
('Airport Shuttle',     '/assets/images/icons/shuttle.svg'),
('Free Parking',        '/assets/images/icons/parking.svg'),
('Restaurant & Bar',    '/assets/images/icons/restaurant.svg'),
('Ocean View',          '/assets/images/icons/ocean.svg');

-- ==========================================
-- 7. COLLECTIONS (independent)
-- ==========================================
INSERT INTO Collections (Name, TagType) VALUES
('Editor''s Choice',    'Badge'),
('Trending',            'Highlight'),
('Best Value',          'Promotion'),
('Luxury Picks',        'Badge'),
('Hidden Gems',         'Highlight');

-- ==========================================
-- 8. PROPERTIES (depends on Users, Locations, PropertyTypes)
-- ==========================================
INSERT INTO Properties (HostID, LocationID, TypeID, Name, Description, Address, Latitude, Longitude, BasePrice, Rating) VALUES
(1, 1, 1, 'Maison D''Orient Hanoi',
    'French-colonial elegance meets Old Quarter charm — rooftop terraces, lantern-lit courtyards, and the aroma of pho at dawn.',
    '24 Hang Bac, Hoan Kiem, Hanoi', 21.03330000, 105.85070000, 85.00, 9.30),

(2, 2, 2, 'Bali Sunset Paradise Villa',
    'Private beachfront villa with infinity pool, tropical gardens, and sunsets that paint the Indian Ocean gold.',
    'Jl. Pantai Batu Bolong, Canggu, Bali', -8.65520000, 115.13140000, 220.00, 9.70),

(2, 3, 1, 'Le Marais Boutique Hotel',
    'A chic Parisian retreat nestled in the heart of Le Marais — exposed stone walls, velvet furnishings, and a courtyard garden.',
    '15 Rue des Archives, 75004 Paris', 48.85790000, 2.35510000, 195.00, 9.10),

(1, 4, 5, 'Oceanfront Da Nang Resort',
    'Wake up to waves on My Khe Beach — marble mountains behind, endless blue ahead. World-class spa and rooftop infinity pool.',
    '120 Vo Nguyen Giap, Son Tra, Da Nang', 16.05440000, 108.24600000, 130.00, 9.20),

(2, 5, 3, 'Shibuya Sky Loft',
    'Ultra-modern loft in the heart of Shibuya with panoramic city views, minimalist design, and smart-home amenities.',
    '2-21-1 Shibuya, Tokyo 150-0002', 35.65950000, 139.70060000, 175.00, 8.90);

-- ==========================================
-- 9. PROPERTY IMAGES (depends on Properties)
-- ==========================================
INSERT INTO PropertyImages (PropertyID, ImageURL, IsPrimary) VALUES
-- Maison D'Orient Hanoi
(1, '/assets/images/properties/hanoi-hotel-cover.jpg',   TRUE),
(1, '/assets/images/properties/hanoi-hotel-room.jpg',    FALSE),
(1, '/assets/images/properties/hanoi-hotel-lobby.jpg',   FALSE),
-- Bali Sunset Paradise Villa
(2, '/assets/images/properties/bali-villa-cover.jpg',    TRUE),
(2, '/assets/images/properties/bali-villa-pool.jpg',     FALSE),
(2, '/assets/images/properties/bali-villa-bedroom.jpg',  FALSE),
-- Le Marais Boutique Hotel
(3, '/assets/images/properties/paris-hotel-cover.jpg',   TRUE),
(3, '/assets/images/properties/paris-hotel-room.jpg',    FALSE),
-- Oceanfront Da Nang Resort
(4, '/assets/images/properties/danang-resort-cover.jpg', TRUE),
(4, '/assets/images/properties/danang-resort-spa.jpg',   FALSE),
-- Shibuya Sky Loft
(5, '/assets/images/properties/tokyo-loft-cover.jpg',    TRUE),
(5, '/assets/images/properties/tokyo-loft-living.jpg',   FALSE);

-- ==========================================
-- 10. PROPERTY AMENITIES (depends on Properties, Amenities)
-- ==========================================
INSERT INTO PropertyAmenities (PropertyID, AmenityID) VALUES
-- Maison D'Orient Hanoi → WiFi, Gym, Restaurant
(1, 1), (1, 3), (1, 7),
-- Bali Villa → WiFi, Pool, Spa, Ocean View
(2, 1), (2, 2), (2, 4), (2, 8),
-- Le Marais Paris → WiFi, Restaurant
(3, 1), (3, 7),
-- Da Nang Resort → WiFi, Pool, Gym, Spa, Parking, Restaurant, Ocean View
(4, 1), (4, 2), (4, 3), (4, 4), (4, 6), (4, 7), (4, 8),
-- Tokyo Loft → WiFi, Gym
(5, 1), (5, 3);

-- ==========================================
-- 11. PROPERTY COLLECTIONS (depends on Properties, Collections)
-- ==========================================
INSERT INTO PropertyCollections (PropertyID, CollectionID) VALUES
(1, 2),  -- Hanoi Hotel     → Trending
(1, 3),  -- Hanoi Hotel     → Best Value
(2, 1),  -- Bali Villa      → Editor's Choice
(2, 4),  -- Bali Villa      → Luxury Picks
(3, 5),  -- Paris Hotel     → Hidden Gems
(4, 2),  -- Da Nang Resort  → Trending
(4, 1),  -- Da Nang Resort  → Editor's Choice
(5, 5);  -- Tokyo Loft      → Hidden Gems

-- ==========================================
-- 12. ROOM TYPES (depends on Properties)
-- ==========================================
INSERT INTO RoomTypes (PropertyID, Name, Description, MaxGuests, PricePerNight) VALUES
-- Maison D'Orient Hanoi
(1, 'Heritage Deluxe',       'Elegant French-colonial room with wooden shutters and Old Quarter views.',     2, 85.00),
(1, 'Rooftop Suite',         'Spacious top-floor suite with private terrace and panoramic city skyline.',    3, 150.00),
-- Bali Sunset Paradise Villa
(2, 'Garden Pool Villa',     'Secluded villa with plunge pool, hammock terrace, and tropical garden.',       4, 220.00),
(2, 'Ocean Front Suite',     'Premium suite with direct beach access and floor-to-ceiling ocean views.',     2, 310.00),
-- Le Marais Paris
(3, 'Classic Parisienne',    'Cozy room with exposed stone, velvet armchair, and courtyard garden view.',    2, 195.00),
(3, 'Grand Suite Marais',    'Two-room suite with vintage chandelier, clawfoot bathtub, and balcony.',       3, 340.00),
-- Da Nang Resort
(4, 'Ocean Superior',        'Bright, airy room with balcony directly facing My Khe Beach.',                 2, 130.00),
(4, 'Beachfront Family',     'Spacious family room with bunk beds, play area, and ocean terrace.',           5, 210.00),
-- Tokyo Loft
(5, 'Shibuya Studio',        'Compact smart-home studio with panoramic city views and rain shower.',         2, 175.00),
(5, 'Penthouse Loft',        'Bi-level loft with rooftop terrace, skyline panorama, and soaking tub.',       4, 420.00);

-- ==========================================
-- 13. ROOMS — physical rooms (depends on RoomTypes)
-- ==========================================
INSERT INTO Rooms (RoomTypeID, RoomNumber, Status) VALUES
-- Hanoi Heritage Deluxe (RoomTypeID=1)
(1, '101', 'Available'),
(1, '102', 'Available'),
(1, '103', 'Booked'),
-- Hanoi Rooftop Suite (RoomTypeID=2)
(2, '501', 'Available'),
-- Bali Garden Pool Villa (RoomTypeID=3)
(3, 'V-01', 'Available'),
(3, 'V-02', 'Maintenance'),
-- Bali Ocean Front Suite (RoomTypeID=4)
(4, 'V-10', 'Available'),
-- Paris Classic Parisienne (RoomTypeID=5)
(5, '201', 'Available'),
(5, '202', 'Booked'),
-- Paris Grand Suite (RoomTypeID=6)
(6, '301', 'Available'),
-- Da Nang Ocean Superior (RoomTypeID=7)
(7, 'A-101', 'Available'),
(7, 'A-102', 'Available'),
-- Da Nang Family (RoomTypeID=8)
(8, 'B-201', 'Available'),
-- Tokyo Shibuya Studio (RoomTypeID=9)
(9, '1201', 'Available'),
-- Tokyo Penthouse Loft (RoomTypeID=10)
(10, 'PH-01', 'Available');

-- ==========================================
-- 14. BOOKINGS (depends on Users, Properties)
-- ==========================================
INSERT INTO Bookings (UserID, PropertyID, CheckInDate, CheckOutDate, TotalAmount, GuestCount, Status) VALUES
-- Le Thanh Mai books Hanoi Hotel (upcoming, confirmed)
(3, 1, '2026-06-10', '2026-06-13', 255.00, 2, 'Confirmed'),
-- Le Thanh Mai books Bali Villa (completed trip)
(3, 2, '2026-04-05', '2026-04-08', 660.00, 3, 'Completed'),
-- Pham Hoang Long books Da Nang Resort (upcoming, pending)
(4, 4, '2026-07-01', '2026-07-04', 390.00, 2, 'Pending'),
-- Pham Hoang Long books Paris Hotel (completed trip)
(4, 3, '2026-03-15', '2026-03-18', 585.00, 2, 'Completed'),
-- Le Thanh Mai books Tokyo Loft (cancelled)
(3, 5, '2026-05-20', '2026-05-22', 350.00, 2, 'Cancelled');

-- ==========================================
-- 15. BOOKING ROOMS (depends on Bookings, Rooms)
-- ==========================================
INSERT INTO BookingRooms (BookingID, RoomID, PriceAtBooking) VALUES
-- Booking 1: Hanoi Heritage Deluxe room 101
(1, 1,  85.00),
-- Booking 2: Bali Garden Pool Villa V-01
(2, 5,  220.00),
-- Booking 3: Da Nang Ocean Superior A-101
(3, 11, 130.00),
-- Booking 4: Paris Classic Parisienne room 201
(4, 8,  195.00),
-- Booking 5: Tokyo Shibuya Studio 1201
(5, 14, 175.00);

-- ==========================================
-- 16. PAYMENTS (depends on Bookings)
-- ==========================================
INSERT INTO Payments (BookingID, Amount, PaymentMethod, PaymentStatus) VALUES
(1, 255.00, 'VNPay',          'Success'),
(2, 660.00, 'Credit Card',    'Success'),
(3, 390.00, 'Bank Transfer',  'Pending'),
(4, 585.00, 'Credit Card',    'Success'),
(5, 350.00, 'VNPay',          'Refunded');

-- ==========================================
-- 17. REVIEWS (depends on Bookings, Properties, Users)
-- Only completed bookings can have reviews
-- ==========================================
INSERT INTO Reviews (BookingID, PropertyID, UserID, RatingValue, Comment, CreatedAt) VALUES
(2, 2, 3, 9.5,
    'Absolutely breathtaking! The infinity pool overlooking the ocean was a dream. Staff were incredibly warm and the private villa felt like paradise. Will definitely return!',
    '2026-04-09 10:30:00'),
(4, 3, 4, 9.0,
    'Le Marais location is unbeatable — charming neighborhood with amazing bakeries around every corner. The room had beautiful vintage touches. Only wish the bathroom was slightly larger.',
    '2026-03-19 14:15:00'),
(2, 2, 4, 9.8,
    'Best villa experience in Southeast Asia. The sunset views from the terrace are world-class. Highly recommend the Ocean Front Suite for honeymooners!',
    '2026-04-10 09:00:00');

-- ==========================================
-- 18. REWARDS (depends on Users)
-- ==========================================
INSERT INTO Rewards (UserID, PointsBalance, TierLevel) VALUES
(1, 1200, 'Gold'),       -- Admin: frequent tester
(2,  800, 'Silver'),     -- Host: moderate activity
(3,  450, 'Silver'),     -- Le Thanh Mai: active traveler
(4,  150, 'Bronze');     -- Pham Hoang Long: new customer
