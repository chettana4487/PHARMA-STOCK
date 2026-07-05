import { NextResponse } from 'next/server';
import { getSheetData, appendSheetRow, User } from '@/lib/google-sheets';

function generateNextUserId(users: User[]): string {
  if (users.length === 0) return 'USR001';

  const ids = users
    .map((u) => {
      const match = u.user_id.match(/^USR(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((id) => id > 0);

  const maxId = ids.length > 0 ? Math.max(...ids) : 0;
  const nextNum = maxId + 1;
  return `USR${String(nextNum).padStart(3, '0')}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, role } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const users = await getSheetData<User>('Users');

    const emailExists = users.some(
      (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const nextId = generateNextUserId(users);
    const validRole = ['admin', 'staff', 'viewer'].includes(role) ? role : 'staff';

    const newUser: User = {
      user_id: nextId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: validRole as 'admin' | 'staff' | 'viewer',
      active: true, // Mark active true immediately for onboarding convenience
    };

    await appendSheetRow('Users', newUser);

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error in user registration:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
