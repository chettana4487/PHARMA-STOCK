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

    const [medicines, stockInRecords, stockOutRecords] = await Promise.all([
      getSheetData<Medicine>('Medicines'),
      getSheetData<StockIn>('StockIn'),
      getSheetData<StockOut>('StockOut'),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Compute totals
    const totalMedicines = medicines.length;
    
    // Low stock count: current_stock <= min_stock
    const lowStockCount = medicines.filter(
      (m) => (Number(m.current_stock) || 0) <= (Number(m.min_stock) || 0)
    ).length;

    // 2. Compute expirations
    let expiredCount = 0;
    let expiring30Count = 0;
    let expiring60Count = 0;
    let expiring90Count = 0;

    medicines.forEach((m) => {
      if (!m.expire_date) return;
      const expireTime = new Date(m.expire_date).getTime();
      if (isNaN(expireTime)) return;

      const diffDays = Math.ceil((expireTime - todayStart) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expiredCount++;
      } else if (diffDays <= 30) {
        expiring30Count++;
      } else if (diffDays <= 60) {
        expiring60Count++;
      } else if (diffDays <= 90) {
        expiring90Count++;
      }
    });

    // 3. Compute recent activity (Last 5 transactions)
    const medicineMap = new Map(medicines.map((m) => [m.medicine_id, m.medicine_name]));
    
    const recentStockIn = stockInRecords.map((r) => ({
      id: r.stock_in_id,
      type: 'in',
      medicine_name: medicineMap.get(r.medicine_id) || 'Unknown Medicine',
      quantity: Number(r.quantity) || 0,
      unit: r.unit,
      date: r.received_date,
      created_at: r.created_at,
    }));

    const recentStockOut = stockOutRecords.map((r) => ({
      id: r.stock_out_id,
      type: 'out',
      medicine_name: medicineMap.get(r.medicine_id) || 'Unknown Medicine',
      quantity: Number(r.quantity) || 0,
      unit: r.unit,
      date: r.issued_date,
      created_at: r.created_at,
    }));

    const recentActivities = [...recentStockIn, ...recentStockOut]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // 4. Monthly chart data (last 6 months)
    const monthNamesThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthlyStats: Record<string, { in: number; out: number; sortKey: number }> = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[key] = { in: 0, out: 0, sortKey: d.getTime() };
    }

    // Process Stock-In quantities
    stockInRecords.forEach((r) => {
      const date = new Date(r.received_date || r.created_at);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyStats[key]) {
        monthlyStats[key].in += Number(r.quantity) || 0;
      }
    });

    // Process Stock-Out quantities
    stockOutRecords.forEach((r) => {
      const date = new Date(r.issued_date || r.created_at);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyStats[key]) {
        monthlyStats[key].out += Number(r.quantity) || 0;
      }
    });

    const chartData = Object.entries(monthlyStats)
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([, value]) => {
        const date = new Date(value.sortKey);
        const name = `${monthNamesThai[date.getMonth()]} ${String(date.getFullYear() + 543).substring(2)}`;
        return {
          month: name,
          in: value.in,
          out: value.out,
        };
      });

    return NextResponse.json({
      totalMedicines,
      lowStockCount,
      expiredCount,
      expiring30Count,
      expiring60Count,
      expiring90Count,
      recentActivities,
      chartData,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
