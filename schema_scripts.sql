CREATE TABLE price_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  override_price DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(RoomID) ON DELETE CASCADE
);

CREATE TABLE room_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(RoomID) ON DELETE CASCADE
);
