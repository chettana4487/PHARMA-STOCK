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
      items, // Optional array of { medicine_id: string, quantity: number, unit: string }
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

    // Normalize input to items array
    let itemsToProcess: Array<{ medicine_id: string; quantity: number; unit: string }> = [];
    if (items && Array.isArray(items)) {
      itemsToProcess = items.map((item: any) => ({
        medicine_id: item.medicine_id,
        quantity: Number(item.quantity),
        unit: String(item.unit || '').trim(),
      }));
    } else if (medicine_id) {
      itemsToProcess = [{
        medicine_id,
        quantity: Number(quantity),
        unit: String(unit || '').trim(),
      }];
    }

    // Validation
    if (itemsToProcess.length === 0 || !requester || !issued_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    for (const item of itemsToProcess) {
      if (!item.medicine_id || isNaN(item.quantity) || item.quantity <= 0 || !item.unit) {
        return NextResponse.json({ error: 'Invalid medicine item fields or quantity must be a positive number' }, { status: 400 });
      }
    }

    // 1. Fetch medicine data to check stock availability for all items
    const medicines = await getSheetData<Medicine>('Medicines');
    for (const item of itemsToProcess) {
      const medicine = medicines.find((m) => m.medicine_id === item.medicine_id);
      if (!medicine) {
        return NextResponse.json({ error: `Medicine with ID ${item.medicine_id} not found` }, { status: 404 });
      }

      const currentStock = Number(medicine.current_stock) || 0;
      if (currentStock < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for medicine "${medicine.medicine_name}". Current stock is ${currentStock} but requested ${item.quantity}`,
        }, { status: 400 });
      }
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

    // 3. Insert StockOut Records
    const stockOutRecords = await getSheetData<StockOut>('StockOut');
    const nextId = generateNextId(stockOutRecords);
    const creatorName = session.user.name || session.user.email || 'System';
    const savedTransactions: StockOut[] = [];

    for (let idx = 0; idx < itemsToProcess.length; idx++) {
      const item = itemsToProcess[idx];
      const medicine = medicines.find((m) => m.medicine_id === item.medicine_id)!;
      const currentStock = Number(medicine.current_stock) || 0;
      
      const recordId = itemsToProcess.length === 1 ? nextId : `${nextId}-${idx + 1}`;

      const newStockOut: StockOut = {
        stock_out_id: recordId,
        medicine_id: item.medicine_id,
        quantity: item.quantity,
        unit: item.unit,
        department: department?.trim() || '',
        requester: requester.trim(),
        purpose: purpose?.trim() || '',
        issued_date,
        hn: hn?.trim() || '',
        created_by: creatorName,
        created_at: nowStr,
      };

      await appendSheetRow('StockOut', newStockOut);

      // 4. Update Medicine stock
      const newStock = currentStock - item.quantity;
      await updateSheetRow('Medicines', 'medicine_id', item.medicine_id, {
        current_stock: newStock,
        updated_at: nowStr,
      });

      savedTransactions.push(newStockOut);
    }

    return NextResponse.json({
      success: true,
      transactions: savedTransactions,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error posting stock-out:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
