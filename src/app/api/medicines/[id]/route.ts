import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateSheetRow, deleteSheetRow } from '@/lib/google-sheets';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'admin' && userRole !== 'staff') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Whitelist values to update
    const allowedKeys = [
      'medicine_code',
      'medicine_name',
      'category',
      'unit',
      'manufacturer_id',
      'min_stock',
      'location',
      'expire_date',
      'note',
    ];

    allowedKeys.forEach((key) => {
      if (body[key] !== undefined) {
        if (key === 'min_stock') {
          updateData[key] = Number(body[key]) || 0;
        } else {
          updateData[key] = String(body[key]).trim();
        }
      }
    });

    await updateSheetRow('Medicines', 'medicine_id', id, updateData);

    return NextResponse.json({ success: true, message: `Medicine ${id} updated successfully` });
  } catch (error: any) {
    console.error('Error updating medicine:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const { id } = await params;

    await deleteSheetRow('Medicines', 'medicine_id', id);

    return NextResponse.json({ success: true, message: `Medicine ${id} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting medicine:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
