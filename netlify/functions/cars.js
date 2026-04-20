const data = require("../../data/cars.json");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  const params = event.queryStringParameters || {};
  let results = [...data];

  // ── General ─────────────────────────────────────────────
  results = applyStringFilter(results, params.lang, (car) => {
    const langMap = { en: "/en/", tr: "/tr/", ru: "/ru/" };
    const fragment = langMap[params.lang.toLowerCase()];
    return fragment ? car.URL && car.URL.includes(fragment) : true;
  });

  results = applyStringFilter(results, params.brand, (car) =>
    strIncludes(getGeneralInfo(car).brand, params.brand)
  );

  results = applyStringFilter(results, params.model, (car) =>
    strIncludes(getGeneralInfo(car).model, params.model)
  );

  results = applyStringFilter(results, params.generation, (car) =>
    strIncludes(getGeneralInfo(car).generation, params.generation)
  );

  results = applyStringFilter(results, params.modification, (car) =>
    strIncludes(getGeneralInfo(car).modification, params.modification)
  );

  results = applyStringFilter(results, params.body_type, (car) =>
    strIncludes(getGeneralInfo(car).body_type, params.body_type)
  );

  results = applyStringFilter(results, params.engine_code, (car) =>
    strIncludes(getEngine(car).code, params.engine_code)
  );

  // Seats & doors (exact integer match)
  results = applyNumberExact(results, params.seats, (car) => {
    const v = getGeneralInfo(car).seats;
    return v ? parseInt(v) : null;
  });

  results = applyNumberExact(results, params.doors, (car) => {
    const v = getGeneralInfo(car).doors;
    return v ? parseInt(v) : null;
  });

  // ── Year ─────────────────────────────────────────────────
  results = applyNumberMin(results, params.year_from, (car) =>
    extractYear(getGeneralInfo(car).start)
  );

  results = applyNumberMax(results, params.year_to, (car) =>
    extractYear(getGeneralInfo(car).end)
  );

  // ── Performance ──────────────────────────────────────────
  results = applyStringFilter(results, params.fuel_type, (car) =>
    strIncludes(getPerformance(car).fuel_type, params.fuel_type)
  );

  results = applyStringFilter(results, params.emission_standard, (car) =>
    strIncludes(getPerformance(car).emission, params.emission_standard)
  );

  results = applyNumberMin(results, params.min_max_speed, (car) =>
    parseFirstNumber(getPerformance(car).max_speed)
  );
  results = applyNumberMax(results, params.max_max_speed, (car) =>
    parseFirstNumber(getPerformance(car).max_speed)
  );

  results = applyNumberMin(results, params.min_accel_100, (car) =>
    parseFirstNumber(getPerformance(car).accel_100)
  );
  results = applyNumberMax(results, params.max_accel_100, (car) =>
    parseFirstNumber(getPerformance(car).accel_100)
  );

  results = applyNumberMax(results, params.max_co2, (car) =>
    parseFirstNumber(getPerformance(car).co2)
  );
  results = applyNumberMin(results, params.min_co2, (car) =>
    parseFirstNumber(getPerformance(car).co2)
  );

  results = applyNumberMax(results, params.max_fuel_combined, (car) =>
    parseFirstNumber(getPerformance(car).combined)
  );
  results = applyNumberMin(results, params.min_fuel_combined, (car) =>
    parseFirstNumber(getPerformance(car).combined)
  );

  // ── Engine ───────────────────────────────────────────────
  results = applyNumberMin(results, params.min_power_hp, (car) =>
    parseFirstNumber(getEngine(car).power)
  );
  results = applyNumberMax(results, params.max_power_hp, (car) =>
    parseFirstNumber(getEngine(car).power)
  );

  results = applyNumberMin(results, params.min_torque_nm, (car) =>
    parseFirstNumber(getEngine(car).torque)
  );
  results = applyNumberMax(results, params.max_torque_nm, (car) =>
    parseFirstNumber(getEngine(car).torque)
  );

  results = applyNumberMin(results, params.min_displacement, (car) =>
    parseFirstNumber(getEngine(car).displacement)
  );
  results = applyNumberMax(results, params.max_displacement, (car) =>
    parseFirstNumber(getEngine(car).displacement)
  );

  results = applyNumberExact(results, params.cylinders, (car) => {
    const v = getEngine(car).cylinders;
    return v ? parseInt(v) : null;
  });

  results = applyStringFilter(results, params.aspiration, (car) =>
    strIncludes(getEngine(car).aspiration, params.aspiration)
  );

  results = applyStringFilter(results, params.valvetrain, (car) =>
    strIncludes(getEngine(car).valvetrain, params.valvetrain)
  );

  results = applyStringFilter(results, params.engine_config, (car) =>
    strIncludes(getEngine(car).configuration, params.engine_config)
  );

  // ── Drivetrain ───────────────────────────────────────────
  results = applyStringFilter(results, params.drive, (car) =>
    strIncludes(getDrivetrain(car).drive_wheel, params.drive)
  );

  results = applyStringFilter(results, params.gearbox, (car) =>
    strIncludes(getDrivetrain(car).gearbox, params.gearbox)
  );

  results = applyStringFilter(results, params.tires, (car) =>
    strIncludes(getDrivetrain(car).tires, params.tires)
  );

  // ── Weight ───────────────────────────────────────────────
  results = applyNumberMin(results, params.min_weight_kg, (car) =>
    parseFirstNumber(getSpace(car).kerb_weight)
  );
  results = applyNumberMax(results, params.max_weight_kg, (car) =>
    parseFirstNumber(getSpace(car).kerb_weight)
  );

  // ── Dimensions ───────────────────────────────────────────
  results = applyNumberMin(results, params.min_length_mm, (car) =>
    parseFirstNumber(getDimensions(car).length)
  );
  results = applyNumberMax(results, params.max_length_mm, (car) =>
    parseFirstNumber(getDimensions(car).length)
  );

  results = applyNumberMin(results, params.min_wheelbase_mm, (car) =>
    parseFirstNumber(getDimensions(car).wheelbase)
  );
  results = applyNumberMax(results, params.max_wheelbase_mm, (car) =>
    parseFirstNumber(getDimensions(car).wheelbase)
  );

  // ── Sort ─────────────────────────────────────────────────
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

  // ── Pagination ───────────────────────────────────────────
  const page = Math.max(parseInt(params.page) || 1, 1);
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const total = results.length;
  const paginated = results.slice(offset, offset + limit);

  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      results: paginated.map(normalize),
    }),
  };
};

