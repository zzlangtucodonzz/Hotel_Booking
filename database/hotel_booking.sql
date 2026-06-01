-- ============================================================
-- Wanderly Hotel Booking Database — Vietnam Edition
-- Schema + Seed Data
-- ============================================================

-- Drop tables if they exist (reverse dependency order)
IF OBJECT_ID('dbo.Bookings', 'U') IS NOT NULL DROP TABLE dbo.Bookings;
IF OBJECT_ID('dbo.Rooms', 'U') IS NOT NULL DROP TABLE dbo.Rooms;
IF OBJECT_ID('dbo.Hotels', 'U') IS NOT NULL DROP TABLE dbo.Hotels;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Destinations', 'U') IS NOT NULL DROP TABLE dbo.Destinations;


-- ===== DESTINATIONS =====
CREATE TABLE dbo.Destinations (
    DestinationId   INT IDENTITY(1,1) PRIMARY KEY,
    Name            NVARCHAR(100) NOT NULL,
    Country         NVARCHAR(50) NOT NULL DEFAULT 'Viet Nam',
    Description     NVARCHAR(500) NULL,
    Badge           NVARCHAR(50) NULL,
    ImagePath       NVARCHAR(255) NULL,
    CreatedAt       DATETIME2 DEFAULT GETDATE()
);

INSERT INTO dbo.Destinations (Name, Country, Description, Badge, ImagePath) VALUES
('Hoi An', 'Viet Nam', 'Lantern-lit streets, riverside tailors & ancient charm', N'🏮 Trending', 'assets/images/hoian-destination.png'),
('Da Nang', 'Viet Nam', 'Golden beaches, marble mountains & coastal energy', N'🌊 Popular', 'assets/images/danang-destination.png'),
('Nha Trang', 'Viet Nam', 'Island hopping, seafood feasts & turquoise waters', N'☀️ Coastal Gem', 'assets/images/nhatrang-destination.png'),
('Ha Noi', 'Viet Nam', 'Old Quarter charm, lakeside serenity & street food paradise', N'🏛️ Cultural Heart', 'assets/images/hanoi-hotel.png'),
('Ho Chi Minh City', 'Viet Nam', 'Urban buzz, rooftop bars & the spirit of Saigon', N'🌃 Vibrant', 'assets/images/city-wonders.png'),
('Phu Quoc', 'Viet Nam', 'Pristine beaches, pearl farms & sunset coasts', N'🏝️ Island Paradise', 'assets/images/phuquoc-villa.png'),
('Da Lat', 'Viet Nam', 'Pine forests, flower valleys & highland cool', N'🌸 Romantic', 'assets/images/dalat-retreat.png'),
('Sapa', 'Viet Nam', 'Terraced rice fields, ethnic culture & mountain mist', N'⛰️ Adventure', 'assets/images/secluded-getaway.png'),
('Ha Giang', 'Viet Nam', 'Dramatic karst peaks, winding passes & frontier spirit', N'🏔️ Epic', 'assets/images/mountain-retreat.png'),
('Hue', 'Viet Nam', 'Imperial citadels, perfume river & royal cuisine', N'👑 Heritage', 'assets/images/city-wonders.png');


-- ===== USERS =====
CREATE TABLE dbo.Users (
    UserId          INT IDENTITY(1,1) PRIMARY KEY,
    FullName        NVARCHAR(100) NOT NULL,
    Email           NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash    NVARCHAR(255) NOT NULL,
    Phone           NVARCHAR(20) NULL,
    RewardsTier     NVARCHAR(20) DEFAULT 'Explorer',
    CreatedAt       DATETIME2 DEFAULT GETDATE()
);


