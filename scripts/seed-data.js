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

// Mock Data Arrays
const manufacturers = [
  ['MAN001', 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'คุณเอกภพ สายน้ำ', '02-555-0101', 'info@siampharma.co.th', '123/45 ถ.วิภาวดีรังสิต กทม.', 'ผู้ผลิตยาหลักในประเทศ'],
  ['MAN002', 'บริษัท เมก้า ไลฟ์ไซแอ็นซ์ จำกัด', 'คุณเบญจวรรณ พลอยดี', '02-769-4000', 'contact@megawecare.com', '384 ซ.พัฒนาการ 30 กทม.', 'เน้นยาปฏิชีวนะและอาหารเสริม'],
  ['MAN003', 'องค์การเภสัชกรรม (GPO)', 'ฝ่ายการตลาดคลัง', '02-203-8000', 'callcenter@gpo.or.th', '75/1 ถ.พระราม 6 กทม.', 'โรงงานเวชภัณฑ์ยาแห่งรัฐ']
];

// medicine_id, medicine_code, medicine_name, category, unit, manufacturer_id, min_stock, current_stock, location, expire_date, note, created_at, updated_at
const now = new Date();
const nowStr = now.toISOString();

// Date calculations for expiring cases
const dateIn30Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15).toISOString().split('T')[0]; // Expiring in 15 days
const dateIn2Years = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString().split('T')[0];
const dateIn1Year = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];

const medicines = [
  ['MED001', 'PARA500', 'Paracetamol 500mg', 'ยาแก้ปวดลดไข้', 'เม็ด', 'MAN001', '200', '1500', 'ตู้ A ชั้น 1', dateIn2Years, 'เก็บพ้นแสง', nowStr, nowStr],
  ['MED002', 'AMOX500', 'Amoxicillin 500mg', 'ยาปฏิชีวนะ', 'แคปซูล', 'MAN002', '300', '120', 'ตู้ B ชั้น 2', dateIn1Year, 'ยาอันตรายควบคุม', nowStr, nowStr], // Low Stock! (120 < 300)
  ['MED003', 'DECOL', 'Decolgen คลายกล้ามเนื้อ', 'ยาแก้แพ้แก้หวัด', 'เม็ด', 'MAN001', '100', '50', 'ตู้ A ชั้น 2', dateIn30Days, 'ระวังอาการง่วงนอน', nowStr, nowStr], // Expiring Soon!
  ['MED004', 'IBU400', 'Ibuprofen 400mg', 'ยาแก้ปวดอักเสบ', 'เม็ด', 'MAN003', '150', '0', 'ตู้ C ชั้น 1', dateIn2Years, 'ทานหลังอาหารทันที', nowStr, nowStr] // Out of Stock!
];

// historical transaction dates
const date3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 5).toISOString().split('T')[0];
const date2MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString().split('T')[0];
const date1MonthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString().split('T')[0];

// stock_in_id, medicine_id, lot_no, quantity, unit, expire_date, received_date, supplier, document_no, file_url, created_by, created_at
const stockIn = [
  ['IN001', 'MED001', 'LOT-P01', '1000', 'เม็ด', dateIn2Years, date3MonthsAgo, 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'INV-6901', 'https://drive.google.com/file/d/1_demo_invoice_1/view', 'System Seeder', new Date(date3MonthsAgo).toISOString()],
  ['IN002', 'MED001', 'LOT-P02', '1000', 'เม็ด', dateIn2Years, date2MonthsAgo, 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'INV-7204', '', 'System Seeder', new Date(date2MonthsAgo).toISOString()],
  ['IN003', 'MED002', 'LOT-A1', '200', 'แคปซูล', dateIn1Year, date2MonthsAgo, 'บริษัท เมก้า ไลฟ์ไซแอ็นซ์ จำกัด', 'INV-7320', 'https://drive.google.com/file/d/1_demo_invoice_2/view', 'System Seeder', new Date(date2MonthsAgo).toISOString()],
  ['IN004', 'MED003', 'LOT-D01', '100', 'เม็ด', dateIn30Days, date1MonthAgo, 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'INV-8002', '', 'System Seeder', new Date(date1MonthAgo).toISOString()],
  ['IN005', 'MED001', 'LOT-P03', '500', 'เม็ด', dateIn2Years, date1MonthAgo, 'บริษัท สยามฟาร์มาซูติคอล จำกัด', 'INV-8043', '', 'System Seeder', new Date(date1MonthAgo).toISOString()]
];

