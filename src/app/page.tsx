'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Pill,
  AlertTriangle,
  Calendar,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  totalMedicines: number;
  lowStockCount: number;
  expiredCount: number;
  expiring30Count: number;
  expiring60Count: number;
  expiring90Count: number;
  recentActivities: Array<{
    id: string;
    type: 'in' | 'out';
    medicine_name: string;
    quantity: number;
    unit: string;
    date: string;
    created_at: string;
  }>;
  chartData: Array<{
    month: string;
    in: number;
    out: number;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  async function fetchDashboardSummary() {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard-summary');
      if (res.ok) {
        const summaryData = await res.json();
        setData(summaryData);
      } else {
        console.error('Failed to fetch summary data');
      }
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    fetchDashboardSummary();
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-10 w-64 bg-slate-800 rounded-xl"></div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 border border-slate-800 rounded-3xl"></div>
          ))}
        </div>

        {/* Chart & Activity Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-800/50 border border-slate-800 rounded-3xl"></div>
          <div className="h-96 bg-slate-800/50 border border-slate-800 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const summary = data || {
    totalMedicines: 0,
    lowStockCount: 0,
    expiredCount: 0,
    expiring30Count: 0,
    expiring60Count: 0,
    expiring90Count: 0,
    recentActivities: [],
    chartData: [],
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
            แดชบอร์ดระบบคลังยา
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ภาพรวมข้อมูลรายการยา จำนวนคงคลังปัจจุบัน และประวัติล่าสุด
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ยินดีต้อนรับ: {session?.user?.name} ({session?.user?.role})</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Medicines */}
        <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700/50 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 card-watermark-icon group-hover:scale-110 transition-transform duration-300">
            <Pill className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">รายการยาทั้งหมด</p>
              <h3 className="text-3xl font-extrabold text-white mt-0.5">{summary.totalMedicines}</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">ลงทะเบียนในระบบคลัง</p>
        </div>

        {/* Card 2: Low Stock Warning */}
        <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700/50 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 card-watermark-icon group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle className="w-24 h-24 text-amber-400" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${summary.lowStockCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">ยาต่ำกว่าเกณฑ์ (Min Stock)</p>
              <h3 className={`text-3xl font-extrabold mt-0.5 ${summary.lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                {summary.lowStockCount}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {summary.lowStockCount > 0 ? 'ควรเร่งสั่งซื้อเพิ่มเติมเข้าระบบ' : 'ปริมาณคลังยาเพียงพอทั้งหมด'}
          </p>
        </div>

        {/* Card 3: Expired / Expiring Soon */}
        <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700/50 transition-all duration-300 md:col-span-1">
          <div className="absolute top-0 right-0 p-8 card-watermark-icon group-hover:scale-110 transition-transform duration-300">
            <Calendar className="w-24 h-24 text-rose-400" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${summary.expiredCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">หมดอายุ / ใกล้หมดอายุ</p>
              <h3 className={`text-3xl font-extrabold mt-0.5 ${summary.expiredCount > 0 ? 'text-rose-500' : 'text-white'}`}>
                {summary.expiredCount} <span className="text-sm font-semibold text-slate-500">รายการหมดอายุ</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold">
              30 วัน: {summary.expiring30Count}
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">
              60 วัน: {summary.expiring60Count}
            </span>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-bold">
              90 วัน: {summary.expiring90Count}
            </span>
          </div>
        </div>

        {/* Card 4: Operation Activity */}
        <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl shadow-lg relative overflow-hidden group hover:border-slate-700/50 transition-all duration-300">
          <div className="absolute top-0 right-0 p-8 card-watermark-icon group-hover:scale-110 transition-transform duration-300">
            <Activity className="w-24 h-24 text-teal-400" />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">รายการเดินคลังรวม</p>
              <h3 className="text-3xl font-extrabold text-white mt-0.5">
                {summary.recentActivities.length}
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500">บันทึกธุรกรรมในระลอกล่าสุด</p>
        </div>
      </div>

      {/* Main Charts & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-slate-950/40 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-wide">สถิตินำเข้าและเบิกจ่าย (6 เดือนย้อนหลัง)</h2>
            <p className="text-xs text-slate-400">สรุปยอดรวมของจำนวนหน่วยเวชภัณฑ์ที่มีการรับเข้าและเบิกออกรายเดือน</p>
          </div>
          
          <div className="w-full h-80">
            {summary.chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm font-medium">
                ไม่มีข้อมูลประวัติธุรกรรมสำหรับแสดงกราฟ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '16px',
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                  <Bar dataKey="in" name="นำเข้าสต็อก (Stock In)" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="out" name="เบิกจ่ายออก (Stock Out)" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity Column */}
        <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">ธุรกรรมล่าสุด</h2>
            <p className="text-xs text-slate-400 mb-6">ประวัติรับเข้าและเบิกจ่ายยาล่าสุดในคลัง</p>
            
            <div className="space-y-4">
              {summary.recentActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm font-medium">
                  ไม่มีรายการความเคลื่อนไหว
                </div>
              ) : (
                summary.recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start justify-between border-b border-slate-800/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        act.type === 'in'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {act.type === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{act.medicine_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(act.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${act.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {act.type === 'in' ? '+' : '-'}{act.quantity}
                      </p>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{act.unit}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <a
              href="/history"
              className="w-full inline-flex items-center justify-center text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              ดูประวัติประมวลผลทั้งหมด →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
