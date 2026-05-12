# Scorpus Auto-Data API

Cloudflare Workers origin for the Scorpus car dataset. This is the API that the frontend should keep using, so the response shape stays compatible with the current app.

**Base URL:** `https://scorpus-api.babayevv-arif05.workers.dev`

## RapidAPI setup

RapidAPI can import the OpenAPI file from:

`worker/openapi.yaml`

That file describes the public endpoints and query parameters used by the current API:

- `GET /`
- `GET /brands`
- `GET /models`
- `GET /languages`
- `GET /stats`
- `GET /health`
- `GET /ping`

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
