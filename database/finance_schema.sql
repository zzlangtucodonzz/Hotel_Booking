-- ==========================================
-- Finance Module Schema (Payments & Refunds) - CORRECTED
-- ==========================================

-- 1. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` VARCHAR(20) NOT NULL, -- Đã sửa thành VARCHAR(20) để khớp với bảng bookings
    `transaction_code` VARCHAR(100) UNIQUE,
    `amount` DECIMAL(10, 2) NOT NULL,
    `gateway` VARCHAR(50) DEFAULT 'payOS',
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    `payos_order_code` BIGINT UNIQUE, 
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_payment_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Refunds Table
CREATE TABLE IF NOT EXISTS `refunds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `payment_id` INT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` VARCHAR(255) DEFAULT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT `fk_refund_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Indexes for fast reconciliation and webhook lookups
CREATE INDEX `idx_payment_booking` ON `payments`(`booking_id`);
CREATE INDEX `idx_payment_payos_code` ON `payments`(`payos_order_code`);
CREATE INDEX `idx_payment_status` ON `payments`(`status`);
CREATE INDEX `idx_refund_payment` ON `refunds`(`payment_id`);