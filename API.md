# Scorpus Auto-Data API

Cloudflare Workers origin for the Scorpus car dataset. This is the API that the frontend should keep using, so the response shape stays compatible with the current app.

**Base URL:** `https://scorpus-api.babayevv-arif05.workers.dev`

## RapidAPI setup

RapidAPI can import the OpenAPI file from:

`worker/openapi.yaml`

That file describes the public endpoints and query parameters used by the current API:

- `GET /`
- `GET /cars/:id`
- `GET /cars/:id/related`
- `GET /models/:brand/:model/years`
- `GET /models/:brand/:model/variants`
- `GET /brands`
- `GET /models`
- `GET /languages`
- `GET /stats`
- `GET /health`
- `GET /ping`
- `POST /auth/register`
- `POST /auth/login`
- `GET /users/:id`
- `GET /masters`
- `GET /masters/:id`
- `POST /masters/:id/profile`
- `GET /masters/:id/reviews`
- `POST /masters/:id/reviews`
- `GET /drivers/search`
- `GET /users/:id/vehicles`
- `POST /users/:id/vehicles`
- `GET /users/:id/service-history`
- `POST /service-records`
- `POST /oil-changes`

The worker also allows RapidAPI-style headers through CORS:

- `X-RapidAPI-Key`
- `X-RapidAPI-Host`
- `X-RapidAPI-Proxy-Secret`

## Response shape

The main endpoint keeps the same structure the frontend already expects:

```json
{
  "success": true,
  "count": 20,
  "page": 1,
  "results": []
}
```

Metadata endpoints return:

- `/brands` -> `{ success, brands }`
- `/models` -> `{ success, models }`
- `/languages` -> `{ success, languages }`
- `/stats` -> `{ success, stats, total }`
- `/health` -> `{ success, status, service, provider, database }`
- `/ping` -> same as `/health`, safe to use as RapidAPI's scheduled health check URL

## Main query endpoint

`GET /?lang=en&brand=Hyundai&model=Santa%20Fe&page=1&limit=20`

Supported filters include:

- `lang`
- `brand`
- `model`
- `generation`
- `modification`
- `body_type`
- `fuel_type`
- `aspiration`
- `gearbox`
- `drive`
- `engine_code`
- `seats`
- `doors`
- `cylinders`
- `year_from`
- `year_to`
- `min_power_hp`
- `max_power_hp`
- `min_torque_nm`
- `max_torque_nm`
- `min_displacement`
- `max_displacement`
- `min_max_speed`
- `max_max_speed`
- `min_accel_100`
- `max_accel_100`
- `sort_by`
- `sort_dir`
- `page`
- `limit`
- `grouped`
- `grouped_by_model`

Sorting supports:

`power_hp`, `torque_nm`, `displacement_cm3`, `acceleration`, `max_speed`, `weight`, `year_start`, `year_end`, `fuel_combined`, `co2`, `length`, `wheelbase`, `brand`, `model`

## Direct detail and model navigation endpoints

`GET /cars/:id?lang=en`

Returns one car record by the internal API id. This avoids frontend page-scanning when opening a detail page.

`GET /cars/:id/related?lang=en&limit=7`

Returns nearby variants for the same brand/model as the current car, sorted by production year and power. The detail page can use this for compact version navigation.

`GET /models/:brand/:model/years?lang=en`

Returns year-card data for a model, including count, image, and the primary variant for each year.

`GET /models/:brand/:model/variants?lang=en&year=2020`

Returns all variants for a model, optionally filtered to a selected year.

## Auth, masters, and reviews

`POST /auth/register`

Creates a simple driver or master account with mobile number and password. Passwords are stored as salted SHA-256 hashes. No session or token layer is added.

```json
{
  "role": "master",
  "name": "Elnur Məmmədov",
  "phone": "+994501234567",
  "password": "secret123",
  "specialties": ["engine", "electrical"]
}
```

`POST /auth/login`

Returns the public user profile for a mobile number and password.

`GET /masters?sort=rating_desc`

Returns registered master accounts with rating and review counts. Sort options: `rating_desc`, `rating_asc`, `reviews_desc`, `newest`.

`POST /masters/:id/profile`

Completes a master profile after login. The request must include `user_id` matching the path id, plus profile fields such as `specialties`, `city`, `address`, `experience_years`, and `bio`.

`POST /masters/:id/reviews`

Creates or updates one review from a driver account for a master.

```json
{
  "user_id": 12,
  "rating": 5,
  "comment": "Çox yaxşı xidmət."
}
```

## Service history

These endpoints power the service-registration workflow. The app still uses simple user ids, without sessions or tokens.

`GET /drivers/search?q=+99451`

Returns driver accounts by name or mobile number so a master can find the vehicle owner.

`GET /users/:id/vehicles`

Returns a driver's saved vehicles.

`POST /users/:id/vehicles`

Adds a vehicle to a driver account.

```json
{
  "brand": "Hyundai",
  "model": "Santa Fe",
  "year": 2018,
  "plate_number": "10 AA 100"
}
```

`GET /users/:id/service-history`

Returns `{ vehicles, service_records, oil_changes }` for the driver's profile and for the master service panel.

`POST /service-records`

Creates a service-work record for a selected driver and vehicle.

```json
{
  "master_user_id": 3,
  "driver_user_id": 12,
  "vehicle_id": 5,
  "service_date": "2026-05-13",
  "odometer_km": 145000,
  "work_summary": "Ön əyləc qəlibləri dəyişildi, diaqnostika edildi."
}
```

`POST /oil-changes`

Creates an oil-change record. `oil_name` is optional, `next_due_date` is required.

```json
{
  "master_user_id": 3,
  "driver_user_id": 12,
  "vehicle_id": 5,
  "changed_at": "2026-05-13",
  "oil_name": "Shell Helix 5W-30",
  "odometer_km": 145000,
  "next_due_date": "2026-11-13"
}
```

## Cloudflare deployment

From the repo root:

```bash
npm run deploy:worker
```

Or from the worker folder:

```bash
npm run deploy
```

Local worker dev:

```bash
npm run dev:worker
```

## Notes

- The worker now sends cache headers for GET responses so browsing feels faster.
- `/health` is available for monitoring and RapidAPI checks.
- The frontend should not need any changes because the main response shape was preserved.
