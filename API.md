# Scorpus Auto-Data API

Serverless REST API built on Netlify Functions — **117,000+ car specifications** in **3 languages** (English, Turkish, Russian).

**Base URL:** `https://scorpus.netlify.app/.netlify/functions/cars`

---

## Endpoints

### `GET /cars` — Main endpoint
Returns a paginated, filtered, and optionally sorted list of car specifications.

### `GET /cars/languages` — Supported languages
Returns available languages.

### `GET /cars/stats` — Dataset statistics
Returns record counts per language and total.

### `GET /cars/brands?lang=en` — Brand list
Returns all unique brands for the given language.

---

## Query Parameters

### Language (Important!)

| Parameter | Type | Default | Description |
|---|---|---|---|
| `lang` | string | `en` | **Required for non-English data.** `en`, `tr`, or `ru` |

### General

| Parameter | Type | Description | Example |
|---|---|---|---|
| `brand` | string | Brand name (partial match) | `brand=Opel` |
| `model` | string | Model name (partial match) | `model=Astra` |
| `generation` | string | Generation name (partial match) | `generation=GTC` |
| `modification` | string | Engine modification (partial match) | `modification=Turbo` |
| `body_type` | string | Body type (partial match) | `body_type=Hatchback` |
| `seats` | integer | Exact seat count | `seats=5` |
| `doors` | integer | Exact door count | `doors=3` |

### Year

| Parameter | Type | Description | Example |
|---|---|---|---|
| `year_from` | integer | Production start year ≥ value | `year_from=2007` |
| `year_to` | integer | Production end year ≤ value | `year_to=2010` |

### Performance

| Parameter | Type | Description | Example |
|---|---|---|---|
| `fuel_type` | string | Fuel type (partial match) | `fuel_type=Petrol` |
| `emission_standard` | string | Emission standard (partial match) | `emission_standard=Euro 4` |
| `min_max_speed` | number | Min top speed in km/h | `min_max_speed=200` |
| `max_max_speed` | number | Max top speed in km/h | `max_max_speed=300` |
| `min_accel_100` | number | Min 0-100 time in seconds | `min_accel_100=5` |
| `max_accel_100` | number | Max 0-100 time in seconds | `max_accel_100=10` |
| `min_co2` | number | Min CO₂ emissions in g/km | `min_co2=100` |
| `max_co2` | number | Max CO₂ emissions in g/km | `max_co2=200` |
| `min_fuel_combined` | number | Min combined fuel l/100km | `min_fuel_combined=5` |
| `max_fuel_combined` | number | Max combined fuel l/100km | `max_fuel_combined=10` |

### Engine

| Parameter | Type | Description | Example |
|---|---|---|---|
| `min_power_hp` | number | Min engine power in HP | `min_power_hp=150` |
| `max_power_hp` | number | Max engine power in HP | `max_power_hp=300` |
| `min_torque_nm` | number | Min torque in Nm | `min_torque_nm=200` |
| `max_torque_nm` | number | Max torque in Nm | `max_torque_nm=400` |
| `min_displacement` | number | Min displacement in cm³ | `min_displacement=1600` |
| `max_displacement` | number | Max displacement in cm³ | `max_displacement=2500` |
| `cylinders` | integer | Exact cylinder count | `cylinders=4` |
| `aspiration` | string | Engine aspiration (partial match) | `aspiration=Turbo` |
| `valvetrain` | string | Valvetrain type (partial match) | `valvetrain=DOHC` |
| `engine_config` | string | Engine configuration (partial match) | `engine_config=Inline` |
| `engine_code` | string | Engine code (partial match) | `engine_code=Z20LER` |

### Drivetrain

| Parameter | Type | Description | Example |
|---|---|---|---|
| `drive` | string | Drive type (partial match) | `drive=Front` |
| `gearbox` | string | Gearbox type (partial match) | `gearbox=manual` |
| `tires` | string | Tire size (partial match) | `tires=225/45` |

### Weight & Dimensions

| Parameter | Type | Description | Example |
|---|---|---|---|
| `min_weight_kg` | number | Min kerb weight in kg | `min_weight_kg=1000` |
| `max_weight_kg` | number | Max kerb weight in kg | `max_weight_kg=1500` |
| `min_length_mm` | number | Min vehicle length in mm | `min_length_mm=4000` |
| `max_length_mm` | number | Max vehicle length in mm | `max_length_mm=5000` |
| `min_wheelbase_mm` | number | Min wheelbase in mm | `min_wheelbase_mm=2500` |
| `max_wheelbase_mm` | number | Max wheelbase in mm | `max_wheelbase_mm=2800` |

### Sorting

| Parameter | Type | Description | Example |
|---|---|---|---|
| `sort_by` | string | Field to sort by (see values below) | `sort_by=power_hp` |
| `sort_dir` | string | `asc` (default) or `desc` | `sort_dir=desc` |

**`sort_by` values:** `power_hp`, `torque_nm`, `displacement_cm3`, `acceleration`, `max_speed`, `weight`, `year_start`, `year_end`, `fuel_combined`, `co2`, `length`, `wheelbase`, `brand`, `model`

### Pagination

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `page` | integer | 1 | — | Page number |
| `limit` | integer | 20 | 100 | Results per page |

---

## Dataset Statistics

| Language | Records |
|---|---|
| English (`en`) | 41,384 |
| Turkish (`tr`) | 41,449 |
| Russian (`ru`) | 34,641 |
| **Total** | **117,474** |

---

## curl Examples

```bash
BASE="https://scorpus.netlify.app/.netlify/functions/cars"
```

### Get stats
```bash
curl "$BASE/stats"
```

### List supported languages
```bash
curl "$BASE/languages"
```

### List all brands (English)
```bash
curl "$BASE/brands?lang=en"
```

### Get all English records
```bash
curl "$BASE?lang=en"
```

### Get Turkish data, filter by brand
```bash
curl "$BASE?lang=tr&brand=BMW"
```

### Get Russian data, 200+ HP
```bash
curl "$BASE?lang=ru&min_power_hp=200"
```

### Combined filter — brand + power + turbo
```bash
curl "$BASE?lang=en&brand=Opel&min_power_hp=150&aspiration=Turbo&sort_by=power_hp&sort_dir=desc"
```

---

## Notes

- `lang` defaults to `en` if omitted.
- All string filters are **case-insensitive partial matches**.
- Numeric range filters (`min_*` / `max_*`) use `≥` and `≤` comparisons.
- Records missing the queried field are **excluded** from range results.
- `limit` is capped at **100**.
- CORS is fully open (`Access-Control-Allow-Origin: *`).
- RapidAPI headers (`X-RapidAPI-Key`, `X-RapidAPI-Host`) are allowed in CORS.
