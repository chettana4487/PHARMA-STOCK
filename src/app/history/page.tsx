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
  ChevronLeft,
  ChevronRight,
  X,
  ClipboardList
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

interface GroupedTransaction {
  id: string;
  type: 'in' | 'out';
  date: string;
  operator: string;
  supplier_or_dept: string;
  document_no: string;
  hn?: string;
  patient_name?: string;
  file_url?: string;
  created_at: string;
  items: Array<{
    medicine_id: string;
    medicine_code: string;
    medicine_name: string;
    quantity: number;
    unit: string;
    note_or_purpose: string;
    lot_no?: string;
  }>;
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<GroupedTransaction | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, startDate, endDate, selectedOperator]);

  const patientMap = React.useMemo(() => new Map(patients.map(p => [p.hn.trim().toLowerCase(), p.name])), [patients]);

  const getBaseTransactionId = (id: string): string => {
    const match = id.match(/^OUT(\d+)(-\d+)?$/i);
    if (match) {
      return `OUT${match[1]}`;
    }
    return id;
  };

  // Group raw transactions by base transaction ID
  const groupedTransactions = React.useMemo(() => {
    const map = new Map<string, GroupedTransaction>();

    transactions.forEach((t) => {
      const baseId = getBaseTransactionId(t.id);
      const patientName = t.hn ? patientMap.get(t.hn.trim().toLowerCase()) || '' : '';

      if (!map.has(baseId)) {
        map.set(baseId, {
          id: baseId,
          type: t.type,
          date: t.date,
          operator: t.operator,
          supplier_or_dept: t.supplier_or_dept,
          document_no: t.document_no || '',
          hn: t.hn,
          patient_name: patientName,
          file_url: t.file_url,
          created_at: t.created_at,
          items: []
        });
      }

      const grp = map.get(baseId)!;
      grp.items.push({
        medicine_id: t.medicine_id,
        medicine_code: t.medicine_code,
        medicine_name: t.medicine_name,
        quantity: t.quantity,
        unit: t.unit,
        note_or_purpose: t.note_or_purpose,
        lot_no: t.lot_no
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [transactions, patientMap]);

  // Extract all unique requesters (for Stock Out) and operators (recorders)
  const peopleList = React.useMemo(() => {
    return Array.from(
      new Set([
        ...transactions.filter(t => t.type === 'out').map(t => t.document_no?.trim()),
        ...transactions.map(t => t.operator?.trim())
      ])
    ).filter(Boolean).filter(name => name !== '-' && name !== 'ไม่ระบุ').sort() as string[];
  }, [transactions]);

  // Filter application
  const filteredTransactions = React.useMemo(() => {
    return groupedTransactions.filter((gt) => {
      const matchesSearch =
        gt.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gt.supplier_or_dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gt.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (gt.hn && gt.hn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (gt.patient_name && gt.patient_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        gt.items.some(item => 
          item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.medicine_code.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesType = selectedType === 'all' || gt.type === selectedType;

      let matchesDate = true;
      if (gt.date) {
        const transDate = new Date(gt.date).getTime();
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

      const matchesOperator =
        selectedOperator === 'all' ||
        gt.operator === selectedOperator ||
        gt.document_no === selectedOperator;

      return matchesSearch && matchesType && matchesDate && matchesOperator;
    });
  }, [groupedTransactions, searchQuery, selectedType, startDate, endDate, selectedOperator]);

  // Pagination calculations
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Helper for generating range array
  const getPageNumbers = (current: number, total: number) => {
    const maxPageButtons = 5;
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxPageButtons - 1);
    if (end - start < maxPageButtons - 1) {
      start = Math.max(1, end - maxPageButtons + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

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
    const rows: any[][] = [];
    filteredTransactions.forEach((gt) => {
      gt.items.forEach((item) => {
        rows.push([
          gt.id,
          gt.type === 'in' ? 'นำเข้าสต็อก (Stock In)' : 'เบิกจ่ายออก (Stock Out)',
          item.medicine_code,
          item.medicine_name,
          item.quantity,
          item.unit,
          gt.date,
          item.lot_no || '-',
          gt.type === 'in' ? (gt.supplier_or_dept || '-') : '-',
          gt.document_no || '-',
          gt.operator,
          item.note_or_purpose || '-',
          gt.file_url || '-',
        ]);
      });
    });

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

  // Export single transaction details slip to Excel
  const handleExportSingleExcel = (gt: GroupedTransaction) => {
    const sheetName = `ธุรกรรม_${gt.id}`;
    const reportTitle = gt.type === 'in' 
      ? 'ใบสรุปรายการตรวจรับเวชภัณฑ์เข้าคลัง (Stock In Slip)'
      : 'ใบส่งมอบและเบิกจ่ายเวชภัณฑ์ยา (Stock Out Slip)';
    const subTitle = 'ระบบบริหารจัดการสต็อกยาส่วนกลาง (Central Pharmacy Stock System)';

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, sans-serif; }
          .title { font-size: 14px; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 10px; color: #475569; }
          .meta-box { border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 10px; }
          .meta-label { font-weight: bold; color: #475569; }
          .meta-val { color: #0f172a; font-weight: bold; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; border: 1px solid #94a3b8; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .zebra { background-color: #f8fafc; }
          .signature-label { font-weight: bold; color: #334155; font-size: 11px; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="6" class="title">${reportTitle}</td>
          </tr>
          <tr>
            <td colspan="6" class="subtitle">${subTitle}</td>
          </tr>
          <tr><td colspan="6" style="border:none;"></td></tr>

          <!-- Transaction Metadata -->
          <tr class="meta-box">
            <td class="meta-label">เลขที่ใบงาน/ธุรกรรม:</td>
            <td class="meta-val" style="mso-number-format:'\\@';">${gt.id}</td>
            <td class="meta-label">ประเภท:</td>
            <td class="meta-val">${gt.type === 'in' ? 'รับเข้าคลังยา (Stock In)' : 'จ่ายออกคลังยา (Stock Out)'}</td>
            <td class="meta-label">วันที่ดำเนินการ:</td>
            <td class="meta-val">
              ${new Date(gt.date).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </td>
          </tr>

          ${gt.type === 'out' ? `
            <tr class="meta-box">
              <td class="meta-label">ผู้เบิกเวชภัณฑ์:</td>
              <td class="meta-val">${gt.document_no}</td>
              <td class="meta-label">เบิกไปแผนก/หน่วยงาน:</td>
              <td class="meta-val">${gt.supplier_or_dept}</td>
              <td class="meta-label">วัตถุประสงค์:</td>
              <td class="meta-val">${gt.items[0]?.note_or_purpose || '-'}</td>
            </tr>
            ${gt.hn ? `
              <tr class="meta-box">
                <td class="meta-label">คนไข้รับการรักษา:</td>
                <td class="meta-val" colspan="2">HN: ${gt.hn} (${gt.patient_name || 'ผู้ป่วยรายใหม่'})</td>
                <td class="meta-label">ผู้บันทึก:</td>
                <td class="meta-val" colspan="2">${gt.operator}</td>
              </tr>
            ` : ''}
          ` : `
            <tr class="meta-box">
              <td class="meta-label">รับเข้าจาก (ผู้ขาย):</td>
              <td class="meta-val" colspan="2">${gt.supplier_or_dept || '-'}</td>
              <td class="meta-label">เลขที่เอกสารอ้างอิง:</td>
              <td class="meta-val" colspan="2" style="mso-number-format:'\\@';">${gt.document_no || '-'}</td>
            </tr>
            <tr class="meta-box">
              <td class="meta-label">ผู้บันทึกตรวจรับ:</td>
              <td class="meta-val" colspan="5">${gt.operator}</td>
            </tr>
          `}

          <tr><td colspan="6" style="border:none;"></td></tr>

          <!-- Items Table -->
          <thead>
            <tr>
              <th style="width: 100px;">รหัสเวชภัณฑ์</th>
              <th style="width: 250px;">รายการเวชภัณฑ์ยา</th>
              <th style="width: 100px; text-align: right;">จำนวนดำเนินการ</th>
              <th style="width: 80px;">หน่วยนับ</th>
              <th style="width: 150px;">เลขล็อต (Lot No.)</th>
              <th style="width: 150px;">หมายเหตุรายการ</th>
            </tr>
          </thead>
          <tbody>
            ${gt.items.map((item, idx) => `
              <tr class="${idx % 2 === 0 ? '' : 'zebra'}">
                <td class="text-center" style="mso-number-format:'\\@';">${item.medicine_code}</td>
                <td style="font-weight: bold;">${item.medicine_name}</td>
                <td class="text-right" style="font-weight: bold; color: ${gt.type === 'in' ? '#15803d' : '#be123c'};">
                  ${gt.type === 'in' ? '+' : '-'}${item.quantity.toLocaleString()}
                </td>
                <td class="text-center">${item.unit}</td>
                <td class="text-center" style="mso-number-format:'\\@';">${item.lot_no || '-'}</td>
                <td>${item.note_or_purpose || '-'}</td>
              </tr>
            `).join('')}
          </tbody>

          <tr><td colspan="6" style="border:none;"></td></tr>
          <tr><td colspan="6" style="border:none;"></td></tr>

          <!-- Signatures Section -->
          <tr>
            <td colspan="3" class="text-center signature-label" style="border:none; border-top:1px dashed #cbd5e1; padding-top:15px;">
              ผู้ส่งมอบ / ผู้ดำเนินการบันทึก
            </td>
            <td colspan="3" class="text-center signature-label" style="border:none; border-top:1px dashed #cbd5e1; padding-top:15px;">
              ผู้รับมอบ / ผู้ตรวจสอบรายงาน
            </td>
          </tr>
          <tr>
            <td colspan="3" class="text-center" style="border:none; height: 50px; vertical-align: bottom;">
              ลงชื่อ ........................................................................
            </td>
            <td colspan="3" class="text-center" style="border:none; height: 50px; vertical-align: bottom;">
              ลงชื่อ ........................................................................
            </td>
          </tr>
          <tr>
            <td colspan="3" class="text-center" style="border:none; font-weight: bold;">
              ( ${gt.operator} )
            </td>
            <td colspan="3" class="text-center" style="border:none;">
              ( ........................................................................ )
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ใบงานธุรกรรม_${gt.id}_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('ดาวน์โหลดรายงานธุรกรรมสำเร็จ');
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 bg-slate-950/40 border border-slate-800 p-4 rounded-3xl">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหายา, เลขธุรกรรม, หน่วยงาน..."
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

        {/* Operator Filter */}
        <select
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">ผู้เบิก / ผู้บันทึกทุกคน</option>
          {peopleList.map((person) => (
            <option key={person} value={person}>
              {person}
            </option>
          ))}
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
                  <th className="py-4 px-6">เลขที่ธุรกรรม</th>
                  <th className="py-4 px-6">ประเภท</th>
                  <th className="py-4 px-6">ผู้เบิก / ผู้ขาย / แผนก</th>
                  <th className="py-4 px-6">คนไข้รับยา</th>
                  <th className="py-4 px-6 text-center">จำนวนเวชภัณฑ์</th>
                  <th className="py-4 px-6">วันดำเนินการ</th>
                  <th className="py-4 px-6">ผู้บันทึก (LOG IN)</th>
                  <th className="py-4 px-6 text-center">เอกสาร/การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-6 text-center text-slate-500 font-medium">
                      ไม่พบประวัติข้อมูลตรงตามเงื่อนไขที่กำหนด
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((gt) => (
                    <tr key={gt.id} className="hover:bg-slate-900/30 transition-colors whitespace-nowrap">
                      <td className="py-4 px-6 font-bold text-slate-400 font-mono text-xs">
                        {gt.id}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          gt.type === 'in'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {gt.type === 'in' ? (
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
                      <td className="py-4 px-6 text-xs">
                        {gt.type === 'in' ? (
                          <>
                            <span className="font-extrabold text-white block">ผู้ขาย: {gt.supplier_or_dept || '-'}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">Ref No: {gt.document_no || '-'}</span>
                          </>
                        ) : (
                          <>
                            <span className="font-extrabold text-white block">ผู้เบิก: {gt.document_no || '-'}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">แผนก: {gt.supplier_or_dept || '-'}</span>
                          </>
                        )}
                      </td>
                      <td className="py-4 px-6 text-xs">
                        {gt.type === 'out' && gt.hn ? (
                          <>
                            <span className="font-bold text-emerald-400 block font-mono">{gt.hn}</span>
                            <span className="text-white font-semibold mt-0.5 block">{gt.patient_name || 'ผู้ป่วยรายใหม่'}</span>
                          </>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center text-xs font-bold text-slate-200">
                        {gt.items.length} รายการ
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {new Date(gt.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs font-semibold">
                        {gt.operator || 'ไม่ระบุ'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedTransaction(gt)}
                            className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all duration-200 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>ดูรายละเอียด</span>
                          </button>
                          
                          <button
                            onClick={() => handleExportSingleExcel(gt)}
                            className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all duration-200 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>ใบเบิก Excel</span>
                          </button>
                          
                          {gt.file_url && (
                            <a
                              href={gt.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 p-1 rounded-lg"
                              title="ดูไฟล์แนบ"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-800/60">
            {paginatedTransactions.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-500 font-medium">
                ไม่พบประวัติข้อมูลตรงตามเงื่อนไขที่กำหนด
              </div>
            ) : (
              paginatedTransactions.map((gt) => (
                <div key={gt.id} className="p-5 flex flex-col gap-4 bg-slate-900/10">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">เลขที่ธุรกรรม {gt.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border mt-1 self-start ${
                        gt.type === 'in'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {gt.type === 'in' ? (
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
                        {new Date(gt.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Details Summary */}
                  <div>
                    <span className="font-extrabold text-white block text-sm leading-snug">
                      {gt.type === 'in' ? `รับจาก: ${gt.supplier_or_dept}` : `ผู้เบิก: ${gt.document_no}`}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block font-mono">
                      มีเวชภัณฑ์ยาที่เบิกทั้งหมด {gt.items.length} รายการ
                    </span>
                  </div>

                  {/* Actions Grid */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTransaction(gt)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>ดูรายละเอียด ({gt.items.length})</span>
                    </button>
                    
                    <button
                      onClick={() => handleExportSingleExcel(gt)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>ใบเบิก Excel</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 font-medium">
                แสดง {startIndex + 1} ถึง {Math.min(endIndex, totalItems)} จาก {totalItems} รายการธุรกรรม
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {getPageNumbers(currentPage, totalPages).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      currentPage === p
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200 text-xs">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800/80 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                  <span>รายละเอียดใบธุรกรรมคลัง</span>
                  <span className="font-mono text-sm px-2 py-0.5 rounded-lg bg-slate-850 text-slate-400 border border-slate-800">
                    {selectedTransaction.id}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  ประเภทธุรกรรม: {selectedTransaction.type === 'in' ? 'รับเวชภัณฑ์เข้าสต็อก' : 'เบิกจ่ายเวชภัณฑ์ออกคลัง'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto text-xs font-medium">
              {/* Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">ข้อมูลการจัดทำเอกสาร</h4>
                  <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-2xl space-y-2 text-slate-350">
                    <div className="flex justify-between">
                      <span className="text-slate-500">ผู้จัดบันทึก:</span>
                      <span className="text-white font-bold">{selectedTransaction.operator || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">วันที่ทำรายการ:</span>
                      <span className="text-white font-bold">
                        {new Date(selectedTransaction.date).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    {selectedTransaction.type === 'in' ? 'ข้อมูลคู่ค้าผู้จำหน่าย' : 'ข้อมูลหน่วยงานผู้เบิก'}
                  </h4>
                  <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-2xl space-y-2 text-slate-350">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {selectedTransaction.type === 'in' ? 'ชื่อผู้ขาย/ร้านค้า:' : 'แผนกที่ขอเบิก:'}
                      </span>
                      <span className="text-white font-bold">{selectedTransaction.supplier_or_dept || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {selectedTransaction.type === 'in' ? 'เลขที่ใบกำกับ/Invoice:' : 'เจ้าหน้าที่ผู้เบิก:'}
                      </span>
                      <span className="text-white font-bold">{selectedTransaction.document_no || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Info (for Stock Out if present) */}
              {selectedTransaction.type === 'out' && selectedTransaction.hn && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">ข้อมูลผู้รับบริการ (คนไข้)</h4>
                  <div className="bg-slate-950/30 border border-slate-850 p-3.5 rounded-2xl space-y-2 text-slate-350">
                    <div className="flex justify-between">
                      <span className="text-slate-500">หมายเลข HN:</span>
                      <span className="text-emerald-400 font-mono font-bold">{selectedTransaction.hn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ชื่อผู้ป่วย:</span>
                      <span className="text-white font-bold">{selectedTransaction.patient_name || 'ผู้ป่วยรายใหม่'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  รายการยาทั้งหมดในธุรกรรม ({selectedTransaction.items.length} รายการ)
                </h4>
                <div className="border border-slate-800/80 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-400 font-bold border-b border-slate-800/80">
                        <th className="py-2.5 px-3">รหัส / ชื่อเวชภัณฑ์ยา</th>
                        <th className="py-2.5 px-3 text-right">จำนวน</th>
                        <th className="py-2.5 px-3 text-center">Lot / เลขล็อต</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {selectedTransaction.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/20">
                          <td className="py-2.5 px-3">
                            <span className="text-[9px] font-mono text-emerald-400 block">{item.medicine_code}</span>
                            <span className="text-white block mt-0.5 font-bold">{item.medicine_name}</span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-black text-sm ${
                            selectedTransaction.type === 'in' ? 'text-emerald-400' : 'text-rose-455'
                          }`}>
                            {selectedTransaction.type === 'in' ? '+' : '-'}{item.quantity.toLocaleString()} <span className="text-[10px] text-slate-500 uppercase font-bold">{item.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-[10px] font-mono text-slate-450">
                            {item.lot_no || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => handleExportSingleExcel(selectedTransaction)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer text-xs shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดใบเบิก (Excel)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
