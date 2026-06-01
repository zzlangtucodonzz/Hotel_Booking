-- ============================================================
-- Wanderly Hotel Booking — MySQL CREATE TABLE Statements
-- Compatible with XAMPP phpMyAdmin (InnoDB / utf8mb4)
-- Run this BEFORE seed_data.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS Rewards;
DROP TABLE IF EXISTS Reviews;
DROP TABLE IF EXISTS Payments;
DROP TABLE IF EXISTS BookingRooms;
DROP TABLE IF EXISTS Bookings;
DROP TABLE IF EXISTS Rooms;
DROP TABLE IF EXISTS RoomTypes;
DROP TABLE IF EXISTS PropertyCollections;
DROP TABLE IF EXISTS PropertyAmenities;
DROP TABLE IF EXISTS PropertyImages;
DROP TABLE IF EXISTS Properties;
DROP TABLE IF EXISTS Collections;
DROP TABLE IF EXISTS Amenities;
DROP TABLE IF EXISTS PropertyTypes;
DROP TABLE IF EXISTS Locations;
DROP TABLE IF EXISTS UserRoles;
DROP TABLE IF EXISTS Roles;
DROP TABLE IF EXISTS Users;

SET FOREIGN_KEY_CHECKS = 1;

-- ===== ROLES =====
CREATE TABLE Roles (
    RoleID      INT AUTO_INCREMENT PRIMARY KEY,
    RoleName    VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== USERS =====
CREATE TABLE Users (
    UserID       INT AUTO_INCREMENT PRIMARY KEY,
    Email        VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName     VARCHAR(100) NOT NULL,
    PhoneNumber  VARCHAR(20) NULL,
    AvatarURL    VARCHAR(255) NULL,
    IsActive     BOOLEAN DEFAULT TRUE,
    CreatedAt    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== USER ROLES (junction) =====
CREATE TABLE UserRoles (
    UserID  INT NOT NULL,
    RoleID  INT NOT NULL,
    PRIMARY KEY (UserID, RoleID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== LOCATIONS =====
CREATE TABLE Locations (
    LocationID      INT AUTO_INCREMENT PRIMARY KEY,
    City            VARCHAR(100) NOT NULL,
    Country         VARCHAR(50) NOT NULL,
    ThumbnailImage  VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PROPERTY TYPES =====
CREATE TABLE PropertyTypes (
    TypeID      INT AUTO_INCREMENT PRIMARY KEY,
    TypeName    VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== AMENITIES =====
CREATE TABLE Amenities (
    AmenityID   INT AUTO_INCREMENT PRIMARY KEY,
    Name        VARCHAR(100) NOT NULL,
    IconURL     VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== COLLECTIONS =====
CREATE TABLE Collections (
    CollectionID    INT AUTO_INCREMENT PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL,
    TagType         VARCHAR(50) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PROPERTIES =====
CREATE TABLE Properties (
    PropertyID  INT AUTO_INCREMENT PRIMARY KEY,
    HostID      INT NOT NULL,
    LocationID  INT NOT NULL,
    TypeID      INT NOT NULL,
    Name        VARCHAR(150) NOT NULL,
    Description TEXT NULL,
    Address     VARCHAR(200) NOT NULL,
    Latitude    DECIMAL(12,8) NULL,
    Longitude   DECIMAL(12,8) NULL,
    BasePrice   DECIMAL(10,2) NOT NULL,
    Rating      DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    CreatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (HostID) REFERENCES Users(UserID),
    FOREIGN KEY (LocationID) REFERENCES Locations(LocationID),
    FOREIGN KEY (TypeID) REFERENCES PropertyTypes(TypeID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PROPERTY IMAGES =====
CREATE TABLE PropertyImages (
    ImageID     INT AUTO_INCREMENT PRIMARY KEY,
    PropertyID  INT NOT NULL,
    ImageURL    VARCHAR(255) NOT NULL,
    IsPrimary   BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PROPERTY AMENITIES (junction) =====
CREATE TABLE PropertyAmenities (
    PropertyID  INT NOT NULL,
    AmenityID   INT NOT NULL,
    PRIMARY KEY (PropertyID, AmenityID),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID) ON DELETE CASCADE,
    FOREIGN KEY (AmenityID) REFERENCES Amenities(AmenityID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PROPERTY COLLECTIONS (junction) =====
CREATE TABLE PropertyCollections (
    PropertyID      INT NOT NULL,
    CollectionID    INT NOT NULL,
    PRIMARY KEY (PropertyID, CollectionID),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID) ON DELETE CASCADE,
    FOREIGN KEY (CollectionID) REFERENCES Collections(CollectionID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== ROOM TYPES =====
CREATE TABLE RoomTypes (
    RoomTypeID      INT AUTO_INCREMENT PRIMARY KEY,
    PropertyID      INT NOT NULL,
    Name            VARCHAR(100) NOT NULL,
    Description     TEXT NULL,
    MaxGuests       INT NOT NULL DEFAULT 2,
    PricePerNight   DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== ROOMS =====
CREATE TABLE Rooms (
    RoomID      INT AUTO_INCREMENT PRIMARY KEY,
    RoomTypeID  INT NOT NULL,
    RoomNumber  VARCHAR(20) NOT NULL,
    Status      ENUM('Available', 'Booked', 'Maintenance') DEFAULT 'Available',
    FOREIGN KEY (RoomTypeID) REFERENCES RoomTypes(RoomTypeID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== BOOKINGS =====
CREATE TABLE Bookings (
    BookingID       INT AUTO_INCREMENT PRIMARY KEY,
    UserID          INT NOT NULL,
    PropertyID      INT NOT NULL,
    CheckInDate     DATE NOT NULL,
    CheckOutDate    DATE NOT NULL,
    TotalAmount     DECIMAL(10,2) NOT NULL,
    GuestCount      INT NOT NULL DEFAULT 1,
    Status          ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending',
    CreatedAt       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== BOOKING ROOMS (junction) =====
CREATE TABLE BookingRooms (
    BookingID       INT NOT NULL,
    RoomID          INT NOT NULL,
    PriceAtBooking  DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (BookingID, RoomID),
    FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (RoomID) REFERENCES Rooms(RoomID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== PAYMENTS =====
CREATE TABLE Payments (
    PaymentID       INT AUTO_INCREMENT PRIMARY KEY,
    BookingID       INT NOT NULL,
    Amount          DECIMAL(10,2) NOT NULL,
    PaymentMethod   VARCHAR(50) NOT NULL,
    PaymentStatus   ENUM('Pending', 'Success', 'Failed', 'Refunded') DEFAULT 'Pending',
    PaidAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== REVIEWS =====
CREATE TABLE Reviews (
    ReviewID    INT AUTO_INCREMENT PRIMARY KEY,
    BookingID   INT NOT NULL,
    PropertyID  INT NOT NULL,
    UserID      INT NOT NULL,
    RatingValue DECIMAL(3,1) NOT NULL,
    Comment     TEXT NULL,
    CreatedAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingID) REFERENCES Bookings(BookingID),
    FOREIGN KEY (PropertyID) REFERENCES Properties(PropertyID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== REWARDS =====
CREATE TABLE Rewards (
    RewardID        INT AUTO_INCREMENT PRIMARY KEY,
    UserID          INT NOT NULL UNIQUE,
    PointsBalance   INT DEFAULT 0,
    TierLevel       ENUM('Bronze', 'Silver', 'Gold', 'Platinum') DEFAULT 'Bronze',
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
