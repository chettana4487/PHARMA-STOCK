import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData, appendSheetRow, Manufacturer } from '@/lib/google-sheets';

function generateNextId(manufacturers: Manufacturer[]): string {
  if (manufacturers.length === 0) return 'MAN001';

  const ids = manufacturers
    .map((m) => {
      const match = m.manufacturer_id.match(/^MAN(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextNum = maxId + 1;
  return `MAN${String(nextNum).padStart(3, '0')}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manufacturers = await getSheetData<Manufacturer>('Manufacturers');
    return NextResponse.json(manufacturers);
  } catch (error: any) {
    console.error('Error fetching manufacturers:', error);
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
    const { manufacturer_name, contact_name, phone, email, address, note } = body;

    if (!manufacturer_name) {
      return NextResponse.json({ error: 'Manufacturer name is required' }, { status: 400 });
    }

    const manufacturers = await getSheetData<Manufacturer>('Manufacturers');

    const nameExists = manufacturers.some(
      (m) => m.manufacturer_name.trim().toLowerCase() === manufacturer_name.trim().toLowerCase()
    );
    if (nameExists) {
      return NextResponse.json({ error: 'Manufacturer name already exists' }, { status: 400 });
    }

    const nextId = generateNextId(manufacturers);

    const newManufacturer: Manufacturer = {
      manufacturer_id: nextId,
      manufacturer_name: manufacturer_name.trim(),
      contact_name: contact_name?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      address: address?.trim() || '',
      note: note?.trim() || '',
    };

    await appendSheetRow('Manufacturers', newManufacturer);

    return NextResponse.json(newManufacturer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating manufacturer:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
