# Scorpus Auto-Data API

Serverless REST API built on Netlify Functions. No downtime, free tier, CORS enabled.

**Base URL:** `https://<your-site>.netlify.app/.netlify/functions/cars`

---

## GET `/.netlify/functions/cars`

Returns a paginated, filtered, and optionally sorted list of car specifications.  
All parameters are optional and combinable.

---

## Query Parameters

### General

| Parameter | Type | Description | Example |
|---|---|---|---|
| `lang` | string | Filter by language (`en`, `tr`, `ru`) | `lang=en` |
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
| `min_fuel_combined` | number | Min combined fuel consumption l/100km | `min_fuel_combined=5` |
| `max_fuel_combined` | number | Max combined fuel consumption l/100km | `max_fuel_combined=10` |

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

## Response Structure

```json
{
  "total": 3,
  "page": 1,
  "limit": 20,
  "pages": 1,
  "results": [
    {
      "title": "Specs of Opel Astra H GTC (facelift 2007) 2.0 Turbo ECOTEC (200 Hp) /2007, 2008, 2009, 2010/",
      "url": "https://www.auto-data.net/en/opel-astra-h-gtc-facelift-2007-2.0-turbo-ecotec-200hp-47431",
      "images": [
        "https://www.auto-data.net/images/f85/Opel-Astra-H-GTC_3.jpg"
      ],
      "general": {
        "brand": "Opel",
        "model": "Astra",
        "generation": "Astra H GTC (facelift 2007)",
        "modification": "2.0 Turbo ECOTEC (200 Hp)",
        "year_start": 2007,
        "year_end": 2010,
        "powertrain_architecture": "Internal Combustion engine",
        "body_type": "Hatchback",
        "seats": 5,
        "doors": 3
      },
      "performance": {
        "fuel_consumption_urban_l100km": 13.1,
        "fuel_consumption_extra_urban_l100km": 7.1,
        "fuel_consumption_combined_l100km": 9.3,
        "co2_emissions_g_km": 223,
        "fuel_type": "Petrol (Gasoline)",
        "acceleration_0_100_sec": 7.8,
        "max_speed_kmh": 234,
        "emission_standard": "Euro 4"
      },
      "engine": {
        "power_hp": 200,
        "power_rpm": 5400,
        "torque_nm": 262,
        "torque_rpm": 4200,
        "displacement_cm3": 1998,
        "cylinders": 4,
        "configuration": "Inline",
        "valvetrain": "DOHC",
        "fuel_injection": "Multi-port manifold injection",
        "aspiration": "Turbocharger, Intercooler",
        "compression_ratio": "8.8:1",
        "engine_code": "Z20LER",
        "oil_capacity_l": 4.25
      },
      "dimensions": {
        "length_mm": 4290,
        "width_mm": 1753,
        "height_mm": 1435,
        "wheelbase_mm": 2614,
        "front_track_mm": 1488,
        "rear_track_mm": 1488
      },
      "space_weight": {
        "kerb_weight_kg": 1290,
        "max_weight_kg": 1840,
        "trunk_min_l": 340,
        "trunk_max_l": 1070,
        "fuel_tank_l": 52
      },
      "drivetrain": {
        "drive_wheel": "Front wheel drive",
        "gearbox": "6 gears, manual transmission",
        "front_suspension": "Independent, type McPherson with coil spring and anti-roll bar",
        "rear_suspension": "Torsion",
        "front_brakes": "Ventilated discs, 308 mm",
        "rear_brakes": "Disc, 264 mm",
        "tires": "205/55 R16; 225/45 R17; 225/40 R18",
        "rims": "6.5J x 16; 7J x 17; 7.5J x 18"
      }
    }
  ]
}
```

> All numeric fields in the response are parsed to native numbers (`null` if unavailable).  
> String filters use **case-insensitive partial matching**.

---

## curl Examples

Replace `BASE` with your deployed URL.

```bash
BASE="https://<your-site>.netlify.app/.netlify/functions/cars"
```

### Basic — get all records (English)
```bash
curl "$BASE?lang=en"
```

### Filter by brand + model
```bash
curl "$BASE?brand=Opel&model=Astra"
```

### Filter by brand + body type + fuel type
```bash
curl "$BASE?brand=Opel&body_type=Hatchback&fuel_type=Petrol"
```

### Power range (150–250 HP), turbocharged only
```bash
curl "$BASE?min_power_hp=150&max_power_hp=250&aspiration=Turbo"
```

### Acceleration under 8 seconds, sorted fastest first
```bash
curl "$BASE?max_accel_100=8&sort_by=acceleration&sort_dir=asc"
```

### CO₂ under 200 g/km, combined fuel under 9 l/100km
```bash
curl "$BASE?max_co2=200&max_fuel_combined=9"
```

### Year range + 4-cylinder + manual gearbox
```bash
curl "$BASE?year_from=2005&year_to=2012&cylinders=4&gearbox=manual"
```

### Sort by power descending, page 2, 10 results per page
```bash
curl "$BASE?sort_by=power_hp&sort_dir=desc&page=2&limit=10"
```

### Top speed over 230 km/h, front-wheel drive
```bash
curl "$BASE?min_max_speed=230&drive=Front"
```

### Weight under 1400 kg + DOHC valvetrain + 4 doors
```bash
curl "$BASE?max_weight_kg=1400&valvetrain=DOHC&doors=4"
```

### Turkish language, Inline engine config, Euro 4 emission
```bash
curl "$BASE?lang=tr&engine_config=Inline&emission_standard=Euro+4"
```

### Specific engine code lookup
```bash
curl "$BASE?engine_code=Z20LER"
```

### Displacement 1800–2200 cm³, sorted by torque descending
```bash
curl "$BASE?min_displacement=1800&max_displacement=2200&sort_by=torque_nm&sort_dir=desc"
```

### Combined filter — all parameters at once
```bash
curl "$BASE?lang=en&brand=Opel&model=Astra&body_type=Hatchback&year_from=2007&year_to=2010&fuel_type=Petrol&min_power_hp=190&max_power_hp=210&cylinders=4&aspiration=Turbo&drive=Front&gearbox=manual&max_weight_kg=1400&sort_by=power_hp&sort_dir=desc&page=1&limit=10"
```

---

## Notes

- All string filters are **case-insensitive partial matches** — `brand=op` matches `Opel`.
- Numeric range filters (`min_*` / `max_*`) use `≥` and `≤` comparisons.
- Records missing the queried numeric field are **excluded** from range-filtered results.
- `sort_by` without `sort_dir` defaults to ascending order.
- Records with `null` in the sort field are placed **last**.
- `limit` is capped at **100** regardless of the requested value.
- CORS is fully open (`Access-Control-Allow-Origin: *`).
