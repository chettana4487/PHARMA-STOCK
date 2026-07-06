'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  ArrowUpRight,
  Pill,
  ShieldAlert,
  UserCheck,
  ClipboardList,
  Minus,
  Camera,
} from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

interface Medicine {
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  category: string;
  unit: string;
  current_stock: number;
  location: string;
  expire_date: string;
}

export default function StockOutPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    medicine_id: '',
    quantity: '',
    unit: '',
    department: '',
    requester: '',
    purpose: '',
    issued_date: new Date().toISOString().split('T')[0], // Default today
  });

  // Re-open scanner if needed
  useEffect(() => {
    const handleReopen = () => {
      setIsScannerOpen(true);
    };
    window.addEventListener('reopen-scanner', handleReopen);
    return () => window.removeEventListener('reopen-scanner', handleReopen);
  }, []);

  const handleScanBarcodeSuccess = (decodedBarcode: string) => {
    setIsScannerOpen(false);
    
    const code = decodedBarcode.trim().toLowerCase();
    const matched = medicines.find(
      (m) => m.medicine_code.trim().toLowerCase() === code
    );
    
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        medicine_id: matched.medicine_id,
        unit: matched.unit,
      }));
      toast.success(`เลือกยา: [${matched.medicine_code}] ${matched.medicine_name} สำเร็จ`);
    } else {
      toast.error(`ไม่พบรหัสยา/บาร์โค้ด "${decodedBarcode}" ในระบบ`);
    }
  };

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
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isWritable) {
      toast.error('เฉพาะฝ่ายจัดการคลังหรือแอดมินเท่านั้นที่สามารถจ่ายเวชภัณฑ์ได้');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.medicine_id || !formData.quantity || !formData.department || !formData.requester || !formData.issued_date) {
      toast.error('กรุณากรอกข้อมูลหลักให้ครบถ้วน');
      return;
    }

    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('จำนวนจ่ายยาต้องมากกว่า 0');
      return;
    }

    const selectedMed = medicines.find((m) => m.medicine_id === formData.medicine_id);
    if (!selectedMed) return;

    if (qty > selectedMed.current_stock) {
      toast.error('ยอดจ่ายมากกว่าสต็อกคงคลังที่มีอยู่จริง');
      return;
    }

    const toastId = toast.loading('กำลังบันทึกข้อมูลเบิกจ่ายและหักยอดสต็อก...');

    try {
      const res = await fetch('/api/stock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: qty,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('ทำรายการเบิกจ่ายและหักยอดคลังสำเร็จแล้ว', { id: toastId });
        
        // Reset form but retain defaults
        setFormData({
          medicine_id: medicines[0]?.medicine_id || '',
          quantity: '',
          unit: medicines[0]?.unit || '',
          department: '',
          requester: '',
          purpose: '',
          issued_date: new Date().toISOString().split('T')[0],
        });
        
        fetchMedicines(); // Refresh stock numbers locally
        router.refresh();
      } else {
        toast.error(result.error || 'บันทึกไม่สำเร็จ', { id: toastId });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', { id: toastId });
    }
  };

  const selectedMed = medicines.find((m) => m.medicine_id === formData.medicine_id);
  const currentStock = selectedMed ? selectedMed.current_stock : 0;
  const isOutOfStock = currentStock === 0;
  
  const reqQty = Number(formData.quantity);
  const isStockInsufficient = reqQty > currentStock;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          บันทึกเบิกจ่ายยา (Stock Out)
        </h1>
        <p className="text-sm text-slate-400 mt-1 pl-13">
          บันทึกการเบิกจ่ายเวชภัณฑ์ยาออกจากคลังส่วนกลางไปยังแผนกต่างๆ และหักลบยอดสต็อกอัตโนมัติ
        </p>
      </div>

      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 animate-pulse">
          กำลังดาวน์โหลดรายการยา...
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          ไม่พบรายการยาทีี่ลงทะเบียนในระบบ กรุณาลงทะเบียนยาที่เมนู &quot;จัดการยา&quot; ก่อน
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <Pill className="w-5 h-5 text-rose-500" />
                ระบุรายการเวชภัณฑ์ยา
              </h2>

              {/* Medicine Select */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-extrabold text-slate-400">เลือกรายการยา *</label>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>สแกนบาร์โค้ดเพื่อเลือก</span>
                  </button>
                </div>
                <select
                  name="medicine_id"
                  value={formData.medicine_id}
                  onChange={handleMedicineChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-rose-500 font-bold"
                >
                  {medicines.map((med) => (
                    <option key={med.medicine_id} value={med.medicine_id}>
                      [{med.medicine_code}] {med.medicine_name} (คงเหลือ: {med.current_stock} {med.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">จำนวนที่ต้องการเบิก *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="quantity"
                      required
                      min="1"
                      placeholder="ป้อนตัวเลข..."
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-900 border text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none font-bold ${
                        isStockInsufficient ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-rose-500'
                      }`}
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
                  {isStockInsufficient && (
                    <span className="block text-[11px] text-rose-400 font-bold mt-1.5 animate-pulse">
                      * ยอดเบิกเกินยอดสต็อกคงคลัง (คงเหลือในคลัง {currentStock} {formData.unit})
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="block text-[11px] text-rose-500 font-bold mt-1.5">
                      * เวชภัณฑ์นี้หมดสต็อกชั่วคราว
                    </span>
                  )}
                </div>

                {/* Issued date */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">วันที่ต้องการเบิกจ่าย *</label>
                  <input
                    type="date"
                    name="issued_date"
                    required
                    value={formData.issued_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
              <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-rose-500" />
                รายละเอียดผู้ขอเบิกและวัตถุประสงค์
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">แผนกที่นำไปใช้ (Department) *</label>
                  <select
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-rose-500"
                  >
                    <option value="">-- เลือกแผนกผู้เบิก --</option>
                    <option value="แผนกผู้ป่วยนอก (OPD)">แผนกผู้ป่วยนอก (OPD)</option>
                    <option value="แผนกผู้ป่วยใน (IPD)">แผนกผู้ป่วยใน (IPD)</option>
                    <option value="แผนกฉุกเฉิน (ER)">แผนกฉุกเฉิน (ER)</option>
                    <option value="หออภิบาลผู้ป่วยหนัก (ICU)">หออภิบาลผู้ป่วยหนัก (ICU)</option>
                    <option value="ห้องผ่าตัด (OR)">ห้องผ่าตัด (OR)</option>
                    <option value="ห้องทันตกรรม">ห้องทันตกรรม</option>
                    <option value="แผนกเภสัชกรรม (กระจายยา)">แผนกเภสัชกรรม (กระจายยา)</option>
                  </select>
                </div>

                {/* Requester */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ชื่อผู้เบิก / เจ้าหน้าที่รับผิดชอบ *</label>
                  <input
                    type="text"
                    name="requester"
                    required
                    placeholder="ระบุชื่อและนามสกุลเจ้าหน้าที่"
                    value={formData.requester}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">วัตถุประสงค์ในการเบิกใช้</label>
                <input
                  type="text"
                  name="purpose"
                  placeholder="ระบุเหตุผล เช่น เติมสต็อกวอร์ดประจำสัปดาห์, ใช้เฉพาะเคสคนไข้ฉุกเฉิน"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Preview Panel */}
          <div className="space-y-6">
            <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col justify-between h-full">
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white tracking-wide border-b border-slate-800/80 pb-3 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-rose-500" />
                  สรุปรายละเอียดเชลฟ์ยา
                </h2>

                {selectedMed ? (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-500 font-semibold">ชื่อทางการยา</span>
                      <span className="text-slate-300 font-bold">{selectedMed.medicine_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-500 font-semibold">รหัสทางการคลัง</span>
                      <span className="text-slate-300 font-mono font-bold text-emerald-400">{selectedMed.medicine_code}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-500 font-semibold">หมวดหมู่กลุ่มยา</span>
                      <span className="text-slate-300 font-bold">{selectedMed.category}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-500 font-semibold">ตำแหน่งจัดเก็บ (Shelf)</span>
                      <span className="text-slate-300 font-bold">{selectedMed.location || 'ไม่ได้ระบุ'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-2">
                      <span className="text-slate-500 font-semibold">วันหมดอายุหน้ายา</span>
                      <span className="text-slate-300 font-bold">
                        {selectedMed.expire_date ? new Date(selectedMed.expire_date).toLocaleDateString('th-TH') : 'ไม่ได้ระบุ'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-500 font-semibold text-sm">คลังคงเหลือสูงสุด</span>
                      <span className="text-sm font-black text-emerald-400">{currentStock} {selectedMed.unit}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">เลือกยาเพื่อตรวจสอบข้อมูลคลัง</p>
                )}

                {isStockInsufficient && (
                  <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex gap-2 text-rose-300 text-[11px] leading-relaxed">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>ไม่สามารถทำรายการจ่ายยอดยาได้เนื่องจากสต็อกคลังกลางไม่เพียงพอ กรุณาสั่งตรวจรับเข้าคลังก่อน</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isStockInsufficient || isOutOfStock || !formData.department}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-rose-950/20 hover:-translate-y-0.5 disabled:-translate-y-0 transition-all duration-200 cursor-pointer"
                >
                  <Minus className="w-5 h-5" />
                  <span>บันทึกการเบิกจ่าย</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Barcode Scanner Modal component */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanBarcodeSuccess}
      />
    </div>
  );
}
