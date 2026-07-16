-- ============================================================
-- Hotels CRUD Migration — Add missing columns to Properties
-- Run this in phpMyAdmin or MySQL CLI against `hotel_booking` DB
-- ============================================================

-- Add BasePrice column
ALTER TABLE Properties
  ADD COLUMN BasePrice DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER Longitude;

-- Add Rating column
ALTER TABLE Properties
  ADD COLUMN Rating DECIMAL(3,1) NOT NULL DEFAULT 0.0 AFTER BasePrice;

-- Add Status column (active/inactive) with default 'active'
ALTER TABLE Properties
  ADD COLUMN Status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' AFTER Rating;

-- Add CreatedAt timestamp
ALTER TABLE Properties
  ADD COLUMN CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER Status;

-- Add UpdatedAt timestamp that auto-updates on row modification
ALTER TABLE Properties
  ADD COLUMN UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER CreatedAt;
