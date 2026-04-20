const data = require("../../data/cars.json");

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  let results = [...data];

  if (params.lang) {
    const lang = params.lang.toLowerCase();
    const langMap = { en: "/en/", tr: "/tr/", ru: "/ru/" };
    const urlFragment = langMap[lang];
    if (urlFragment) {
      results = results.filter((car) => car.URL && car.URL.includes(urlFragment));
    }
  }

  if (params.brand) {
    const brand = params.brand.toLowerCase();
    results = results.filter((car) => {
      const info = getGeneralInfo(car);
      return info.brand && info.brand.toLowerCase().includes(brand);
    });
  }

  if (params.model) {
    const model = params.model.toLowerCase();
    results = results.filter((car) => {
      const info = getGeneralInfo(car);
      return info.model && info.model.toLowerCase().includes(model);
    });
  }

  if (params.generation) {
    const gen = params.generation.toLowerCase();
    results = results.filter((car) => {
      const info = getGeneralInfo(car);
      return info.generation && info.generation.toLowerCase().includes(gen);
    });
  }

  if (params.year_from) {
    const yearFrom = parseInt(params.year_from);
    results = results.filter((car) => {
      const info = getGeneralInfo(car);
      const start = extractYear(info.start);
      return start && start >= yearFrom;
    });
  }

  if (params.year_to) {
    const yearTo = parseInt(params.year_to);
    results = results.filter((car) => {
      const info = getGeneralInfo(car);
      const end = extractYear(info.end);
      return end && end <= yearTo;
    });
  }

  if (params.fuel_type) {
    const fuel = params.fuel_type.toLowerCase();
    results = results.filter((car) => {
      const perf = getPerformance(car);
      return perf.fuel_type && perf.fuel_type.toLowerCase().includes(fuel);
    });
  }

  if (params.body_type) {
    const body = params.body_type.toLowerCase();
    results = results.filter((car) => {
      const info = getGeneralInfo(car);
      return info.body_type && info.body_type.toLowerCase().includes(body);
    });
  }

  if (params.drive) {
    const drive = params.drive.toLowerCase();
    results = results.filter((car) => {
      const dt = getDrivetrain(car);
      return dt.drive_wheel && dt.drive_wheel.toLowerCase().includes(drive);
    });
  }

  const page = parseInt(params.page) || 1;
  const limit = Math.min(parseInt(params.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const paginated = results.slice(offset, offset + limit);

  const normalized = paginated.map((car) => normalize(car));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      total: results.length,
      page,
      limit,
      results: normalized,
    }),
  };
};

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
      brand: info.brand,
      model: info.model,
      generation: info.generation,
      modification: info.modification,
      year_start: extractYear(info.start),
      year_end: extractYear(info.end),
      powertrain_architecture: info.powertrain,
      body_type: info.body_type,
      seats: info.seats ? parseInt(info.seats) : null,
      doors: info.doors ? parseInt(info.doors) : null,
    },
    performance: {
      fuel_consumption_urban_l100km: parseFloat(perf.urban) || null,
      fuel_consumption_extra_urban_l100km: parseFloat(perf.extra_urban) || null,
      fuel_consumption_combined_l100km: parseFloat(perf.combined) || null,
      co2_emissions_g_km: parseFloat(perf.co2) || null,
      fuel_type: perf.fuel_type,
      acceleration_0_100_sec: parseFloat(perf.accel_100) || null,
      max_speed_kmh: parseFloat(perf.max_speed) || null,
      emission_standard: perf.emission,
    },
    engine: {
      power_hp: parseFirstNumber(engine.power),
      power_rpm: parseRpm(engine.power),
      torque_nm: parseFirstNumber(engine.torque),
      torque_rpm: parseRpm(engine.torque),
      displacement_cm3: parseFirstNumber(engine.displacement),
      cylinders: engine.cylinders ? parseInt(engine.cylinders) : null,
      configuration: engine.configuration,
      valvetrain: engine.valvetrain,
      fuel_injection: engine.injection,
      aspiration: engine.aspiration,
      compression_ratio: engine.compression,
      engine_code: engine.code,
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
      drive_wheel: dt.drive_wheel,
      gearbox: dt.gearbox,
      front_suspension: dt.front_suspension,
      rear_suspension: dt.rear_suspension,
      front_brakes: dt.front_brakes,
      rear_brakes: dt.rear_brakes,
      tires: dt.tires,
      rims: dt.rims,
    },
  };
}