// stock_out_id, medicine_id, quantity, unit, department, requester, purpose, issued_date, created_by, created_at
const stockOut = [
  ['OUT001', 'MED001', '300', 'เม็ด', 'แผนกผู้ป่วยนอก (OPD)', 'นพ.สมศักดิ์ รักดี', 'จ่ายยาประจำแผนกรายวัน', date3MonthsAgo, 'System Seeder', new Date(date3MonthsAgo).toISOString()],
  ['OUT002', 'MED001', '200', 'เม็ด', 'แผนกฉุกเฉิน (ER)', 'พญ.นลิน สวยสม', 'เบิกด่วนเคสรถชน', date2MonthsAgo, 'System Seeder', new Date(date2MonthsAgo).toISOString()],
  ['OUT003', 'MED002', '80', 'แคปซูล', 'แผนกผู้ป่วยใน (IPD)', 'พยาบาลสุรีย์ มีสุข', 'สำหรับคนไข้วอร์ด 4', date2MonthsAgo, 'System Seeder', new Date(date2MonthsAgo).toISOString()],
  ['OUT004', 'MED001', '500', 'เม็ด', 'แผนกเภสัชกรรม (กระจายยา)', 'ภญ.พิมพ์ชนก แสงเงิน', 'แจกจ่ายร้านยาชุมชน', date1MonthAgo, 'System Seeder', new Date(date1MonthAgo).toISOString()],
  ['OUT005', 'MED003', '50', 'เม็ด', 'แผนกผู้ป่วยนอก (OPD)', 'นพ.สมศักดิ์ รักดี', 'จ่ายยากลุ่มหวัดประเดือน', date1MonthAgo, 'System Seeder', new Date(date1MonthAgo).toISOString()]
];

async function seed() {
  try {
    console.log('\x1b[36m%s\x1b[0m', '🔄 เริ่มการล้างข้อมูลเดิมและเขียนข้อมูลจำลอง (Seed Data)...');

    // Clear existing data (everything below row 1)
    const sheetsToClear = ['Medicines', 'Manufacturers', 'StockIn', 'StockOut'];
    for (const sheetName of sheetsToClear) {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A2:Z5000`,
      });
    }
    console.log('✅ ล้างข้อมูลเก่าของชีต Medicines, Manufacturers, StockIn, StockOut เรียบร้อย');

    // Seed Manufacturers
    console.log('🔄 กำลังเขียนข้อมูลผู้จัดจำหน่าย (Manufacturers)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Manufacturers!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: manufacturers },
    });

    // Seed Medicines
    console.log('🔄 กำลังเขียนข้อมูลเวชภัณฑ์ยา (Medicines)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Medicines!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: medicines },
    });

    // Seed StockIn Records
    console.log('🔄 กำลังเขียนประวัตินำเข้า (StockIn)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'StockIn!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockIn },
    });

    // Seed StockOut Records
    console.log('🔄 กำลังเขียนประวัติการเบิกจ่าย (StockOut)...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'StockOut!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockOut },
    });

    console.log('\n\x1b[32m%s\x1b[0m', '🎉 ทำการสร้างข้อมูลจำลอง (Seed Data) ลง Google Sheets เรียบร้อยแล้ว!');
    console.log('กรุณาเปิดหน้าเว็บแดชบอร์ด http://localhost:3000 อีกครั้งเพื่อตรวจสอบความถูกต้องของสถิติและกราฟ');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเขียนข้อมูลจำลอง:');
    console.error(error);
  }
}

seed();
