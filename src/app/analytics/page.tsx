'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Pill,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Info,
  ChevronDown,
  Archive,
} from 'lucide-react';

interface Medicine {
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  category: string;
  unit: string;
  manufacturer_name: string;
  min_stock: number;
  current_stock: number;
  location: string;
  expire_date: string;
}

interface Transaction {
  id: string;
  type: 'in' | 'out';
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  quantity: number;
  unit: string;
  date: string; // YYYY-MM-DD
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [reportMode, setReportMode] = useState<'recent_day' | 'recent_week' | 'recent_month' | 'calendar'>('recent_month');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [selectedMedId, setSelectedMedId] = useState<string>('all');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Detect and listen to theme class changes on documentElement
  useEffect(() => {
    const checkTheme = () => {
      const isLight = document.documentElement.classList.contains('light');
      setTheme(isLight ? 'light' : 'dark');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [medRes, txRes] = await Promise.all([
        fetch('/api/medicines'),
        fetch('/api/transactions'),
      ]);

      if (medRes.ok && txRes.ok) {
        const medData = await medRes.json();
        const txData = await txRes.json();
        setMedicines(medData);
        setTransactions(txData);
      } else {
        toast.error('ล้มเหลวในการดาวน์โหลดข้อมูลเพื่อประมวลผลกราฟ');
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบคลัง');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Theme chart config colors
  const isLight = theme === 'light';
  const chartTextFill = isLight ? '#334155' : '#94a3b8';
  const chartGridStroke = isLight ? '#e2e8f0' : '#1e293b';
  const tooltipBgColor = isLight ? '#ffffff' : '#0f172a';
  const tooltipBorderColor = isLight ? '#e2e8f0' : '#1e293b';
  const tooltipLabelColor = isLight ? '#0f172a' : '#ffffff';

  // Parse YYYY-MM-DD local date safely
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999); // end of day
  };

  // Helper: Calculate remaining stock at a specific historical point in time (retroactive simulation)
  const getStockAtTime = (targetDate: Date, currentStockMap: Map<string, number>, targetMedId: string) => {
    // Find all transactions that occurred strictly AFTER targetDate
    const txAfter = transactions.filter((t) => {
      if (targetMedId !== 'all' && t.medicine_id !== targetMedId) return false;
      const tDate = parseLocalDate(t.date);
      return tDate > targetDate;
    });

    // Sum changes backwards
    let netIn = 0;
    let netOut = 0;
    for (const t of txAfter) {
      if (t.type === 'in') netIn += t.quantity;
      else if (t.type === 'out') netOut += t.quantity;
    }

    // Sum current base stock
    let baseStock = 0;
    if (targetMedId !== 'all') {
      baseStock = currentStockMap.get(targetMedId) || 0;
    } else {
      for (const val of currentStockMap.values()) {
        baseStock += val;
      }
    }

    // Historical stock level
    return Math.max(0, baseStock - netIn + netOut);
  };

  // Dynamically extract available years from transactions
  const years = Array.from(
    new Set(
      transactions.map((t) => {
        try {
          return parseLocalDate(t.date).getFullYear();
        } catch {
          return currentYear;
        }
      })
    )
  )
    .filter(Boolean)
    .sort((a, b) => b - a);

  const availableYears = years.length > 0 ? years : [currentYear];

  const monthsList = [
    { value: 'all', label: 'ทุกเดือน (ทั้งปี)' },
    { value: '1', label: 'มกราคม' },
    { value: '2', label: 'กุมภาพันธ์' },
    { value: '3', label: 'มีนาคม' },
    { value: '4', label: 'เมษายน' },
    { value: '5', label: 'พฤษภาคม' },
    { value: '6', label: 'มิถุนายน' },
    { value: '7', label: 'กรกฎาคม' },
    { value: '8', label: 'สิงหาคม' },
    { value: '9', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' },
  ];

  // 1. Process Timeline Comparison Data
  const getTimelineData = () => {
    const dataList = [];
    const currentStockMap = new Map(medicines.map((m) => [m.medicine_id, m.current_stock]));

    if (reportMode === 'recent_day') {
      // Last 10 Days
      for (let i = 9; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        // Sum stock outs
        const outs = transactions.filter((t) => {
          if (selectedMedId !== 'all' && t.medicine_id !== selectedMedId) return false;
          if (t.type !== 'out') return false;
          const tDate = parseLocalDate(t.date);
          return tDate >= startOfDay && tDate <= endOfDay;
        });
        const totalOut = outs.reduce((sum, t) => sum + t.quantity, 0);
        const remaining = getStockAtTime(endOfDay, currentStockMap, selectedMedId);

        const label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        dataList.push({ name: label, stockOut: totalOut, remaining });
      }
    } else if (reportMode === 'recent_week') {
      // Last 8 Weeks
      for (let i = 7; i >= 0; i--) {
        const today = new Date();
        const d = new Date(today.setDate(today.getDate() - i * 7));
        const dayOfWeek = d.getDay();
        const startOfWeek = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1), 0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);

        const outs = transactions.filter((t) => {
          if (selectedMedId !== 'all' && t.medicine_id !== selectedMedId) return false;
          if (t.type !== 'out') return false;
          const tDate = parseLocalDate(t.date);
          return tDate >= startOfWeek && tDate <= endOfWeek;
        });
        const totalOut = outs.reduce((sum, t) => sum + t.quantity, 0);
        const remaining = getStockAtTime(endOfWeek, currentStockMap, selectedMedId);

        const labelStart = startOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        const labelEnd = endOfWeek.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        dataList.push({ name: `${labelStart}-${labelEnd}`, stockOut: totalOut, remaining });
      }
    } else if (reportMode === 'recent_month') {
      // Last 6 Months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const outs = transactions.filter((t) => {
          if (selectedMedId !== 'all' && t.medicine_id !== selectedMedId) return false;
          if (t.type !== 'out') return false;
          const tDate = parseLocalDate(t.date);
          return tDate >= startOfMonth && tDate <= endOfMonth;
        });
        const totalOut = outs.reduce((sum, t) => sum + t.quantity, 0);
        const remaining = getStockAtTime(endOfMonth, currentStockMap, selectedMedId);

        const label = d.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
        dataList.push({ name: label, stockOut: totalOut, remaining });
      }
    } else {
      // calendar mode
      if (selectedMonth !== 'all') {
        const year = Number(selectedYear);
        const month = Number(selectedMonth);
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
          const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

          const outs = transactions.filter((t) => {
            if (selectedMedId !== 'all' && t.medicine_id !== selectedMedId) return false;
            if (t.type !== 'out') return false;
            const tDate = parseLocalDate(t.date);
            return tDate >= startOfDay && tDate <= endOfDay;
          });
          const totalOut = outs.reduce((sum, t) => sum + t.quantity, 0);
          const remaining = getStockAtTime(endOfDay, currentStockMap, selectedMedId);

          const label = `${day} ${endOfDay.toLocaleDateString('th-TH', { month: 'short' })}`;
          dataList.push({ name: label, stockOut: totalOut, remaining });
        }
      } else {
        const year = Number(selectedYear);
        for (let monthVal = 1; monthVal <= 12; monthVal++) {
          const startOfMonth = new Date(year, monthVal - 1, 1, 0, 0, 0, 0);
          const endOfMonth = new Date(year, monthVal, 0, 23, 59, 59, 999);

          const outs = transactions.filter((t) => {
            if (selectedMedId !== 'all' && t.medicine_id !== selectedMedId) return false;
            if (t.type !== 'out') return false;
            const tDate = parseLocalDate(t.date);
            return tDate >= startOfMonth && tDate <= endOfMonth;
          });
          const totalOut = outs.reduce((sum, t) => sum + t.quantity, 0);
          const remaining = getStockAtTime(endOfMonth, currentStockMap, selectedMedId);

          const label = endOfMonth.toLocaleDateString('th-TH', { month: 'short' });
          dataList.push({ name: label, stockOut: totalOut, remaining });
        }
      }
    }

    return dataList;
  };

  const timelineData = getTimelineData();

  // 2. Process Summary KPI Metrics
  const getSummaryMetrics = () => {
    const currentStockMap = new Map(medicines.map((m) => [m.medicine_id, m.current_stock]));

    let startPeriod = new Date();
    let endPeriod = new Date();

    if (reportMode === 'recent_day') {
      startPeriod.setDate(startPeriod.getDate() - 9);
      startPeriod.setHours(0, 0, 0, 0);
      // endPeriod is today
    } else if (reportMode === 'recent_week') {
      startPeriod.setDate(startPeriod.getDate() - 55);
      startPeriod.setHours(0, 0, 0, 0);
      // endPeriod is today
    } else if (reportMode === 'recent_month') {
      startPeriod.setMonth(startPeriod.getMonth() - 5);
      startPeriod.setHours(0, 0, 0, 0);
      // endPeriod is today
    } else {
      // calendar mode
      if (selectedMonth !== 'all') {
        const year = Number(selectedYear);
        const month = Number(selectedMonth);
        startPeriod = new Date(year, month - 1, 1, 0, 0, 0, 0);
        endPeriod = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        const year = Number(selectedYear);
        startPeriod = new Date(year, 0, 1, 0, 0, 0, 0);
        endPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    }

    // Remaining Stock at the end of the period
    const remaining = getStockAtTime(endPeriod, currentStockMap, selectedMedId);

    // Total Stock Out during the period
    const periodOuts = transactions.filter((t) => {
      if (selectedMedId !== 'all' && t.medicine_id !== selectedMedId) return false;
      if (t.type !== 'out') return false;
      const tDate = parseLocalDate(t.date);
      return tDate >= startPeriod && tDate <= endPeriod;
    });

    const totalStockOut = periodOuts.reduce((sum, t) => sum + t.quantity, 0);
    const sumInventory = remaining + totalStockOut;
    const ratio = sumInventory > 0 ? (totalStockOut / sumInventory) * 100 : 0;

    return {
      remaining,
      stockOut: totalStockOut,
      ratio: ratio.toFixed(1),
      startPeriod,
      endPeriod,
    };
  };

  const metrics = getSummaryMetrics();

  // 3. Process Donut Pie Chart (Remaining vs Stock Out)
  const pieData = [
    { name: 'คงคลังปัจจุบัน', value: metrics.remaining, color: '#10b981' },
    { name: 'ปริมาณเบิกใช้รวม', value: metrics.stockOut, color: '#f43f5e' },
  ];

  // 4. Process Top 5 Consumed Medicines Breakdown
  const getTopConsumedData = () => {
    const { startPeriod, endPeriod } = metrics;

    // Sum stock-outs per medicine during the filtered period
    const medUsageMap = new Map<string, number>();
    transactions.forEach((t) => {
      if (t.type === 'out') {
        const tDate = parseLocalDate(t.date);
        if (tDate >= startPeriod && tDate <= endPeriod) {
          const current = medUsageMap.get(t.medicine_id) || 0;
          medUsageMap.set(t.medicine_id, current + t.quantity);
        }
      }
    });

    // Create top list
    const topList = medicines
      .map((m) => {
        const stockOut = medUsageMap.get(m.medicine_id) || 0;
        
        // Find remaining stock of this medicine at the end of the period
        const mStockMap = new Map([[m.medicine_id, m.current_stock]]);
        const remainingAtEnd = getStockAtTime(endPeriod, mStockMap, m.medicine_id);

        return {
          name: m.medicine_name.length > 25 ? m.medicine_name.substring(0, 25) + '...' : m.medicine_name,
          stockOut,
          remaining: remainingAtEnd,
        };
      })
      .sort((a, b) => b.stockOut - a.stockOut)
      .slice(0, 5);

    return topList;
  };

  const topConsumedData = getTopConsumedData();

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            วิเคราะห์และเทียบสัดส่วนคลังยา
          </h1>
          <p className="text-sm text-slate-400 mt-1 pl-13">
            เปรียบเทียบสัดส่วนยอดการเบิกจ่ายเวชภัณฑ์ยา กับระดับปริมาณยาคงเหลือในระบบคลัง
          </p>
        </div>
      </div>

      {/* Selector & Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/40 border border-slate-800 p-4 rounded-3xl">
        {/* Medicine Dropdown Selector */}
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">เวชภัณฑ์ยา</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Pill className="w-4 h-4" />
            </span>
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl pl-10 pr-10 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="all">เวชภัณฑ์ยาทุกรายการ (รวมสถิติ)</option>
              {medicines.map((m) => (
                <option key={m.medicine_id} value={m.medicine_id}>
                  {m.medicine_code} - {m.medicine_name} ({m.unit})
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Report Mode Dropdown Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ช่วงเวลาแสดงผล</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Calendar className="w-4 h-4" />
            </span>
            <select
              value={reportMode}
              onChange={(e) => setReportMode(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl pl-10 pr-10 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="recent_day">ล่าสุด (10 วัน)</option>
              <option value="recent_week">ล่าสุด (8 สัปดาห์)</option>
              <option value="recent_month">ล่าสุด (6 เดือน)</option>
              <option value="calendar">กำหนดเดือน/ปี เอง</option>
            </select>
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Calendar Filter */}
        {reportMode === 'calendar' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ปี</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 text-xs rounded-2xl px-3 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer text-center font-bold"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>ปี {yr + 543}</option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-500">
                  <ChevronDown className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">เดือน</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs rounded-2xl px-2 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer text-center font-bold"
                >
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-500">
                  <ChevronDown className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden lg:block opacity-30 select-none">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">ตัวกรองปฏิทิน</label>
            <div className="bg-slate-950/20 border border-slate-900 text-xs text-slate-600 rounded-2xl py-3 text-center font-semibold">
              เปิดเมื่อกำหนดเดือน/ปี เอง
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          กำลังดาวน์โหลดและประมวลผลข้อมูลสถิติ...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Remaining */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-300">
                <Archive className="w-24 h-24 text-emerald-400" />
              </div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">ปริมาณยาคงเหลือในคลังปัจจุบัน</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">
                {metrics.remaining.toLocaleString()}{' '}
                <span className="text-xs text-slate-500 font-bold uppercase">หน่วย</span>
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                ยอดสต็อกรวมของกลุ่มยาที่ฟิลเตอร์ปัจจุบัน
              </p>
            </div>

            {/* Card 2: Total Stock Out */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-300">
                <ArrowUpRight className="w-24 h-24 text-rose-400" />
              </div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">ยอดเบิกจ่ายออกสะสม</p>
              <h3 className="text-3xl font-extrabold text-rose-400 mt-2">
                {metrics.stockOut.toLocaleString()}{' '}
                <span className="text-xs text-slate-500 font-bold uppercase">หน่วย</span>
              </h3>
              <p className="text-xs text-slate-500 mt-2">
                นับรวมตามช่วงเวลาที่กำหนดในการรายงาน
              </p>
            </div>

            {/* Card 3: Consumption Ratio */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-24 h-24 text-teal-400" />
              </div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">สัดส่วนการเบิกจ่ายต่อคลัง</p>
              <h3 className="text-3xl font-extrabold text-teal-400 mt-2">
                {metrics.ratio}%
              </h3>
              <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 leading-none">
                <Info className="w-3.5 h-3.5" />
                <span>อัตราการนำยาไปใช้เปรียบเทียบกับยาที่มีในคลัง</span>
              </div>
            </div>
          </div>

          {/* Primary Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Donut Proportion Chart */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between h-96">
              <div className="mb-2">
                <h2 className="text-base font-bold text-white tracking-wide">สัดส่วนการเบิกจ่าย vs คงคลัง</h2>
                <p className="text-[11px] text-slate-500">อัตราส่วนการใช้เวชภัณฑ์เปรียบเทียบกับคลังปัจจุบัน</p>
              </div>

              {metrics.remaining === 0 && metrics.stockOut === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  ไม่มีปริมาณยาคงคลังและยอดเบิกจ่ายในช่วงเวลานี้
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: tooltipBgColor,
                            border: `1px solid ${tooltipBorderColor}`,
                            borderRadius: '12px',
                          }}
                          labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Custom Legends list */}
                  <div className="space-y-1.5 w-full max-w-[240px] mt-2">
                    {pieData.map((data, index) => (
                      <div key={index} className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: data.color }}
                          />
                          <span className="text-slate-400 font-medium truncate max-w-[140px]" title={data.name}>
                            {data.name}
                          </span>
                        </div>
                        <span className="font-bold text-white">{data.value.toLocaleString()} หน่วย</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Timeline Bar & Area Composed Chart */}
            <div className="lg:col-span-2 bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between h-96">
              <div className="mb-4">
                <h2 className="text-base font-bold text-white tracking-wide">
                  แนวโน้มการเบิกจ่ายและระดับคงคลังสะสม
                </h2>
                <p className="text-[11px] text-slate-500">
                  สัดส่วนปริมาณเบิกจ่าย (แท่งสีแดง) เปรียบเทียบกับระดับสต็อกคงเหลือสะสม ณ เวลานั้น ๆ (พื้นที่สีเขียว)
                </p>
              </div>

              <div className="w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="name" stroke={chartTextFill} fontSize={10} tickLine={false} />
                    <YAxis stroke={chartTextFill} fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: tooltipBgColor,
                        border: `1px solid ${tooltipBorderColor}`,
                        borderRadius: '16px',
                      }}
                      labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold', fontSize: '11px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    {/* Area for historical stock trend */}
                    <Area
                      type="monotone"
                      dataKey="remaining"
                      name="ปริมาณคงคลัง (Remaining)"
                      fill="#10b981"
                      fillOpacity={0.08}
                      stroke="#10b981"
                      strokeWidth={2.5}
                    />
                    {/* Bar for stock out */}
                    <Bar
                      dataKey="stockOut"
                      name="ยอดเบิกจ่ายสะสม (Stock Out)"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={25}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Secondary Charts Section */}
          <div className="grid grid-cols-1 gap-6">
            {/* Chart 3: Top 5 Consumed Medicines */}
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between min-h-[300px]">
              <div className="mb-4">
                <h2 className="text-base font-bold text-white tracking-wide">
                  5 อันดับเวชภัณฑ์ยาที่มีอัตราเบิกใช้สูงสุด
                </h2>
                <p className="text-[11px] text-slate-500">
                  เปรียบเทียบสัดส่วนยอดการเบิกจ่ายออก (แท่งสีแดง) และยาที่เหลืออยู่ในสต็อกปัจจุบัน (แท่งสีเขียว)
                </p>
              </div>

              {topConsumedData.length === 0 || topConsumedData.every((item) => item.stockOut === 0) ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                  ไม่มีประวัติการเบิกจ่ายยาในช่วงเวลานี้เพื่อจัดอันดับ
                </div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topConsumedData}
                      layout="vertical"
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} horizontal={false} />
                      <XAxis type="number" stroke={chartTextFill} fontSize={10} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={chartTextFill}
                        fontSize={10}
                        tickLine={false}
                        width={130}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBgColor,
                          border: `1px solid ${tooltipBorderColor}`,
                          borderRadius: '16px',
                        }}
                        labelStyle={{ color: tooltipLabelColor, fontWeight: 'bold', fontSize: '11px' }}
                        itemStyle={{ fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar
                        dataKey="stockOut"
                        name="ยอดเบิกจ่ายสะสม (Stock Out)"
                        fill="#f43f5e"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={15}
                      />
                      <Bar
                        dataKey="remaining"
                        name="ปริมาณคงสต็อก (Remaining)"
                        fill="#10b981"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={15}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
