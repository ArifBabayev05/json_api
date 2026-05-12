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
    allowMethods: ['GET', 'OPTIONS'],
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

function jsonWithHeaders(c, body, status = 200, cacheControl = MAIN_CACHE_CONTROL, extraHeaders = {}) {
  return c.json(body, status, {
    'Cache-Control': cacheControl,
    'X-API-Version': API_VERSION,
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
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
      const base = {
        brand: r.brand,
        model: r.model,
        ...parseJson(r.full_data, {}),
        _id: r.id
      };

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