// ── Filter helpers ────────────────────────────────────────

function applyStringFilter(results, param, predicate) {
  if (!param) return results;
  return results.filter(predicate);
}

function applyNumberMin(results, param, getValue) {
  if (!param) return results;
  const min = parseFloat(param);
  if (isNaN(min)) return results;
  return results.filter((car) => {
    const v = getValue(car);
    return v !== null && v >= min;
  });
}

function applyNumberMax(results, param, getValue) {
  if (!param) return results;
  const max = parseFloat(param);
  if (isNaN(max)) return results;
  return results.filter((car) => {
    const v = getValue(car);
    return v !== null && v <= max;
  });
}

function applyNumberExact(results, param, getValue) {
  if (!param) return results;
  const target = parseInt(param);
  if (isNaN(target)) return results;
  return results.filter((car) => getValue(car) === target);
}

function strIncludes(haystack, needle) {
  if (!haystack || !needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// ── Sort value resolver ───────────────────────────────────

function getSortValue(car, field) {
  const n = normalize(car);
  const map = {
    power_hp: n.engine.power_hp,
    torque_nm: n.engine.torque_nm,
    displacement_cm3: n.engine.displacement_cm3,
    acceleration: n.performance.acceleration_0_100_sec,
    max_speed: n.performance.max_speed_kmh,
    weight: n.space_weight.kerb_weight_kg,
    year_start: n.general.year_start,
    year_end: n.general.year_end,
    fuel_combined: n.performance.fuel_consumption_combined_l100km,
    co2: n.performance.co2_emissions_g_km,
    length: n.dimensions.length_mm,
    wheelbase: n.dimensions.wheelbase_mm,
    brand: n.general.brand,
    model: n.general.model,
  };
  return map[field] !== undefined ? map[field] : null;
}

// ── Normalize ─────────────────────────────────────────────

function normalize(car) {
  const info = getGeneralInfo(car);
  const perf = getPerformance(car);
  const engine = getEngine(car);
  const dims = getDimensions(car);
  const space = getSpace(car);
  const dt = getDrivetrain(car);

  return {
    title: car.Title,
    url: car.URL,
    images: car.Images || [],
    general: {
      brand: info.brand || null,
      model: info.model || null,
      generation: info.generation || null,
      modification: info.modification || null,
      year_start: extractYear(info.start),
      year_end: extractYear(info.end),
      powertrain_architecture: info.powertrain || null,
      body_type: info.body_type || null,
      seats: info.seats ? parseInt(info.seats) : null,
      doors: info.doors ? parseInt(info.doors) : null,
    },
    performance: {
      fuel_consumption_urban_l100km: parseFirstNumber(perf.urban),
      fuel_consumption_extra_urban_l100km: parseFirstNumber(perf.extra_urban),
      fuel_consumption_combined_l100km: parseFirstNumber(perf.combined),
      co2_emissions_g_km: parseFirstNumber(perf.co2),
      fuel_type: perf.fuel_type || null,
      acceleration_0_100_sec: parseFirstNumber(perf.accel_100),
      max_speed_kmh: parseFirstNumber(perf.max_speed),
      emission_standard: perf.emission || null,
    },
    engine: {
      power_hp: parseFirstNumber(engine.power),
      power_rpm: parseRpm(engine.power),
      torque_nm: parseFirstNumber(engine.torque),
      torque_rpm: parseRpm(engine.torque),
      displacement_cm3: parseFirstNumber(engine.displacement),
      cylinders: engine.cylinders ? parseInt(engine.cylinders) : null,
      configuration: engine.configuration || null,
      valvetrain: engine.valvetrain || null,
      fuel_injection: engine.injection || null,
      aspiration: engine.aspiration || null,
      compression_ratio: engine.compression || null,
      engine_code: engine.code || null,
      oil_capacity_l: parseFirstNumber(engine.oil_capacity),
    },
    dimensions: {
      length_mm: parseFirstNumber(dims.length),
      width_mm: parseFirstNumber(dims.width),
      height_mm: parseFirstNumber(dims.height),
      wheelbase_mm: parseFirstNumber(dims.wheelbase),
      front_track_mm: parseFirstNumber(dims.front_track),
      rear_track_mm: parseFirstNumber(dims.rear_track),
    },
    space_weight: {
      kerb_weight_kg: parseFirstNumber(space.kerb_weight),
      max_weight_kg: parseFirstNumber(space.max_weight),
      trunk_min_l: parseFirstNumber(space.trunk_min),
      trunk_max_l: parseFirstNumber(space.trunk_max),
      fuel_tank_l: parseFirstNumber(space.fuel_tank),
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

// ── Section extractors ────────────────────────────────────

function getGeneralInfo(car) {
  const s =
    car["General information"] ||
    car["Genel bilgi"] ||
    car["Базовая информация"] ||
    {};
  return {
    brand:        s["Brand"]               || s["Marka"]                    || s["Марка"],
    model:        s["Model"],
    generation:   s["Generation"]          || s["Nesil"]                    || s["Поколения"],
    modification: s["Modification (Engine)"]|| s["Modifikasyonu (Motor)"]   || s["Модификация (двигатель)"],
    start:        s["Start of production"] || s["Üretim başlangıç yılı"]    || s["Начало выпуска"],
    end:          s["End of production"]   || s["Son üretim yılı"]           || s["Оконч. выпуска"],
    powertrain:   s["Powertrain Architecture"]|| s["Güç ünitesi mimarisi"]  || s["Архитектура силового агрегата"],
    body_type:    s["Body type"]           || s["Gövde tipi"]                || s["Тип кузова"],
    seats:        s["Seats"]               || s["Koltuk Sayısı"]             || s["Количество мест"],
    doors:        s["Doors"]               || s["Kapı sayısı"]               || s["Количество дверей"],
  };
}

function getPerformance(car) {
  const s =
    car["Performance specs"] ||
    car["Performans"] ||
    car["Эксплуатационные характеристики"] ||
    {};
  return {
    urban:       s["Fuel consumption (economy) - urban (NEDC)"]       || s["Şehir içi yakıt tüketimi (NEDC)"]  || s["Расход топлива в городе (NEDC)"],
    extra_urban: s["Fuel consumption (economy) - extra urban (NEDC)"] || s["Şehir dışı yakıt tüketimi (NEDC)"] || s["Расход топлива на шоссе (NEDC)"],
    combined:    s["Fuel consumption (economy) - combined (NEDC)"]    || s["Ortalama yakıt tüketimi (NEDC)"]   || s["Расход топлива Смешанный цикл (NEDC)"],
    co2:         s["CO2 emissions (NEDC)"]       || s["CO2 Emisyonları (NEDC)"] || s["Выбросы CO2 (NEDC)"],
    fuel_type:   s["Fuel Type"]                  || s["Yakıt Tipi"]             || s["Топливо"],
    accel_100:   s["Acceleration 0 - 100 km/h"]  || s["Hızlanma 0 - 100 km/saat"] || s["Время разгона 0 - 100 км/ч"],
    max_speed:   s["Maximum speed"]              || s["Maksimum sürat"]         || s["Максимальная скорость"],
    emission:    s["Emission standard"]          || s["Emisyon Standardı"]      || s["Экологический стандарт"],
  };
}

function getEngine(car) {
  const s =
    car["Engine specs"] ||
    car["Motor"] ||
    car["Двигатель"] ||
    {};
  return {
    power:         s["Power"]                      || s["Güç"]                       || s["Мощность"],
    torque:        s["Torque"]                     || s["Tork"]                      || s["Крутящий момент"],
    displacement:  s["Engine displacement"]        || s["Motor hacmi"]               || s["Объем двигателя"],
    cylinders:     s["Number of cylinders"]        || s["Silindir Adedi"]            || s["Количество цилиндров"],
    configuration: s["Engine configuration"]       || s["Motor konfigürasyonu"]      || s["Конфигурация двигателя"],
    valvetrain:    s["Valvetrain"]                 || s["Valf yapısı"]               || s["Газораспределительный механизм"],
    injection:     s["Fuel injection system"]      || s["Yakıt enjeksiyon sistemi"]  || s["Система впрыска топлива"],
    aspiration:    s["Engine aspiration"]          || s["Motor aspirasyonu"]         || s["Тип наддува"],
    compression:   s["Compression ratio"]          || s["Sıkıştırma oranı"]         || s["Степень сжатия"],
    code:          s["Engine Model/Code"]          || s["Motor Modeli/Kodu"]         || s["Модель/Код двигателя"],
    oil_capacity:  s["Engine oil capacity"]        || s["Motor yağı kapasitesi"]     || s["Количество масла в двигателе"],
  };
}

function getDimensions(car) {
  const s =
    car["Dimensions"] ||
    car["Boyutlar"] ||
    car["Габариты"] ||
    {};
  return {
    length:      s["Length"]            || s["Uzunluk"]           || s["Длина"],
    width:       s["Width"]             || s["Genişlik"]          || s["Ширина"],
    height:      s["Height"]            || s["Yükseklik"]         || s["Высота"],
    wheelbase:   s["Wheelbase"]         || s["Dingil Mesafesi"]   || s["Колесная база"],
    front_track: s["Front track"]       || s["Ön tekerlek izi"]   || s["Колея передняя"],
    rear_track:  s["Rear (Back) track"] || s["Arka tekerlek izi"] || s["Колея задняя"],
  };
}

function getSpace(car) {
  const s =
    car["Space, Volume and weights"] ||
    car["Hacim ve ağırlıklar."] ||
    car["Объем и вес"] ||
    {};
  return {
    kerb_weight: s["Kerb Weight"]                   || s["Ağırlık"]           || s["Снаряженная масса автомобиля"],
    max_weight:  s["Max. weight"]                   || s["Maksimum ağırlık"]  || s["Допустимая полная масса"],
    trunk_min:   s["Trunk (boot) space - minimum"]  || s["Bagaj hacmi en az"] || s["Объем багажника минимальный"],
    trunk_max:   s["Trunk (boot) space - maximum"]  || s["Bagaj hacmi en fazla"]|| s["Объем багажника максимальный"],
    fuel_tank:   s["Fuel tank capacity"]            || s["Yakıt deposu hacmi"]|| s["Объем топливного бака"],
  };
}

function getDrivetrain(car) {
  const s =
    car["Drivetrain, brakes and suspension specs"] ||
    car["Şanzıman, fren ve süspansiyon"] ||
    car["Трансмиссия, тормоза и подвеска"] ||
    {};
  return {
    drive_wheel:       s["Drive wheel"]                         || s["Çekiş"]                        || s["Привод"],
    gearbox:           s["Number of gears and type of gearbox"] || s["Vites sayısı ve şanzıman tipi"] || s["Количество передач и тип коробки передач"],
    front_suspension:  s["Front suspension"]                    || s["Ön süspansiyon"]                || s["Тип передней подвески"],
    rear_suspension:   s["Rear suspension"]                     || s["Arka süspansiyon"]              || s["Тип задней подвески"],
    front_brakes:      s["Front brakes"]                        || s["Ön frenler"]                    || s["Передние тормоза"],
    rear_brakes:       s["Rear brakes"]                         || s["Arka frenler"]                  || s["Задние тормоза"],
    tires:             s["Tires size"]                          || s["Lastik boyutu"]                 || s["Размер шин"],
    rims:              s["Wheel rims size"]                     || s["Jant Boyutu"]                   || s["Размер дисков"],
  };
}

// ── Utils ─────────────────────────────────────────────────

function extractYear(str) {
  if (!str) return null;
  const m = str.match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

function parseFirstNumber(str) {
  if (!str) return null;
  const m = str.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function parseRpm(str) {
  if (!str) return null;
  const m = str.match(/@\s*([\d,]+)\s*(rpm|dev|об)/i);
  return m ? parseInt(m[1].replace(",", "")) : null;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}