-- ===== HOTELS =====
CREATE TABLE dbo.Hotels (
    HotelId         INT IDENTITY(1,1) PRIMARY KEY,
    DestinationId   INT NOT NULL REFERENCES dbo.Destinations(DestinationId),
    Name            NVARCHAR(150) NOT NULL,
    Location        NVARCHAR(200) NOT NULL,
    City            NVARCHAR(100) NOT NULL,
    Type            NVARCHAR(50) NOT NULL DEFAULT 'hotel',
    Rating          DECIMAL(3,1) NOT NULL,
    RatingLabel     NVARCHAR(30) NOT NULL,
    ReviewCount     INT NOT NULL DEFAULT 0,
    Tag             NVARCHAR(50) NULL,
    Description     NVARCHAR(500) NULL,
    ImagePath       NVARCHAR(255) NULL,
    IsFeatured      BIT DEFAULT 0,
    CreatedAt       DATETIME2 DEFAULT GETDATE()
);

INSERT INTO dbo.Hotels (DestinationId, Name, Location, City, Type, Rating, RatingLabel, ReviewCount, Tag, Description, ImagePath, IsFeatured) VALUES
(4, 'Maison D''Orient', 'Old Quarter, Ha Noi', 'Ha Noi', 'hotel', 9.3, 'Wonderful', 427, 'Insider Pick', 'French-colonial elegance meets Old Quarter charm — rooftop terraces, lantern-lit courtyards, and the aroma of pho at dawn.', 'assets/images/hanoi-hotel.png', 1),
(6, 'Sunset Bay Resort', 'Ong Lang, Phu Quoc', 'Phu Quoc', 'villa', 9.6, 'Exceptional', 284, 'Top Rated', 'Private beachfront villas with infinity pools, tropical gardens, and sunsets that paint the Gulf of Thailand gold.', 'assets/images/phuquoc-villa.png', 1),
(1, 'Lantern Boutique Hotel', 'Hoi An, Viet Nam', 'Hoi An', 'hotel', 9.4, 'Wonderful', 318, 'Editor''s Choice', 'Ancient town charm with riverside serenity — lantern-lit evenings, tailored silk, and the gentle rhythm of the Thu Bon River.', 'assets/images/hoian-destination.png', 1),
(7, 'Pine Hill Lodge', 'Da Lat, Viet Nam', 'Da Lat', 'lodge', 9.1, 'Wonderful', 246, NULL, 'A highland retreat wrapped in pine forests and flower gardens — misty mornings, French-villa warmth, and lake-view tranquility.', 'assets/images/dalat-retreat.png', 1),
(5, 'Saigon Central Suites', 'District 1, Ho Chi Minh City', 'Ho Chi Minh City', 'hotel', 9.1, 'Wonderful', 512, 'Genius Deal', 'Modern urban luxury in the heart of the city — panoramic skyline views, rooftop infinity pool, and world-class dining.', 'assets/images/danang-destination.png', 1),
(2, 'Oceanfront Da Nang Resort', 'My Khe Beach, Da Nang', 'Da Nang', 'hotel', 9.2, 'Wonderful', 389, 'Beachfront', 'Wake up to waves on one of the world''s most beautiful beaches — marble mountains behind, endless blue ahead.', 'assets/images/danang-destination.png', 0),
(8, 'Sapa Cloud Nest', 'Sapa, Lao Cai', 'Sapa', 'lodge', 9.0, 'Wonderful', 194, 'Hidden Gem', 'Perched above terraced rice fields where clouds drift through your window — ethnic culture, trekking trails, and mountain silence.', 'assets/images/secluded-getaway.png', 0),
(10, 'Imperial Hue Heritage', 'Hue, Viet Nam', 'Hue', 'hotel', 8.9, 'Fabulous', 267, 'Heritage Stay', 'Royal courtyards and perfume river breezes — a living museum where imperial Vietnam meets graceful hospitality.', 'assets/images/city-wonders.png', 0),
(3, 'Nha Trang Pearl Resort', 'Tran Phu, Nha Trang', 'Nha Trang', 'hotel', 9.3, 'Wonderful', 341, 'Popular', 'Crystal-clear bays, island-hopping adventures, and seaside luxury — the jewel of Vietnam''s central coast.', 'assets/images/nhatrang-destination.png', 0),
(9, 'Ha Giang Mountain Lodge', 'Dong Van, Ha Giang', 'Ha Giang', 'lodge', 9.5, 'Exceptional', 138, 'Adventure Pick', 'At the edge of Vietnam''s northern frontier — dramatic karst valleys, winding passes, and the road less traveled.', 'assets/images/mountain-retreat.png', 0),
(4, 'West Lake Pavilion', 'Tay Ho, Ha Noi', 'Ha Noi', 'hotel', 9.5, 'Exceptional', 356, 'Luxury Stay', 'Lakeside grandeur with lotus-garden suites — where Ha Noi''s cultural soul meets five-star sophistication.', 'assets/images/hanoi-hotel.png', 0),
(6, 'Phu Quoc Emerald Bay', 'An Thoi, Phu Quoc', 'Phu Quoc', 'villa', 9.7, 'Exceptional', 412, 'Ultra Luxury', 'A whimsical island masterpiece — overwater pavilions, private beaches, and an Instagrammable world unto itself.', 'assets/images/phuquoc-villa.png', 0);


