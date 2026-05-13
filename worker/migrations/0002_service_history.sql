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
