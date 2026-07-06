import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetRow, updateSheetRow, StockOut, Medicine, Patient } from '@/lib/google-sheets';

function generateNextId(records: StockOut[]): string {
  if (records.length === 0) return 'OUT001';

  const ids = records
    .map((r) => {
      const match = r.stock_out_id.match(/^OUT(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextNum = maxId + 1;
  return `OUT${String(nextNum).padStart(3, '0')}`;
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
      quantity,
      unit,
      department,
      requester,
      purpose,
      issued_date,
      hn,
      patient_name,
      patient_age,
      patient_allergy,
    } = body;

    // Validation
    if (!medicine_id || quantity === undefined || !unit || !department || !requester || !issued_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }

    // 1. Fetch medicine data to check stock availability
    const medicines = await getSheetData<Medicine>('Medicines');
    const medicine = medicines.find((m) => m.medicine_id === medicine_id);
    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 });
    }

    const currentStock = Number(medicine.current_stock) || 0;
    if (currentStock < qty) {
      return NextResponse.json({
        error: `Insufficient stock. Current stock is ${currentStock} but requested ${qty}`,
      }, { status: 400 });
    }

    const nowStr = new Date().toISOString();
    
    // 2. Handle Patient insertion / update if HN is provided
    if (hn && hn.trim()) {
      const patientHn = hn.trim();
      const patients = await getSheetData<Patient>('Patients');
      const patientExists = patients.find(p => p.hn.trim().toLowerCase() === patientHn.toLowerCase());
      
      const patientData = {
        hn: patientHn,
        name: patient_name?.trim() || '',
        age: Number(patient_age) || 0,
        allergy: patient_allergy?.trim() || '',
        updated_at: nowStr,
      };

      if (patientExists) {
        // Update details if found
        await updateSheetRow('Patients', 'hn', patientExists.hn, {
          name: patientData.name,
          age: patientData.age,
          allergy: patientData.allergy,
          updated_at: nowStr,
        });
      } else {
        // Append new patient if not found
        await appendSheetRow('Patients', {
          ...patientData,
          created_at: nowStr,
        });
      }
    }

    // 3. Insert StockOut Record
    const stockOutRecords = await getSheetData<StockOut>('StockOut');
    const nextId = generateNextId(stockOutRecords);
    const creatorName = session.user.name || session.user.email || 'System';

    const newStockOut: StockOut = {
      stock_out_id: nextId,
      medicine_id,
      quantity: qty,
      unit: unit.trim(),
      department: department.trim(),
      requester: requester.trim(),
      purpose: purpose?.trim() || '',
      issued_date,
      hn: hn?.trim() || '',
      created_by: creatorName,
      created_at: nowStr,
    };

    await appendSheetRow('StockOut', newStockOut);

    // 4. Update Medicine stock
    const newStock = currentStock - qty;
    await updateSheetRow('Medicines', 'medicine_id', medicine_id, {
      current_stock: newStock,
      updated_at: nowStr,
    });

    return NextResponse.json({
      success: true,
      transaction: newStockOut,
      new_stock: newStock,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error posting stock-out:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