-- ===== ROOMS =====
CREATE TABLE dbo.Rooms (
    RoomId          INT IDENTITY(1,1) PRIMARY KEY,
    HotelId         INT NOT NULL REFERENCES dbo.Hotels(HotelId),
    Name            NVARCHAR(100) NOT NULL,
    Description     NVARCHAR(500) NULL,
    PricePerNight   DECIMAL(10,2) NOT NULL,
    Capacity        INT NOT NULL DEFAULT 2,
    SizeSqm         INT NULL,
    ImagePath       NVARCHAR(255) NULL,
    IsAvailable     BIT DEFAULT 1,
    CreatedAt       DATETIME2 DEFAULT GETDATE()
);

INSERT INTO dbo.Rooms (HotelId, Name, Description, PricePerNight, Capacity, SizeSqm) VALUES
(1, 'Heritage Deluxe Room', 'Elegant French-colonial inspired room with wooden shutters, vintage tiles, and views of the Old Quarter streets below.', 128.00, 2, 32),
(1, 'Rooftop Suite', 'Spacious suite on the top floor with a private terrace, panoramic Old Quarter rooftops, and complimentary afternoon tea.', 215.00, 2, 48),
(2, 'Beachfront Villa', 'Private villa steps from the sand, with an infinity plunge pool, outdoor shower, and direct sunset views.', 215.00, 2, 65),
(2, 'Garden Pool Villa', 'Tucked within a tropical garden, featuring a secluded plunge pool, hammock terrace, and open-air bathroom.', 280.00, 3, 80),
(3, 'Riverside Charm Room', 'Lantern-lit ambiance with wooden furnishings, silk accents, and a balcony overlooking the Thu Bon River.', 142.00, 2, 28),
(4, 'Pine View Cabin', 'Cozy highland cabin with a stone fireplace, floor-to-ceiling windows framing pine forests, and a deep soaking tub.', 95.00, 2, 35),
(5, 'Skyline Executive Suite', 'Floor-to-ceiling glass panels frame the Saigon skyline — modern minimalist design with a work desk and lounge area.', 188.00, 2, 55),
(5, 'Presidential Penthouse', 'The crown jewel — a two-level penthouse with private rooftop terrace, dining room, and 360-degree city panorama.', 450.00, 4, 120),
(6, 'Ocean Superior Room', 'Bright, airy room with direct ocean views from a private balcony — wake up to the sound of waves on My Khe Beach.', 175.00, 2, 38),
(7, 'Terrace Cloud Room', 'Wake above the clouds — private terrace overlooking cascading rice terraces, with ethnic-inspired textiles.', 88.00, 2, 30);


-- ===== BOOKINGS =====
CREATE TABLE dbo.Bookings (
    BookingId       INT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT NOT NULL REFERENCES dbo.Users(UserId),
    RoomId          INT NOT NULL REFERENCES dbo.Rooms(RoomId),
    CheckInDate     DATE NOT NULL,
    CheckOutDate    DATE NOT NULL,
    GuestCount      INT NOT NULL DEFAULT 1,
    TotalPrice      DECIMAL(10,2) NOT NULL,
    Status          NVARCHAR(20) DEFAULT 'confirmed',
    SpecialRequests NVARCHAR(500) NULL,
    CreatedAt       DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT CK_Bookings_Dates CHECK (CheckOutDate > CheckInDate)
);
