'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  ArrowDownLeft,
  Pill,
  FileText,
  Truck,
  UploadCloud,
  File,
  X,
  Plus,
  Loader2,
  CheckCircle,
} from 'lucide-react';

interface Medicine {
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  category: string;
  unit: string;
  current_stock: number;
}

export default function StockInPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    medicine_id: '',
    lot_no: '',
    quantity: '',
    unit: '',
    expire_date: '',
    received_date: new Date().toISOString().split('T')[0], // Default today
    supplier: '',
    document_no: '',
  });

  const role = session?.user?.role || 'viewer';
  const isWritable = role === 'admin' || role === 'staff';

  async function fetchMedicines() {
    try {
      setLoading(true);
      const res = await fetch('/api/medicines');
      if (res.ok) {
        const data = await res.json();
        setMedicines(data);
        if (data.length > 0) {
          // Initialize selection
          setFormData((prev) => ({
            ...prev,
            medicine_id: data[0].medicine_id,
            unit: data[0].unit,
          }));
        }
      } else {
        toast.error('ล้มเหลวในการดึงข้อมูลยา');
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isWritable) {
      toast.error('ขออภัย เฉพาะฝ่ายผู้ตรวจรับคลังหรือแอดมินเท่านั้นที่บันทึกข้อมูลได้');
      router.push('/');
      return;
    }
    fetchMedicines();
  }, [isWritable, router]);

  const handleMedicineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const medId = e.target.value;
    const selectedMed = medicines.find((m) => m.medicine_id === medId);
    setFormData((prev) => ({
      ...prev,
      medicine_id: medId,
      unit: selectedMed ? selectedMed.unit : '',
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์ห้ามเกิน 5MB');
      return;
    }

    setUploadingFile(true);
    setFileName(file.name);

    const data = new FormData();
    data.append('file', file);

    try {
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: data,
      });

      const result = await res.json();
      if (res.ok) {
        setFileUrl(result.url);
        toast.success('อัปโหลดไฟล์ไป Google Drive สำเร็จ');
      } else {
        toast.error(result.error || 'ล้มเหลวในการอัปโหลดไฟล์');
        setFileName('');
        setFileUrl('');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่ออัปโหลด');
      setFileName('');
      setFileUrl('');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeFile = () => {
    setFileName('');
    setFileUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.medicine_id || !formData.lot_no || !formData.quantity || !formData.received_date) {
      toast.error('กรุณากรอกข้อมูลหลักให้ครบถ้วน');
      return;
    }

    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('จำนวนนำเข้าต้องมากกว่า 0');
      return;
    }

    const toastId = toast.loading('กำลังบันทึกประวัตินำเข้าคลังและปรับสต็อก...');

    try {
      const res = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: qty,
          file_url: fileUrl,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('นำเข้าคลังยาเสร็จสมบูรณ์ ปรับเพิ่มจำนวนยอดคลังแล้ว', { id: toastId });
        
        // Reset Form
        setFormData({
          medicine_id: medicines[0]?.medicine_id || '',
          lot_no: '',
          quantity: '',
          unit: medicines[0]?.unit || '',
          expire_date: '',
          received_date: new Date().toISOString().split('T')[0],
          supplier: '',
          document_no: '',
        });
        removeFile();
        
        router.refresh();
      } else {
        toast.error(result.error || 'บันทึกไม่สำเร็จ', { id: toastId });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('มีข้อผิดพลาดทางเทคนิคในการเชื่อมต่อ', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          บันทึกนำเข้าคลังยา (Stock In)
        </h1>
        <p className="text-sm text-slate-400 mt-1 pl-13">
          บันทึกยอดรับยาเข้าคลังจากซัพพลายเออร์ พร้อมแนบเอกสารใบเสร็จหรือล็อตการรับสินค้า
        </p>
      </div>

      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          กำลังดาวน์โหลดรายการยา...
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          ไม่พบรายการยาทีี่ลงทะเบียนในระบบ กรุณาไปเพิ่มยาในเมนู &quot;จัดการยา&quot; ก่อน
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-500" />
                ข้อมูลเวชภัณฑ์ยาที่รับเข้า
              </h2>

              {/* Medicine Select */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">เลือกรายการยา *</label>
                <select
                  name="medicine_id"
                  value={formData.medicine_id}
                  onChange={handleMedicineChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {medicines.map((med) => (
                    <option key={med.medicine_id} value={med.medicine_id}>
                      [{med.medicine_code}] {med.medicine_name} (คงเหลือ: {med.current_stock} {med.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lot Number */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">เลขล็อตสินค้า (Lot No.) *</label>
                  <input
                    type="text"
                    name="lot_no"
                    required
                    placeholder="เช่น LOT69-012"
                    value={formData.lot_no}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">จำนวนที่รับเข้า *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="quantity"
                      required
                      min="1"
                      placeholder="ป้อนตัวเลข..."
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-bold"
                    />
                    <input
                      type="text"
                      name="unit"
                      disabled
                      placeholder="หน่วย"
                      value={formData.unit}
                      className="w-24 bg-slate-900/60 border border-slate-800 text-center text-sm rounded-xl py-2.5 text-slate-400 font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Expiration date */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">วันหมดอายุ (Expiry Date)</label>
                  <input
                    type="date"
                    name="expire_date"
                    value={formData.expire_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Received date */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">วันที่ตรวจรับเข้า *</label>
                  <input
                    type="date"
                    name="received_date"
                    required
                    value={formData.received_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                รายละเอียดผู้จัดจำหน่ายและเอกสาร
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Supplier */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ผู้ขาย / ซัพพลายเออร์</label>
                  <input
                    type="text"
                    name="supplier"
                    placeholder="ชื่อบริษัทผู้ผลิตหรือผู้แทนจำหน่าย"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Document Number */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">เลขที่เอกสารแนบ / ใบส่งของ</label>
                  <input
                    type="text"
                    name="document_no"
                    placeholder="เช่น INV-2026-009"
                    value={formData.document_no}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Upload Side panel */}
          <div className="space-y-6">
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-500" />
                  เอกสารประกอบการนำเข้า
                </h2>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  แนบไฟล์รูปถ่ายกล่องยา ล็อตสินค้า ใบเสร็จ หรือใบส่งของเพื่ออัปโหลดเก็บไว้ใน Google Drive ของหน่วยงาน (รองรับ PDF, PNG, JPG ขนาดไม่เกิน 5MB)
                </p>

                {/* File Upload Zone */}
                {!fileUrl && !uploadingFile && (
                  <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-colors text-center relative group">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-2 group-hover:scale-110 transition-transform duration-200" />
                    <span className="block text-xs text-slate-400 font-bold mb-1">คลิกหรือลากไฟล์วางเพื่ออัปโหลด</span>
                    <span className="text-[10px] text-slate-600">PDF, PNG, JPG สูงสุด 5MB</span>
                  </div>
                )}

                {/* Uploading progress indicator */}
                {uploadingFile && (
                  <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-6 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs font-semibold text-slate-300">กำลังอัปโหลดไฟล์ขึ้น Google Drive...</p>
                    <p className="text-[10px] text-slate-500 truncate mt-1">{fileName}</p>
                  </div>
                )}

                {/* Upload complete state */}
                {fileUrl && (
                  <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 bg-emerald-600/20 text-emerald-400 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <File className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-white truncate">{fileName}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
                          <CheckCircle className="w-3 h-3" />
                          อัปโหลดสำเร็จ
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-950/20 hover:-translate-y-0.5 disabled:-translate-y-0 transition-all duration-200 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>บันทึกการรับเข้า</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
