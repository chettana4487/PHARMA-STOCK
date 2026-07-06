'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  History,
  Download,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Paperclip,
  Calendar,
  User,
  FileText,
} from 'lucide-react';

interface Patient {
  hn: string;
  name: string;
  age: number;
  allergy: string;
}

interface Transaction {
  id: string;
  type: 'in' | 'out';
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  quantity: number;
  unit: string;
  date: string;
  operator: string;
  note_or_purpose: string;
  lot_no?: string;
  supplier_or_dept: string;
  document_no?: string;
  file_url?: string;
  created_at: string;
  hn?: string;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function fetchData() {
    try {
      setLoading(true);
      const [txRes, patRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/patients'),
      ]);

      if (txRes.ok && patRes.ok) {
        const txData = await txRes.json();
        const patData = await patRes.json();
        setTransactions(txData);
        setPatients(patData);
      } else {
        toast.error('ล้มเหลวในการดาวน์โหลดประวัติเดินคลังหรือข้อมูลผู้ป่วย');
      }
    } catch (error) {
      console.error('Error fetching history logs:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลประวัติ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const patientMap = new Map(patients.map(p => [p.hn.trim().toLowerCase(), p.name]));

  // Filter application
  const filteredTransactions = transactions.filter((t) => {
    const patientName = t.hn ? patientMap.get(t.hn.trim().toLowerCase()) || '' : '';
    const matchesSearch =
      t.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.medicine_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.supplier_or_dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.hn && t.hn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      patientName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || t.type === selectedType;

    let matchesDate = true;
    if (t.date) {
      const transDate = new Date(t.date).getTime();
      if (startDate) {
        const start = new Date(startDate).getTime();
        if (transDate < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate).getTime();
        // Add one day to end date to make it inclusive
        const endInclusive = end + 24 * 60 * 60 * 1000;
        if (transDate > endInclusive) matchesDate = false;
      }
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Client-side CSV Exporter with UTF-8 BOM
  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('ไม่มีข้อมูลในตารางสำหรับส่งออก');
      return;
    }

    // CSV Headers
    const headers = [
      'เลขที่ธุรกรรม',
      'ประเภท',
      'รหัสเวชภัณฑ์',
      'ชื่อเวชภัณฑ์',
      'จำนวน',
      'หน่วยนับ',
      'วันที่บันทึกรายการ',
      ' Lot No / เลขล็อต',
      'ผู้ขาย หรือ แผนกที่เบิก',
      'ผู้เบิก / เลขที่ใบส่งของ',
      'ผู้รับผิดชอบ (Operator)',
      'วัตถุประสงค์ / หมายเหตุ',
      'ลิงก์เอกสารอ้างอิง',
    ];

    // Build row values
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.type === 'in' ? 'นำเข้าสต็อก (Stock In)' : 'เบิกจ่ายออก (Stock Out)',
      t.medicine_code,
      t.medicine_name,
      t.quantity,
      t.unit,
      t.date,
      t.lot_no || '-',
      t.supplier_or_dept,
      t.document_no || '-',
      t.operator,
      t.note_or_purpose || '-',
      t.file_url || '-',
    ]);

    // Construct CSV String
    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Add UTF-8 BOM (\uFEFF) to make Thai characters display properly in MS Excel
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const nowStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `PharmaStock_History_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('ส่งออกข้อมูล CSV เรียบร้อยแล้ว');
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
            <History className="w-8 h-8 text-emerald-500" />
            ประวัติธุรกรรมเดินคลังยา
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ตรวจสอบข้อมูลนำเข้าและเบิกจ่ายรายวัน กรองผลลัพธ์ย้อนหลัง และดาวน์โหลดรายงาน
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-slate-200 font-bold px-5 py-3 rounded-2xl shadow-lg transition-all duration-200 cursor-pointer text-sm"
        >
          <Download className="w-5 h-5 text-emerald-400" />
          <span>ดาวน์โหลดรายงาน (CSV)</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-950/40 border border-slate-800 p-4 rounded-3xl">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหายา, เลขธุรกรรม, หน่วยงาน, หรือผู้ทำรายการ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Transaction Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">ประเภทธุรกรรมทั้งหมด</option>
          <option value="in">เฉพาะการนำเข้า (Stock In)</option>
          <option value="out">เฉพาะการเบิกจ่าย (Stock Out)</option>
        </select>

        {/* Start Date */}
        <div className="relative">
          <input
            type="date"
            placeholder="ตั้งแต่วันที่"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
          />
          <span className="absolute top-1.5 right-3 text-slate-600 pointer-events-none">
            {/* Display Calendar icon indicator */}
          </span>
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            placeholder="ถึงวันที่"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table Container */}
      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          กำลังดาวน์โหลดประวัติเดินคลัง...
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-4 px-6">เลขที่รายการ</th>
                  <th className="py-4 px-6">ประเภท</th>
                  <th className="py-4 px-6">ชื่อเวชภัณฑ์ / รหัส</th>
                  <th className="py-4 px-6 text-right">จำนวน</th>
                  <th className="py-4 px-6">หน่วยนับ</th>
                  <th className="py-4 px-6">ผู้ขาย / แผนกผู้เบิก</th>
                  <th className="py-4 px-6">ผู้เบิก / คนไข้</th>
                  <th className="py-4 px-6">วันบันทึกรายการ</th>
                  <th className="py-4 px-6">ผู้ทำรายการ</th>
                  <th className="py-4 px-6 text-center">ไฟล์อ้างอิง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 px-6 text-center text-slate-500 font-medium">
                      ไม่พบประวัติข้อมูลตรงตามเงื่อนไขที่กำหนด
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/30 transition-colors whitespace-nowrap">
                      <td className="py-4 px-6 font-bold text-slate-400 font-mono text-xs">
                        {t.id}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          t.type === 'in'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {t.type === 'in' ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                              <span>รับเข้า</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-rose-400" />
                              <span>จ่ายออก</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-white block">{t.medicine_name}</span>
                        <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">{t.medicine_code}</span>
                      </td>
                      <td className={`py-4 px-6 text-right font-extrabold text-base ${t.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'in' ? '+' : '-'}{t.quantity}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-bold text-xs uppercase">
                        {t.unit}
                      </td>
                      <td className="py-4 px-6 text-slate-300 font-bold text-xs">
                        {t.supplier_or_dept}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        <span className="font-bold text-slate-300 block">{t.document_no || '-'}</span>
                        {t.type === 'out' && t.hn && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold mt-1">
                            HN: {t.hn} {patientMap.get(t.hn.trim().toLowerCase()) ? `(${patientMap.get(t.hn.trim().toLowerCase())})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {new Date(t.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs font-semibold">
                        {t.operator}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {t.file_url ? (
                          <a
                            href={t.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all duration-200"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>ดูไฟล์</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-800/60">
            {filteredTransactions.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-500 font-medium">
                ไม่พบประวัติข้อมูลตรงตามเงื่อนไขที่กำหนด
              </div>
            ) : (
              filteredTransactions.map((t) => (
                <div key={t.id} className="p-5 flex flex-col gap-4 bg-slate-900/10">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">เลขที่รายการ {t.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border mt-1 self-start ${
                        t.type === 'in'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {t.type === 'in' ? (
                          <>
                            <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-400" />
                            <span>รับเข้า</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-2.5 h-2.5 text-rose-400" />
                            <span>จ่ายออก</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-right text-slate-400 text-xs font-medium flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {new Date(t.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Medicine Name and Code */}
                  <div>
                    <span className="font-extrabold text-white block text-base leading-snug">{t.medicine_name}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block font-mono">รหัสเวชภัณฑ์: {t.medicine_code}</span>
                  </div>

                  {/* Card Info Grid */}
                  <div className="grid grid-cols-2 gap-4 mt-1 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/40">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">จำนวน / หน่วยนับ</span>
                      <span className={`text-base font-extrabold mt-1 ${t.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'in' ? '+' : '-'}{t.quantity} <span className="text-xs text-slate-400 font-semibold">{t.unit}</span>
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ผู้ขาย / แผนกผู้เบิก</span>
                      <span className="text-slate-300 text-xs mt-1 leading-normal font-bold">{t.supplier_or_dept}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ผู้เบิกจ่าย / อ้างอิง</span>
                      <span className="text-slate-300 text-xs mt-1 font-bold">{t.document_no || <span className="text-slate-600">-</span>}</span>
                    </div>

                    {t.type === 'out' && t.hn && (
                      <div className="flex flex-col col-span-2 pt-2 border-t border-slate-800/40">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ผู้รับบริการ (คนไข้)</span>
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs mt-1 font-bold">
                          <User className="w-3.5 h-3.5" />
                          {t.hn} {patientMap.get(t.hn.trim().toLowerCase()) ? `(${patientMap.get(t.hn.trim().toLowerCase())})` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ผู้ทำรายการ</span>
                      <span className="text-slate-300 text-xs mt-1 font-semibold flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {t.operator}
                      </span>
                    </div>
                  </div>

                  {/* File Attachment Link */}
                  {t.file_url ? (
                    <div className="mt-1 pt-1">
                      <a
                        href={t.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span>ดูไฟล์อ้างอิง</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
