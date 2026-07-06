const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// 1. Read and parse .env manually
const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: ไม่พบไฟล์ .env');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = env.GOOGLE_SHEET_ID;

if (!serviceAccountEmail || !privateKey || !spreadsheetId || spreadsheetId === 'your-google-spreadsheet-id') {
  console.error('❌ Error: กรุณากรอกการเชื่อมต่อ Google API และ Sheet ID ใน .env ก่อน');
  process.exit(1);
}

privateKey = privateKey.replace(/\\n/g, '\n');

// 2. Google OAuth
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccountEmail,
    private_key: privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const now = new Date();
const nowStr = now.toISOString();

// Date calculations for expiring cases
const dateIn30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15).toISOString().split('T')[0]; // Expiring in 15 days
const dateIn2Years = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString().split('T')[0];
const dateIn1Year = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];

function getRandomDateFrom2025() {
  const start = new Date('2025-01-01T00:00:00Z').getTime();
  const end = now.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

// 1. Manufacturers (5 entries)
const manufacturers = [
  ['MAN001', 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'คุณเอกภพ สายน้ำ', '02-555-0101', 'info@siampharma.co.th', '123/45 ถ.วิภาวดีรังสิต กทม.', 'ผู้ผลิตยาหลักในประเทศ'],
  ['MAN002', 'บริษัท เมก้า ไลฟ์ไซแอ็นซ์ จำกัด', 'คุณเบญจวรรณ พลอยดี', '02-769-4000', 'contact@megawecare.com', '384 ซ.พัฒนาการ 30 กทม.', 'เน้นยาปฏิชีวนะและอาหารเสริม'],
  ['MAN003', 'องค์การเภสัชกรรม (GPO)', 'ฝ่ายการตลาดคลัง', '02-203-8000', 'callcenter@gpo.or.th', '75/1 ถ.พระราม 6 กทม.', 'โรงงานเวชภัณฑ์ยาแห่งรัฐ'],
  ['MAN004', 'บริษัท สหแพทย์เภสัช จำกัด', 'คุณมานพ โชคดี', '02-318-0022', 'contact@unitedpharma.co.th', '456 ถ.สุขุมวิท กทม.', 'ผู้ผลิตยาบรรเทาอาการปวดและหวัด'],
  ['MAN005', 'บริษัท ไบโอแลป จำกัด', 'คุณวิชัย เจริญวิทย์', '02-726-9000', 'sales@biolab.co.th', '999 ถ.บางนา-ตราด สมุทรปราการ', 'ผู้เชี่ยวชาญด้านเวชภัณฑ์และครีมรักษาโรค']
];

// 2. Generate 100 unique medicines
const drugBases = [
  { name: 'Paracetamol', cat: 'ยาแก้ปวดลดไข้', unit: 'เม็ด' },
  { name: 'Amoxicillin', cat: 'ยาปฏิชีวนะ', unit: 'แคปซูล' },
  { name: 'Decolgen', cat: 'ยาแก้แพ้แก้หวัด', unit: 'เม็ด' },
  { name: 'Ibuprofen', cat: 'ยาแก้ปวดอักเสบ', unit: 'เม็ด' },
  { name: 'Chlorpheniramine', cat: 'ยาแก้แพ้', unit: 'เม็ด' },
  { name: 'ORS Powder', cat: 'เกลือแร่ทดแทน', unit: 'ซอง' },
  { name: 'Metformin', cat: 'ยารักษาเบาหวาน', unit: 'เม็ด' },
  { name: 'Losartan', cat: 'ยาลดความดันโลหิต', unit: 'เม็ด' },
  { name: 'Atorvastatin', cat: 'ยาลดไขมันในเลือด', unit: 'เม็ด' },
  { name: 'Salbutamol Inhaler', cat: 'ยารักษาโรคหอบหืด', unit: 'หลอดพ่น' },
  { name: 'Omeprazole', cat: 'ยารักษาโรคกระเพาะ', unit: 'แคปซูล' },
  { name: 'Cetirizine', cat: 'ยาแก้แพ้ชนิดไม่ง่วง', unit: 'เม็ด' },
  { name: 'Vitamin C', cat: 'วิตามินและอาหารเสริม', unit: 'เม็ด' },
  { name: 'Povidone Iodine', cat: 'ยาใส่แผลภายนอก', unit: 'ขวด' },
  { name: 'Amlodipine', cat: 'ยาลดความดันโลหิต', unit: 'เม็ด' },
  { name: 'Simvastatin', cat: 'ยาลดไขมันในเลือด', unit: 'เม็ด' },
  { name: 'Clopidogrel', cat: 'ยาต้านเกล็ดเลือด', unit: 'เม็ด' },
  { name: 'Gliclazide', cat: 'ยารักษาเบาหวาน', unit: 'เม็ด' },
  { name: 'Prednisolone', cat: 'ยาสเตียรอยด์', unit: 'เม็ด' },
  { name: 'Diazepam', cat: 'ยาคลายกังวล/นอนหลับ', unit: 'เม็ด' },
  { name: 'Tramadol', cat: 'ยาแก้ปวดรุนแรง', unit: 'แคปซูล' },
  { name: 'Aspirin', cat: 'ยาต้านเกล็ดเลือด', unit: 'เม็ด' },
  { name: 'Ranitidine', cat: 'ยารักษาโรคกระเพาะ', unit: 'เม็ด' },
  { name: 'Multivitamin', cat: 'วิตามินและอาหารเสริม', unit: 'เม็ด' },
  { name: 'Calcium Carbonate', cat: 'วิตามินและอาหารเสริม', unit: 'เม็ด' }
];

const strengths = ['5mg', '10mg', '20mg', '50mg', '100mg', '250mg', '500mg', '1000mg'];

const medicines = [];
const medicineTemplatesForTx = []; // matching list for generating transactions

for (let i = 1; i <= 100; i++) {
  const base = drugBases[i % drugBases.length];
  const str = strengths[i % strengths.length];
  const medId = `MED${String(i).padStart(3, '0')}`;
  const code = `${base.name.substring(0, 4).toUpperCase()}_${str.toUpperCase()}_${i}`;
  const name = `${base.name} ${str}`;
  const cat = base.cat;
  const unit = base.unit;
  const manId = `MAN00${(i % 5) + 1}`;
  const minStock = String(Math.floor(Math.random() * 5) * 50 + 100); // 100 to 300
  const currentStock = String(Math.floor(Math.random() * 15) * 100 + 800); // 800 to 2200
  const location = `ตู้ ${String.fromCharCode(65 + (i % 8))} ชั้น ${(i % 4) + 1}`;
  const expDate = i % 10 === 0 ? dateIn30Days : (i % 2 === 0 ? dateIn1Year : dateIn2Years);
  const note = i % 5 === 0 ? 'ระวังอาการง่วงนอน' : (i % 3 === 0 ? 'ยาอันตรายควบคุม' : 'เก็บพ้นแสง');

  // Push to medicines table input (13 columns: id, code, name, category, unit, manId, minStock, currentStock, location, expire, note, created, updated)
  medicines.push([
    medId,
    code,
    name,
    cat,
    unit,
    manId,
    minStock,
    currentStock,
    location,
    expDate,
    note,
    nowStr,
    nowStr
  ]);

  // Keep a clean structure to use in transactions loop
  medicineTemplatesForTx.push({
    medicine_id: medId,
    medicine_code: code,
    medicine_name: name,
    unit,
    expire_date: expDate
  });
}

// 3. Patients (20 entries)
const patientNames = [
  'น.ส. พัฒน์นรี สุวรรณ', 'นาย สมชาย ใจดี', 'นาง สมศรี มีความสุข', 'ด.ช. เก่งกล้า รักเรียน', 'น.ส. อารียา รุ่งเรือง',
  'นาย ประสิทธิ์ เจริญผล', 'นาง พรทิพย์ แสนดี', 'น.ส. สุธิดา แก้วมณี', 'นาย วิทวัส บุญเกิด', 'นาง อัญชลี รักษ์ไทย',
  'นาย ณัฐพงษ์ ทองคำ', 'น.ส. กัญญารัตน์ โพธิ์ทอง', 'นาย กิตติศักดิ์ ชัยชนะ', 'นาง ศิริพร พูนผล', 'นาย เกียรติศักดิ์ อุดมสุข',
  'น.ส. วรัญญา สิงห์โต', 'นาย ธีรภัทร สมบัติ', 'นาง นงลักษณ์ ยอดรัก', 'นาย ปกรณ์ ปัญญาดี', 'น.ส. พรหมพร จันทร์เพ็ญ'
];
const allergies = ['ไม่มี', 'แพ้ยา Penicillin', 'ไม่มี', 'แพ้ยา Aspirin', 'ไม่มี', 'ไม่มี', 'แพ้ยา Sulfa', 'ไม่มี', 'ไม่มี', 'ไม่มี'];

const patients = [];
for (let i = 0; i < patientNames.length; i++) {
  const hn = `HN ${1232679 + i}`;
  const age = Math.floor(Math.random() * 60) + 12; // ages 12 to 72
  const allergy = allergies[i % allergies.length];
  patients.push([hn, patientNames[i], String(age), allergy, nowStr, nowStr]);
}

// 4. StockIn Transactions (200 entries)
const recorders = [
  'ภญ.พิมพ์ชนก แสงเงิน',
  'ภก.สมเจตน์ มั่นคง',
  'น.ส.ดวงใจ ดีเลิศ',
  'นายเกียรติภูมิ แก้วใส',
  'ภญ.อัญชลี รักษ์ไทย',
  'Admin User'
];

const suppliers = [
  'บริษัท สยามฟาร์มาซูติคอล จำกัด',
  'บริษัท เมก้า ไลฟ์ไซแอ็นซ์ จำกัด',
  'องค์การเภสัชกรรม (GPO)',
  'บริษัท สหแพทย์เภสัช จำกัด',
  'บริษัท ไบโอแลป จำกัด'
];

const stockInRaw = [];
for (let i = 1; i <= 200; i++) {
  const med = medicineTemplatesForTx[Math.floor(Math.random() * medicineTemplatesForTx.length)];
  const lotNo = `LOT-${med.medicine_code}-${Math.floor(Math.random() * 90) + 10}`;
  const quantity = Math.floor(Math.random() * 10) * 100 + 1000; // 1000 to 1900
  const randDate = getRandomDateFrom2025();
  const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  const docNo = `INV-${Math.floor(Math.random() * 9000) + 1000}`;
  const fileUrl = Math.random() > 0.5 ? `https://drive.google.com/file/d/demo_inv_${i}/view` : '';
  const creator = recorders[Math.floor(Math.random() * recorders.length)];

  stockInRaw.push({
    medId: med.medicine_id,
    lotNo,
    quantity,
    unit: med.unit,
    expireDate: med.expire_date,
    randDate,
    supplier,
    docNo,
    fileUrl,
    creator
  });
}

// Sort StockIn records chronologically
stockInRaw.sort((a, b) => a.randDate - b.randDate);

const stockIn = stockInRaw.map((item, index) => {
  const inId = `IN${String(index + 1).padStart(3, '0')}`;
  const receivedDate = item.randDate.toISOString().split('T')[0];
  const createdAt = item.randDate.toISOString();
  return [
    inId,
    item.medId,
    item.lotNo,
    String(item.quantity),
    item.unit,
    item.expireDate,
    receivedDate,
    item.supplier,
    item.docNo,
    item.fileUrl,
    item.creator,
    createdAt
  ];
});

// 5. StockOut Transactions (300 entries)
const departments = [
  'แผนกผู้ป่วยนอก (OPD)',
  'แผนกผู้ป่วยใน (IPD)',
  'แผนกฉุกเฉิน (ER)',
  'หออภิบาลผู้ป่วยหนัก (ICU)',
  'ห้องผ่าตัด (OR)',
  'ห้องทันตกรรม',
  'แผนกเภสัชกรรม (กระจายยา)'
];
const doctors = [
  'นพ.สมศักดิ์ รักดี', 'พญ.นลิน สวยสม', 'นพ.ปรีชา เลิศไกร', 'พญ.ดุษฎี ศรีสุข', 'ภญ.พิมพ์ชนก แสงเงิน', 'พยาบาลสุรีย์ มีสุข'
];
const purposes = [
  'จ่ายยาประจำแผนกรายวัน', 'ใช้พ่นฉุกเฉินเคสคนไข้หอบ', 'เบิกด่วนเคสผ่าตัดอุบัติเหตุ', 'สำหรับคนไข้วอร์ดอายุรกรรม',
  'กระจายยาสู่ห้องยาผู้ป่วยนอก', 'จ่ายยาคนไข้เบาหวาน/ความดัน', 'เบิกเติมยาสามัญประจำตู้', 'ระงับปวดฉุกเฉิน'
];

const stockOutRaw = [];
for (let i = 1; i <= 300; i++) {
  const med = medicineTemplatesForTx[Math.floor(Math.random() * medicineTemplatesForTx.length)];
  const quantity = Math.floor(Math.random() * 15) * 5 + 10; // 10 to 80
  const dept = departments[Math.floor(Math.random() * departments.length)];
  const requester = doctors[Math.floor(Math.random() * doctors.length)];
  const purpose = purposes[Math.floor(Math.random() * purposes.length)];
  const randDate = getRandomDateFrom2025();
  const creator = recorders[Math.floor(Math.random() * recorders.length)];
  const hasPatient = Math.random() < 0.90;
  const patient = hasPatient ? patients[Math.floor(Math.random() * patients.length)] : null;
  const hn = patient ? patient[0] : '';

  stockOutRaw.push({
    medId: med.medicine_id,
    quantity,
    unit: med.unit,
    dept,
    requester,
    purpose,
    randDate,
    creator,
    hn
  });
}

// Sort StockOut records chronologically
stockOutRaw.sort((a, b) => a.randDate - b.randDate);

const stockOut = stockOutRaw.map((item, index) => {
  const outId = `OUT${String(index + 1).padStart(3, '0')}`;
  const issuedDate = item.randDate.toISOString().split('T')[0];
  const createdAt = item.randDate.toISOString();
  return [
    outId,
    item.medId,
    String(item.quantity),
    item.unit,
    item.dept,
    item.requester,
    item.purpose,
    issuedDate,
    item.creator,
    createdAt,
    item.hn
  ];
});

async function seed() {
  try {
    console.log('\x1b[36m%s\x1b[0m', '🔄 เริ่มการล้างข้อมูลเดิมและเขียนข้อมูลจำลองชุดใหญ่ (Super Seed Data)...');

    // Clear existing data (everything below row 1)
    const sheetsToClear = ['Medicines', 'Manufacturers', 'StockIn', 'StockOut', 'Patients'];
    for (const sheetName of sheetsToClear) {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A2:Z10000`,
        });
      } catch (err) {
        console.warn(`⚠️ Warning: ไม่สามารถล้างข้อมูลชีต ${sheetName} ได้`);
      }
    }
    console.log('✅ ล้างข้อมูลเก่าของชีตเรียบร้อย');

    // Seed Manufacturers
    console.log('🔄 กำลังเขียนข้อมูลผู้จัดจำหน่ายจำลอง (5 รายการ)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Manufacturers!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: manufacturers },
    });

    // Seed Medicines
    console.log(`🔄 กำลังเขียนข้อมูลเวชภัณฑ์ยาจำลอง (${medicines.length} รายการ)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Medicines!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: medicines },
    });

    // Seed StockIn Records
    console.log(`🔄 กำลังเขียนประวัตินำเข้าจำลอง (${stockIn.length} รายการ)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'StockIn!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockIn },
    });

    // Seed StockOut Records
    console.log(`🔄 กำลังเขียนประวัติการเบิกจ่ายจำลอง (${stockOut.length} รายการ)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'StockOut!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockOut },
    });

    // Seed Patients Records
    console.log(`🔄 กำลังเขียนข้อมูลผู้ป่วยจำลอง (${patients.length} รายการ)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Patients!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: patients },
    });

    console.log('\n\x1b[32m%s\x1b[0m', '🎉 ทำการสร้างข้อมูลจำลองขนาดใหญ่ (Super Seed Data) ลง Google Sheets เรียบร้อยแล้ว!');
    console.log('กรุณาเปิดหน้าเว็บแดชบอร์ด http://localhost:3000 อีกครั้งเพื่อตรวจสอบความถูกต้องของสถิติและกราฟ');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเขียนข้อมูลจำลอง:');
    console.error(error);
  }
}

seed();
