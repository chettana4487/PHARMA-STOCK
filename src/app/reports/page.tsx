'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  FileText,
  Calendar,
  Printer,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  FileCheck,
  TrendingUp,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

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
  lot_no: string;
  supplier_or_dept: string;
  document_no: string;
  file_url: string;
  created_at: string;
  hn: string;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Default dates: Start of current month to today
  const defaultStartDate = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };
  const defaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // State Filters
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [txType, setTxType] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  async function fetchTransactions() {
    try {
      setLoading(true);
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      } else {
        toast.error('ล้มเหลวในการโหลดข้อมูลประวัติเดินคลัง');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      fetchTransactions();
    }
  }, [status, router]);

  // Handle refresh
  const handleRefresh = () => {
    fetchTransactions();
    toast.success('อัปเดตข้อมูลเสร็จสิ้น');
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel
  const handleExportExcel = () => {
    const sheetName = 'รายงานการเดินคลังยา';
    const reportTitle = 'รายงานประวัติธุรกรรมคลังเวชภัณฑ์ยา';
    const subTitle = 'ระบบบริหารจัดการสต็อกยาส่วนกลาง (Central Pharmacy Stock System)';
    
    // Prepare HTML content for Excel
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
          .title { font-size: 16px; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 11px; color: #475569; }
          .meta-label { font-weight: bold; color: #475569; font-size: 10px; }
          .meta-val { color: #0f172a; font-size: 10px; }
          .summary-card { background-color: #f8fafc; border: 1px solid #cbd5e1; font-weight: bold; font-size: 10px; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 11px; border: 1px solid #94a3b8; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-emerald { color: #15803d; font-weight: bold; }
          .text-rose { color: #be123c; font-weight: bold; }
          .zebra { background-color: #f8fafc; }
          .signature-label { font-weight: bold; color: #334155; font-size: 11px; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="8" class="title">${reportTitle}</td>
          </tr>
          <tr>
            <td colspan="8" class="subtitle">${subTitle}</td>
          </tr>
          <tr><td colspan="8" style="border:none;"></td></tr>
          
          <!-- Metadata Info -->
          <tr>
            <td class="meta-label">ช่วงเวลารายงาน:</td>
            <td colspan="3" class="meta-val">${formatDateThai(startDate)} ถึง ${formatDateThai(endDate)}</td>
            <td class="meta-label">ประเภทการกรอง:</td>
            <td colspan="3" class="meta-val">
              ${txType === 'all' ? 'ทั้งหมด (นำเข้า & เบิกจ่าย)' : txType === 'in' ? 'นำเข้าเวชภัณฑ์' : 'เบิกจ่ายเวชภัณฑ์'}
            </td>
          </tr>
          <tr>
            <td class="meta-label">ผู้พิมพ์รายงาน:</td>
            <td colspan="3" class="meta-val">${reportCreator}</td>
            <td class="meta-label">ออก ณ วันที่:</td>
            <td colspan="3" class="meta-val">${new Date().toLocaleDateString('th-TH')}</td>
          </tr>
          
          <tr><td colspan="8" style="border:none;"></td></tr>

          <!-- Summary Box -->
          <tr class="summary-card">
            <td colspan="2">จำนวนครั้งนำเข้า: ${totalInTransactions} รายการ</td>
            <td colspan="2">ปริมาณนำเข้ารวม: +${totalInQty.toLocaleString()}</td>
            <td colspan="2">จำนวนครั้งเบิกจ่าย: ${totalOutTransactions} รายการ</td>
            <td colspan="2">ปริมาณเบิกจ่ายรวม: -${totalOutQty.toLocaleString()}</td>
          </tr>
          
          <tr><td colspan="8" style="border:none;"></td></tr>

          <!-- Table Header -->
          <thead>
            <tr>
              <th style="width: 120px;">วัน/เวลาบันทึก</th>
              <th style="width: 100px;">เลขที่รายการ</th>
              <th style="width: 100px;">ประเภท</th>
              <th style="width: 250px;">ชื่อเวชภัณฑ์ (รหัส)</th>
              <th style="width: 80px; text-align: right;">จำนวน</th>
              <th style="width: 60px;">หน่วย</th>
              <th style="width: 180px;">ผู้เบิก / ผู้ขาย</th>
              <th style="width: 200px;">วัตถุประสงค์ / ล็อต</th>
            </tr>
          </thead>
          
          <!-- Table Body -->
          <tbody>
            ${filteredTransactions.map((t, idx) => `
              <tr class="${idx % 2 === 0 ? '' : 'zebra'}">
                <td class="text-center">${formatDateThai(t.date)}</td>
                <td class="text-center" style="mso-number-format:'\\@';">${t.id}</td>
                <td class="text-center ${t.type === 'in' ? 'text-emerald' : 'text-rose'}">
                  ${t.type === 'in' ? 'รับเข้า (IN)' : 'เบิกออก (OUT)'}
                </td>
                <td>
                  <strong>${t.medicine_name}</strong><br/>
                  <span style="color:#64748b; font-size:9px; mso-number-format:'\\@';">${t.medicine_code}</span>
                </td>
                <td class="text-right ${t.type === 'in' ? 'text-emerald' : 'text-rose'}">
                  ${t.type === 'in' ? '+' : '-'}${t.quantity.toLocaleString()}
                </td>
                <td class="text-center">${t.unit}</td>
                <td>
                  ${t.type === 'in' ? (t.supplier_or_dept || '-') : (t.document_no || '-')}
                  ${t.type === 'out' && t.hn ? `<br/><span style="color:#059669; font-size:9px;">HN: ${t.hn}</span>` : ''}
                </td>
                <td>
                  ${t.type === 'in' ? (t.lot_no ? `Lot: ${t.lot_no}` : '-') : (t.note_or_purpose || '-')}
                </td>
              </tr>
            `).join('')}
          </tbody>

          <tr><td colspan="8" style="border:none;"></td></tr>
          <tr><td colspan="8" style="border:none;"></td></tr>

          <!-- Signatures Block -->
          <tr>
            <td colspan="4" class="text-center signature-label" style="border:none; border-top:1px dashed #cbd5e1; padding-top:15px;">
              ผู้จัดทำรายงาน
            </td>
            <td colspan="4" class="text-center signature-label" style="border:none; border-top:1px dashed #cbd5e1; padding-top:15px;">
              ผู้ตรวจสอบ / ผู้อนุมัติรายงาน
            </td>
          </tr>
          <tr>
            <td colspan="4" class="text-center" style="border:none; height: 50px; vertical-align: bottom;">
              ลงชื่อ ........................................................................
            </td>
            <td colspan="4" class="text-center" style="border:none; height: 50px; vertical-align: bottom;">
              ลงชื่อ ........................................................................
            </td>
          </tr>
          <tr>
            <td colspan="4" class="text-center" style="border:none; font-weight: bold;">
              ( ${reportCreator} )
            </td>
            <td colspan="4" class="text-center" style="border:none;">
              ( ........................................................................ )
            </td>
          </tr>
          <tr>
            <td colspan="4" class="text-center" style="border:none; font-size: 9px; color: #64748b;">
              ตำแหน่ง เจ้าหน้าที่งานบริหารเวชภัณฑ์คลังยา
            </td>
            <td colspan="4" class="text-center" style="border:none; font-size: 9px; color: #64748b;">
              ตำแหน่ง หัวหน้างานเภสัชกรรมคลังเวชภัณฑ์กลาง
            </td>
          </tr>
          <tr>
            <td colspan="4" class="text-center" style="border:none; font-size: 9px; color: #64748b;">
              วันที่ออกรายงาน : ${new Date().toLocaleDateString('th-TH')}
            </td>
            <td colspan="4" class="text-center" style="border:none; font-size: 9px; color: #64748b;">
              วันที่อนุมัติ : ...... / ...... / ......
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
    link.setAttribute('download', `รายงานการเดินคลังยา_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('ส่งออกไฟล์ Excel สำเร็จ');
  };

  // Filtered transactions logic
  const filteredTransactions = transactions.filter((t) => {
    // 1. Date Range check
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;

    // 2. Transaction Type check
    if (txType !== 'all' && t.type !== txType) return false;

    // 3. Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = t.id.toLowerCase().includes(q);
      const matchCode = t.medicine_code.toLowerCase().includes(q);
      const matchName = t.medicine_name.toLowerCase().includes(q);
      const matchOperator = t.operator.toLowerCase().includes(q);
      const matchDoc = t.document_no.toLowerCase().includes(q);
      const matchSupplier = t.supplier_or_dept.toLowerCase().includes(q);
      const matchPurpose = t.note_or_purpose.toLowerCase().includes(q);

      return (
        matchId ||
        matchCode ||
        matchName ||
        matchOperator ||
        matchDoc ||
        matchSupplier ||
        matchPurpose
      );
    }

    return true;
  });

  // Calculations for dashboard
  const totalInTransactions = filteredTransactions.filter((t) => t.type === 'in').length;
  const totalOutTransactions = filteredTransactions.filter((t) => t.type === 'out').length;

  const totalInQty = filteredTransactions
    .filter((t) => t.type === 'in')
    .reduce((sum, t) => sum + t.quantity, 0);

  const totalOutQty = filteredTransactions
    .filter((t) => t.type === 'out')
    .reduce((sum, t) => sum + t.quantity, 0);

  // Format Date Helper
  const formatDateThai = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper for current user name
  const reportCreator = session?.user?.name || session?.user?.email || 'เจ้าหน้าที่ผู้รายงาน';

  if (status === 'loading' || (loading && transactions.length === 0)) {
    return (
      <div className="flex-1 bg-slate-950 p-6 lg:p-8 flex items-center justify-center min-h-[70vh]">
        <div className="text-center text-slate-400 space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="text-sm font-medium tracking-wide">กำลังเตรียมข้อมูลรายงาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 min-h-screen print:min-h-0 print:bg-white print:text-black">
      {/* Dynamic Printing Style Block */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.2cm;
          }
          /* Hide sidebar, filter sections, scroll elements and buttons */
          .print-hidden,
          aside,
          header,
          button,
          nav,
          .no-print {
            display: none !important;
          }

          /* Force body default light scheme and occupy full screen page width */
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Sarabun', 'Inter', sans-serif !important;
            font-size: 10px !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Expand main container layout */
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0.5cm 0 !important;
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }

          /* Formal Document Header elements */
          .print-header {
            display: block !important;
            margin-bottom: 12px !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 8px !important;
          }

          /* Force stats summaries into clean boxes for prints */
          .print-summary-box {
            display: grid !important;
            grid-template-cols: repeat(4, 1fr) !important;
            gap: 15px !important;
            margin-bottom: 15px !important;
            border: 1px solid #e2e8f0 !important;
            padding: 6px 15px !important;
            background-color: #f8fafc !important;
            border-radius: 6px !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-summary-item {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 5px !important;
          }

          /* Table print styling */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            margin-top: 15px !important;
            margin-bottom: 40px !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          tr:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          thead {
            display: table-header-group !important;
          }
          th, td {
            white-space: normal !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
          }
          th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            border: 1px solid #0f172a !important;
            padding: 8px 10px !important;
            text-align: left !important;
            font-size: 9px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px 10px !important;
            color: #334155 !important;
            font-weight: 500 !important;
            font-size: 9px !important;
          }

          /* Force wrapper divs to visible overflow during printing */
          .print-container div {
            overflow: visible !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: none !important;
          }

          /* Signatures printed footer */
          .print-signatures {
            display: flex !important;
            justify-content: space-between !important;
            position: relative !important;
            margin-top: 50px !important;
            page-break-inside: avoid !important;
            border-top: 1px dashed #cbd5e1 !important;
            padding-top: 25px !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 print-container">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-5 no-print">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/20">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-wide">รายงานการเดินคลังยา</h1>
                <p className="text-xs text-slate-400 mt-0.5">จัดพิมพ์เอกสารรายงานสรุปรายการนำเข้า-เบิกจ่ายในแต่ละช่วงเวลา</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl border border-slate-850 hover:border-slate-700 transition-all text-sm shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-4.5 h-4.5" />
              <span>รีเฟรช</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredTransactions.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-950/20 transition-all text-sm cursor-pointer no-print"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              <span>ส่งออก Excel</span>
            </button>

            {/* 
            <button
              onClick={handlePrint}
              disabled={filteredTransactions.length === 0}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-950/20 transition-all text-sm cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5" />
              <span>พิมพ์รายงาน (PDF)</span>
            </button>
            */}
          </div>
        </div>

        {/* ================= PRINT ONLY FORMAL HEADER ================= */}
        <div className="hidden print-header text-black">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              {/* SVG Medical Cross Emblem */}
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10.5h-5.5V5a1.5 1.5 0 00-3 0v5.5H5a1.5 1.5 0 000 3h5.5V19a1.5 1.5 0 003 0v-5.5H19a1.5 1.5 0 000-3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-wide uppercase">รายงานประวัติธุรกรรมคลังเวชภัณฑ์ยา</h1>
                <p className="text-[9px] font-bold text-gray-500">ระบบบริหารจัดการสต็อกยาส่วนกลาง (Central Pharmacy Stock System)</p>
              </div>
            </div>
            
            <div className="text-right text-[9px] text-gray-500 space-y-0.5">
              <p className="font-extrabold text-slate-800">ช่วงเวลารายงาน: {formatDateThai(startDate)} ถึง {formatDateThai(endDate)}</p>
              <p>ประเภทการกรอง: {txType === 'all' ? 'ทั้งหมด (นำเข้า & เบิกจ่าย)' : txType === 'in' ? 'นำเข้าคลัง' : 'เบิกจ่ายออกจากคลัง'}</p>
              <p>ผู้พิมพ์รายงาน: {reportCreator} • ออก ณ วันที่: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>
        </div>

        {/* ================= FILTER PANEL (NO PRINT) ================= */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 shadow-md space-y-4 no-print">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            ตัวกรองรายงาน
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">วันที่เริ่ม</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">วันที่สิ้นสุด</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>
            </div>

            {/* Tx Type */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">ประเภทรายการ</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="all">ทั้งหมด (นำเข้า & เบิกจ่าย)</option>
                <option value="in">รับเข้าสต็อก (Stock In)</option>
                <option value="out">เบิกจ่ายออก (Stock Out)</option>
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1.5">ค้นหาคำสำคัญ</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ชื่อยา, เลขธุรกรรม, ผู้บันทึก..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm placeholder-slate-650 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ================= SUMMARY STATS (SCREEN VIEW / PRINT VIEW) ================= */}
        {/* Screen Summary (Premium style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
          {/* Card 1: Total Inward transactions */}
          <div className="bg-slate-900/20 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">จำนวนครั้งนำเข้า</span>
              <span className="text-2xl font-black text-white block">{totalInTransactions} <span className="text-xs text-slate-400 font-bold">รายการ</span></span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Inward quantity */}
          <div className="bg-slate-900/20 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">ปริมาณนำเข้ารวม</span>
              <span className="text-2xl font-black text-emerald-400 block">+{totalInQty.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Total Outward transactions */}
          <div className="bg-slate-900/20 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">จำนวนครั้งเบิกจ่าย</span>
              <span className="text-2xl font-black text-white block">{totalOutTransactions} <span className="text-xs text-slate-400 font-bold">รายการ</span></span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Total Outward quantity */}
          <div className="bg-slate-900/20 border border-slate-850 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">ปริมาณเบิกจ่ายรวม</span>
              <span className="text-2xl font-black text-rose-400 block">-{totalOutQty.toLocaleString()}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Printable Summary Layout */}
        <div className="hidden print:grid grid-cols-4 gap-4 border border-slate-200 bg-slate-50/50 rounded-xl p-3 mb-4 print-summary-box text-black text-xs font-semibold">
          <div className="print-summary-item flex print:flex items-center print:items-center gap-1.5 print:gap-1.5">
            <span className="text-gray-500 text-[9px] font-bold">จำนวนครั้งนำเข้า:</span>
            <span className="text-[10px] font-black text-slate-800">{totalInTransactions} รายการ</span>
          </div>
          <div className="print-summary-item flex print:flex items-center print:items-center gap-1.5 print:gap-1.5">
            <span className="text-gray-500 text-[9px] font-bold">ปริมาณนำเข้ารวม:</span>
            <span className="text-[10px] font-black text-emerald-700">+{totalInQty.toLocaleString()}</span>
          </div>
          <div className="print-summary-item flex print:flex items-center print:items-center gap-1.5 print:gap-1.5">
            <span className="text-gray-500 text-[9px] font-bold">จำนวนครั้งเบิกจ่าย:</span>
            <span className="text-[10px] font-black text-slate-800">{totalOutTransactions} รายการ</span>
          </div>
          <div className="print-summary-item flex print:flex items-center print:items-center gap-1.5 print:gap-1.5">
            <span className="text-gray-500 text-[9px] font-bold">ปริมาณเบิกจ่ายรวม:</span>
            <span className="text-[10px] font-black text-rose-700">-{totalOutQty.toLocaleString()}</span>
          </div>
        </div>

        {/* ================= TRANSACTION TABLE ================= */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl overflow-hidden shadow-lg">
          {/* Main report table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] text-slate-400 font-black uppercase tracking-wider whitespace-nowrap print:bg-gray-100 print:text-black">
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[13%]">วัน/เวลาบันทึก</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[11%]">เลขที่รายการ</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[11%]">ประเภท</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[24%]">ชื่อเวชภัณฑ์ (รหัส)</th>
                  <th className="py-4 px-6 text-right print:py-2 print:px-3 print:text-right print:w-[8%]">จำนวน</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[7%]">หน่วย</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[13%]">ผู้เบิก / ผู้ขาย</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:hidden">ผู้บันทึก (Operator)</th>
                  <th className="py-4 px-6 print:py-2 print:px-3 print:w-[13%]">วัตถุประสงค์ / ล็อต</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-xs text-slate-350 print:divide-y print:divide-black">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 px-6 text-center text-slate-500 font-medium print:text-black">
                      ไม่มีรายการเดินคลังอยู่ในช่วงเวลาที่เลือกหรือคำค้นหาไม่ถูกต้อง
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/20 transition-colors whitespace-nowrap print:hover:bg-transparent">
                      {/* Date */}
                      <td className="py-4 px-6 font-semibold print:py-2 print:px-3">
                        {formatDateThai(t.date)}
                      </td>
                      {/* Transaction ID */}
                      <td className="py-4 px-6 font-bold text-slate-400 font-mono text-[11px] print:py-2 print:px-3 print:text-black">
                        {t.id}
                      </td>
                      {/* Type */}
                      <td className="py-4 px-6 print:py-2 print:px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border print:border-none print:bg-transparent print:p-0 print:text-[10px] ${
                          t.type === 'in'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 print:text-emerald-700'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 print:text-red-700'
                        }`}>
                          {t.type === 'in' ? 'รับเข้า (IN)' : 'เบิกออก (OUT)'}
                        </span>
                      </td>
                      {/* Medicine Name / Code */}
                      <td className="py-4 px-6 print:py-2 print:px-3">
                        <span className="font-extrabold text-slate-200 block truncate max-w-[200px] print:text-black print:max-w-none print:whitespace-normal">
                          {t.medicine_name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 block font-mono mt-0.5 print:text-gray-600">
                          {t.medicine_code}
                        </span>
                      </td>
                      {/* Quantity */}
                      <td className={`py-4 px-6 text-right font-black text-sm print:py-2 print:px-3 print:text-right ${
                        t.type === 'in' ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-red-700'
                      }`}>
                        {t.type === 'in' ? '+' : '-'}{t.quantity.toLocaleString()}
                      </td>
                      {/* Unit */}
                      <td className="py-4 px-6 text-slate-400 font-medium print:py-2 print:px-3 print:text-black">
                        {t.unit}
                      </td>
                      {/* Supplier or Requester */}
                      <td className="py-4 px-6 text-slate-300 font-bold print:py-2 print:px-3 print:text-black">
                        {/* If in, show supplier_or_dept (Supplier). If out, show document_no (Requester). */}
                        {t.type === 'in' ? (t.supplier_or_dept || '-') : (t.document_no || '-')}
                        {t.type === 'out' && t.hn && (
                          <span className="block text-[9px] font-bold text-emerald-500/80 mt-0.5 print:text-emerald-800">
                            HN: {t.hn}
                          </span>
                        )}
                      </td>
                      {/* Operator (hidden in A4 print to preserve space) */}
                      <td className="py-4 px-6 text-slate-400 text-[11px] font-semibold print:hidden">
                        {t.operator || 'ไม่ระบุ'}
                      </td>
                      {/* Lot / Purpose */}
                      <td className="py-4 px-6 text-slate-400 text-[11px] truncate max-w-[150px] print:py-2 print:px-3 print:text-black print:max-w-none print:whitespace-normal">
                        {t.type === 'in' 
                          ? (t.lot_no ? `Lot: ${t.lot_no}` : '-')
                          : (t.note_or_purpose || '-')
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      {/* ================= PRINT ONLY SIGNATURES BLOCK ================= */}
      <div className="hidden print-signatures text-black text-xs font-semibold">
        <div className="w-[45%] text-center space-y-12">
          <p className="font-bold text-gray-700">ผู้จัดทำรายงาน</p>
          <div className="space-y-2">
            <p>ลงชื่อ ........................................................................</p>
            <p className="text-gray-800 font-extrabold">( {reportCreator} )</p>
            <p className="text-gray-500 text-[10px]">ตำแหน่ง เจ้าหน้าที่งานบริหารเวชภัณฑ์คลังยา</p>
            <p className="text-gray-500 text-[10px]">วันที่ออกรายงาน : {new Date().toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        <div className="w-[45%] text-center space-y-12">
          <p className="font-bold text-gray-700">ผู้ตรวจสอบ / ผู้อนุมัติรายงาน</p>
          <div className="space-y-2">
            <p>ลงชื่อ ........................................................................</p>
            <p className="text-gray-450">( ........................................................................ )</p>
            <p className="text-gray-500 text-[10px]">ตำแหน่ง หัวหน้างานเภสัชกรรมคลังเวชภัณฑ์กลาง</p>
            <p className="text-gray-500 text-[10px]">วันที่อนุมัติ : ...... / ...... / ......</p>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
