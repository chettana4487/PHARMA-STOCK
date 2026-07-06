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

function getPastDate(daysAgo) {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// 1. Manufacturers (5 entries)
const manufacturers = [
  ['MAN001', 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'คุณเอกภพ สายน้ำ', '02-555-0101', 'info@siampharma.co.th', '123/45 ถ.วิภาวดีรังสิต กทม.', 'ผู้ผลิตยาหลักในประเทศ'],
  ['MAN002', 'บริษัท เมก้า ไลฟ์ไซแอ็นซ์ จำกัด', 'คุณเบญจวรรณ พลอยดี', '02-769-4000', 'contact@megawecare.com', '384 ซ.พัฒนาการ 30 กทม.', 'เน้นยาปฏิชีวนะและอาหารเสริม'],
  ['MAN003', 'องค์การเภสัชกรรม (GPO)', 'ฝ่ายการตลาดคลัง', '02-203-8000', 'callcenter@gpo.or.th', '75/1 ถ.พระราม 6 กทม.', 'โรงงานเวชภัณฑ์ยาแห่งรัฐ'],
  ['MAN004', 'บริษัท สหแพทย์เภสัช จำกัด', 'คุณมานพ โชคดี', '02-318-0022', 'contact@unitedpharma.co.th', '456 ถ.สุขุมวิท กทม.', 'ผู้ผลิตยาบรรเทาอาการปวดและหวัด'],
  ['MAN005', 'บริษัท ไบโอแลป จำกัด', 'คุณวิชัย เจริญวิทย์', '02-726-9000', 'sales@biolab.co.th', '999 ถ.บางนา-ตราด สมุทรปราการ', 'ผู้เชี่ยวชาญด้านเวชภัณฑ์และครีมรักษาโรค']
];

// 2. Medicines (15 entries)
const medicineTemplates = [
  ['MED001', 'PARA500', 'Paracetamol 500mg', 'ยาแก้ปวดลดไข้', 'เม็ด', 'MAN001', '200', '1500', 'ตู้ A ชั้น 1', dateIn2Years, 'เก็บพ้นแสง'],
  ['MED002', 'AMOX500', 'Amoxicillin 500mg', 'ยาปฏิชีวนะ', 'แคปซูล', 'MAN002', '300', '120', 'ตู้ B ชั้น 2', dateIn1Year, 'ยาอันตรายควบคุม'],
  ['MED003', 'DECOL', 'Decolgen คลายกล้ามเนื้อ', 'ยาแก้แพ้แก้หวัด', 'เม็ด', 'MAN001', '100', '50', 'ตู้ A ชั้น 2', dateIn30Days, 'ระวังอาการง่วงนอน'],
  ['MED004', 'IBU400', 'Ibuprofen 400mg', 'ยาแก้ปวดอักเสบ', 'เม็ด', 'MAN003', '150', '0', 'ตู้ C ชั้น 1', dateIn2Years, 'ทานหลังอาหารทันที'],
  ['MED005', 'CPM4', 'Chlorpheniramine 4mg', 'ยาแก้แพ้', 'เม็ด', 'MAN003', '100', '800', 'ตู้ C ชั้น 2', dateIn2Years, 'หลีกเลี่ยงการขับขี่ยานพาหนะ'],
  ['MED006', 'ORAL1', 'ORS เกลือแร่', 'เกลือแร่ทดแทน', 'ซอง', 'MAN001', '50', '250', 'ตู้ A ชั้น 3', dateIn1Year, 'ละลายน้ำสะอาดดื่ม'],
  ['MED007', 'PARA_SYR', 'Paracetamol Syrup 120mg/5ml', 'ยาแก้ปวดลดไข้เด็ก', 'ขวด', 'MAN004', '30', '180', 'ตู้ D ชั้น 1', dateIn1Year, 'เขย่าขวดก่อนใช้'],
  ['MED008', 'METFORMIN', 'Metformin 500mg', 'ยารักษาเบาหวาน', 'เม็ด', 'MAN003', '500', '2400', 'ตู้ E ชั้น 1', dateIn2Years, 'ทานพร้อมอาหาร'],
  ['MED009', 'LOSARTAN', 'Losartan 50mg', 'ยาลดความดันโลหิต', 'เม็ด', 'MAN002', '400', '1800', 'ตู้ E ชั้น 2', dateIn2Years, 'ทานวันละ 1 ครั้งเวลาเดิม'],
  ['MED010', 'ATORVASTATIN', 'Atorvastatin 20mg', 'ยาลดไขมันในเลือด', 'เม็ด', 'MAN001', '300', '950', 'ตู้ E ชั้น 3', dateIn2Years, 'ทานก่อนนอน'],
  ['MED011', 'SALBUTAMOL', 'Salbutamol Inhaler 100mcg', 'ยารักษาโรคหอบหืด', 'หลอดพ่น', 'MAN005', '20', '45', 'ตู้ B ชั้น 3', dateIn1Year, 'ยาพ่นฉุกเฉิน'],
  ['MED012', 'OMEPRAZOLE', 'Omeprazole 20mg', 'ยารักษาโรคกระเพาะ', 'แคปซูล', 'MAN004', '200', '1100', 'ตู้ F ชั้น 1', dateIn2Years, 'ทานก่อนอาหาร 30 นาที'],
  ['MED013', 'CETIRIZINE', 'Cetirizine 10mg', 'ยาแก้แพ้ชนิดไม่ง่วง', 'เม็ด', 'MAN002', '100', '650', 'ตู้ C ชั้น 3', dateIn2Years, 'ทานวันละ 1 เม็ด'],
  ['MED014', 'VIT_C', 'Vitamin C 1000mg', 'วิตามินและอาหารเสริม', 'เม็ด', 'MAN002', '50', '500', 'ตู้ G ชั้น 1', dateIn2Years, 'ทานหลังอาหารเช้า'],
  ['MED015', 'POVIDONE', 'Povidone Iodine 15ml', 'ยาใส่แผลภายนอก', 'ขวด', 'MAN005', '30', '90', 'ตู้ H ชั้น 1', dateIn2Years, 'ห้ามรับประทาน']
];

const medicines = medicineTemplates.map(m => [...m, nowStr, nowStr]);

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

// 4. StockIn Transactions (30 entries)
const stockIn = [];
const suppliers = [
  'บริษัท สยามฟาร์มาซูติคอล จำกัด',
  'บริษัท เมก้า ไลฟ์ไซแอ็นซ์ จำกัด',
  'องค์การเภสัชกรรม (GPO)',
  'บริษัท สหแพทย์เภสัช จำกัด',
  'บริษัท ไบโอแลป จำกัด'
];

for (let i = 1; i <= 30; i++) {
  const inId = `IN${String(i).padStart(3, '0')}`;
  const med = medicineTemplates[Math.floor(Math.random() * medicineTemplates.length)];
  const medId = med[0];
  const lotNo = `LOT-${med[1]}-${Math.floor(Math.random() * 90) + 10}`;
  const quantity = Math.floor(Math.random() * 10) * 100 + 1000; // 1000 to 1900
  const unit = med[4];
  const expireDate = med[9];
  
  const daysAgo = Math.floor(Math.random() * 80) + 5;
  const receivedDate = getPastDate(daysAgo).toISOString().split('T')[0];
  const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
  const docNo = `INV-${Math.floor(Math.random() * 9000) + 1000}`;
  const fileUrl = Math.random() > 0.5 ? `https://drive.google.com/file/d/demo_inv_${i}/view` : '';
  const creator = 'System Seeder';
  const createdAt = new Date(receivedDate).toISOString();

  stockIn.push([inId, medId, lotNo, String(quantity), unit, expireDate, receivedDate, supplier, docNo, fileUrl, creator, createdAt]);
}

// 5. StockOut Transactions (60 entries)
const stockOut = [];
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

for (let i = 1; i <= 60; i++) {
  const outId = `OUT${String(i).padStart(3, '0')}`;
  const med = medicineTemplates[Math.floor(Math.random() * medicineTemplates.length)];
  const medId = med[0];
  const quantity = Math.floor(Math.random() * 15) * 5 + 10; // 10 to 80
  const unit = med[4];
  const dept = departments[Math.floor(Math.random() * departments.length)];
  const requester = doctors[Math.floor(Math.random() * doctors.length)];
  const purpose = purposes[Math.floor(Math.random() * purposes.length)];
  
  const daysAgo = Math.floor(Math.random() * 80) + 2;
  const issuedDate = getPastDate(daysAgo).toISOString().split('T')[0];
  const creator = 'System Seeder';
  const createdAt = new Date(issuedDate).toISOString();
  
  const hasPatient = Math.random() < 0.90;
  const patient = hasPatient ? patients[Math.floor(Math.random() * patients.length)] : null;
  const hn = patient ? patient[0] : '';

  stockOut.push([outId, medId, String(quantity), unit, dept, requester, purpose, issuedDate, creator, createdAt, hn]);
}

async function seed() {
  try {
    console.log('\x1b[36m%s\x1b[0m', '🔄 เริ่มการล้างข้อมูลเดิมและเขียนข้อมูลจำลองชุดใหญ่ (Super Seed Data)...');

    // Clear existing data (everything below row 1)
    const sheetsToClear = ['Medicines', 'Manufacturers', 'StockIn', 'StockOut', 'Patients'];
    for (const sheetName of sheetsToClear) {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A2:Z5000`,
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
    console.log('🔄 กำลังเขียนข้อมูลเวชภัณฑ์ยาจำลอง (15 รายการ)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Medicines!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: medicines },
    });

    // Seed StockIn Records
    console.log('🔄 กำลังเขียนประวัตินำเข้าจำลอง (30 รายการ)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'StockIn!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockIn },
    });

    // Seed StockOut Records
    console.log('🔄 กำลังเขียนประวัติการเบิกจ่ายจำลอง (60 รายการ)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'StockOut!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockOut },
    });

    // Seed Patients Records
    console.log('🔄 กำลังเขียนข้อมูลผู้ป่วยจำลอง (20 รายการ)...');
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
