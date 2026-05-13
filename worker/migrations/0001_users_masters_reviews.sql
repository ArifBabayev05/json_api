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
