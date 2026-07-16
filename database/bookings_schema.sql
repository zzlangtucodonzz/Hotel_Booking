SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS bookingrooms;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS booking_rooms;
DROP TABLE IF EXISTS payment_history;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `bookings` (
  `id` VARCHAR(20) NOT NULL PRIMARY KEY,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(20) DEFAULT NULL,
  `hotel_id` INT(11) NOT NULL,
  `check_in_date` DATE NOT NULL,
  `check_out_date` DATE NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `payment_status` ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  `booking_status` ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`hotel_id`) REFERENCES `properties`(`PropertyID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `booking_rooms` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `booking_id` VARCHAR(20) NOT NULL,
  `room_id` INT(11) NOT NULL,
  `price_at_booking` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`RoomID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `payment_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `booking_id` VARCHAR(20) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `payment_method` VARCHAR(100) NOT NULL,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
