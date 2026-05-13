import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

const API_VERSION = '2026-05-10';
const MAIN_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=86400';
const METADATA_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const NO_STORE = 'no-store';
const RAPIDAPI_HEADERS = [
  'Content-Type',
  'X-RapidAPI-Key',
  'X-RapidAPI-Host',
  'X-RapidAPI-Proxy-Secret',
  'Authorization',
];

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: RAPIDAPI_HEADERS,
    exposeHeaders: ['Cache-Control', 'X-API-Version', 'X-Result-Count', 'X-Page', 'X-Limit'],
    maxAge: 86400,
  }),
);

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function readJsonBody(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function cleanString(value, maxLength = 200) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizePhone(value) {
  const raw = cleanString(value, 32).replace(/[^\d+]/g, '');
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  if (raw.startsWith('994')) return `+${raw}`;
  return raw;
}

function isValidPhone(phone) {
  return /^\+?\d{7,15}$/.test(phone);
}

function randomHex(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const payload = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', payload);
  return bufferToHex(digest);
}

function normalizeArray(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item, 80)).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [cleanString(value, 80)];
  }

  return fallback;
}

function jsonWithHeaders(c, body, status = 200, cacheControl = MAIN_CACHE_CONTROL, extraHeaders = {}) {
  return c.json(body, status, {
    'Cache-Control': cacheControl,
    'X-API-Version': API_VERSION,
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
}

function appDb(c) {
  return c.env.APP_DB || c.env.DB;
}

function formatCarRow(row) {
  if (!row) return null;

  return {
    brand: row.brand,
    model: row.model,
    ...parseJson(row.full_data, {}),
    _id: row.id,
  };
}

function parseInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compareCarsByYearAndPower(a, b) {
  const yearDiff = (b.year_start ?? 0) - (a.year_start ?? 0);
  if (yearDiff !== 0) return yearDiff;

  const endYearDiff = (b.year_end ?? 9999) - (a.year_end ?? 9999);
  if (endYearDiff !== 0) return endYearDiff;

  return (b.power_hp ?? 0) - (a.power_hp ?? 0);
}

function rowMatchesYear(row, year) {
  if (!year) return true;
  if (row.year_start && row.year_end) return row.year_start <= year && year <= row.year_end;
  if (row.year_start) return year >= row.year_start;
  if (row.year_end) return year <= row.year_end;
  return false;
}

function getRowImages(row) {
  const data = parseJson(row.full_data, {});
  return Array.isArray(data.Images) ? data.Images.filter(Boolean) : [];
}

function getYearImage(rows, year) {
  const exact = rows
    .filter((row) => row.year_start === year)
    .flatMap(getRowImages);
  const ranged = rows
    .filter((row) => rowMatchesYear(row, year))
    .flatMap(getRowImages);

  return [...new Set([...exact, ...ranged])][0] || '';
}

function getGenerationYears(rows) {
  const years = new Set();

  rows.forEach((row) => {
    if (row.year_start && row.year_end) {
      for (let year = row.year_start; year <= row.year_end; year += 1) years.add(year);
    } else if (row.year_start) {
      years.add(row.year_start);
    } else if (row.year_end) {
      years.add(row.year_end);
    }
  });

  return Array.from(years).sort((a, b) => b - a);
}

function formatMasterRow(row) {
  if (!row) return null;

  const reviewCount = Number(row.review_count || 0);
  const rating = reviewCount > 0 ? Number(Number(row.overall_rating || 0).toFixed(1)) : 0;
  const specialty = row.specialty || 'general';

  return {
    id: row.user_id,
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    role: 'master',
    specialty,
    specialties: parseJson(row.specialties, specialty ? [specialty] : []),
    supported_brands: parseJson(row.supported_brands, []),
    city: row.city || '',
    address: row.address || '',
    experience_years: Number(row.experience_years || 0),
    bio: row.bio || '',
    services: parseJson(row.services, []),
    portfolio_photos: parseJson(row.portfolio_photos, []),
    certificates: parseJson(row.certificates, []),
    overall_rating: rating,
    review_count: reviewCount,
    status: 'approved',
    created_at: row.created_at,
  };
}

function formatReviewRow(row) {
  return {
    id: row.id,
    master_user_id: row.master_user_id,
    user_id: row.user_id,
    user_name: row.user_name,
    rating: Number(row.rating || 0),
    comment: row.comment || '',
    created_at: row.created_at,
  };
}

function normalizeDate(value) {
  const date = cleanString(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function normalizeYear(value) {
  const year = parseInteger(value);
  if (!year || year < 1900 || year > 2100) return null;
  return year;
}

function formatDriverRow(row) {
  return {
    id: row.id,
    role: 'driver',
    name: row.name,
    phone: row.phone,
    created_at: row.created_at,
    vehicle_count: Number(row.vehicle_count || 0),
  };
}

function formatVehicleRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    car_id: row.car_id || null,
    brand: row.brand,
    model: row.model,
    year: row.year || null,
    modification: row.modification || '',
    plate_number: row.plate_number || '',
    created_at: row.created_at,
  };
}

function vehicleFromRow(row) {
  if (!row) return null;

  return {
    id: row.vehicle_id,
    brand: row.vehicle_brand,
    model: row.vehicle_model,
    year: row.vehicle_year || null,
    modification: row.vehicle_modification || '',
    plate_number: row.vehicle_plate_number || '',
  };
}

function formatServiceRecordRow(row) {
  return {
    id: row.id,
    master_user_id: row.master_user_id,
    master_name: row.master_name || '',
    master_phone: row.master_phone || '',
    driver_user_id: row.driver_user_id,
    vehicle_id: row.vehicle_id,
    vehicle: vehicleFromRow(row),
    service_date: row.service_date,
    odometer_km: row.odometer_km == null ? null : Number(row.odometer_km),
    work_summary: row.work_summary || '',
    note: row.note || '',
    created_at: row.created_at,
  };
}

function formatOilChangeRow(row) {
  return {
    id: row.id,
    master_user_id: row.master_user_id,
    master_name: row.master_name || '',
    master_phone: row.master_phone || '',
    driver_user_id: row.driver_user_id,
    vehicle_id: row.vehicle_id,
    vehicle: vehicleFromRow(row),
    changed_at: row.changed_at,
    oil_name: row.oil_name || '',
    odometer_km: row.odometer_km == null ? null : Number(row.odometer_km),
    next_due_date: row.next_due_date,
    note: row.note || '',
    created_at: row.created_at,
  };
}

function publicUser(user, master = null) {
  if (!user) return null;

  return {
    id: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    created_at: user.created_at,
    master: master ? formatMasterRow({ ...master, user_id: user.id, name: user.name, phone: user.phone }) : null,
  };
}

async function getUserWithMaster(db, userId) {
  const user = await db.prepare(
    'SELECT id, role, name, phone, created_at FROM users WHERE id = ? LIMIT 1'
  ).bind(userId).first();

  if (!user) return null;

  if (user.role !== 'master') return publicUser(user);

  const master = await db.prepare(
    `SELECT m.*, u.id as user_id, u.name, u.phone, u.created_at,
            COALESCE(AVG(r.rating), 0) as overall_rating,
            COUNT(r.id) as review_count
     FROM masters m
     JOIN users u ON u.id = m.user_id
     LEFT JOIN master_reviews r ON r.master_user_id = u.id
     WHERE m.user_id = ?
     GROUP BY m.user_id
     LIMIT 1`
  ).bind(userId).first();

  return publicUser(user, master);
}

// Helper to build dynamic SQL queries
function buildQuery(params) {
  const isGrouped = params.grouped === 'true';
  const isGroupedByModel = params.grouped_by_model === 'true';
  const lang = params.lang || 'en';

  let selectClause = '*';
  let groupClause = '';

  if (isGroupedByModel) {
    selectClause = `
      brand, model,
      MAX(year_end) as latest_year,
      MIN(id) as id,
      COUNT(*) as total_modifications,
      full_data,
      json_group_array(json_object(
        'id', id,
        'generation', generation,
        'year_start', year_start,
        'year_end', year_end,
        'modification', modification,
        'power_hp', power_hp,
        'acceleration_100', acceleration_100,
        'max_speed', max_speed
      )) as all_variants
    `;
    groupClause = ' GROUP BY brand, model';
  } else if (isGrouped) {
    selectClause = `
      brand, model, generation,
      MIN(id) as id,
      COUNT(*) as mod_count,
      full_data,
      json_group_array(json_object(
        'id', id,
        'modification', modification,
        'power_hp', power_hp,
        'acceleration_100', acceleration_100,
        'max_speed', max_speed,
        'year_start', year_start,
        'year_end', year_end
      )) as modifications
    `;
    groupClause = ' GROUP BY brand, model, generation';
  }

  let query = `SELECT ${selectClause} FROM cars WHERE brand IS NOT NULL AND brand != '' AND model IS NOT NULL AND model != ''`;
  const args = [];

  // Language filter
  query += ' AND lang = ?';
  args.push(lang);

  // Require Images if grouped by model (for clean UI cards)
  if (isGroupedByModel) {
    query += " AND full_data->>'$.Images' IS NOT NULL AND full_data->>'$.Images' != '[]' AND full_data->>'$.Images' != 'null'";
  }

  // Exact matches
  if (params.seats) {
    query += ' AND CAST(full_data->>\'$.\"General information\".Seats\' AS INTEGER) = ?';
    args.push(parseInt(params.seats));
  }
  if (params.doors) {
    query += ' AND CAST(full_data->>\'$.\"General information\".Doors\' AS INTEGER) = ?';
    args.push(parseInt(params.doors));
  }
  if (params.cylinders) {
    query += ' AND CAST(full_data->>\'$.\"Engine specs\".\"Number of cylinders\"\' AS INTEGER) = ?';
    args.push(parseInt(params.cylinders));
  }

  // Partial matches
  const textFilters = {
    brand: 'brand',
    model: 'model',
    generation: 'generation',
    modification: 'modification',
    body_type: 'body_type',
    fuel_type: 'full_data->>\'$.\"Performance specs\".\"Fuel Type\"\'',
    aspiration: 'full_data->>\'$.\"Engine specs\".\"Engine aspiration\"\'',
    gearbox: 'full_data->>\'$.\"Drivetrain, brakes and suspension specs\".\"Number of gears and type of gearbox\"\'',
    drive: 'full_data->>\'$.\"Drivetrain, brakes and suspension specs\".\"Drive wheel\"\'',
    engine_code: 'full_data->>\'$.\"Engine specs\".\"Engine Model/Code\"\'',
  };

  for (const [param, column] of Object.entries(textFilters)) {
    if (params[param]) {
      query += ` AND ${column} LIKE ?`;
      args.push(`%${params[param]}%`);
    }
  }

  // Range filters
  const rangeFilters = {
    year_from: ['year_start', '>='],
    year_to: ['year_end', '<='],
    min_power_hp: ['power_hp', '>='],
    max_power_hp: ['power_hp', '<='],
    min_torque_nm: ['torque_nm', '>='],
    max_torque_nm: ['torque_nm', '<='],
    min_displacement: ['displacement_cm3', '>='],
    max_displacement: ['displacement_cm3', '<='],
    min_max_speed: ['max_speed', '>='],
    max_max_speed: ['max_speed', '<='],
    min_accel_100: ['acceleration_100', '>='],
    max_accel_100: ['acceleration_100', '<='],
  };

  for (const [param, [column, op]] of Object.entries(rangeFilters)) {
    if (params[param]) {
      query += ` AND ${column} ${op} ?`;
      args.push(parseFloat(params[param]));
    }
  }

  if (isGrouped || isGroupedByModel) {
    query += groupClause;
  }

  // Sorting
  const allowedSortFields = {
    power_hp: isGrouped || isGroupedByModel ? 'MAX(power_hp)' : 'power_hp',
    torque_nm: isGrouped || isGroupedByModel ? 'MAX(torque_nm)' : 'torque_nm',
    displacement_cm3: isGrouped || isGroupedByModel ? 'MAX(displacement_cm3)' : 'displacement_cm3',
    acceleration: isGrouped || isGroupedByModel ? 'MIN(acceleration_100)' : 'acceleration_100',
    max_speed: isGrouped || isGroupedByModel ? 'MAX(max_speed)' : 'max_speed',
    weight: isGrouped || isGroupedByModel ? 'MAX(weight_kg)' : 'weight_kg',
    year_start: isGrouped || isGroupedByModel ? 'MIN(year_start)' : 'year_start',
    year_end: isGrouped || isGroupedByModel ? 'MAX(year_end)' : 'year_end',
    fuel_combined: isGrouped || isGroupedByModel ? 'MIN(fuel_combined)' : 'fuel_combined',
    co2: isGrouped || isGroupedByModel ? 'MIN(co2)' : 'co2',
    length: isGrouped || isGroupedByModel ? 'MAX(length_mm)' : 'length_mm',
    wheelbase: isGrouped || isGroupedByModel ? 'MAX(wheelbase_mm)' : 'wheelbase_mm',
    brand: 'brand',
    model: 'model'
  };

  if (params.sort_by && allowedSortFields[params.sort_by]) {
    const dir = params.sort_dir === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${allowedSortFields[params.sort_by]} ${dir}`;
  } else {
    query += ' ORDER BY brand ASC, model ASC';
  }

  // Pagination
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const page = Math.max(parseInt(params.page) || 1, 1);
  const offset = (page - 1) * limit;

  query += ' LIMIT ? OFFSET ?';
  args.push(limit, offset);

  return { query, args, limit, page };
}

app.get('/', async (c) => {
  const params = c.req.query();
  const { query, args, limit, page } = buildQuery(params);

  try {
    const { results } = await c.env.DB.prepare(query).bind(...args).all();

    const formatted = results.map(r => {
      const base = formatCarRow(r);

      if (params.grouped_by_model === 'true') {
        const variants = parseJson(r.all_variants, []);

        // Group variants by generation
        const generations = {};
        variants.forEach(v => {
          if (!generations[v.generation]) {
            generations[v.generation] = {
              generation: v.generation,
              year_start: v.year_start,
              year_end: v.year_end,
              modifications: []
            };
          }
          generations[v.generation].modifications.push(v);
        });

        base.total_modifications = r.total_modifications;
        // Sort generations by year_start desc
        base.generations = Object.values(generations).sort((a, b) => b.year_start - a.year_start);

        delete base.Modification;
        delete base.Generation;
      } else if (params.grouped === 'true') {
        base.modifications = JSON.parse(r.modifications);
        base.mod_count = r.mod_count;
        // Clean up representative modification info to be more generic if it's a group
        delete base.Modification;
      }

      return base;
    });

    return jsonWithHeaders(c, {
      success: true,
      count: formatted.length,
      page,
      results: formatted
    }, 200, MAIN_CACHE_CONTROL, {
      'X-Result-Count': String(formatted.length),
      'X-Page': String(page),
      'X-Limit': String(limit),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/cars/:id', async (c) => {
  const id = parseInteger(c.req.param('id'));
  const lang = c.req.query('lang') || 'en';

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid car id is required' }, 400, NO_STORE);
  }

  try {
    const row = await c.env.DB.prepare(
      'SELECT * FROM cars WHERE id = ? AND lang = ? LIMIT 1'
    ).bind(id, lang).first();

    if (!row) {
      return jsonWithHeaders(c, { success: false, error: 'Car not found' }, 404, NO_STORE);
    }

    return jsonWithHeaders(c, {
      success: true,
      result: formatCarRow(row),
    }, 200, MAIN_CACHE_CONTROL, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/cars/:id/related', async (c) => {
  const id = parseInteger(c.req.param('id'));
  const lang = c.req.query('lang') || 'en';
  const limit = Math.min(Math.max(parseInteger(c.req.query('limit'), 7), 1), 21);

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid car id is required' }, 400, NO_STORE);
  }

  try {
    const current = await c.env.DB.prepare(
      'SELECT * FROM cars WHERE id = ? AND lang = ? LIMIT 1'
    ).bind(id, lang).first();

    if (!current) {
      return jsonWithHeaders(c, { success: false, error: 'Car not found' }, 404, NO_STORE);
    }

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM cars
       WHERE lang = ? AND brand = ? AND model = ?
       ORDER BY year_start DESC, year_end DESC, power_hp DESC`
    ).bind(lang, current.brand, current.model).all();

    const sorted = [...results].sort(compareCarsByYearAndPower);
    const currentIndex = sorted.findIndex((row) => row.id === id);
    const before = Math.floor((limit - 1) / 2);
    const maxStart = Math.max(0, sorted.length - limit);
    const start = Math.min(Math.max(0, currentIndex - before), maxStart);
    const selected = sorted.slice(start, start + limit);

    return jsonWithHeaders(c, {
      success: true,
      current_id: id,
      count: selected.length,
      results: selected.map(formatCarRow),
    }, 200, MAIN_CACHE_CONTROL, {
      'X-Result-Count': String(selected.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/models/:brand/:model/years', async (c) => {
  const brand = decodeURIComponent(c.req.param('brand'));
  const model = decodeURIComponent(c.req.param('model'));
  const lang = c.req.query('lang') || 'en';

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, brand, model, generation, modification, body_type, year_start, year_end,
              power_hp, acceleration_100, max_speed, full_data
       FROM cars
       WHERE lang = ? AND brand = ? AND model = ?
       ORDER BY year_start DESC, year_end DESC, power_hp DESC`
    ).bind(lang, brand, model).all();

    const years = getGenerationYears(results).map((year) => {
      const variants = results
        .filter((row) => rowMatchesYear(row, year))
        .sort(compareCarsByYearAndPower);
      const primary = variants[0];

      return {
        year,
        count: variants.length,
        image: getYearImage(results, year),
        primary_variant: primary ? {
          id: primary.id,
          generation: primary.generation,
          modification: primary.modification,
          year_start: primary.year_start,
          year_end: primary.year_end,
          power_hp: primary.power_hp,
          acceleration_100: primary.acceleration_100,
          max_speed: primary.max_speed,
        } : null,
      };
    });

    return jsonWithHeaders(c, {
      success: true,
      brand,
      model,
      count: years.length,
      years,
    }, 200, MAIN_CACHE_CONTROL, {
      'X-Result-Count': String(years.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/models/:brand/:model/variants', async (c) => {
  const brand = decodeURIComponent(c.req.param('brand'));
  const model = decodeURIComponent(c.req.param('model'));
  const lang = c.req.query('lang') || 'en';
  const year = parseInteger(c.req.query('year'));

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM cars
       WHERE lang = ? AND brand = ? AND model = ?
       ORDER BY year_start DESC, year_end DESC, power_hp DESC`
    ).bind(lang, brand, model).all();

    const selected = results
      .filter((row) => rowMatchesYear(row, year))
      .sort(compareCarsByYearAndPower);

    return jsonWithHeaders(c, {
      success: true,
      brand,
      model,
      year,
      count: selected.length,
      results: selected.map(formatCarRow),
    }, 200, MAIN_CACHE_CONTROL, {
      'X-Result-Count': String(selected.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/auth/register', async (c) => {
  const db = appDb(c);
  const body = await readJsonBody(c);
  const role = body.role === 'master' ? 'master' : 'driver';
  const name = cleanString(body.name, 80);
  const phone = normalizePhone(body.phone || body.mobile);
  const password = String(body.password || '');

  if (!name) {
    return jsonWithHeaders(c, { success: false, error: 'Name is required' }, 400, NO_STORE);
  }

  if (!phone || !isValidPhone(phone)) {
    return jsonWithHeaders(c, { success: false, error: 'Valid mobile number is required' }, 400, NO_STORE);
  }

  if (password.length < 6) {
    return jsonWithHeaders(c, { success: false, error: 'Password must be at least 6 characters' }, 400, NO_STORE);
  }

  try {
    const existing = await db.prepare(
      'SELECT id FROM users WHERE phone = ? LIMIT 1'
    ).bind(phone).first();

    if (existing) {
      return jsonWithHeaders(c, { success: false, error: 'Mobile number is already registered' }, 409, NO_STORE);
    }

    const passwordSalt = randomHex();
    const passwordHash = await hashPassword(password, passwordSalt);
    const insertUser = await db.prepare(
      `INSERT INTO users (role, name, phone, password_hash, password_salt)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(role, name, phone, passwordHash, passwordSalt).run();

    let userId = insertUser.meta?.last_row_id;
    if (!userId) {
      const created = await db.prepare(
        'SELECT id FROM users WHERE phone = ? LIMIT 1'
      ).bind(phone).first();
      userId = created?.id;
    }

    if (role === 'master') {
      const specialty = cleanString(body.specialty || body.master_specialty || 'general', 80) || 'general';
      const specialties = normalizeArray(body.specialties, [specialty]);
      const supportedBrands = normalizeArray(body.supported_brands, []);
      const services = Array.isArray(body.services)
        ? body.services.map((service) => ({
            name: cleanString(service?.name ?? service, 80),
            price: service?.price ? Number(service.price) : undefined,
          })).filter((service) => service.name)
        : [];

      await db.prepare(
        `INSERT INTO masters (
          user_id, specialty, specialties, supported_brands, city, address,
          experience_years, bio, services, portfolio_photos, certificates
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        userId,
        specialty,
        JSON.stringify(specialties),
        JSON.stringify(supportedBrands),
        cleanString(body.city, 80),
        cleanString(body.address, 160),
        Math.max(0, parseInteger(body.experience_years, 0) || 0),
        cleanString(body.bio, 600),
        JSON.stringify(services),
        JSON.stringify(normalizeArray(body.portfolio_photos, [])),
        JSON.stringify(normalizeArray(body.certificates, [])),
      ).run();
    }

    const user = await getUserWithMaster(db, userId);
    return jsonWithHeaders(c, { success: true, user }, 201, NO_STORE);
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/auth/login', async (c) => {
  const db = appDb(c);
  const body = await readJsonBody(c);
  const phone = normalizePhone(body.phone || body.mobile);
  const password = String(body.password || '');

  if (!phone || !password) {
    return jsonWithHeaders(c, { success: false, error: 'Mobile number and password are required' }, 400, NO_STORE);
  }

  try {
    const userRow = await db.prepare(
      'SELECT * FROM users WHERE phone = ? LIMIT 1'
    ).bind(phone).first();

    if (!userRow) {
      return jsonWithHeaders(c, { success: false, error: 'Mobile number or password is incorrect' }, 401, NO_STORE);
    }

    const candidateHash = await hashPassword(password, userRow.password_salt);
    if (candidateHash !== userRow.password_hash) {
      return jsonWithHeaders(c, { success: false, error: 'Mobile number or password is incorrect' }, 401, NO_STORE);
    }

    const user = await getUserWithMaster(db, userRow.id);
    return jsonWithHeaders(c, { success: true, user }, 200, NO_STORE);
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/users/:id', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid user id is required' }, 400, NO_STORE);
  }

  try {
    const user = await getUserWithMaster(db, id);
    if (!user) {
      return jsonWithHeaders(c, { success: false, error: 'User not found' }, 404, NO_STORE);
    }

    return jsonWithHeaders(c, { success: true, user }, 200, NO_STORE);
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/drivers/search', async (c) => {
  const db = appDb(c);
  const query = cleanString(c.req.query('q') || c.req.query('query') || c.req.query('phone'), 80);

  if (!query) {
    return jsonWithHeaders(c, { success: true, count: 0, results: [] }, 200, NO_STORE, {
      'X-Result-Count': '0',
    });
  }

  const phone = normalizePhone(query);
  const textLike = `%${query}%`;
  const phoneLike = `%${phone || query.replace(/[^\d]/g, '')}%`;

  try {
    const { results } = await db.prepare(
      `SELECT u.id, u.role, u.name, u.phone, u.created_at,
              COUNT(v.id) as vehicle_count
       FROM users u
       LEFT JOIN user_vehicles v ON v.user_id = u.id
       WHERE u.role = 'driver'
         AND (u.name LIKE ? OR u.phone LIKE ?)
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 12`
    ).bind(textLike, phoneLike).all();

    const drivers = results.map(formatDriverRow);
    return jsonWithHeaders(c, {
      success: true,
      count: drivers.length,
      results: drivers,
    }, 200, NO_STORE, {
      'X-Result-Count': String(drivers.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/users/:id/vehicles', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid user id is required' }, 400, NO_STORE);
  }

  try {
    const user = await db.prepare(
      'SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1'
    ).bind(id, 'driver').first();

    if (!user) {
      return jsonWithHeaders(c, { success: false, error: 'Driver not found' }, 404, NO_STORE);
    }

    const { results } = await db.prepare(
      `SELECT *
       FROM user_vehicles
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    ).bind(id).all();

    const vehicles = results.map(formatVehicleRow);
    return jsonWithHeaders(c, {
      success: true,
      count: vehicles.length,
      results: vehicles,
    }, 200, NO_STORE, {
      'X-Result-Count': String(vehicles.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/users/:id/vehicles', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));
  const body = await readJsonBody(c);
  const brand = cleanString(body.brand, 80);
  const model = cleanString(body.model, 80);
  const year = normalizeYear(body.year);
  const modification = cleanString(body.modification, 160);
  const plateNumber = cleanString(body.plate_number, 32).toUpperCase();
  const carId = parseInteger(body.car_id);

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid user id is required' }, 400, NO_STORE);
  }

  if (!brand || !model) {
    return jsonWithHeaders(c, { success: false, error: 'Brand and model are required' }, 400, NO_STORE);
  }

  try {
    const user = await db.prepare(
      'SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1'
    ).bind(id, 'driver').first();

    if (!user) {
      return jsonWithHeaders(c, { success: false, error: 'Driver not found' }, 404, NO_STORE);
    }

    const insert = await db.prepare(
      `INSERT INTO user_vehicles (user_id, car_id, brand, model, year, modification, plate_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, carId, brand, model, year, modification, plateNumber).run();

    let vehicleId = insert.meta?.last_row_id;
    if (!vehicleId) {
      const created = await db.prepare(
        `SELECT id
         FROM user_vehicles
         WHERE user_id = ? AND brand = ? AND model = ?
         ORDER BY id DESC
         LIMIT 1`
      ).bind(id, brand, model).first();
      vehicleId = created?.id;
    }

    const vehicle = await db.prepare(
      'SELECT * FROM user_vehicles WHERE id = ? LIMIT 1'
    ).bind(vehicleId).first();

    return jsonWithHeaders(c, {
      success: true,
      result: formatVehicleRow(vehicle),
    }, 201, NO_STORE, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/users/:id/service-history', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));
  const vehicleId = parseInteger(c.req.query('vehicle_id'));

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid user id is required' }, 400, NO_STORE);
  }

  const vehicleFilter = vehicleId ? ' AND vehicle_id = ?' : '';
  const vehicleArgs = vehicleId ? [id, vehicleId] : [id];

  try {
    const user = await db.prepare(
      'SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1'
    ).bind(id, 'driver').first();

    if (!user) {
      return jsonWithHeaders(c, { success: false, error: 'Driver not found' }, 404, NO_STORE);
    }

    const { results: vehicles } = await db.prepare(
      `SELECT *
       FROM user_vehicles
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`
    ).bind(id).all();

    const { results: serviceRows } = await db.prepare(
      `SELECT sr.*, mu.name as master_name, mu.phone as master_phone,
              v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model,
              v.year as vehicle_year, v.modification as vehicle_modification,
              v.plate_number as vehicle_plate_number
       FROM service_records sr
       JOIN users mu ON mu.id = sr.master_user_id
       JOIN user_vehicles v ON v.id = sr.vehicle_id
       WHERE sr.driver_user_id = ?${vehicleFilter}
       ORDER BY sr.service_date DESC, sr.created_at DESC`
    ).bind(...vehicleArgs).all();

    const { results: oilRows } = await db.prepare(
      `SELECT oc.*, mu.name as master_name, mu.phone as master_phone,
              v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model,
              v.year as vehicle_year, v.modification as vehicle_modification,
              v.plate_number as vehicle_plate_number
       FROM oil_changes oc
       JOIN users mu ON mu.id = oc.master_user_id
       JOIN user_vehicles v ON v.id = oc.vehicle_id
       WHERE oc.driver_user_id = ?${vehicleFilter}
       ORDER BY oc.changed_at DESC, oc.created_at DESC`
    ).bind(...vehicleArgs).all();

    return jsonWithHeaders(c, {
      success: true,
      vehicles: vehicles.map(formatVehicleRow),
      service_records: serviceRows.map(formatServiceRecordRow),
      oil_changes: oilRows.map(formatOilChangeRow),
    }, 200, NO_STORE);
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/service-records', async (c) => {
  const db = appDb(c);
  const body = await readJsonBody(c);
  const masterId = parseInteger(body.master_user_id);
  const driverId = parseInteger(body.driver_user_id);
  const vehicleId = parseInteger(body.vehicle_id);
  const serviceDate = normalizeDate(body.service_date);
  const odometerKm = parseInteger(body.odometer_km);
  const workSummary = cleanString(body.work_summary || body.description, 1200);
  const note = cleanString(body.note, 800);

  if (!masterId || !driverId || !vehicleId) {
    return jsonWithHeaders(c, { success: false, error: 'Master, driver and vehicle ids are required' }, 400, NO_STORE);
  }

  if (!serviceDate) {
    return jsonWithHeaders(c, { success: false, error: 'Valid service date is required' }, 400, NO_STORE);
  }

  if (!workSummary) {
    return jsonWithHeaders(c, { success: false, error: 'Work summary is required' }, 400, NO_STORE);
  }

  try {
    const master = await db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'master' LIMIT 1"
    ).bind(masterId).first();
    const driver = await db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'driver' LIMIT 1"
    ).bind(driverId).first();
    const vehicle = await db.prepare(
      'SELECT id FROM user_vehicles WHERE id = ? AND user_id = ? LIMIT 1'
    ).bind(vehicleId, driverId).first();

    if (!master) return jsonWithHeaders(c, { success: false, error: 'Master not found' }, 404, NO_STORE);
    if (!driver) return jsonWithHeaders(c, { success: false, error: 'Driver not found' }, 404, NO_STORE);
    if (!vehicle) return jsonWithHeaders(c, { success: false, error: 'Vehicle not found for selected driver' }, 404, NO_STORE);

    const insert = await db.prepare(
      `INSERT INTO service_records (
        master_user_id, driver_user_id, vehicle_id, service_date, odometer_km, work_summary, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(masterId, driverId, vehicleId, serviceDate, odometerKm, workSummary, note).run();

    const record = await db.prepare(
      `SELECT sr.*, mu.name as master_name, mu.phone as master_phone,
              v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model,
              v.year as vehicle_year, v.modification as vehicle_modification,
              v.plate_number as vehicle_plate_number
       FROM service_records sr
       JOIN users mu ON mu.id = sr.master_user_id
       JOIN user_vehicles v ON v.id = sr.vehicle_id
       WHERE sr.id = ?
       LIMIT 1`
    ).bind(insert.meta?.last_row_id).first();

    return jsonWithHeaders(c, {
      success: true,
      result: formatServiceRecordRow(record),
    }, 201, NO_STORE, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/oil-changes', async (c) => {
  const db = appDb(c);
  const body = await readJsonBody(c);
  const masterId = parseInteger(body.master_user_id);
  const driverId = parseInteger(body.driver_user_id);
  const vehicleId = parseInteger(body.vehicle_id);
  const changedAt = normalizeDate(body.changed_at);
  const nextDueDate = normalizeDate(body.next_due_date);
  const oilName = cleanString(body.oil_name, 120);
  const odometerKm = parseInteger(body.odometer_km);
  const note = cleanString(body.note, 800);

  if (!masterId || !driverId || !vehicleId) {
    return jsonWithHeaders(c, { success: false, error: 'Master, driver and vehicle ids are required' }, 400, NO_STORE);
  }

  if (!changedAt || !nextDueDate) {
    return jsonWithHeaders(c, { success: false, error: 'Oil change and next visit dates are required' }, 400, NO_STORE);
  }

  try {
    const master = await db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'master' LIMIT 1"
    ).bind(masterId).first();
    const driver = await db.prepare(
      "SELECT id FROM users WHERE id = ? AND role = 'driver' LIMIT 1"
    ).bind(driverId).first();
    const vehicle = await db.prepare(
      'SELECT id FROM user_vehicles WHERE id = ? AND user_id = ? LIMIT 1'
    ).bind(vehicleId, driverId).first();

    if (!master) return jsonWithHeaders(c, { success: false, error: 'Master not found' }, 404, NO_STORE);
    if (!driver) return jsonWithHeaders(c, { success: false, error: 'Driver not found' }, 404, NO_STORE);
    if (!vehicle) return jsonWithHeaders(c, { success: false, error: 'Vehicle not found for selected driver' }, 404, NO_STORE);

    const insert = await db.prepare(
      `INSERT INTO oil_changes (
        master_user_id, driver_user_id, vehicle_id, changed_at, oil_name, odometer_km, next_due_date, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(masterId, driverId, vehicleId, changedAt, oilName, odometerKm, nextDueDate, note).run();

    const oilChange = await db.prepare(
      `SELECT oc.*, mu.name as master_name, mu.phone as master_phone,
              v.id as vehicle_id, v.brand as vehicle_brand, v.model as vehicle_model,
              v.year as vehicle_year, v.modification as vehicle_modification,
              v.plate_number as vehicle_plate_number
       FROM oil_changes oc
       JOIN users mu ON mu.id = oc.master_user_id
       JOIN user_vehicles v ON v.id = oc.vehicle_id
       WHERE oc.id = ?
       LIMIT 1`
    ).bind(insert.meta?.last_row_id).first();

    return jsonWithHeaders(c, {
      success: true,
      result: formatOilChangeRow(oilChange),
    }, 201, NO_STORE, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/masters', async (c) => {
  const db = appDb(c);
  const sort = c.req.query('sort') || 'rating_desc';
  const city = cleanString(c.req.query('city'), 80);
  const specialty = cleanString(c.req.query('specialty'), 80);
  const args = [];
  const filters = ["u.role = 'master'"];

  if (city) {
    filters.push('m.city = ?');
    args.push(city);
  }

  if (specialty) {
    filters.push('(m.specialty = ? OR m.specialties LIKE ?)');
    args.push(specialty, `%"${specialty}"%`);
  }

  const sortClauses = {
    rating_desc: 'overall_rating DESC, review_count DESC, u.created_at DESC',
    rating_asc: 'overall_rating ASC, review_count DESC, u.created_at DESC',
    reviews_desc: 'review_count DESC, overall_rating DESC, u.created_at DESC',
    newest: 'u.created_at DESC',
  };
  const orderBy = sortClauses[sort] || sortClauses.rating_desc;

  try {
    const { results } = await db.prepare(
      `SELECT m.*, u.id as user_id, u.name, u.phone, u.created_at,
              COALESCE(AVG(r.rating), 0) as overall_rating,
              COUNT(r.id) as review_count
       FROM users u
       JOIN masters m ON m.user_id = u.id
       LEFT JOIN master_reviews r ON r.master_user_id = u.id
       WHERE ${filters.join(' AND ')}
       GROUP BY u.id
       ORDER BY ${orderBy}`
    ).bind(...args).all();

    const masters = results.map(formatMasterRow);
    return jsonWithHeaders(c, {
      success: true,
      count: masters.length,
      results: masters,
    }, 200, NO_STORE, {
      'X-Result-Count': String(masters.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/masters/:id', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid master id is required' }, 400, NO_STORE);
  }

  try {
    const masterRow = await db.prepare(
      `SELECT m.*, u.id as user_id, u.name, u.phone, u.created_at,
              COALESCE(AVG(r.rating), 0) as overall_rating,
              COUNT(r.id) as review_count
       FROM users u
       JOIN masters m ON m.user_id = u.id
       LEFT JOIN master_reviews r ON r.master_user_id = u.id
       WHERE u.id = ? AND u.role = 'master'
       GROUP BY u.id
       LIMIT 1`
    ).bind(id).first();

    if (!masterRow) {
      return jsonWithHeaders(c, { success: false, error: 'Master not found' }, 404, NO_STORE);
    }

    const { results: reviewRows } = await db.prepare(
      `SELECT r.*, u.name as user_name
       FROM master_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.master_user_id = ?
       ORDER BY r.created_at DESC`
    ).bind(id).all();

    return jsonWithHeaders(c, {
      success: true,
      result: {
        ...formatMasterRow(masterRow),
        reviews: reviewRows.map(formatReviewRow),
      },
    }, 200, NO_STORE, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/masters/:id/profile', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));
  const body = await readJsonBody(c);
  const userId = parseInteger(body.user_id);

  if (!id || !userId || id !== userId) {
    return jsonWithHeaders(c, { success: false, error: 'Valid master user id is required' }, 400, NO_STORE);
  }

  try {
    const master = await db.prepare(
      `SELECT u.id FROM users u
       JOIN masters m ON m.user_id = u.id
       WHERE u.id = ? AND u.role = 'master'
       LIMIT 1`
    ).bind(id).first();

    if (!master) {
      return jsonWithHeaders(c, { success: false, error: 'Master not found' }, 404, NO_STORE);
    }

    const specialties = normalizeArray(body.specialties, []);
    const specialty = specialties[0] || cleanString(body.specialty || 'general', 80) || 'general';
    const services = Array.isArray(body.services)
      ? body.services.map((service) => ({
          name: cleanString(service?.name ?? service, 80),
          price: service?.price ? Number(service.price) : undefined,
        })).filter((service) => service.name)
      : [];

    await db.prepare(
      `UPDATE masters
       SET specialty = ?,
           specialties = ?,
           supported_brands = ?,
           city = ?,
           address = ?,
           experience_years = ?,
           bio = ?,
           services = ?
       WHERE user_id = ?`
    ).bind(
      specialty,
      JSON.stringify(specialties.length ? specialties : [specialty]),
      JSON.stringify(normalizeArray(body.supported_brands, [])),
      cleanString(body.city, 80),
      cleanString(body.address, 160),
      Math.max(0, parseInteger(body.experience_years, 0) || 0),
      cleanString(body.bio, 600),
      JSON.stringify(services),
      id,
    ).run();

    const updated = await db.prepare(
      `SELECT m.*, u.id as user_id, u.name, u.phone, u.created_at,
              COALESCE(AVG(r.rating), 0) as overall_rating,
              COUNT(r.id) as review_count
       FROM users u
       JOIN masters m ON m.user_id = u.id
       LEFT JOIN master_reviews r ON r.master_user_id = u.id
       WHERE u.id = ?
       GROUP BY u.id
       LIMIT 1`
    ).bind(id).first();

    return jsonWithHeaders(c, {
      success: true,
      result: formatMasterRow(updated),
      user: await getUserWithMaster(db, id),
    }, 200, NO_STORE);
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/masters/:id/reviews', async (c) => {
  const db = appDb(c);
  const id = parseInteger(c.req.param('id'));

  if (!id) {
    return jsonWithHeaders(c, { success: false, error: 'Valid master id is required' }, 400, NO_STORE);
  }

  try {
    const { results } = await db.prepare(
      `SELECT r.*, u.name as user_name
       FROM master_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.master_user_id = ?
       ORDER BY r.created_at DESC`
    ).bind(id).all();

    return jsonWithHeaders(c, {
      success: true,
      count: results.length,
      results: results.map(formatReviewRow),
    }, 200, NO_STORE, {
      'X-Result-Count': String(results.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.post('/masters/:id/reviews', async (c) => {
  const db = appDb(c);
  const masterId = parseInteger(c.req.param('id'));
  const body = await readJsonBody(c);
  const userId = parseInteger(body.user_id);
  const rating = parseInteger(body.rating);
  const comment = cleanString(body.comment, 800);

  if (!masterId || !userId) {
    return jsonWithHeaders(c, { success: false, error: 'Master and user ids are required' }, 400, NO_STORE);
  }

  if (!rating || rating < 1 || rating > 5) {
    return jsonWithHeaders(c, { success: false, error: 'Rating must be between 1 and 5' }, 400, NO_STORE);
  }

  if (!comment) {
    return jsonWithHeaders(c, { success: false, error: 'Review text is required' }, 400, NO_STORE);
  }

  if (masterId === userId) {
    return jsonWithHeaders(c, { success: false, error: 'Masters cannot review themselves' }, 400, NO_STORE);
  }

  try {
    const master = await db.prepare(
      `SELECT u.id FROM users u
       JOIN masters m ON m.user_id = u.id
       WHERE u.id = ? AND u.role = 'master'
       LIMIT 1`
    ).bind(masterId).first();

    if (!master) {
      return jsonWithHeaders(c, { success: false, error: 'Master not found' }, 404, NO_STORE);
    }

    const user = await db.prepare(
      'SELECT id, role FROM users WHERE id = ? LIMIT 1'
    ).bind(userId).first();

    if (!user) {
      return jsonWithHeaders(c, { success: false, error: 'User not found' }, 404, NO_STORE);
    }

    if (user.role !== 'driver') {
      return jsonWithHeaders(c, { success: false, error: 'Only driver accounts can write reviews' }, 403, NO_STORE);
    }

    await db.prepare(
      `INSERT INTO master_reviews (master_user_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(master_user_id, user_id)
       DO UPDATE SET rating = excluded.rating, comment = excluded.comment, created_at = CURRENT_TIMESTAMP`
    ).bind(masterId, userId, rating, comment).run();

    const review = await db.prepare(
      `SELECT r.*, u.name as user_name
       FROM master_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.master_user_id = ? AND r.user_id = ?
       LIMIT 1`
    ).bind(masterId, userId).first();

    return jsonWithHeaders(c, {
      success: true,
      review: formatReviewRow(review),
    }, 201, NO_STORE);
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/brands', async (c) => {
  const lang = c.req.query('lang') || 'en';
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT DISTINCT brand FROM cars WHERE lang = ? AND brand IS NOT NULL AND brand != '' ORDER BY brand ASC"
    ).bind(lang).all();
    return jsonWithHeaders(c, { success: true, brands: results.map(r => r.brand) }, 200, METADATA_CACHE_CONTROL, {
      'X-Result-Count': String(results.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/models', async (c) => {
  const brand = c.req.query('brand');
  const lang = c.req.query('lang') || 'en';

  if (!brand) {
    return jsonWithHeaders(c, { success: false, error: 'Brand parameter is required' }, 400, NO_STORE);
  }

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT DISTINCT model FROM cars WHERE brand = ? AND lang = ? AND model IS NOT NULL AND model != '' ORDER BY model ASC"
    ).bind(brand, lang).all();
    return jsonWithHeaders(c, { success: true, models: results.map(r => r.model) }, 200, METADATA_CACHE_CONTROL, {
      'X-Result-Count': String(results.length),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/languages', (c) => {
  return jsonWithHeaders(c, { success: true, languages: ['en', 'tr', 'ru'] }, 200, METADATA_CACHE_CONTROL, {
    'X-Result-Count': '3',
  });
});

app.get('/stats', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT lang, COUNT(*) as count FROM cars GROUP BY lang'
    ).all();

    const stats = {};
    let total = 0;
    results.forEach(r => {
      stats[r.lang] = r.count;
      total += r.count;
    });

    return jsonWithHeaders(c, { success: true, stats, total }, 200, METADATA_CACHE_CONTROL, {
      'X-Result-Count': String(total),
    });
  } catch (err) {
    return jsonWithHeaders(c, { success: false, error: err.message }, 500, NO_STORE);
  }
});

app.get('/health', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as ok').first();
    return jsonWithHeaders(c, {
      success: true,
      status: 'ok',
      service: 'scorpus-api',
      provider: 'cloudflare-worker',
      database: result?.ok === 1 ? 'connected' : 'unknown',
    }, 200, METADATA_CACHE_CONTROL, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, {
      success: false,
      status: 'error',
      error: err.message,
    }, 503, NO_STORE);
  }
});

app.get('/ping', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT 1 as ok').first();
    return jsonWithHeaders(c, {
      success: true,
      status: 'ok',
      service: 'scorpus-api',
      provider: 'cloudflare-worker',
      database: result?.ok === 1 ? 'connected' : 'unknown',
    }, 200, METADATA_CACHE_CONTROL, {
      'X-Result-Count': '1',
    });
  } catch (err) {
    return jsonWithHeaders(c, {
      success: false,
      status: 'error',
      error: err.message,
    }, 503, NO_STORE);
  }
});

app.onError((err, c) => {
  return jsonWithHeaders(c, {
    success: false,
    error: err.message || 'Internal Server Error',
  }, 500, NO_STORE);
});

app.notFound((c) => {
  return jsonWithHeaders(c, {
    success: false,
    error: 'Not Found',
  }, 404, NO_STORE);
});

export default app;
