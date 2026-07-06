'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  ClipboardList,
  Calendar,
  MapPin,
  User,
  X,
  ShieldAlert,
  Clock,
  BriefcaseMedical,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

interface Patient {
  hn: string;
  name: string;
  age: number;
  allergy: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  type: string;
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  quantity: number;
  unit: string;
  date: string;
  operator: string;
  note_or_purpose: string;
  supplier_or_dept: string;
  document_no: string;
  created_at: string;
  hn?: string;
}

export default function PatientsPage() {
  const { data: session } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [historyPage, setHistoryPage] = useState(1);
  const historyItemsPerPage = 5;

  async function fetchData() {
    try {
      setLoading(true);
      const [patRes, txRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/transactions'),
      ]);

      if (patRes.ok && txRes.ok) {
        const patData = await patRes.json();
        const txData = await txRes.json();
        setPatients(patData);
        // Only keep Stock Out transactions (type = 'out') that have a valid HN
        setTransactions(txData.filter((t: Transaction) => t.type === 'out' && t.hn));
      } else {
        toast.error('ล้มเหลวในการดาวน์โหลดข้อมูลผู้ป่วยหรือประวัติการเบิกยา');
      }
    } catch (error) {
      console.error('Error fetching patient logs:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Export Individual Patient Drug History to Excel
  const handleExportPatientExcel = () => {
    if (!activePatient) return;
    
    const sheetName = 'ประวัติรับยาผู้ป่วย';
    const reportTitle = 'รายงานประวัติการรับยาผู้ป่วยรายบุคคล';
    const subTitle = 'ระบบบริหารจัดการยาและคลังเวชภัณฑ์ (Central Pharmacy Stock)';
    
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
          .title { font-size: 14px; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 10px; color: #475569; }
          .meta-box { border: 1px solid #cbd5e1; background-color: #f8fafc; font-size: 10px; }
          .meta-label { font-weight: bold; color: #475569; }
          .meta-val { color: #0f172a; font-weight: bold; }
          .allergy-warn { background-color: #fdf2f2; color: #b91c1c; font-weight: bold; font-size: 10px; border: 1px solid #fecaca; }
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

          <!-- Patient Meta Information -->
          <tr class="meta-box">
            <td class="meta-label">ชื่อผู้ป่วย:</td>
            <td class="meta-val">${activePatient.name}</td>
            <td class="meta-label">หมายเลข HN:</td>
            <td class="meta-val" style="mso-number-format:'\\@';">${activePatient.hn}</td>
            <td class="meta-label">อายุ:</td>
            <td class="meta-val">${activePatient.age} ปี</td>
          </tr>
          ${activePatient.allergy && activePatient.allergy.trim() !== 'ไม่มี' ? `
            <tr class="allergy-warn">
              <td class="meta-label">ประวัติแพ้ยา:</td>
              <td colspan="5">${activePatient.allergy}</td>
            </tr>
          ` : ''}
          <tr>
            <td class="meta-label" style="font-size:9px; color:#64748b;">ผู้จัดพิมพ์:</td>
            <td colspan="2" style="font-size:9px; color:#0f172a;">${session?.user?.name || 'เจ้าหน้าที่คลังยา'}</td>
            <td class="meta-label" style="font-size:9px; color:#64748b;">วันที่พิมพ์:</td>
            <td colspan="2" style="font-size:9px; color:#0f172a;">${new Date().toLocaleDateString('th-TH')}</td>
          </tr>

          <tr><td colspan="6" style="border:none;"></td></tr>

          <!-- Table Header -->
          <thead>
            <tr>
              <th style="width: 120px;">วันที่รับยา</th>
              <th style="width: 100px;">รหัสยา</th>
              <th style="width: 250px;">ชื่อเวชภัณฑ์ยา</th>
              <th style="width: 80px; text-align: right;">จำนวน</th>
              <th style="width: 60px;">หน่วย</th>
              <th style="width: 180px;">แผนกผู้รับเบิก</th>
            </tr>
          </thead>
          
          <!-- Table Body -->
          <tbody>
            ${activePatientTransactions.length === 0 ? `
              <tr>
                <td colspan="6" class="text-center" style="color: #64748b;">ไม่มีประวัติการเบิกจ่ายยาระบุถึงผู้ป่วยรายนี้</td>
              </tr>
            ` : activePatientTransactions.map((tx, idx) => `
              <tr class="${idx % 2 === 0 ? '' : 'zebra'}">
                <td class="text-center">
                  ${new Date(tx.date).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td class="text-center" style="mso-number-format:'\\@';">${tx.medicine_code}</td>
                <td style="font-weight: bold;">${tx.medicine_name}</td>
                <td class="text-right" style="font-weight: bold;">${tx.quantity.toLocaleString()}</td>
                <td class="text-center">${tx.unit}</td>
                <td>${tx.supplier_or_dept || '-'}</td>
              </tr>
            `).join('')}
          </tbody>

          <tr><td colspan="6" style="border:none;"></td></tr>
          <tr><td colspan="6" style="border:none;"></td></tr>

          <!-- Signatures Block -->
          <tr>
            <td colspan="3" class="text-center signature-label" style="border:none; border-top:1px dashed #cbd5e1; padding-top:15px;">
              ผู้รายงาน / ผู้จัดทำเอกสาร
            </td>
            <td colspan="3" class="text-center signature-label" style="border:none; border-top:1px dashed #cbd5e1; padding-top:15px;">
              ผู้สอบทาน / หัวหน้าแผนก
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
              ( ${session?.user?.name || '...........................................'} )
            </td>
            <td colspan="3" class="text-center" style="border:none;">
              ( ........................................................................ )
            </td>
          </tr>
          <tr>
            <td colspan="3" class="text-center" style="border:none; font-size: 9px; color: #64748b;">
              ตำแหน่ง เจ้าหน้าที่บันทึกจ่ายเวชภัณฑ์ยา
            </td>
            <td colspan="3" class="text-center" style="border:none; font-size: 9px; color: #64748b;">
              ตำแหน่ง หัวหน้างานเภสัชกรรมคลังกลาง
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
    link.setAttribute('download', `ประวัติรับยา_${activePatient.name}_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('ส่งออกไฟล์ Excel สำเร็จ');
  };

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset history page when active patient changes
  useEffect(() => {
    setHistoryPage(1);
  }, [activePatient]);

  const openHistoryModal = (patient: Patient) => {
    setActivePatient(patient);
    setIsHistoryModalOpen(true);
  };

  // Filter patients by HN or Name
  const filteredPatients = patients.filter((pat) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      pat.name.toLowerCase().includes(query) ||
      pat.hn.toLowerCase().includes(query)
    );
  });

  // Main Pagination calculation
  const totalItems = filteredPatients.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

  // Filter transactions for active patient
  const activePatientTransactions = activePatient
    ? transactions.filter((t) => t.hn?.trim().toLowerCase() === activePatient.hn.trim().toLowerCase())
    : [];

  // History Pagination calculation
  const historyTotalItems = activePatientTransactions.length;
  const historyTotalPages = Math.max(1, Math.ceil(historyTotalItems / historyItemsPerPage));
  const historyStartIndex = (historyPage - 1) * historyItemsPerPage;
  const historyEndIndex = historyStartIndex + historyItemsPerPage;
  const paginatedHistoryTransactions = activePatientTransactions.slice(historyStartIndex, historyEndIndex);

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

  return (
    <div className="space-y-6">
      {/* Dynamic Printing Style Block */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.2cm;
          }
          /* Hide all screen-only elements */
          .no-print,
          aside,
          header,
          button,
          nav,
          .modal-screen {
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

          .print-patient-report {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0.5cm 0 !important;
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
          }/* Patient Meta Info Box */
          .print-meta-box {
            display: grid !important;
            grid-template-cols: repeat(3, 1fr) !important;
            gap: 15px !important;
            margin-bottom: 15px !important;
            border: 1px solid #e2e8f0 !important;
            padding: 8px 15px !important;
            background-color: #f8fafc !important;
            border-radius: 6px !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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

      {/* Screen layout wrapper (hidden during print) */}
      <div className="no-print space-y-6">
        {/* Header Panel */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          ประวัติการรับยาของผู้ป่วย (Patient Drug History)
        </h1>
        <p className="text-sm text-slate-400 mt-1 pl-13">
          ตรวจสอบรายชื่อผู้ป่วย ค้นหาประวัติการรับจ่ายยา และรายละเอียดการเบิกยาแยกตามรายบุคคล
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl max-w-xl">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อผู้ป่วย หรือ หมายเลข HN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Content View (Table on PC, Cards on Mobile) */}
      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          กำลังดาวน์โหลดฐานข้อมูลผู้ป่วย...
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 text-sm">
          ไม่พบข้อมูลผู้ป่วยในระบบการเบิกจ่าย
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          {/* PC Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-4 px-6">หมายเลข HN</th>
                  <th className="py-4 px-6">ชื่อ-นามสกุล</th>
                  <th className="py-4 px-6">อายุ</th>
                  <th className="py-4 px-6">ประวัติแพ้ยา</th>
                  <th className="py-4 px-6 text-center">จำนวนครั้งที่รับยา</th>
                  <th className="py-4 px-6">อัปเดตล่าสุด</th>
                  <th className="py-4 px-6 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {paginatedPatients.map((pat) => {
                  const hasAllergy = pat.allergy && pat.allergy.trim() !== 'ไม่มี';
                  const patTxCount = transactions.filter(t => t.hn?.trim().toLowerCase() === pat.hn.trim().toLowerCase()).length;
                  return (
                    <tr key={pat.hn} className="hover:bg-slate-900/30 transition-colors whitespace-nowrap">
                      <td className="py-4 px-6 font-bold text-emerald-400 font-mono text-xs">
                        {pat.hn}
                      </td>
                      <td className="py-4 px-6 font-extrabold text-white">
                        {pat.name}
                      </td>
                      <td className="py-4 px-6 text-slate-350 font-bold">
                        {pat.age} ปี
                      </td>
                      <td className="py-4 px-6">
                        <span className={`font-bold inline-flex items-center gap-1 ${
                          hasAllergy ? 'text-rose-400 animate-pulse' : 'text-slate-400'
                        }`}>
                          {hasAllergy ? (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              {pat.allergy}
                            </>
                          ) : (
                            'ไม่มี'
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-slate-300 font-bold">
                        {patTxCount} ครั้ง
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {new Date(pat.updated_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openHistoryModal(pat)}
                          className="inline-flex items-center gap-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-bold px-3.5 py-1.5 rounded-xl text-xs hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>ดูประวัติ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden p-4">
            <div className="grid grid-cols-1 gap-4">
              {paginatedPatients.map((pat) => {
                const hasAllergy = pat.allergy && pat.allergy.trim() !== 'ไม่มี';
                const patTxCount = transactions.filter(t => t.hn?.trim().toLowerCase() === pat.hn.trim().toLowerCase()).length;

                return (
                  <div
                    key={pat.hn}
                    className="bg-slate-900/30 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-md hover:border-slate-700/80 transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                            <User className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-emerald-400 font-mono tracking-wider">
                              {pat.hn}
                            </span>
                            <h4 className="font-extrabold text-white text-sm truncate max-w-[150px]" title={pat.name}>
                              {pat.name}
                            </h4>
                          </div>
                        </div>
                        <span className="text-xs bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-lg text-slate-400 font-bold">
                          อายุ {pat.age} ปี
                        </span>
                      </div>

                      <div className="bg-slate-950/20 p-3 rounded-2xl border border-slate-900/60 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold">จำนวนครั้งที่รับยา</span>
                          <span className="text-slate-200 font-bold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {patTxCount} ครั้ง
                          </span>
                        </div>

                        <div className="flex justify-between items-start pt-1.5 border-t border-slate-900/40">
                          <span className="text-slate-500 font-semibold shrink-0 mt-0.5">ประวัติแพ้ยา</span>
                          <span className={`font-bold text-right truncate max-w-[150px] ${
                            hasAllergy ? 'text-rose-400 flex items-center gap-1 animate-pulse' : 'text-slate-400'
                          }`}>
                            {hasAllergy ? (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                {pat.allergy}
                              </>
                            ) : (
                              'ไม่มี'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-600 font-semibold">
                        อัปเดตล่าสุด: {new Date(pat.updated_at).toLocaleDateString('th-TH')}
                      </span>
                      <button
                        onClick={() => openHistoryModal(pat)}
                        className="flex items-center gap-1 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-bold px-3.5 py-1.5 rounded-xl text-xs hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>ดูประวัติ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Table Pagination */}
          <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-medium">
              แสดง {startIndex + 1} ถึง {Math.min(endIndex, totalItems)} จาก {totalItems} รายชื่อผู้ป่วย
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
                title="ก่อนหน้า"
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
                title="ถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      </div> {/* Close no-print screen layout */}

      {/* History Modal */}
      {isHistoryModalOpen && activePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 no-print">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0 bg-slate-950/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    ประวัติผู้ป่วย: <span className="text-emerald-400 font-extrabold">{activePatient.name}</span>
                  </h3>
                  <span className="block text-[10px] font-mono text-slate-400 font-semibold mt-0.5">
                    HN: {activePatient.hn} • อายุ {activePatient.age} ปี
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {/* Allergy Warning Alert if patient has allergies */}
              {activePatient.allergy && activePatient.allergy.trim() !== 'ไม่มี' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-rose-300 text-sm leading-relaxed">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <span className="font-extrabold block text-rose-400 text-base">คำเตือน: ผู้ป่วยมีประวัติการแพ้ยา!</span>
                    <span className="block mt-1 font-semibold">แพ้ยา: {activePatient.allergy}</span>
                  </div>
                </div>
              )}

              {/* Transactions Logs table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                  <BriefcaseMedical className="w-4 h-4 text-emerald-400" />
                  รายการยาที่ได้รับเบิกจ่ายออกไป ({historyTotalItems} รายการ)
                </h4>

                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
                  {/* Desktop view */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                          <th className="py-3 px-5">วันที่รับยา</th>
                          <th className="py-3 px-5">ชื่อยา / รหัส</th>
                          <th className="py-3 px-5 text-right">จำนวน</th>
                          <th className="py-3 px-5">แผนกผู้เบิก</th>
                          <th className="py-3 px-5">ผู้เบิกยา (เจ้าหน้าที่)</th>
                          <th className="py-3 px-5">ผู้บันทึก (LOG IN)</th>
                          <th className="py-3 px-5">วัตถุประสงค์</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-xs">
                        {paginatedHistoryTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 px-5 text-center text-slate-500 font-medium">
                              ไม่มีประวัติการเบิกจ่ายยาระบุถึงผู้ป่วยรายนี้
                            </td>
                          </tr>
                        ) : (
                          paginatedHistoryTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-900/20 text-slate-300 transition-colors whitespace-nowrap">
                              <td className="py-3.5 px-5">
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  {new Date(tx.date).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </td>
                              <td className="py-3.5 px-5">
                                <span className="block text-[10px] font-bold text-emerald-400 font-mono">{tx.medicine_code}</span>
                                <span className="font-bold text-white block mt-0.5 truncate max-w-[180px]">{tx.medicine_name}</span>
                              </td>
                              <td className="py-3.5 px-5 text-right font-black text-white text-sm">
                                {tx.quantity} <span className="text-[10px] text-slate-500 font-bold uppercase">{tx.unit}</span>
                              </td>
                              <td className="py-3.5 px-5">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  {tx.supplier_or_dept || '-'}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-400 font-medium">
                                {tx.document_no || 'ไม่ระบุ'}
                              </td>
                              <td className="py-3.5 px-5 text-slate-400 font-medium">
                                {tx.operator || 'ไม่ระบุ'}
                              </td>
                              <td className="py-3.5 px-5 text-slate-400 text-[11px] truncate max-w-[150px]" title={tx.note_or_purpose}>
                                {tx.note_or_purpose || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile responsive view */}
                  <div className="block md:hidden divide-y divide-slate-850">
                    {paginatedHistoryTransactions.length === 0 ? (
                      <div className="py-12 px-5 text-center text-slate-500 text-xs">
                        ไม่มีประวัติการเบิกจ่ายยาระบุถึงผู้ป่วยรายนี้
                      </div>
                    ) : (
                      paginatedHistoryTransactions.map((tx) => (
                        <div key={tx.id} className="p-4 space-y-3 bg-slate-900/10">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-emerald-400 font-mono block">{tx.medicine_code}</span>
                              <h5 className="font-extrabold text-white text-sm mt-0.5">{tx.medicine_name}</h5>
                            </div>
                            <span className="text-base font-black text-white">
                              {tx.quantity} <span className="text-[10px] text-slate-500 font-bold uppercase">{tx.unit}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/20 p-3 rounded-xl border border-slate-900/50">
                            <div>
                              <span className="text-slate-500 block font-semibold">วันที่รับจ่าย</span>
                              <span className="text-slate-300 font-bold block mt-0.5">{tx.date}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-semibold">แผนกผู้รับ</span>
                              <span className="text-slate-300 block mt-0.5">{tx.supplier_or_dept || '-'}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-950/20">
                              <span className="text-slate-500 block font-semibold">ผู้เบิก / ผู้บันทึก (LOG IN)</span>
                              <span className="text-slate-400 block mt-0.5 leading-normal font-medium">
                                ผู้เบิก: {tx.document_no || 'ไม่ระบุ'} • ผู้บันทึก: {tx.operator || 'ไม่ระบุ'}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-950/20">
                              <span className="text-slate-500 block font-semibold">วัตถุประสงค์</span>
                              <span className="text-slate-400 block mt-0.5 leading-normal">
                                {tx.note_or_purpose || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Modal History Table Pagination */}
                {historyTotalPages > 1 && (
                  <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-950/20 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl">
                    <div className="text-[11px] text-slate-400 font-semibold">
                      แสดง {historyStartIndex + 1} ถึง {Math.min(historyEndIndex, historyTotalItems)} จาก {historyTotalItems} รายการยา
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setHistoryPage(prev => Math.max(prev - 1, 1))}
                        disabled={historyPage === 1}
                        className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {getPageNumbers(historyPage, historyTotalPages).map((p) => (
                        <button
                          key={p}
                          onClick={() => setHistoryPage(p)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                            historyPage === p
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        onClick={() => setHistoryPage(prev => Math.min(prev + 1, historyTotalPages))}
                        disabled={historyPage === historyTotalPages}
                        className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center shrink-0 no-print gap-3">
              <div className="flex items-center gap-2">
                {/* 
                <button
                  onClick={() => window.print()}
                  disabled={activePatientTransactions.length === 0}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all text-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์รายงาน (PDF)</span>
                </button>
                */}

                <button
                  onClick={handleExportPatientExcel}
                  disabled={activePatientTransactions.length === 0}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ส่งออก Excel</span>
                </button>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PRINT ONLY PATIENT REPORT ================= */}
      {activePatient && (
        <div className="hidden print-patient-report text-black">
          {/* Header */}
          <div className="flex justify-between items-center w-full border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-center gap-2">
              {/* SVG Medical Cross Emblem */}
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 10.5h-5.5V5a1.5 1.5 0 00-3 0v5.5H5a1.5 1.5 0 000 3h5.5V19a1.5 1.5 0 003 0v-5.5H19a1.5 1.5 0 000-3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-wide uppercase">รายงานประวัติการรับยาผู้ป่วยรายบุคคล</h1>
                <p className="text-[9px] font-bold text-gray-500">ระบบบริหารจัดการยาและคลังเวชภัณฑ์ (Central Pharmacy Stock)</p>
              </div>
            </div>
            
            <div className="text-right text-[9px] text-gray-500 space-y-0.5">
              <p>ผู้จัดพิมพ์รายงาน: {session?.user?.name || 'เจ้าหน้าที่คลังยา'}</p>
              <p>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {/* Patient Meta Info Box */}
          <div className="print-meta-box">
            <div>
              <span className="text-gray-500 block text-[9px] uppercase font-bold">ชื่อผู้ป่วย:</span>
              <span className="text-xs font-black text-slate-800">{activePatient.name}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[9px] uppercase font-bold">หมายเลข HN:</span>
              <span className="text-xs font-black text-slate-800 font-mono">{activePatient.hn}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[9px] uppercase font-bold">อายุ:</span>
              <span className="text-xs font-black text-slate-800">{activePatient.age} ปี</span>
            </div>
            {activePatient.allergy && activePatient.allergy.trim() !== 'ไม่มี' && (
              <div className="col-span-3 mt-1.5 pt-1.5 border-t border-rose-100 text-rose-700">
                <span className="text-[9px] font-bold uppercase block text-rose-500">ประวัติแพ้ยา (Allergies Warning):</span>
                <span className="text-xs font-black">{activePatient.allergy}</span>
              </div>
            )}
          </div>

          {/* Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>วันที่รับยา</th>
                <th style={{ width: '15%' }}>รหัสยา</th>
                <th style={{ width: '30%' }}>ชื่อเวชภัณฑ์ยา</th>
                <th style={{ width: '10%' }} className="text-right">จำนวน</th>
                <th style={{ width: '10%' }}>หน่วย</th>
                <th style={{ width: '20%' }}>แผนกผู้รับเบิก</th>
              </tr>
            </thead>
            <tbody>
              {activePatientTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6">ไม่มีประวัติการเบิกจ่ายยาระบุถึงผู้ป่วยรายนี้</td>
                </tr>
              ) : (
                activePatientTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      {new Date(tx.date).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="font-mono">{tx.medicine_code}</td>
                    <td className="font-extrabold">{tx.medicine_name}</td>
                    <td className="text-right font-bold">{tx.quantity.toLocaleString()}</td>
                    <td>{tx.unit}</td>
                    <td>{tx.supplier_or_dept || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="print-signatures text-xs font-semibold">
            <div className="w-[45%] text-center space-y-12">
              <p className="font-bold text-gray-700">ผู้รายงาน / ผู้จัดทำเอกสาร</p>
              <div className="space-y-2">
                <p>ลงชื่อ ........................................................................</p>
                <p className="text-gray-800 font-extrabold">( {session?.user?.name || '...........................................'} )</p>
                <p className="text-gray-500 text-[10px]">ตำแหน่ง เจ้าหน้าที่บันทึกจ่ายเวชภัณฑ์ยา</p>
              </div>
            </div>

            <div className="w-[45%] text-center space-y-12">
              <p className="font-bold text-gray-700">ผู้สอบทาน / หัวหน้าแผนก</p>
              <div className="space-y-2">
                <p>ลงชื่อ ........................................................................</p>
                <p className="text-gray-450">( ........................................................................ )</p>
                <p className="text-gray-500 text-[10px]">ตำแหน่ง หัวหน้างานเภสัชกรรมคลังกลาง</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
