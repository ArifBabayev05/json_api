/**
 * Pre-normalize all scraped data into compact format.
 * Strips Breadcrumbs, _metadata, Other, and extracts only useful fields.
 * Reduces ~545MB → ~100MB total.
 */
const fs = require("fs");
const path = require("path");

const FILES = {
  en: path.resolve(__dirname, "../scraped_data.json"),
  ru: path.resolve(__dirname, "../scraped_data_ru.json"),
  tr: path.resolve(__dirname, "../scraped_data_tr.json"),
};

const OUT_DIR = path.resolve(__dirname, "../data");

// ── Section extractors (multi-lang keys) ──────────────────
function getSection(car, ...keys) {
  for (const k of keys) if (car[k]) return car[k];
  return {};
}

function getGeneralInfo(car) {
  const s = getSection(car, "General information", "Genel bilgi", "Базовая информация");
  return {
    brand: s["Brand"] || s["Marka"] || s["Марка"] || null,
    model: s["Model"] || s["Модель"] || null,
    generation: s["Generation"] || s["Nesil"] || s["Поколения"] || null,
    modification: s["Modification (Engine)"] || s["Modifikasyonu (Motor)"] || s["Модификация (двигатель)"] || null,
    start: s["Start of production"] || s["Üretim başlangıç yılı"] || s["Начало выпуска"] || null,
    end: s["End of production"] || s["Son üretim yılı"] || s["Оконч. выпуска"] || null,
    powertrain: s["Powertrain Architecture"] || s["Güç ünitesi mimarisi"] || s["Архитектура силового агрегата"] || null,
    body_type: s["Body type"] || s["Gövde tipi"] || s["Тип кузова"] || null,
    seats: s["Seats"] || s["Koltuk Sayısı"] || s["Количество мест"] || null,
    doors: s["Doors"] || s["Kapı sayısı"] || s["Количество дверей"] || null,
  };
}

function getPerformance(car) {
  const s = getSection(car, "Performance specs", "Performans", "Эксплуатационные характеристики");
  return {
    urban: s["Fuel consumption (economy) - urban (NEDC)"] || s["Şehir içi yakıt tüketimi (NEDC)"] || s["Расход топлива в городе (NEDC)"] || null,
    extra_urban: s["Fuel consumption (economy) - extra urban (NEDC)"] || s["Şehir dışı yakıt tüketimi (NEDC)"] || s["Расход топлива на шоссе (NEDC)"] || null,
    combined: s["Fuel consumption (economy) - combined (NEDC)"] || s["Ortalama yakıt tüketimi (NEDC)"] || s["Расход топлива Смешанный цикл (NEDC)"] || null,
    co2: s["CO2 emissions (NEDC)"] || s["CO2 Emisyonları (NEDC)"] || s["Выбросы CO2 (NEDC)"] || null,
    fuel_type: s["Fuel Type"] || s["Yakıt Tipi"] || s["Топливо"] || null,
    accel_100: s["Acceleration 0 - 100 km/h"] || s["Hızlanma 0 - 100 km/saat"] || s["Время разгона 0 - 100 км/ч"] || null,
    max_speed: s["Maximum speed"] || s["Maksimum sürat"] || s["Максимальная скорость"] || null,
    emission: s["Emission standard"] || s["Emisyon Standardı"] || s["Экологический стандарт"] || null,
  };
}

function getEngine(car) {
  const s = getSection(car, "Engine specs", "Motor", "Двигатель");
  return {
    power: s["Power"] || s["Güç"] || s["Мощность"] || null,
    torque: s["Torque"] || s["Tork"] || s["Крутящий момент"] || null,
    displacement: s["Engine displacement"] || s["Motor hacmi"] || s["Объем двигателя"] || null,
    cylinders: s["Number of cylinders"] || s["Silindir Adedi"] || s["Количество цилиндров"] || null,
    configuration: s["Engine configuration"] || s["Motor konfigürasyonu"] || s["Конфигурация двигателя"] || null,
    valvetrain: s["Valvetrain"] || s["Valf yapısı"] || s["Газораспределительный механизм"] || null,
    injection: s["Fuel injection system"] || s["Yakıt enjeksiyon sistemi"] || s["Система впрыска топлива"] || null,
    aspiration: s["Engine aspiration"] || s["Motor aspirasyonu"] || s["Тип наддува"] || null,
    compression: s["Compression ratio"] || s["Sıkıştırma oranı"] || s["Степень сжатия"] || null,
    code: s["Engine Model/Code"] || s["Motor Modeli/Kodu"] || s["Модель/Код двигателя"] || null,
    oil_capacity: s["Engine oil capacity"] || s["Motor yağı kapasitesi"] || s["Количество масла в двигателе"] || null,
  };
}

