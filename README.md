# Scorpus Auto-Data API

Scorpus Auto-Data API provides structured vehicle specification data for brands, models, generations, trims, body types, engines, performance, dimensions, drivetrain details, and images.

The API is useful for automotive marketplaces, comparison tools, catalog pages, valuation products, internal vehicle databases, and car research applications.

## Base URL

When using RapidAPI, use the base URL shown in your RapidAPI dashboard.

Direct Cloudflare origin:

```text
https://scorpus-api.babayevv-arif05.workers.dev
```

## Authentication

RapidAPI handles authentication through request headers.

Every request made through RapidAPI must include:

```http
X-RapidAPI-Key: YOUR_RAPIDAPI_KEY
X-RapidAPI-Host: YOUR_RAPIDAPI_HOST
```

If you call the Cloudflare origin directly, no RapidAPI key is required.

## Health Check

Use this endpoint for monitoring and RapidAPI health checks:

```http
GET /ping
```

Example response:

```json
{
  "success": true,
  "status": "ok",
  "service": "scorpus-api",
  "provider": "cloudflare-worker",
  "database": "connected"
}
```

## Endpoints

### List Car Specifications

```http
GET /
```

Returns a paginated list of car specification records.

Example:

```http
GET /?lang=en&brand=Hyundai&model=Santa%20Fe&page=1&limit=10
```

Example response:

```json
{
  "success": true,
  "count": 10,
  "page": 1,
  "results": [
    {
      "_id": 29360,
      "brand": "Hyundai",
      "model": "Santa Fe",
      "Images": [],
      "General information": {},
      "Performance specs": {},
      "Engine specs": {}
    }
  ]
}
```

### Get One Car Specification

```http
GET /cars/:id?lang=en
```

Returns a single car record by API id.

### Related Variants

```http
GET /cars/:id/related?lang=en&limit=7
```

Returns nearby variants for the same brand and model. Useful for detail-page version navigation.

### Model Years

```http
GET /models/:brand/:model/years?lang=en
```

Returns year cards for a selected model, including image, count, and primary variant.

### Model Variants

```http
GET /models/:brand/:model/variants?lang=en&year=2020
```

Returns all variants for a selected model, optionally filtered by year.

### Simple Register and Login

```http
POST /auth/register
POST /auth/login
```

Creates or logs in a `driver` or `master` account with mobile number and password. This is intentionally simple for the MVP and does not add session or token handling.

Master registration can include multiple specialties:

```json
{
  "role": "master",
  "name": "Elnur Məmmədov",
  "phone": "+994501234567",
  "password": "secret123",
  "specialties": ["engine", "electrical"]
}
```

### Masters and Reviews

```http
GET /masters?sort=rating_desc
GET /masters/:id
POST /masters/:id/profile
POST /masters/:id/reviews
```

Registered masters appear in `/masters`. Drivers can add one review per master; submitting again updates the same review.

### List Brands

```http
GET /brands?lang=en
```

Returns unique vehicle brands for a language.

Example response:

```json
{
  "success": true,
  "brands": ["Hyundai", "Mercedes-Benz", "BMW"]
}
```

### List Models

```http
GET /models?brand=Hyundai&lang=en
```

Returns unique models for a selected brand.

Example response:

```json
{
  "success": true,
  "models": ["Accent", "Elantra", "Santa Fe", "Tucson"]
}
```

### Supported Languages

```http
GET /languages
```

Example response:

```json
{
  "success": true,
  "languages": ["en", "tr", "ru"]
}
```

### Dataset Statistics

```http
GET /stats
```

Example response:

```json
{
  "success": true,
  "stats": {
    "en": 41375,
    "tr": 41439,
    "ru": 34634
  },
  "total": 117448
}
```

## Query Parameters

### General

| Parameter | Type | Default | Description |
|---|---:|---:|---|
| `lang` | string | `en` | Language code: `en`, `tr`, `ru` |
| `brand` | string | - | Partial brand match |
| `model` | string | - | Partial model match |
| `generation` | string | - | Partial generation match |
| `modification` | string | - | Partial trim or engine modification match |
| `body_type` | string | - | Partial body type match |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Results per page, max `100` |

### Vehicle Filters

| Parameter | Type | Description |
|---|---:|---|
| `seats` | integer | Exact number of seats |
| `doors` | integer | Exact number of doors |
| `cylinders` | integer | Exact number of cylinders |
| `fuel_type` | string | Partial fuel type match |
| `aspiration` | string | Partial engine aspiration match |
| `gearbox` | string | Partial gearbox match |
| `drive` | string | Partial drive wheel match |
| `engine_code` | string | Partial engine code match |

### Year Filters

| Parameter | Type | Description |
|---|---:|---|
| `year_from` | integer | Minimum production start year |
| `year_to` | integer | Maximum production end year |

### Performance Filters

| Parameter | Type | Description |
|---|---:|---|
| `min_power_hp` | number | Minimum horsepower |
| `max_power_hp` | number | Maximum horsepower |
| `min_torque_nm` | number | Minimum torque in Nm |
| `max_torque_nm` | number | Maximum torque in Nm |
| `min_displacement` | number | Minimum engine displacement in cm3 |
| `max_displacement` | number | Maximum engine displacement in cm3 |
| `min_max_speed` | number | Minimum top speed in km/h |
| `max_max_speed` | number | Maximum top speed in km/h |
| `min_accel_100` | number | Minimum 0-100 km/h time in seconds |
| `max_accel_100` | number | Maximum 0-100 km/h time in seconds |

### Grouping

| Parameter | Type | Description |
|---|---:|---|
| `grouped` | string | Use `true` to group records by brand, model, and generation |
| `grouped_by_model` | string | Use `true` to group records by brand and model |

### Sorting

| Parameter | Type | Description |
|---|---:|---|
| `sort_by` | string | Sort field |
| `sort_dir` | string | `asc` or `desc` |

Supported `sort_by` values:

```text
power_hp
torque_nm
displacement_cm3
acceleration
max_speed
weight
year_start
year_end
fuel_combined
co2
length
wheelbase
brand
model
```

## Examples

### Get Hyundai Santa Fe records

```bash
curl "https://scorpus-api.babayevv-arif05.workers.dev/?lang=en&brand=Hyundai&model=Santa%20Fe&limit=5"
```

### Get all Mercedes-Benz C-class records from 1998

```bash
curl "https://scorpus-api.babayevv-arif05.workers.dev/?lang=en&brand=Mercedes-Benz&model=C-class&year_from=1998&year_to=1998&limit=20"
```

### Get high-power cars

```bash
curl "https://scorpus-api.babayevv-arif05.workers.dev/?lang=en&min_power_hp=500&sort_by=power_hp&sort_dir=desc&limit=10"
```

### Get brand list

```bash
curl "https://scorpus-api.babayevv-arif05.workers.dev/brands?lang=en"
```

### Get models for a brand

```bash
curl "https://scorpus-api.babayevv-arif05.workers.dev/models?brand=BMW&lang=en"
```

## Notes

- String filters use partial matching.
- `limit` is capped at `100`.
- `lang` defaults to `en`.
- Empty or invalid requests return JSON error responses.
- Public GET responses include cache headers for faster repeated access.
- `/ping` and `/health` are available for uptime monitoring.

## OpenAPI

The OpenAPI file for RapidAPI import is available in:

```text
worker/openapi.yaml
```
