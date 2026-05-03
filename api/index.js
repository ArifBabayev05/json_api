const fs = require("fs");
const path = require("path");

// ── In-memory cache ───────────────────────────────────────
const cache = {};
const SUPPORTED_LANGS = ["en", "ru", "tr"];

function loadData(lang) {
  if (cache[lang]) return cache[lang];
  const filePath = path.resolve(__dirname, `../data/cars_${lang}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    cache[lang] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return cache[lang];
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────
function normLang(v) {
  if (!v) return "en";
  const l = v.toLowerCase().trim();
  return SUPPORTED_LANGS.includes(l) ? l : v;
}

function strInc(h, n) {
  return h && n ? h.toLowerCase().includes(n.toLowerCase()) : false;
}

function parseNum(s) {
  if (!s) return null;
  const m = String(s).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function parseRpm(s) {
  if (!s) return null;
  const m = String(s).match(/@\s*([\d,]+)\s*(rpm|dev|об)/i);
  return m ? parseInt(m[1].replace(",", "")) : null;
}

function extractYear(s) {
  if (!s) return null;
  const m = String(s).match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

function applyStr(r, p, fn) { return p ? r.filter(fn) : r; }
function applyNumMin(r, p, gv) { if (!p) return r; const m = parseFloat(p); return isNaN(m) ? r : r.filter(c => { const v = gv(c); return v !== null && v >= m; }); }
function applyNumMax(r, p, gv) { if (!p) return r; const m = parseFloat(p); return isNaN(m) ? r : r.filter(c => { const v = gv(c); return v !== null && v <= m; }); }
function applyNumEq(r, p, gv) { if (!p) return r; const t = parseInt(p); return isNaN(t) ? r : r.filter(c => gv(c) === t); }

// ── Accessor helpers for compact format ───────────────────
// Optimized data uses short keys: g=general, p=performance, e=engine, d=dimensions, s=space, dt=drivetrain
const G = (c) => c.g || {};
const P = (c) => c.p || {};
const E = (c) => c.e || {};
const D = (c) => c.d || {};
const S = (c) => c.s || {};
const DT = (c) => c.dt || {};

// ── Normalize for API response (expand short keys) ───────
function expand(car) {
  const g = G(car), p = P(car), e = E(car), d = D(car), s = S(car), dt = DT(car);
  return {
    title: car.t || null,
    url: car.u || null,
    images: car.img || [],
    general: {
      brand: g.brand || null,
      model: g.model || null,
      generation: g.generation || null,
      modification: g.modification || null,
      year_start: extractYear(g.start),
      year_end: extractYear(g.end),
      production_start: g.start || null,
      production_end: g.end || null,
      powertrain_architecture: g.powertrain || null,
      body_type: g.body_type || null,
      seats: g.seats ? parseInt(g.seats) : null,
      doors: g.doors ? parseInt(g.doors) : null,
    },
    performance: {
      fuel_consumption_urban_l100km: parseNum(p.urban),
      fuel_consumption_extra_urban_l100km: parseNum(p.extra_urban),
      fuel_consumption_combined_l100km: parseNum(p.combined),
      co2_emissions_g_km: parseNum(p.co2),
      fuel_type: p.fuel_type || null,
      acceleration_0_100_sec: parseNum(p.accel_100),
      max_speed_kmh: parseNum(p.max_speed),
      emission_standard: p.emission || null,
    },
    engine: {
      power_hp: parseNum(e.power),
      power_rpm: parseRpm(e.power),
      torque_nm: parseNum(e.torque),
      torque_rpm: parseRpm(e.torque),
      displacement_cm3: parseNum(e.displacement),
      cylinders: e.cylinders ? parseInt(e.cylinders) : null,
      configuration: e.configuration || null,
      valvetrain: e.valvetrain || null,
      fuel_injection: e.injection || null,
      aspiration: e.aspiration || null,
      compression_ratio: e.compression || null,
      engine_code: e.code || null,
      oil_capacity_l: parseNum(e.oil_capacity),
    },
    dimensions: {
      length_mm: parseNum(d.length),
      width_mm: parseNum(d.width),
      height_mm: parseNum(d.height),
      wheelbase_mm: parseNum(d.wheelbase),
      front_track_mm: parseNum(d.front_track),
      rear_track_mm: parseNum(d.rear_track),
    },
    space_weight: {
      kerb_weight_kg: parseNum(s.kerb_weight),
      max_weight_kg: parseNum(s.max_weight),
      trunk_min_l: parseNum(s.trunk_min),
      trunk_max_l: parseNum(s.trunk_max),
      fuel_tank_l: parseNum(s.fuel_tank),
    },
    drivetrain: {
      drive_wheel: dt.drive_wheel || null,
      gearbox: dt.gearbox || null,
      front_suspension: dt.front_suspension || null,
      rear_suspension: dt.rear_suspension || null,
      front_brakes: dt.front_brakes || null,
      rear_brakes: dt.rear_brakes || null,
      tires: dt.tires || null,
      rims: dt.rims || null,
    },
  };
}

function getSortValue(car, field) {
  const n = expand(car);
  const map = {
    power_hp: n.engine.power_hp, torque_nm: n.engine.torque_nm,
    displacement_cm3: n.engine.displacement_cm3, acceleration: n.performance.acceleration_0_100_sec,
    max_speed: n.performance.max_speed_kmh, weight: n.space_weight.kerb_weight_kg,
    year_start: n.general.year_start, year_end: n.general.year_end,
    fuel_combined: n.performance.fuel_consumption_combined_l100km,
    co2: n.performance.co2_emissions_g_km, length: n.dimensions.length_mm,
    wheelbase: n.dimensions.wheelbase_mm, brand: n.general.brand, model: n.general.model,
  };
  return map[field] !== undefined ? map[field] : null;
}

// ── Main handler ──────────────────────────────────────────
module.exports = (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-RapidAPI-Key, X-RapidAPI-Host, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") return res.status(204).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = url.pathname.replace(/^\/api\/?/, "").replace(/^\/+|\/+$/g, "");
  const params = Object.fromEntries(url.searchParams.entries());

  // ── /api/languages ──────────────────────────────────────
  if (reqPath === "languages") {
    return res.json({ languages: SUPPORTED_LANGS, default: "en", total_languages: SUPPORTED_LANGS.length });
  }

  // ── /api/stats ──────────────────────────────────────────
  if (reqPath === "stats") {
    const stats = {};
    for (const l of SUPPORTED_LANGS) { const d = loadData(l); stats[l] = d ? d.length : 0; }
    return res.json({ languages: stats, total_records: Object.values(stats).reduce((a, b) => a + b, 0) });
  }

  // ── /api/brands ─────────────────────────────────────────
  if (reqPath === "brands") {
    const lang = normLang(params.lang);
    const data = loadData(lang);
    if (!data) return res.status(400).json({ error: `Unsupported language: ${params.lang}. Use: ${SUPPORTED_LANGS.join(", ")}` });
    const brands = new Set();
    for (const car of data) { const b = G(car).brand; if (b) brands.add(b); }
    const sorted = [...brands].sort();
    return res.json({ lang, total: sorted.length, brands: sorted });
  }

  // ── Main cars endpoint ──────────────────────────────────
  const lang = normLang(params.lang);
  const data = loadData(lang);
  if (!data) return res.status(400).json({ error: `Unsupported language: ${params.lang}. Supported: ${SUPPORTED_LANGS.join(", ")}` });

  let results = [...data];

  // General filters
  results = applyStr(results, params.brand, c => strInc(G(c).brand, params.brand));
  results = applyStr(results, params.model, c => strInc(G(c).model, params.model));
  results = applyStr(results, params.generation, c => strInc(G(c).generation, params.generation));
  results = applyStr(results, params.modification, c => strInc(G(c).modification, params.modification));
  results = applyStr(results, params.body_type, c => strInc(G(c).body_type, params.body_type));
  results = applyStr(results, params.engine_code, c => strInc(E(c).code, params.engine_code));
  results = applyNumEq(results, params.seats, c => { const v = G(c).seats; return v ? parseInt(v) : null; });
  results = applyNumEq(results, params.doors, c => { const v = G(c).doors; return v ? parseInt(v) : null; });

  // Year
  results = applyNumMin(results, params.year_from, c => extractYear(G(c).start));
  results = applyNumMax(results, params.year_to, c => extractYear(G(c).end));

  // Performance
  results = applyStr(results, params.fuel_type, c => strInc(P(c).fuel_type, params.fuel_type));
  results = applyStr(results, params.emission_standard, c => strInc(P(c).emission, params.emission_standard));
  results = applyNumMin(results, params.min_max_speed, c => parseNum(P(c).max_speed));
  results = applyNumMax(results, params.max_max_speed, c => parseNum(P(c).max_speed));
  results = applyNumMin(results, params.min_accel_100, c => parseNum(P(c).accel_100));
  results = applyNumMax(results, params.max_accel_100, c => parseNum(P(c).accel_100));
  results = applyNumMin(results, params.min_co2, c => parseNum(P(c).co2));
  results = applyNumMax(results, params.max_co2, c => parseNum(P(c).co2));
  results = applyNumMin(results, params.min_fuel_combined, c => parseNum(P(c).combined));
  results = applyNumMax(results, params.max_fuel_combined, c => parseNum(P(c).combined));

  // Engine
  results = applyNumMin(results, params.min_power_hp, c => parseNum(E(c).power));
  results = applyNumMax(results, params.max_power_hp, c => parseNum(E(c).power));
  results = applyNumMin(results, params.min_torque_nm, c => parseNum(E(c).torque));
  results = applyNumMax(results, params.max_torque_nm, c => parseNum(E(c).torque));
  results = applyNumMin(results, params.min_displacement, c => parseNum(E(c).displacement));
  results = applyNumMax(results, params.max_displacement, c => parseNum(E(c).displacement));
  results = applyNumEq(results, params.cylinders, c => { const v = E(c).cylinders; return v ? parseInt(v) : null; });
  results = applyStr(results, params.aspiration, c => strInc(E(c).aspiration, params.aspiration));
  results = applyStr(results, params.valvetrain, c => strInc(E(c).valvetrain, params.valvetrain));
  results = applyStr(results, params.engine_config, c => strInc(E(c).configuration, params.engine_config));

  // Drivetrain
  results = applyStr(results, params.drive, c => strInc(DT(c).drive_wheel, params.drive));
  results = applyStr(results, params.gearbox, c => strInc(DT(c).gearbox, params.gearbox));
  results = applyStr(results, params.tires, c => strInc(DT(c).tires, params.tires));

  // Weight & Dimensions
  results = applyNumMin(results, params.min_weight_kg, c => parseNum(S(c).kerb_weight));
  results = applyNumMax(results, params.max_weight_kg, c => parseNum(S(c).kerb_weight));
  results = applyNumMin(results, params.min_length_mm, c => parseNum(D(c).length));
  results = applyNumMax(results, params.max_length_mm, c => parseNum(D(c).length));
  results = applyNumMin(results, params.min_wheelbase_mm, c => parseNum(D(c).wheelbase));
  results = applyNumMax(results, params.max_wheelbase_mm, c => parseNum(D(c).wheelbase));

  // Sort
  if (params.sort_by) {
    const dir = params.sort_dir === "desc" ? -1 : 1;
    results.sort((a, b) => {
      const va = getSortValue(a, params.sort_by);
      const vb = getSortValue(b, params.sort_by);
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }

  // Pagination
  const page = Math.max(parseInt(params.page) || 1, 1);
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const total = results.length;
  const paginated = results.slice((page - 1) * limit, page * limit);

  return res.json({
    lang,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    results: paginated.map(expand),
  });
};
