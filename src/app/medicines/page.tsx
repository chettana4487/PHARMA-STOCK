'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  Pill,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  MapPin,
  Calendar,
  Camera,
} from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

interface Medicine {
  medicine_id: string;
  medicine_code: string;
  medicine_name: string;
  category: string;
  unit: string;
  manufacturer_id: string;
  manufacturer_name: string;
  min_stock: number;
  current_stock: number;
  location: string;
  expire_date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface Manufacturer {
  manufacturer_id: string;
  manufacturer_name: string;
}

export default function MedicinesPage() {
  const { data: session } = useSession();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedManufacturer, setSelectedManufacturer] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Wizard state for registering medicine
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [existingMatch, setExistingMatch] = useState<Medicine | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Form states
  const [activeMedicine, setActiveMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState({
    medicine_code: '',
    medicine_name: '',
    category: '',
    unit: '',
    manufacturer_id: '',
    min_stock: 0,
    location: '',
    expire_date: '',
    note: '',
  });

  // Listener to re-open scanner if there is a retry trigger from inside
  useEffect(() => {
    const handleReopen = () => {
      setIsScannerOpen(true);
    };
    window.addEventListener('reopen-scanner', handleReopen);
    return () => window.removeEventListener('reopen-scanner', handleReopen);
  }, []);

  const role = session?.user?.role || 'viewer';
  const isEditable = role === 'admin' || role === 'staff';
  const isAdmin = role === 'admin';

  async function fetchData() {
    try {
      setLoading(true);
      const [medRes, manRes] = await Promise.all([
        fetch('/api/medicines'),
        fetch('/api/manufacturers'),
      ]);

      if (medRes.ok && manRes.ok) {
        const medData = await medRes.json();
        const manData = await manRes.json();
        setMedicines(medData);
        setManufacturers(manData);
      } else {
        toast.error('ล้มเหลวในการดาวน์โหลดข้อมูลยาหรือผู้ผลิต');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('มีข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const getStatus = (med: Medicine) => {
    const stock = Number(med.current_stock) || 0;
    const min = Number(med.min_stock) || 0;

    if (med.expire_date) {
      const expireTime = new Date(med.expire_date).getTime();
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = Math.ceil((expireTime - todayStart) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) return { label: 'หมดอายุ', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      if (diffDays <= 30) return { label: 'ใกล้หมดอายุ (30 วัน)', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      if (diffDays <= 90) return { label: 'ใกล้หมดอายุ (90 วัน)', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    }

    if (stock === 0) return { label: 'สินค้าหมด', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    if (stock <= min) return { label: 'สต็อกต่ำ', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };

    return { label: 'ปกติ', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'min_stock' ? Number(value) : value,
    }));
  };

  const openAddModal = () => {
    setBarcodeQuery('');
    setExistingMatch(null);
    setRegStep(1);
    setFormData({
      medicine_code: '',
      medicine_name: '',
      category: '',
      unit: '',
      manufacturer_id: manufacturers[0]?.manufacturer_id || '',
      min_stock: 10,
      location: '',
      expire_date: '',
      note: '',
    });
    setIsAddModalOpen(true);
  };

  const handleVerifyBarcode = (codeToVerify: string) => {
    const code = codeToVerify.trim();
    if (!code) {
      toast.error('กรุณาระบุรหัสยาหรือสแกนบาร์โค้ด');
      return;
    }

    const matched = medicines.find(
      (m) => m.medicine_code.trim().toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      setExistingMatch(matched);
      setFormData({
        medicine_code: matched.medicine_code,
        medicine_name: matched.medicine_name,
        category: matched.category,
        unit: matched.unit,
        manufacturer_id: matched.manufacturer_id,
        min_stock: Number(matched.min_stock) || 0,
        location: matched.location,
        expire_date: matched.expire_date ? matched.expire_date.split('T')[0] : '',
        note: matched.note,
      });
      setRegStep(2);
      toast.success('พบข้อมูลยารหัสนี้ในระบบ คุณสามารถระบุหรือแก้ไขข้อมูลเพิ่มเติมได้');
    } else {
      setExistingMatch(null);
      setFormData({
        medicine_code: code,
        medicine_name: '',
        category: '',
        unit: '',
        manufacturer_id: manufacturers[0]?.manufacturer_id || '',
        min_stock: 10,
        location: '',
        expire_date: '',
        note: '',
      });
      setRegStep(2);
      toast.success('ไม่พบรหัสยานี้ในระบบ คุณสามารถใส่ข้อมูลด้วยตนเองเพื่อลงทะเบียนใหม่ได้');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicine_code || !formData.medicine_name || !formData.category || !formData.unit || !formData.manufacturer_id) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    const toastId = toast.loading('กำลังบันทึกข้อมูล...');
    try {
      let res;
      if (existingMatch) {
        res = await fetch(`/api/medicines/${existingMatch.medicine_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch('/api/medicines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      const result = await res.json();
      if (res.ok) {
        toast.success(existingMatch ? 'ปรับปรุงข้อมูลยาเรียบร้อยแล้ว' : 'ลงทะเบียนยาใหม่เรียบร้อยแล้ว', { id: toastId });
        setIsAddModalOpen(false);
        fetchData();
      } else {
        toast.error(result.error || 'ล้มเหลวในการบันทึกรายการยา', { id: toastId });
      }
    } catch (error) {
      console.error('Error saving medicine:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', { id: toastId });
    }
  };

  const openEditModal = (med: Medicine) => {
    setActiveMedicine(med);
    setFormData({
      medicine_code: med.medicine_code,
      medicine_name: med.medicine_name,
      category: med.category,
      unit: med.unit,
      manufacturer_id: med.manufacturer_id,
      min_stock: Number(med.min_stock) || 0,
      location: med.location,
      expire_date: med.expire_date ? med.expire_date.split('T')[0] : '', // Extract yyyy-mm-dd
      note: med.note,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMedicine) return;

    const toastId = toast.loading('กำลังอัปเดตข้อมูล...');
    try {
      const res = await fetch(`/api/medicines/${activeMedicine.medicine_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('แก้ไขข้อมูลยาเรียบร้อยแล้ว', { id: toastId });
        setIsEditModalOpen(false);
        setActiveMedicine(null);
        fetchData();
      } else {
        toast.error(result.error || 'ล้มเหลวในการอัปเดตรายการยา', { id: toastId });
      }
    } catch (error) {
      console.error('Error updating medicine:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', { id: toastId });
    }
  };

  const openDeleteModal = (med: Medicine) => {
    setActiveMedicine(med);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeMedicine) return;

    const toastId = toast.loading('กำลังลบข้อมูลยา...');
    try {
      const res = await fetch(`/api/medicines/${activeMedicine.medicine_id}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('ลบข้อมูลยาเรียบร้อยแล้ว', { id: toastId });
        setIsDeleteModalOpen(false);
        setActiveMedicine(null);
        fetchData();
      } else {
        toast.error(result.error || 'ล้มเหลวในการลบรายการยา', { id: toastId });
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล', { id: toastId });
    }
  };

  // Unique categories for filtering
  const categories = Array.from(new Set(medicines.map((m) => m.category))).filter(Boolean);

  // Filter calculations
  const filteredMedicines = medicines.filter((med) => {
    const matchesSearch =
      med.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.medicine_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
    const matchesManufacturer = selectedManufacturer === 'all' || med.manufacturer_id === selectedManufacturer;

    let matchesStatus = true;
    if (selectedStatus !== 'all') {
      const statusObj = getStatus(med);
      if (selectedStatus === 'low') {
        matchesStatus = statusObj.label === 'สต็อกต่ำ' || statusObj.label === 'สินค้าหมด';
      } else if (selectedStatus === 'expired') {
        matchesStatus = statusObj.label.startsWith('หมดอายุ') || statusObj.label.startsWith('ใกล้หมดอายุ');
      } else if (selectedStatus === 'normal') {
        matchesStatus = statusObj.label === 'ปกติ';
      }
    }

    return matchesSearch && matchesCategory && matchesManufacturer && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
            <Pill className="w-8 h-8 text-emerald-500" />
            คลังรายการยาและเวชภัณฑ์
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ค้นหา ตรวจสอบสต็อก จัดกลุ่มหมวดหมู่ และจัดการข้อมูลยา
          </p>
        </div>
        {isEditable && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-950/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>ลงทะเบียนยาใหม่</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-950/40 border border-slate-800 p-4 rounded-3xl">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อยา รหัสยา หรือตำแหน่งชั้นวาง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">หมวดหมู่ทั้งหมด</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Manufacturer Filter */}
        <select
          value={selectedManufacturer}
          onChange={(e) => setSelectedManufacturer(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">ผู้ผลิตทั้งหมด</option>
          {manufacturers.map((man) => (
            <option key={man.manufacturer_id} value={man.manufacturer_id}>
              {man.manufacturer_name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-sm rounded-2xl px-4 py-3 text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">สถานะสินค้าทั้งหมด</option>
          <option value="low">สต็อกต่ำ / หมดคลัง</option>
          <option value="expired">หมดอายุ / ใกล้หมดอายุ</option>
          <option value="normal">สถานะปกติ</option>
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          กำลังดาวน์โหลดรายการยา...
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-4 px-6">รหัสยา / ชื่อยา</th>
                  <th className="py-4 px-6">หมวดหมู่ / หน่วย</th>
                  <th className="py-4 px-6">ผู้จัดจำหน่าย</th>
                  <th className="py-4 px-6 text-right">จำนวนคลัง</th>
                  <th className="py-4 px-6 text-right">ขั้นต่ำ</th>
                  <th className="py-4 px-6">ตำแหน่งเก็บ</th>
                  <th className="py-4 px-6">วันหมดอายุ</th>
                  <th className="py-4 px-6">สถานะ</th>
                  {isEditable && <th className="py-4 px-6 text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={isEditable ? 9 : 8} className="py-12 px-6 text-center text-slate-500 text-sm font-medium">
                      ไม่พบข้อมูลตรงตามเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((med) => {
                    const status = getStatus(med);
                    return (
                      <tr key={med.medicine_id} className="hover:bg-slate-900/30 transition-colors text-sm group whitespace-nowrap">
                        <td className="py-4 px-6">
                          <span className="block text-[11px] font-bold text-emerald-400">{med.medicine_code}</span>
                          <span className="font-extrabold text-white block mt-0.5">{med.medicine_name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="block text-slate-300">{med.category}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{med.unit}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {med.manufacturer_name}
                        </td>
                        <td className={`py-4 px-6 text-right font-extrabold text-base ${Number(med.current_stock) <= Number(med.min_stock) ? 'text-amber-400' : 'text-slate-100'}`}>
                          {med.current_stock}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-500 font-semibold text-xs">
                          {med.min_stock}
                        </td>
                        <td className="py-4 px-6 text-slate-400 text-xs">
                          {med.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              {med.location}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {med.expire_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(med.expire_date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-600">ไม่มีข้อมูล</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        {isEditable && (
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(med)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {role === 'admin' && (
                                <button
                                  onClick={() => openDeleteModal(med)}
                                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                                  title="ลบรายการ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-800/60">
            {filteredMedicines.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-500 text-sm font-medium">
                ไม่พบข้อมูลตรงตามเงื่อนไขการค้นหา
              </div>
            ) : (
              filteredMedicines.map((med) => {
                const status = getStatus(med);
                return (
                  <div key={med.medicine_id} className="p-5 flex flex-col gap-4 bg-slate-900/10">
                    {/* Card Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-400 font-mono tracking-wider">{med.medicine_code}</span>
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-white text-base mt-0.5">{med.medicine_name}</h4>
                      </div>
                      {isEditable && (
                        <div className="flex gap-2 shrink-0 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            title="แก้ไขรายการ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {role === 'admin' && (
                            <button
                              onClick={() => openDeleteModal(med)}
                              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                              title="ลบรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mt-1 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/40">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">หมวดหมู่ / หน่วย</span>
                        <span className="text-slate-200 text-xs font-semibold mt-1">{med.category}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">({med.unit})</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ผู้จัดจำหน่าย</span>
                        <span className="text-slate-300 text-xs mt-1 leading-normal break-words">{med.manufacturer_name}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">จำนวนคลัง / ขั้นต่ำ</span>
                        <span className={`text-base font-extrabold mt-1 ${Number(med.current_stock) <= Number(med.min_stock) ? 'text-amber-400' : 'text-slate-100'}`}>
                          {med.current_stock} <span className="text-xs text-slate-500 font-semibold">/ {med.min_stock}</span>
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ตำแหน่งเก็บ</span>
                        <span className="text-slate-300 text-xs mt-1">
                          {med.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {med.location}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </span>
                      </div>

                      <div className="col-span-2 flex flex-col pt-2 border-t border-slate-900/60">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">วันหมดอายุ</span>
                        <span className="text-slate-300 text-xs mt-1">
                          {med.expire_date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {new Date(med.expire_date).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-600">ไม่มีข้อมูล</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {med.note ? (
                      <div className="text-slate-400 text-xs italic bg-slate-950/10 p-3 rounded-xl border border-slate-900/60">
                        <span className="font-bold not-italic text-[9px] text-slate-500 uppercase tracking-wider block mb-1">หมายเหตุ</span>
                        {med.note}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="text-emerald-500" />
                ลงทะเบียนยาใหม่ในระบบ
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regStep === 1 ? (
              <div className="p-6 space-y-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Pill className="w-8 h-8" />
                </div>
                <div className="text-center max-w-md">
                  <h4 className="text-base font-bold text-white">ขั้นตอนที่ 1: ระบุรหัสหรือสแกนบาร์โค้ดยา</h4>
                  <p className="text-xs text-slate-400 mt-2">
                    กรุณาระบุรหัสสินค้า/บาร์โค้ดที่อยู่บนตัวยา เพื่อให้ระบบค้นหาประวัติก่อนว่ามียานี้ในฐานข้อมูลแล้วหรือไม่
                  </p>
                </div>

                <div className="w-full max-w-md space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      รหัสยา / บาร์โค้ดสินค้า (Medicine Code / Barcode)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="พิมพ์รหัสยาหรือเลขบาร์โค้ด..."
                        value={barcodeQuery}
                        onChange={(e) => setBarcodeQuery(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-bold"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVerifyBarcode(barcodeQuery);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        <Camera className="w-4 h-4" />
                        <span>สแกนกล้อง</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="w-1/2 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      disabled={!barcodeQuery.trim()}
                      onClick={() => handleVerifyBarcode(barcodeQuery)}
                      className="w-1/2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      ตรวจสอบข้อมูล
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {/* Banner Status */}
                {existingMatch ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex flex-col gap-1 leading-relaxed">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      พบข้อมูลยานี้ในคลังแล้ว (รหัส: {formData.medicine_code})
                    </span>
                    <span>ระบบได้นำข้อมูลที่มีอยู่ในคลังขึ้นมาแสดง คุณสามารถตรวจสอบรายละเอียดและแก้ไข/ระบุข้อมูลเพิ่มเติมของยาได้ที่ฟอร์มด้านล่างนี้</span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex flex-col gap-1 leading-relaxed">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      ไม่พบข้อมูลยานี้ในคลัง (รหัสใหม่: {formData.medicine_code})
                    </span>
                    <span>กรุณากรอกรายละเอียดของเวชภัณฑ์ยาด้านล่างเพื่อลงทะเบียนยาใหม่เข้าระบบ</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Code (Read-Only) */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">รหัสยา (Medicine Code)</label>
                    <input
                      type="text"
                      name="medicine_code"
                      disabled
                      value={formData.medicine_code}
                      className="w-full bg-slate-900/60 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-400 font-bold focus:outline-none"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">ชื่อยา (Medicine Name) *</label>
                    <input
                      type="text"
                      name="medicine_name"
                      required
                      placeholder="เช่น Paracetamol 500mg"
                      value={formData.medicine_name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">หมวดหมู่ยา *</label>
                    <input
                      type="text"
                      name="category"
                      required
                      placeholder="เช่น ยาแก้ปวด, ยาฆ่าเชื้อ"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">หน่วยนับ *</label>
                    <input
                      type="text"
                      name="unit"
                      required
                      placeholder="เช่น เม็ด, ขวด, หลอด"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Manufacturer Selection */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">ผู้ผลิต / ผู้จัดจำหน่าย *</label>
                    <select
                      name="manufacturer_id"
                      value={formData.manufacturer_id}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      {manufacturers.map((man) => (
                        <option key={man.manufacturer_id} value={man.manufacturer_id}>
                          {man.manufacturer_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Min Stock */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">จำนวนขั้นต่ำเตือนภัย (Min Stock)</label>
                    <input
                      type="number"
                      name="min_stock"
                      min="0"
                      value={formData.min_stock}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">ตำแหน่งจัดเก็บ (Location)</label>
                    <input
                      type="text"
                      name="location"
                      placeholder="เช่น ตู้ A ชั้น 3, ห้องยาเย็น"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Expiration date */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-400 mb-1">วันหมดอายุตั้งต้น (ถ้ามี)</label>
                    <input
                      type="date"
                      name="expire_date"
                      value={formData.expire_date}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">บันทึกเพิ่มเติม</label>
                  <textarea
                    name="note"
                    rows={3}
                    value={formData.note}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRegStep(1)}
                    className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-350 rounded-xl"
                  >
                    ย้อนกลับ
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      {existingMatch ? 'อัปเดตข้อมูลยา' : 'ลงทะเบียนยา'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="text-emerald-500 w-5 h-5" />
                แก้ไขข้อมูลยา: <span className="text-emerald-400">{activeMedicine?.medicine_name}</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">รหัสยา (Medicine Code) *</label>
                  <input
                    type="text"
                    name="medicine_code"
                    required
                    value={formData.medicine_code}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ชื่อยา *</label>
                  <input
                    type="text"
                    name="medicine_name"
                    required
                    value={formData.medicine_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">หมวดหมู่ยา *</label>
                  <input
                    type="text"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    name="unit"
                    required
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ผู้ผลิต / ผู้จัดจำหน่าย *</label>
                  <select
                    name="manufacturer_id"
                    value={formData.manufacturer_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    {manufacturers.map((man) => (
                      <option key={man.manufacturer_id} value={man.manufacturer_id}>
                        {man.manufacturer_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Stock */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">จำนวนขั้นต่ำแจ้งเตือน</label>
                  <input
                    type="number"
                    name="min_stock"
                    min="0"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ตำแหน่งจัดเก็บ (Location)</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Expire date */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">วันหมดอายุ (Expire Date)</label>
                  <input
                    type="date"
                    name="expire_date"
                    value={formData.expire_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">บันทึกเพิ่มเติม</label>
                <textarea
                  name="note"
                  rows={3}
                  value={formData.note}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white">คุณแน่ใจหรือไม่ที่จะลบยานี้?</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                ยา <span className="font-extrabold text-rose-400">&quot;{activeMedicine?.medicine_name}&quot; ({activeMedicine?.medicine_code})</span> จะถูกลบออกจากฐานข้อมูล Google Sheets อย่างถาวร การกระทำนี้ไม่สามารถย้อนกลับได้
              </p>

              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-5 py-2.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-5 py-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                >
                  ยืนยันลบรายการ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal component */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(decodedBarcode) => {
          setIsScannerOpen(false);
          setBarcodeQuery(decodedBarcode);
          handleVerifyBarcode(decodedBarcode);
        }}
      />
    </div>
  );
}
