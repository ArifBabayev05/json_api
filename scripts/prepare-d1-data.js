const fs = require('fs');
const path = require('path');

const SCRAPED_DIR = path.join(__dirname, '../scraped');
const OUTPUT_FILE = path.join(__dirname, '../worker/data.sql');

const languages = [
  { code: 'en', file: 'scraped_data.json' },
  { code: 'tr', file: 'scraped_data_tr.json' },
  { code: 'ru', file: 'scraped_data_ru.json' }
];

function extractNumber(str) {
  if (!str) return null;
  const match = str.match(/([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
}

function cleanString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").trim();
}

async function prepare() {
  console.log('🚀 Preparing SQL data...');
  const sqlStream = fs.createWriteStream(OUTPUT_FILE);

  let totalCount = 0;

  for (const lang of languages) {
    const filePath = path.join(SCRAPED_DIR, lang.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File not found: ${filePath}`);
      continue;
    }

    console.log(`📦 Processing ${lang.code} (${lang.file})...`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`✅ Loaded ${data.length} records for ${lang.code}`);

    const batchSize = 10;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const values = batch.map(item => {
        const genInfo = item['General information'] || {};
        const perfSpecs = item['Performance specs'] || item['Performans'] || item['Эксплуатационные характеристики'] || {};
        const engineSpecs = item['Engine specs'] || item['Motor'] || item['Двигатель'] || {};
        const weightSpecs = item['Space, Volume and weights'] || item['Hacim ve ağırlıklar.'] || item['Объем и вес'] || {};
        const dimSpecs = item['Dimensions'] || item['Boyutlar'] || item['Габариты'] || {};

        const brand = cleanString(genInfo['Brand'] || genInfo['Marka'] || genInfo['Марка']);
        const model = cleanString(genInfo['Model'] || genInfo['Модель']);
        const generation = cleanString(genInfo['Generation'] || genInfo['Nesil'] || genInfo['Поколения']);
        const modification = cleanString(genInfo['Modification (Engine)'] || genInfo['Modifikasyonu (Motor)'] || genInfo['Модификация (двигатель)']);
        const bodyType = cleanString(genInfo['Body type'] || genInfo['Gövde tipi'] || genInfo['Тип кузова']);
        
        const yearStart = extractNumber(genInfo['Start of production'] || genInfo['Üretim başlangıç yılı'] || genInfo['Начало выпуска']);
        const yearEnd = extractNumber(genInfo['End of production'] || genInfo['Son üretim yılı'] || genInfo['Оконч. выпуска']);
        
        const powerHp = extractNumber(engineSpecs['Power'] || engineSpecs['Güç'] || engineSpecs['Мощность']);
        const torqueNm = extractNumber(engineSpecs['Torque'] || engineSpecs['Tork'] || engineSpecs['Крутящий момент']);
        const displacement = extractNumber(engineSpecs['Engine displacement'] || engineSpecs['Motor hacmi'] || engineSpecs['Объем двигателя']);
        
        const accel = extractNumber(perfSpecs['Acceleration 0 - 100 km/h'] || perfSpecs['Hızlanma 0 - 100 km/saat'] || perfSpecs['Время разгона 0 - 100 км/ч']);
        const maxSpeed = extractNumber(perfSpecs['Maximum speed'] || perfSpecs['Maksimum sürat'] || perfSpecs['Максимальная скорость']);
        const fuelCombined = extractNumber(perfSpecs['Fuel consumption (economy) - combined (NEDC)'] || perfSpecs['Ortalama yakıt tüketimi (NEDC)'] || perfSpecs['Расход топлива Смешанный цикл (NEDC)']);
        const co2 = extractNumber(perfSpecs['CO2 emissions (NEDC)'] || perfSpecs['CO2 Emisyonları (NEDC)'] || perfSpecs['Выбросы CO2 (NEDC)']);
        
        const weight = extractNumber(weightSpecs['Kerb Weight'] || weightSpecs['Ağırlık'] || weightSpecs['Снаряженная масса автомобиля']);
        const length = extractNumber(dimSpecs['Length'] || dimSpecs['Uzunluk'] || dimSpecs['Длина']);
        const wheelbase = extractNumber(dimSpecs['Wheelbase'] || dimSpecs['Dingil Mesafesi'] || dimSpecs['Колесная база']);
        
        const url = cleanString(item['URL']);
        const images = JSON.stringify(item['Images'] || []);
        const fullData = JSON.stringify(item);

        return `(
          '${lang.code}', '${brand}', '${model}', '${generation}', '${modification}', '${bodyType}',
          ${yearStart || 'NULL'}, ${yearEnd || 'NULL'}, ${powerHp || 'NULL'}, ${torqueNm || 'NULL'}, ${displacement || 'NULL'},
          ${accel || 'NULL'}, ${maxSpeed || 'NULL'}, ${fuelCombined || 'NULL'}, ${co2 || 'NULL'},
          ${weight || 'NULL'}, ${length || 'NULL'}, ${wheelbase || 'NULL'},
          '${url}', '${images.replace(/'/g, "''")}', '${fullData.replace(/'/g, "''")}'
        )`;
      }).join(',\n');

      sqlStream.write(`INSERT OR IGNORE INTO cars (
        lang, brand, model, generation, modification, body_type,
        year_start, year_end, power_hp, torque_nm, displacement_cm3,
        acceleration_100, max_speed, fuel_combined, co2,
        weight_kg, length_mm, wheelbase_mm,
        url, images, full_data
      ) VALUES \n${values};\n`);
      
      totalCount += batch.length;
    }
  }

  sqlStream.end();
  console.log(`\n✨ Done! Generated SQL for ${totalCount} records.`);
  console.log(`📂 Output: ${OUTPUT_FILE}`);
}

prepare().catch(console.error);
