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

    const updateData: Record<string, any> = {};

    const allowedKeys = ['manufacturer_name', 'contact_name', 'phone', 'email', 'address', 'note'];

    allowedKeys.forEach((key) => {
      if (body[key] !== undefined) {
        updateData[key] = String(body[key]).trim();
      }
    });

    await updateSheetRow('Manufacturers', 'manufacturer_id', id, updateData);

    return NextResponse.json({ success: true, message: `Manufacturer ${id} updated successfully` });
  } catch (error: any) {
    console.error('Error updating manufacturer:', error);
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

    await deleteSheetRow('Manufacturers', 'manufacturer_id', id);

    return NextResponse.json({ success: true, message: `Manufacturer ${id} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting manufacturer:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
