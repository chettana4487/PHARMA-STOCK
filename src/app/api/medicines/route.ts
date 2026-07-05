import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetRow, Medicine, Manufacturer } from '@/lib/google-sheets';

// Helper to generate next Medicine ID (e.g. MED001)
function generateNextId(medicines: Medicine[]): string {
  if (medicines.length === 0) return 'MED001';
  
  const ids = medicines
    .map(m => {
      const match = m.medicine_id.match(/^MED(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(id => id > 0);

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextNum = maxId + 1;
  return `MED${String(nextNum).padStart(3, '0')}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [medicines, manufacturers] = await Promise.all([
      getSheetData<Medicine>('Medicines'),
      getSheetData<Manufacturer>('Manufacturers'),
    ]);

    // Map manufacturer_name into response objects for UI ease
    const manufacturerMap = new Map(manufacturers.map(m => [m.manufacturer_id, m.manufacturer_name]));

    const joinedMedicines = medicines.map(m => ({
      ...m,
      current_stock: Number(m.current_stock) || 0,
      min_stock: Number(m.min_stock) || 0,
      manufacturer_name: manufacturerMap.get(m.manufacturer_id) || 'Unknown Manufacturer',
    }));

    return NextResponse.json(joinedMedicines);
  } catch (error: any) {
    console.error('Error fetching medicines:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
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
    const { medicine_code, medicine_name, category, unit, manufacturer_id, min_stock, location, note, expire_date } = body;

    // Validate required fields
    if (!medicine_code || !medicine_name || !category || !unit || !manufacturer_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const medicines = await getSheetData<Medicine>('Medicines');

    // Check if code already exists
    const codeExists = medicines.some(m => m.medicine_code.trim().toLowerCase() === medicine_code.trim().toLowerCase());
    if (codeExists) {
      return NextResponse.json({ error: 'Medicine code already exists' }, { status: 400 });
    }

    const nextId = generateNextId(medicines);
    const nowStr = new Date().toISOString();

    const newMedicine: Medicine = {
      medicine_id: nextId,
      medicine_code: medicine_code.trim(),
      medicine_name: medicine_name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      manufacturer_id: manufacturer_id,
      min_stock: Number(min_stock) || 0,
      current_stock: 0, // Starts at zero stock (increased via Stock-In)
      location: location?.trim() || '',
      expire_date: expire_date || '',
      note: note?.trim() || '',
      created_at: nowStr,
      updated_at: nowStr,
    };

    await appendSheetRow('Medicines', newMedicine);

    return NextResponse.json(newMedicine, { status: 201 });
  } catch (error: any) {
    console.error('Error creating medicine:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
