CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room_type (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  max_guests TINYINT NOT NULL,
  room_count SMALLINT NOT NULL,
  rate_low DECIMAL(8,2) NOT NULL,
  rate_mid DECIMAL(8,2) NOT NULL,
  rate_high DECIMAL(8,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number SMALLINT NOT NULL UNIQUE,
  room_type_id INT NOT NULL,
  CONSTRAINT fk_room_room_type FOREIGN KEY (room_type_id) REFERENCES room_type (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS guest (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  family_name VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  INDEX idx_guest_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS booking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guest_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights SMALLINT NOT NULL,
  guests TINYINT NOT NULL,
  season ENUM('low', 'mid', 'high') NOT NULL,
  year SMALLINT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_is_manual BOOLEAN NOT NULL DEFAULT FALSE,
  satisfaction TINYINT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_room_period (room_id, check_in, check_out),
  INDEX idx_booking_year (year),
  INDEX idx_booking_guest (guest_id),
  CONSTRAINT fk_booking_guest FOREIGN KEY (guest_id) REFERENCES guest (id),
  CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES room (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drink (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category ENUM('Cocktail', 'Coffee') NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS drink_sale (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drink_id INT NOT NULL,
  units INT NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  sold_at DATETIME NOT NULL,
  year SMALLINT NOT NULL,
  bartender VARCHAR(100) NOT NULL DEFAULT 'Helene Christine',
  INDEX idx_drink_sale_year (year),
  CONSTRAINT fk_drink_sale_drink FOREIGN KEY (drink_id) REFERENCES drink (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
