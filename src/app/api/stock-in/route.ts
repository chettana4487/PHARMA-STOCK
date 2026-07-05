import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetRow, updateSheetRow, StockIn, Medicine } from '@/lib/google-sheets';

function generateNextId(records: StockIn[]): string {
  if (records.length === 0) return 'IN001';

  const ids = records
    .map((r) => {
      const match = r.stock_in_id.match(/^IN(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextNum = maxId + 1;
  return `IN${String(nextNum).padStart(3, '0')}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'staff') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await request.json();
    const {
      medicine_id,
      lot_no,
      quantity,
      unit,
      expire_date,
      received_date,
      supplier,
      document_no,
      file_url,
    } = body;

    // Validation
    if (!medicine_id || !lot_no || quantity === undefined || !unit || !received_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }

    // 1. Fetch target medicine to verify it exists and get its current stock
    const medicines = await getSheetData<Medicine>('Medicines');
    const medicine = medicines.find((m) => m.medicine_id === medicine_id);
    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
    }

    // 2. Insert StockIn Record
    const stockInRecords = await getSheetData<StockIn>('StockIn');
    const nextId = generateNextId(stockInRecords);
    const nowStr = new Date().toISOString();
    const creatorName = session.user.name || session.user.email || 'System';

    const newStockIn: StockIn = {
      stock_in_id: nextId,
      medicine_id,
      lot_no: lot_no.trim(),
      quantity: qty,
      unit: unit.trim(),
      expire_date: expire_date || '',
      received_date,
      supplier: supplier?.trim() || '',
      document_no: document_no?.trim() || '',
      file_url: file_url || '',
      created_by: creatorName,
      created_at: nowStr,
    };

    await appendSheetRow('StockIn', newStockIn);

    // 3. Update Medicine current_stock & expire_date in Medicines sheet
    const currentStock = Number(medicine.current_stock) || 0;
    const newStock = currentStock + qty;

    const medicineUpdates: Record<string, any> = {
      current_stock: newStock,
      updated_at: nowStr,
    };

    // If an expiration date is provided, update the general expiration date of the medicine
    if (expire_date) {
      medicineUpdates.expire_date = expire_date;
    }

    await updateSheetRow('Medicines', 'medicine_id', medicine_id, medicineUpdates);

    return NextResponse.json({
      success: true,
      transaction: newStockIn,
      new_stock: newStock,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error posting stock-in:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