function getDimensions(car) {
  const s = getSection(car, "Dimensions", "Boyutlar", "Габариты");
  return {
    length: s["Length"] || s["Uzunluk"] || s["Длина"] || null,
    width: s["Width"] || s["Genişlik"] || s["Ширина"] || null,
    height: s["Height"] || s["Yükseklik"] || s["Высота"] || null,
    wheelbase: s["Wheelbase"] || s["Dingil Mesafesi"] || s["Колесная база"] || null,
    front_track: s["Front track"] || s["Ön tekerlek izi"] || s["Колея передняя"] || null,
    rear_track: s["Rear (Back) track"] || s["Arka tekerlek izi"] || s["Колея задняя"] || null,
  };
}

function getSpace(car) {
  const s = getSection(car, "Space, Volume and weights", "Hacim ve ağırlıklar.", "Объем и вес");
  return {
    kerb_weight: s["Kerb Weight"] || s["Ağırlık"] || s["Снаряженная масса автомобиля"] || null,
    max_weight: s["Max. weight"] || s["Maksimum ağırlık"] || s["Допустимая полная масса"] || null,
    trunk_min: s["Trunk (boot) space - minimum"] || s["Bagaj hacmi en az"] || s["Объем багажника минимальный"] || null,
    trunk_max: s["Trunk (boot) space - maximum"] || s["Bagaj hacmi en fazla"] || s["Объем багажника максимальный"] || null,
    fuel_tank: s["Fuel tank capacity"] || s["Yakıt deposu hacmi"] || s["Объем топливного бака"] || null,
  };
}

function getDrivetrain(car) {
  const s = getSection(car, "Drivetrain, brakes and suspension specs", "Şanzıman, fren ve süspansiyon", "Трансмиссия, тормоза и подвеска");
  return {
    drive_wheel: s["Drive wheel"] || s["Çekiş"] || s["Привод"] || null,
    gearbox: s["Number of gears and type of gearbox"] || s["Vites sayısı ve şanzıman tipi"] || s["Количество передач и тип коробки передач"] || null,
    front_suspension: s["Front suspension"] || s["Ön süspansiyon"] || s["Тип передней подвески"] || null,
    rear_suspension: s["Rear suspension"] || s["Arka süspansiyon"] || s["Тип задней подвески"] || null,
    front_brakes: s["Front brakes"] || s["Ön frenler"] || s["Передние тормоза"] || null,
    rear_brakes: s["Rear brakes"] || s["Arka frenler"] || s["Задние тормоза"] || null,
    tires: s["Tires size"] || s["Lastik boyutu"] || s["Размер шин"] || null,
    rims: s["Wheel rims size"] || s["Jant Boyutu"] || s["Размер дисков"] || null,
  };
}

function stripNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

function normalize(car) {
  return stripNulls({
    t: car.Title || undefined,
    u: car.URL || undefined,
    img: (car.Images || []).slice(0, 3),
    g: stripNulls(getGeneralInfo(car)),
    p: stripNulls(getPerformance(car)),
    e: stripNulls(getEngine(car)),
    d: stripNulls(getDimensions(car)),
    s: stripNulls(getSpace(car)),
    dt: stripNulls(getDrivetrain(car)),
  });
}

// ── Main ──────────────────────────────────────────────────
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [lang, filePath] of Object.entries(FILES)) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filePath} not found`);
    continue;
  }

  console.log(`Processing ${lang}...`);
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`  Records: ${raw.length}`);

  const optimized = raw.map(normalize);
  const outPath = path.join(OUT_DIR, `cars_${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(optimized));

  const origSize = fs.statSync(filePath).size;
  const newSize = fs.statSync(outPath).size;
  console.log(`  ${(origSize / 1e6).toFixed(1)}MB → ${(newSize / 1e6).toFixed(1)}MB (${((1 - newSize / origSize) * 100).toFixed(0)}% reduction)`);
}

console.log("\nDone! Optimized files in data/");
