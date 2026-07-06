import { google } from 'googleapis';

// Interface definitions matching our spreadsheet schema
export interface Medicine {
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  category: string;
  unit: string;
  manufacturer_id: string;
  min_stock: number;
  current_stock: number;
  location: string;
  expire_date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Manufacturer {
  manufacturer_id: string;
  manufacturer_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
}

export interface StockIn {
  stock_in_id: string;
  medicine_id: string;
  lot_no: string;
  quantity: number;
  unit: string;
  expire_date: string;
  received_date: string;
  supplier: string;
  document_no: string;
  file_url: string;
  created_by: string;
  created_at: string;
}

export interface StockOut {
  stock_out_id: string;
  medicine_id: string;
  quantity: number;
  unit: string;
  department: string;
  requester: string;
  purpose: string;
  issued_date: string;
  hn?: string;
  created_by: string;
  created_at: string;
}

export interface Patient {
  hn: string;
  name: string;
  age: number;
  allergy: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'viewer';
  active: boolean;
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

export const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Helper to get raw cell values from a sheet range
async function getRawValues(range: string): Promise<any[][]> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID env variable is not set');
  }
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  return response.data.values || [];
}

// Helper to retrieve sheet metadata to find sheetId (gid) by title
async function getSheetId(sheetName: string): Promise<number> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID env variable is not set');
  }
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheet || sheet.properties?.sheetId === undefined || sheet.properties?.sheetId === null) {
    throw new Error(`Sheet name "${sheetName}" not found or sheetId is missing.`);
  }
  return sheet.properties.sheetId as number;
}

// Convert column letters (A, B, C...) based on index (0-indexed)
function getColumnLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

let isSchemaVerified = false;

export async function ensureDatabaseSchema(): Promise<void> {
  if (!SPREADSHEET_ID) return;
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

    // 1. Ensure Patients sheet exists
    if (!sheetTitles.includes('Patients')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Patients',
                },
              },
            },
          ],
        },
      });

      const headers = ['hn', 'name', 'age', 'allergy', 'created_at', 'updated_at'];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Patients!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // 2. Ensure StockOut has hn header
    const stockOutRows = await getRawValues('StockOut!A1:Z1');
    if (stockOutRows.length > 0) {
      const headers = stockOutRows[0].map(h => String(h).trim());
      if (!headers.includes('hn')) {
        headers.push('hn');
        const endColumnLetter = getColumnLetter(headers.length - 1);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `StockOut!A1:${endColumnLetter}1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
      }
    }
  } catch (error) {
    console.error("Error ensuring database schema:", error);
  }
}

/**
 * Fetch all records from a Sheet name and map rows to object fields using header row.
 */
export async function getSheetData<T>(sheetName: string): Promise<T[]> {
  if (!isSchemaVerified) {
    try {
      await ensureDatabaseSchema();
      isSchemaVerified = true;
    } catch (err) {
      console.error("Schema validation failed:", err);
    }
  }
  const rows = await getRawValues(`${sheetName}!A1:Z5000`);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => String(h).trim());
  const data: T[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};
    
    // Skip empty lines
    if (row.length === 0 || row.every(val => val === '')) continue;

    headers.forEach((header, index) => {
      const val = row[index];
      if (val === undefined || val === null || val === '') {
        obj[header] = '';
      } else {
        // Automatically cast specific columns
        if (['current_stock', 'min_stock', 'quantity'].includes(header)) {
          obj[header] = Number(val) || 0;
        } else if (header === 'active') {
          obj[header] = String(val).toUpperCase() === 'TRUE';
        } else {
          obj[header] = String(val);
        }
      }
    });

    data.push(obj as T);
  }

  return data;
}

/**
 * Append a row of data dynamically mapping keys to the sheet's header definition.
 */
export async function appendSheetRow(
  sheetName: string,
  data: Record<string, any>
): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set');
  }

  const rows = await getRawValues(`${sheetName}!A1:Z1`);
  if (rows.length === 0) {
    throw new Error(`Sheet ${sheetName} headers are missing. Please initialize headers first.`);
  }

  const headers = rows[0].map((h) => String(h).trim());
  const newRow = headers.map((header) => {
    const val = data[header];
    if (val === undefined || val === null) {
      return '';
    }
    if (typeof val === 'boolean') {
      return val ? 'TRUE' : 'FALSE';
    }
    return String(val);
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });
}

/**
 * Update a specific row matching a key/value column criteria
 */
export async function updateSheetRow(
  sheetName: string,
  keyColumn: string,
  keyValue: string,
  updatedData: Record<string, any>
): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set');
  }

  const rows = await getRawValues(`${sheetName}!A1:Z5000`);
  if (rows.length === 0) return;

  const headers = rows[0].map((h) => String(h).trim());
  const keyColumnIndex = headers.indexOf(keyColumn);

  if (keyColumnIndex === -1) {
    throw new Error(`Key column "${keyColumn}" not found in sheet ${sheetName}`);
  }

  // Search row index (1-based index including headers, so index in rows is i)
  let foundRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][keyColumnIndex]).trim() === keyValue.trim()) {
      foundRowIndex = i;
      break;
    }
  }

  if (foundRowIndex === -1) {
    throw new Error(`Record with ${keyColumn} = "${keyValue}" not found in ${sheetName}`);
  }

  // Construct updated row matching existing columns
  const existingRow = rows[foundRowIndex];
  const newRow = headers.map((header, index) => {
    if (header in updatedData) {
      const val = updatedData[header];
      if (val === undefined || val === null) return '';
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      return String(val);
    }
    return existingRow[index] !== undefined ? String(existingRow[index]) : '';
  });

  const endColumnLetter = getColumnLetter(headers.length - 1);
  const rowNumber = foundRowIndex + 1; // 1-indexed for sheets range
  const range = `${sheetName}!A${rowNumber}:${endColumnLetter}${rowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });
}

/**
 * Delete a specific row matching key/value by removing the row dimension (preventing empty rows in between).
 */
export async function deleteSheetRow(
  sheetName: string,
  keyColumn: string,
  keyValue: string
): Promise<void> {
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID is not set');
  }

  const rows = await getRawValues(`${sheetName}!A1:Z5000`);
  if (rows.length === 0) return;

  const headers = rows[0].map((h) => String(h).trim());
  const keyColumnIndex = headers.indexOf(keyColumn);

  if (keyColumnIndex === -1) {
    throw new Error(`Key column "${keyColumn}" not found in sheet ${sheetName}`);
  }

  let foundRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][keyColumnIndex]).trim() === keyValue.trim()) {
      foundRowIndex = i; // 0-indexed index in local array rows
      break;
    }
  }

  if (foundRowIndex === -1) {
    throw new Error(`Record with ${keyColumn} = "${keyValue}" not found in ${sheetName}`);
  }

  const sheetId = await getSheetId(sheetName);

  // Send request to delete this specific row index (foundRowIndex is 0-indexed index in array,
  // since rows[0] is header, rows[foundRowIndex] is the target row.
  // In Google Sheets deleteDimension, start index is 0-based inclusive, end is exclusive.
  // Since foundRowIndex is index in rows, it corresponds exactly to the 0-based row index in Sheet.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: foundRowIndex,
              endIndex: foundRowIndex + 1,
            },
          },
        },
      ],
    },
  });
}