function getGeneralInfo(car) {
  const section =
    car["General information"] ||
    car["Genel bilgi"] ||
    car["Базовая информация"] ||
    {};
  return {
    brand: section["Brand"] || section["Marka"] || section["Марка"],
    model: section["Model"] || section["Model"] || section["Модель"],
    generation: section["Generation"] || section["Nesil"] || section["Поколения"],
    modification: section["Modification (Engine)"] || section["Modifikasyonu (Motor)"] || section["Модификация (двигатель)"],
    start: section["Start of production"] || section["Üretim başlangıç yılı"] || section["Начало выпуска"],
    end: section["End of production"] || section["Son üretim yılı"] || section["Оконч. выпуска"],
    powertrain: section["Powertrain Architecture"] || section["Güç ünitesi mimarisi"] || section["Архитектура силового агрегата"],
    body_type: section["Body type"] || section["Gövde tipi"] || section["Тип кузова"],
    seats: section["Seats"] || section["Koltuk Sayısı"] || section["Количество мест"],
    doors: section["Doors"] || section["Kapı sayısı"] || section["Количество дверей"],
  };
}

function getPerformance(car) {
  const section =
    car["Performance specs"] ||
    car["Performans"] ||
    car["Эксплуатационные характеристики"] ||
    {};
  return {
    urban: extractFirstValue(section["Fuel consumption (economy) - urban (NEDC)"] || section["Şehir içi yakıt tüketimi (NEDC)"] || section["Расход топлива в городе (NEDC)"]),
    extra_urban: extractFirstValue(section["Fuel consumption (economy) - extra urban (NEDC)"] || section["Şehir dışı yakıt tüketimi (NEDC)"] || section["Расход топлива на шоссе (NEDC)"]),
    combined: extractFirstValue(section["Fuel consumption (economy) - combined (NEDC)"] || section["Ortalama yakıt tüketimi (NEDC)"] || section["Расход топлива Смешанный цикл (NEDC)"]),
    co2: extractFirstValue(section["CO2 emissions (NEDC)"] || section["CO2 Emisyonları (NEDC)"] || section["Выбросы CO2 (NEDC)"]),
    fuel_type: section["Fuel Type"] || section["Yakıt Tipi"] || section["Топливо"],
    accel_100: extractFirstValue(section["Acceleration 0 - 100 km/h"] || section["Hızlanma 0 - 100 km/saat"] || section["Время разгона 0 - 100 км/ч"]),
    max_speed: extractFirstValue(section["Maximum speed"] || section["Maksimum sürat"] || section["Максимальная скорость"]),
    emission: section["Emission standard"] || section["Emisyon Standardı"] || section["Экологический стандарт"],
  };
}

function getEngine(car) {
  const section =
    car["Engine specs"] ||
    car["Motor"] ||
    car["Двигатель"] ||
    {};
  return {
    power: section["Power"] || section["Güç"] || section["Мощность"],
    torque: section["Torque"] || section["Tork"] || section["Крутящий момент"],
    displacement: section["Engine displacement"] || section["Motor hacmi"] || section["Объем двигателя"],
    cylinders: section["Number of cylinders"] || section["Silindir Adedi"] || section["Количество цилиндров"],
    configuration: section["Engine configuration"] || section["Motor konfigürasyonu"] || section["Конфигурация двигателя"],
    valvetrain: section["Valvetrain"] || section["Valf yapısı"] || section["Газораспределительный механизм"],
    injection: section["Fuel injection system"] || section["Yakıt enjeksiyon sistemi"] || section["Система впрыска топлива"],
    aspiration: section["Engine aspiration"] || section["Motor aspirasyonu"] || section["Тип наддува"],
    compression: section["Compression ratio"] || section["Sıkıştırma oranı"] || section["Степень сжатия"],
    code: section["Engine Model/Code"] || section["Motor Modeli/Kodu"] || section["Модель/Код двигателя"],
    oil_capacity: section["Engine oil capacity"] || section["Motor yağı kapasitesi"] || section["Количество масла в двигателе"],
  };
}

