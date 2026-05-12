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
