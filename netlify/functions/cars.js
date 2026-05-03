const fs = require("fs");
const path = require("path");

// ── In-memory cache ───────────────────────────────────────
const cache = {};

function loadData(lang) {
  if (cache[lang]) return cache[lang];
  const filePath = path.resolve(__dirname, `../../data/cars_${lang}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    cache[lang] = JSON.parse(raw);
    return cache[lang];
  } catch {
    return null;
  }
}

const SUPPORTED_LANGS = ["en", "ru", "tr"];

// ── Handler ───────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  const reqPath = (event.path || "").replace(/.*\/cars\/?/, "").replace(/^\/+|\/+$/g, "");
  const params = event.queryStringParameters || {};

  // ── /cars/languages ─────────────────────────────────────
  if (reqPath === "languages") {
    return json(200, {
      languages: SUPPORTED_LANGS,
      default: "en",
      total_languages: SUPPORTED_LANGS.length,
    });
  }

  // ── /cars/stats ─────────────────────────────────────────
  if (reqPath === "stats") {
    const stats = {};
    for (const l of SUPPORTED_LANGS) {
      const d = loadData(l);
      stats[l] = d ? d.length : 0;
    }
    return json(200, {
      languages: stats,
      total_records: Object.values(stats).reduce((a, b) => a + b, 0),
    });
  }

  // ── /cars/brands ────────────────────────────────────────
  if (reqPath === "brands") {
    const lang = normLang(params.lang);
    const data = loadData(lang);
    if (!data) return json(400, { error: `Unsupported language: ${params.lang}. Use: ${SUPPORTED_LANGS.join(", ")}` });
    const brands = new Set();
    for (const car of data) {
      const b = getGeneralInfo(car).brand;
      if (b) brands.add(b);
    }
    const sorted = [...brands].sort();
    return json(200, { lang, total: sorted.length, brands: sorted });
  }

  // ── Main cars endpoint ──────────────────────────────────
  const lang = normLang(params.lang);
  const data = loadData(lang);
  if (!data) {
    return json(400, {
      error: `Unsupported language: ${params.lang}. Supported: ${SUPPORTED_LANGS.join(", ")}`,
    });
  }

  let results = [...data];

  // General filters
  results = applyStr(results, params.brand, (c) => strInc(getGeneralInfo(c).brand, params.brand));
  results = applyStr(results, params.model, (c) => strInc(getGeneralInfo(c).model, params.model));
  results = applyStr(results, params.generation, (c) => strInc(getGeneralInfo(c).generation, params.generation));
  results = applyStr(results, params.modification, (c) => strInc(getGeneralInfo(c).modification, params.modification));
  results = applyStr(results, params.body_type, (c) => strInc(getGeneralInfo(c).body_type, params.body_type));
  results = applyStr(results, params.engine_code, (c) => strInc(getEngine(c).code, params.engine_code));
  results = applyNumEq(results, params.seats, (c) => { const v = getGeneralInfo(c).seats; return v ? parseInt(v) : null; });
  results = applyNumEq(results, params.doors, (c) => { const v = getGeneralInfo(c).doors; return v ? parseInt(v) : null; });

  // Year
  results = applyNumMin(results, params.year_from, (c) => extractYear(getGeneralInfo(c).start));
  results = applyNumMax(results, params.year_to, (c) => extractYear(getGeneralInfo(c).end));

  // Performance
  results = applyStr(results, params.fuel_type, (c) => strInc(getPerformance(c).fuel_type, params.fuel_type));
  results = applyStr(results, params.emission_standard, (c) => strInc(getPerformance(c).emission, params.emission_standard));
  results = applyNumMin(results, params.min_max_speed, (c) => parseNum(getPerformance(c).max_speed));
  results = applyNumMax(results, params.max_max_speed, (c) => parseNum(getPerformance(c).max_speed));
  results = applyNumMin(results, params.min_accel_100, (c) => parseNum(getPerformance(c).accel_100));
  results = applyNumMax(results, params.max_accel_100, (c) => parseNum(getPerformance(c).accel_100));
  results = applyNumMin(results, params.min_co2, (c) => parseNum(getPerformance(c).co2));
  results = applyNumMax(results, params.max_co2, (c) => parseNum(getPerformance(c).co2));
  results = applyNumMin(results, params.min_fuel_combined, (c) => parseNum(getPerformance(c).combined));
  results = applyNumMax(results, params.max_fuel_combined, (c) => parseNum(getPerformance(c).combined));

  // Engine
  results = applyNumMin(results, params.min_power_hp, (c) => parseNum(getEngine(c).power));
  results = applyNumMax(results, params.max_power_hp, (c) => parseNum(getEngine(c).power));
  results = applyNumMin(results, params.min_torque_nm, (c) => parseNum(getEngine(c).torque));
  results = applyNumMax(results, params.max_torque_nm, (c) => parseNum(getEngine(c).torque));
  results = applyNumMin(results, params.min_displacement, (c) => parseNum(getEngine(c).displacement));
  results = applyNumMax(results, params.max_displacement, (c) => parseNum(getEngine(c).displacement));
  results = applyNumEq(results, params.cylinders, (c) => { const v = getEngine(c).cylinders; return v ? parseInt(v) : null; });
  results = applyStr(results, params.aspiration, (c) => strInc(getEngine(c).aspiration, params.aspiration));
  results = applyStr(results, params.valvetrain, (c) => strInc(getEngine(c).valvetrain, params.valvetrain));
  results = applyStr(results, params.engine_config, (c) => strInc(getEngine(c).configuration, params.engine_config));

  // Drivetrain
  results = applyStr(results, params.drive, (c) => strInc(getDrivetrain(c).drive_wheel, params.drive));
  results = applyStr(results, params.gearbox, (c) => strInc(getDrivetrain(c).gearbox, params.gearbox));
  results = applyStr(results, params.tires, (c) => strInc(getDrivetrain(c).tires, params.tires));

  // Weight & Dimensions
  results = applyNumMin(results, params.min_weight_kg, (c) => parseNum(getSpace(c).kerb_weight));
  results = applyNumMax(results, params.max_weight_kg, (c) => parseNum(getSpace(c).kerb_weight));
  results = applyNumMin(results, params.min_length_mm, (c) => parseNum(getDimensions(c).length));
  results = applyNumMax(results, params.max_length_mm, (c) => parseNum(getDimensions(c).length));
  results = applyNumMin(results, params.min_wheelbase_mm, (c) => parseNum(getDimensions(c).wheelbase));
  results = applyNumMax(results, params.max_wheelbase_mm, (c) => parseNum(getDimensions(c).wheelbase));

  // Sort
  const sortField = params.sort_by;
  const sortDir = params.sort_dir === "desc" ? -1 : 1;
  if (sortField) {
    results.sort((a, b) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      if (va === null) return 1;
      if (vb === null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir;
    });
  }

  // Pagination
  const page = Math.max(parseInt(params.page) || 1, 1);
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const total = results.length;
  const paginated = results.slice(offset, offset + limit);

  return json(200, {
    lang,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    results: paginated.map(normalize),
  });
};

// ── Helpers ───────────────────────────────────────────────

function normLang(val) {
  if (!val) return "en";
  const l = val.toLowerCase().trim();
  return SUPPORTED_LANGS.includes(l) ? l : val;
}

function json(status, body) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(body) };
}

function applyStr(r, p, fn) { return p ? r.filter(fn) : r; }
function applyNumMin(r, p, gv) { if (!p) return r; const m = parseFloat(p); return isNaN(m) ? r : r.filter((c) => { const v = gv(c); return v !== null && v >= m; }); }
function applyNumMax(r, p, gv) { if (!p) return r; const m = parseFloat(p); return isNaN(m) ? r : r.filter((c) => { const v = gv(c); return v !== null && v <= m; }); }
function applyNumEq(r, p, gv) { if (!p) return r; const t = parseInt(p); return isNaN(t) ? r : r.filter((c) => gv(c) === t); }
function strInc(h, n) { return h && n ? h.toLowerCase().includes(n.toLowerCase()) : false; }

function getSortValue(car, field) {
  const n = normalize(car);
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

function normalize(car) {
  const info = getGeneralInfo(car);
  const perf = getPerformance(car);
  const engine = getEngine(car);
  const dims = getDimensions(car);
  const space = getSpace(car);
  const dt = getDrivetrain(car);
  return {
    title: car.Title, url: car.URL, images: car.Images || [],
    general: {
      brand: info.brand || null, model: info.model || null,
      generation: info.generation || null, modification: info.modification || null,
      year_start: extractYear(info.start), year_end: extractYear(info.end),
      powertrain_architecture: info.powertrain || null, body_type: info.body_type || null,
      seats: info.seats ? parseInt(info.seats) : null, doors: info.doors ? parseInt(info.doors) : null,
    },
    performance: {
      fuel_consumption_urban_l100km: parseNum(perf.urban),
      fuel_consumption_extra_urban_l100km: parseNum(perf.extra_urban),
      fuel_consumption_combined_l100km: parseNum(perf.combined),
      co2_emissions_g_km: parseNum(perf.co2), fuel_type: perf.fuel_type || null,
      acceleration_0_100_sec: parseNum(perf.accel_100), max_speed_kmh: parseNum(perf.max_speed),
      emission_standard: perf.emission || null,
    },
    engine: {
      power_hp: parseNum(engine.power), power_rpm: parseRpm(engine.power),
      torque_nm: parseNum(engine.torque), torque_rpm: parseRpm(engine.torque),
      displacement_cm3: parseNum(engine.displacement),
      cylinders: engine.cylinders ? parseInt(engine.cylinders) : null,
      configuration: engine.configuration || null, valvetrain: engine.valvetrain || null,
      fuel_injection: engine.injection || null, aspiration: engine.aspiration || null,
      compression_ratio: engine.compression || null, engine_code: engine.code || null,
      oil_capacity_l: parseNum(engine.oil_capacity),
    },
    dimensions: {
      length_mm: parseNum(dims.length), width_mm: parseNum(dims.width),
      height_mm: parseNum(dims.height), wheelbase_mm: parseNum(dims.wheelbase),
      front_track_mm: parseNum(dims.front_track), rear_track_mm: parseNum(dims.rear_track),
    },
    space_weight: {
      kerb_weight_kg: parseNum(space.kerb_weight), max_weight_kg: parseNum(space.max_weight),
      trunk_min_l: parseNum(space.trunk_min), trunk_max_l: parseNum(space.trunk_max),
      fuel_tank_l: parseNum(space.fuel_tank),
    },
    drivetrain: {
      drive_wheel: dt.drive_wheel || null, gearbox: dt.gearbox || null,
      front_suspension: dt.front_suspension || null, rear_suspension: dt.rear_suspension || null,
      front_brakes: dt.front_brakes || null, rear_brakes: dt.rear_brakes || null,
      tires: dt.tires || null, rims: dt.rims || null,
    },
  };
}

// ── Section extractors (multi-lang) ───────────────────────

function getGeneralInfo(car) {
  const s = car["General information"] || car["Genel bilgi"] || car["Базовая информация"] || {};
  return {
    brand: s["Brand"] || s["Marka"] || s["Марка"],
    model: s["Model"] || s["Модель"],
    generation: s["Generation"] || s["Nesil"] || s["Поколения"],
    modification: s["Modification (Engine)"] || s["Modifikasyonu (Motor)"] || s["Модификация (двигатель)"],
    start: s["Start of production"] || s["Üretim başlangıç yılı"] || s["Начало выпуска"],
    end: s["End of production"] || s["Son üretim yılı"] || s["Оконч. выпуска"],
    powertrain: s["Powertrain Architecture"] || s["Güç ünitesi mimarisi"] || s["Архитектура силового агрегата"],
    body_type: s["Body type"] || s["Gövde tipi"] || s["Тип кузова"],
    seats: s["Seats"] || s["Koltuk Sayısı"] || s["Количество мест"],
    doors: s["Doors"] || s["Kapı sayısı"] || s["Количество дверей"],
  };
}

function getPerformance(car) {
  const s = car["Performance specs"] || car["Performans"] || car["Эксплуатационные характеристики"] || {};
  return {
    urban: s["Fuel consumption (economy) - urban (NEDC)"] || s["Şehir içi yakıt tüketimi (NEDC)"] || s["Расход топлива в городе (NEDC)"],
    extra_urban: s["Fuel consumption (economy) - extra urban (NEDC)"] || s["Şehir dışı yakıt tüketimi (NEDC)"] || s["Расход топлива на шоссе (NEDC)"],
    combined: s["Fuel consumption (economy) - combined (NEDC)"] || s["Ortalama yakıt tüketimi (NEDC)"] || s["Расход топлива Смешанный цикл (NEDC)"],
    co2: s["CO2 emissions (NEDC)"] || s["CO2 Emisyonları (NEDC)"] || s["Выбросы CO2 (NEDC)"],
    fuel_type: s["Fuel Type"] || s["Yakıt Tipi"] || s["Топливо"],
    accel_100: s["Acceleration 0 - 100 km/h"] || s["Hızlanma 0 - 100 km/saat"] || s["Время разгона 0 - 100 км/ч"],
    max_speed: s["Maximum speed"] || s["Maksimum sürat"] || s["Максимальная скорость"],
    emission: s["Emission standard"] || s["Emisyon Standardı"] || s["Экологический стандарт"],
  };
}

function getEngine(car) {
  const s = car["Engine specs"] || car["Motor"] || car["Двигатель"] || {};
  return {
    power: s["Power"] || s["Güç"] || s["Мощность"],
    torque: s["Torque"] || s["Tork"] || s["Крутящий момент"],
    displacement: s["Engine displacement"] || s["Motor hacmi"] || s["Объем двигателя"],
    cylinders: s["Number of cylinders"] || s["Silindir Adedi"] || s["Количество цилиндров"],
    configuration: s["Engine configuration"] || s["Motor konfigürasyonu"] || s["Конфигурация двигателя"],
    valvetrain: s["Valvetrain"] || s["Valf yapısı"] || s["Газораспределительный механизм"],
    injection: s["Fuel injection system"] || s["Yakıt enjeksiyon sistemi"] || s["Система впрыска топлива"],
    aspiration: s["Engine aspiration"] || s["Motor aspirasyonu"] || s["Тип наддува"],
    compression: s["Compression ratio"] || s["Sıkıştırma oranı"] || s["Степень сжатия"],
    code: s["Engine Model/Code"] || s["Motor Modeli/Kodu"] || s["Модель/Код двигателя"],
    oil_capacity: s["Engine oil capacity"] || s["Motor yağı kapasitesi"] || s["Количество масла в двигателе"],
  };
}

function getDimensions(car) {
  const s = car["Dimensions"] || car["Boyutlar"] || car["Габариты"] || {};
  return {
    length: s["Length"] || s["Uzunluk"] || s["Длина"],
    width: s["Width"] || s["Genişlik"] || s["Ширина"],
    height: s["Height"] || s["Yükseklik"] || s["Высота"],
    wheelbase: s["Wheelbase"] || s["Dingil Mesafesi"] || s["Колесная база"],
    front_track: s["Front track"] || s["Ön tekerlek izi"] || s["Колея передняя"],
    rear_track: s["Rear (Back) track"] || s["Arka tekerlek izi"] || s["Колея задняя"],
  };
}

function getSpace(car) {
  const s = car["Space, Volume and weights"] || car["Hacim ve ağırlıklar."] || car["Объем и вес"] || {};
  return {
    kerb_weight: s["Kerb Weight"] || s["Ağırlık"] || s["Снаряженная масса автомобиля"],
    max_weight: s["Max. weight"] || s["Maksimum ağırlık"] || s["Допустимая полная масса"],
    trunk_min: s["Trunk (boot) space - minimum"] || s["Bagaj hacmi en az"] || s["Объем багажника минимальный"],
    trunk_max: s["Trunk (boot) space - maximum"] || s["Bagaj hacmi en fazla"] || s["Объем багажника максимальный"],
    fuel_tank: s["Fuel tank capacity"] || s["Yakıt deposu hacmi"] || s["Объем топливного бака"],
  };
}

function getDrivetrain(car) {
  const s = car["Drivetrain, brakes and suspension specs"] || car["Şanzıman, fren ve süspansiyon"] || car["Трансмиссия, тормоза и подвеска"] || {};
  return {
    drive_wheel: s["Drive wheel"] || s["Çekiş"] || s["Привод"],
    gearbox: s["Number of gears and type of gearbox"] || s["Vites sayısı ve şanzıman tipi"] || s["Количество передач и тип коробки передач"],
    front_suspension: s["Front suspension"] || s["Ön süspansiyon"] || s["Тип передней подвески"],
    rear_suspension: s["Rear suspension"] || s["Arka süspansiyon"] || s["Тип задней подвески"],
    front_brakes: s["Front brakes"] || s["Ön frenler"] || s["Передние тормоза"],
    rear_brakes: s["Rear brakes"] || s["Arka frenler"] || s["Задние тормоза"],
    tires: s["Tires size"] || s["Lastik boyutu"] || s["Размер шин"],
    rims: s["Wheel rims size"] || s["Jant Boyutu"] || s["Размер дисков"],
  };
}

// ── Utils ─────────────────────────────────────────────────

function extractYear(str) { if (!str) return null; const m = str.match(/\d{4}/); return m ? parseInt(m[0]) : null; }
function parseNum(str) { if (!str) return null; const m = str.match(/[\d.]+/); return m ? parseFloat(m[0]) : null; }
function parseRpm(str) { if (!str) return null; const m = str.match(/@\s*([\d,]+)\s*(rpm|dev|об)/i); return m ? parseInt(m[1].replace(",", "")) : null; }

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-RapidAPI-Key, X-RapidAPI-Host",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}