function getDimensions(car) {
  const section =
    car["Dimensions"] ||
    car["Boyutlar"] ||
    car["Габариты"] ||
    {};
  return {
    length: section["Length"] || section["Uzunluk"] || section["Длина"],
    width: section["Width"] || section["Genişlik"] || section["Ширина"],
    height: section["Height"] || section["Yükseklik"] || section["Высота"],
    wheelbase: section["Wheelbase"] || section["Dingil Mesafesi"] || section["Колесная база"],
    front_track: section["Front track"] || section["Ön tekerlek izi"] || section["Колея передняя"],
    rear_track: section["Rear (Back) track"] || section["Arka tekerlek izi"] || section["Колея задняя"],
  };
}

function getSpace(car) {
  const section =
    car["Space, Volume and weights"] ||
    car["Hacim ve ağırlıklar."] ||
    car["Объем и вес"] ||
    {};
  return {
    kerb_weight: section["Kerb Weight"] || section["Ağırlık"] || section["Снаряженная масса автомобиля"],
    max_weight: section["Max. weight"] || section["Maksimum ağırlık"] || section["Допустимая полная масса"],
    trunk_min: section["Trunk (boot) space - minimum"] || section["Bagaj hacmi en az"] || section["Объем багажника минимальный"],
    trunk_max: section["Trunk (boot) space - maximum"] || section["Bagaj hacmi en fazla"] || section["Объем багажника максимальный"],
    fuel_tank: section["Fuel tank capacity"] || section["Yakıt deposu hacmi"] || section["Объем топливного бака"],
  };
}

function getDrivetrain(car) {
  const section =
    car["Drivetrain, brakes and suspension specs"] ||
    car["Şanzıman, fren ve süspansiyon"] ||
    car["Трансмиссия, тормоза и подвеска"] ||
    {};
  return {
    drive_wheel: section["Drive wheel"] || section["Çekiş"] || section["Привод"],
    gearbox: section["Number of gears and type of gearbox"] || section["Vites sayısı ve şanzıman tipi"] || section["Количество передач и тип коробки передач"],
    front_suspension: section["Front suspension"] || section["Ön süspansiyon"] || section["Тип передней подвески"],
    rear_suspension: section["Rear suspension"] || section["Arka süspansiyon"] || section["Тип задней подвески"],
    front_brakes: section["Front brakes"] || section["Ön frenler"] || section["Передние тормоза"],
    rear_brakes: section["Rear brakes"] || section["Arka frenler"] || section["Задние тормоза"],
    tires: section["Tires size"] || section["Lastik boyutu"] || section["Размер шин"],
    rims: section["Wheel rims size"] || section["Jant Boyutu"] || section["Размер дисков"],
  };
}

function extractYear(str) {
  if (!str) return null;
  const match = str.match(/\d{4}/);
  return match ? parseInt(match[0]) : null;
}

function extractFirstValue(str) {
  if (!str) return null;
  const match = str.match(/[\d.]+/);
  return match ? match[0] : null;
}

function parseFirstNumber(str) {
  if (!str) return null;
  const match = str.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function parseRpm(str) {
  if (!str) return null;
  const match = str.match(/@\s*([\d,]+)\s*rpm/i);
  if (match) return parseInt(match[1].replace(",", ""));
  return null;
}
