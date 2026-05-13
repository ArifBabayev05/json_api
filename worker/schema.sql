DROP TABLE IF EXISTS cars;
CREATE TABLE cars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lang TEXT,
  brand TEXT,
  model TEXT,
  generation TEXT,
  modification TEXT,
  body_type TEXT,
  year_start INTEGER,
  year_end INTEGER,
  power_hp INTEGER,
  torque_nm INTEGER,
  displacement_cm3 INTEGER,
  acceleration_100 REAL,
  max_speed INTEGER,
  fuel_combined REAL,
  co2 INTEGER,
  weight_kg INTEGER,
  length_mm INTEGER,
  wheelbase_mm INTEGER,
  url TEXT UNIQUE,
  images TEXT,
  full_data TEXT
);

CREATE INDEX idx_cars_lang_brand ON cars(lang, brand);
CREATE INDEX idx_cars_model ON cars(model);
CREATE INDEX idx_cars_year ON cars(year_start, year_end);
CREATE INDEX idx_cars_power ON cars(power_hp);
CREATE INDEX idx_cars_lang ON cars(lang);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('driver', 'master')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS masters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  specialty TEXT NOT NULL DEFAULT 'general',
  specialties TEXT NOT NULL DEFAULT '[]',
  supported_brands TEXT NOT NULL DEFAULT '[]',
  city TEXT,
  address TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  services TEXT NOT NULL DEFAULT '[]',
  portfolio_photos TEXT NOT NULL DEFAULT '[]',
  certificates TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS master_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_user_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(master_user_id, user_id),
  FOREIGN KEY (master_user_id) REFERENCES users(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_masters_city ON masters(city);
CREATE INDEX IF NOT EXISTS idx_masters_specialty ON masters(specialty);
CREATE INDEX IF NOT EXISTS idx_master_reviews_master ON master_reviews(master_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_master_reviews_user ON master_reviews(user_id);

CREATE TABLE IF NOT EXISTS user_vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  car_id INTEGER,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  modification TEXT,
  plate_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS service_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_user_id INTEGER NOT NULL,
  driver_user_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  service_date TEXT NOT NULL,
  odometer_km INTEGER,
  work_summary TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (master_user_id) REFERENCES users(id),
  FOREIGN KEY (driver_user_id) REFERENCES users(id),
  FOREIGN KEY (vehicle_id) REFERENCES user_vehicles(id)
);

CREATE TABLE IF NOT EXISTS oil_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  master_user_id INTEGER NOT NULL,
  driver_user_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  changed_at TEXT NOT NULL,
  oil_name TEXT,
  odometer_km INTEGER,
  next_due_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (master_user_id) REFERENCES users(id),
  FOREIGN KEY (driver_user_id) REFERENCES users(id),
  FOREIGN KEY (vehicle_id) REFERENCES user_vehicles(id)
);

CREATE INDEX IF NOT EXISTS idx_user_vehicles_user ON user_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_service_records_driver ON service_records(driver_user_id, service_date);
CREATE INDEX IF NOT EXISTS idx_service_records_master ON service_records(master_user_id, service_date);
CREATE INDEX IF NOT EXISTS idx_service_records_vehicle ON service_records(vehicle_id, service_date);
CREATE INDEX IF NOT EXISTS idx_oil_changes_driver ON oil_changes(driver_user_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_oil_changes_vehicle ON oil_changes(vehicle_id, changed_at);
