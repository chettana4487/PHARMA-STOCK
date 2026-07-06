import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, StockIn, StockOut, Medicine } from '@/lib/google-sheets';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [stockInRecords, stockOutRecords, medicines] = await Promise.all([
      getSheetData<StockIn>('StockIn'),
      getSheetData<StockOut>('StockOut'),
      getSheetData<Medicine>('Medicines'),
    ]);

    const medicineMap = new Map(
      medicines.map((m) => [m.medicine_id, { name: m.medicine_name, code: m.medicine_code }])
    );

    // Map Stock In transactions
    const mappedStockIn = stockInRecords.map((r) => {
      const med = medicineMap.get(r.medicine_id);
      return {
        id: r.stock_in_id,
        type: 'in',
        medicine_id: r.medicine_id,
        medicine_code: med?.code || 'N/A',
        medicine_name: med?.name || 'Unknown Medicine',
        quantity: Number(r.quantity) || 0,
        unit: r.unit,
        date: r.received_date,
        operator: r.created_by,
        note_or_purpose: r.lot_no ? `Lot: ${r.lot_no}` : '',
        lot_no: r.lot_no,
        supplier_or_dept: r.supplier,
        document_no: r.document_no,
        file_url: r.file_url,
        created_at: r.created_at,
      };
    });

    // Map Stock Out transactions
    const mappedStockOut = stockOutRecords.map((r) => {
      const med = medicineMap.get(r.medicine_id);
      return {
        id: r.stock_out_id,
        type: 'out',
        medicine_id: r.medicine_id,
        medicine_code: med?.code || 'N/A',
        medicine_name: med?.name || 'Unknown Medicine',
        quantity: Number(r.quantity) || 0,
        unit: r.unit,
        date: r.issued_date,
        operator: r.created_by,
        note_or_purpose: r.purpose || '',
        lot_no: '',
        supplier_or_dept: r.department,
        document_no: r.requester, // Use document_no/requester mapping
        file_url: '',
        created_at: r.created_at,
        hn: r.hn || '',
      };
    });

    // Merge and sort by created_at descending (newest first)
    const allTransactions = [...mappedStockIn, ...mappedStockOut].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json(allTransactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
