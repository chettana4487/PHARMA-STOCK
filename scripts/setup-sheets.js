const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// 1. Read and parse .env manually
const envPath = path.resolve(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: ไม่พบไฟล์ .env กรุณาคัดลอก .env.example และตั้งค่าก่อนรันสคริปต์');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

// Check Google credentials
const serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let privateKey = env.GOOGLE_PRIVATE_KEY;

if (!serviceAccountEmail || !privateKey) {
  console.error('\x1b[31m%s\x1b[0m', '❌ Error: ไม่พบ GOOGLE_SERVICE_ACCOUNT_EMAIL หรือ GOOGLE_PRIVATE_KEY ใน .env');
  process.exit(1);
}

// Format private key (replace \n with actual newlines)
privateKey = privateKey.replace(/\\n/g, '\n');

// Get User Email from arguments
const userEmail = process.argv[2];
if (!userEmail) {
  console.log('\n\x1b[33m%s\x1b[0m', '💡 คำแนะนำ: คุณสามารถส่งอีเมล Google ของคุณเพื่อแชร์สิทธิ์และตั้งค่า Admin เริ่มต้นได้');
  console.log('ตัวอย่างการรัน: node scripts/setup-sheets.js your-email@gmail.com\n');
}

// 2. Setup Google APIs
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccountEmail,
    private_key: privateKey,
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

const DB_SCHEMA = {
  Medicines: [
    'medicine_id', 'medicine_code', 'medicine_name', 'category', 'unit',
    'manufacturer_id', 'min_stock', 'current_stock', 'location', 'expire_date',
    'note', 'created_at', 'updated_at'
  ],
  Manufacturers: [
    'manufacturer_id', 'manufacturer_name', 'contact_name', 'phone', 'email',
    'address', 'note'
  ],
  StockIn: [
    'stock_in_id', 'medicine_id', 'lot_no', 'quantity', 'unit',
    'expire_date', 'received_date', 'supplier', 'document_no', 'file_url',
    'created_by', 'created_at'
  ],
  StockOut: [
    'stock_out_id', 'medicine_id', 'quantity', 'unit', 'department',
    'requester', 'purpose', 'issued_date', 'created_by', 'created_at'
  ],
  Users: [
    'user_id', 'name', 'email', 'role', 'active'
  ]
};

async function run() {
  try {
    let spreadsheetId = env.GOOGLE_SHEET_ID;
    let spreadsheetUrl = '';
    const isPlaceholderId = !spreadsheetId || spreadsheetId === 'your-google-spreadsheet-id' || spreadsheetId.trim() === '';

    if (isPlaceholderId) {
      console.log('\x1b[36m%s\x1b[0m', '🔄 กำลังติดต่อ Google Sheets API เพื่อสร้างฐานข้อมูลใหม่...');
      // 1. Create Spreadsheet
      const resource = {
        properties: {
          title: 'Medical Stock Database (ระบบสต็อกยา)',
        },
      };
      
      const spreadsheet = await sheets.spreadsheets.create({
        requestBody: resource,
        fields: 'spreadsheetId,spreadsheetUrl',
      });

      spreadsheetId = spreadsheet.data.spreadsheetId;
      spreadsheetUrl = spreadsheet.data.spreadsheetUrl;

      console.log('\x1b[32m%s\x1b[0m', `✅ สร้าง Spreadsheet สำเร็จ!`);
      console.log(`ID: ${spreadsheetId}`);
      console.log(`Link: ${spreadsheetUrl}\n`);
    } else {
      console.log('\x1b[36m%s\x1b[0m', `🔄 ตรวจพบ GOOGLE_SHEET_ID ใน .env: ${spreadsheetId}`);
      console.log('🔄 กำลังเชื่อมต่อและจัดโครงสร้างให้กับตารางเดิมของคุณ...');
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    }

    // 2. Add Tabs & Write Headers
    const sheetsMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheetTitles = sheetsMeta.data.sheets.map(s => s.properties.title);
    const defaultSheetId = sheetsMeta.data.sheets[0].properties.sheetId;

    const requests = [];

    // If 'Medicines' doesn't exist, we rename the first sheet (usually Sheet1) to 'Medicines'
    if (!existingSheetTitles.includes('Medicines')) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: defaultSheetId,
            title: 'Medicines',
          },
          fields: 'title',
        },
      });
    }

    // Add remaining sheets if they don't already exist
    const otherSheets = ['Manufacturers', 'StockIn', 'StockOut', 'Users'];
    for (const title of otherSheets) {
      if (!existingSheetTitles.includes(title)) {
        requests.push({
          addSheet: {
            properties: {
              title,
            },
          },
        });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    // Populate Headers for all sheets
    for (const [sheetName, headers] of Object.entries(DB_SCHEMA)) {
      console.log(`🔄 กำลังสร้างคอลัมน์ให้กับหน้า: ${sheetName}...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // 3. Populate default Admin user if email is supplied
    if (userEmail) {
      console.log('\n🔄 กำลังเพิ่มบัญชี Admin แรกเข้าระบบ...');
      const adminRow = ['USR001', 'Admin User', userEmail.trim().toLowerCase(), 'admin', 'TRUE'];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Users!A:A',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [adminRow],
        },
      });
      console.log('\x1b[32m%s\x1b[0m', `✅ เพิ่มสิทธิ์ Admin ให้กับอีเมล: ${userEmail} สำเร็จ!`);

      // 4. Share Spreadsheet with User
      console.log('🔄 กำลังแชร์สิทธิ์การเข้าถึง Spreadsheet ให้กับอีเมลของคุณ...');
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: userEmail.trim().toLowerCase(),
        },
      });
      console.log('\x1b[32m%s\x1b[0m', '✅ แชร์สิทธิ์ในฐานะ Editor เรียบร้อย! เช็กที่ Google Sheets ของคุณได้เลย');
    }

    console.log('\n\x1b[35m%s\x1b[0m', '==================================================');
    console.log('\x1b[32m%s\x1b[0m', '🎉 สรุปขั้นตอนถัดไปเพื่อนำไปรันระบบ:');
    console.log(`1. คัดลอก Spreadsheet ID ด้านล่างนี้ไปใส่ในไฟล์ .env ของคุณ:`);
    console.log(`   GOOGLE_SHEET_ID=${spreadsheetId}`);
    console.log(`2. หากยังไม่ได้แชร์ ไปที่ลิงก์นี้เพื่อเปิดดูตาราง: \n   ${spreadsheetUrl}`);
    console.log('\x1b[35m%s\x1b[0m', '==================================================\n');

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ เกิดข้อผิดพลาดในระหว่างดำเนินการ:');
    console.error(error);
  }
}

run();
