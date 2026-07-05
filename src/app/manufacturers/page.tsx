'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import {
  Factory,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  User,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

interface Manufacturer {
  manufacturer_id: string;
  manufacturer_name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
}

export default function ManufacturersPage() {
  const { data: session } = useSession();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form states
  const [activeManufacturer, setActiveManufacturer] = useState<Manufacturer | null>(null);
  const [formData, setFormData] = useState({
    manufacturer_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    note: '',
  });

  const role = session?.user?.role || 'viewer';
  const isEditable = role === 'admin' || role === 'staff';
  const isAdmin = role === 'admin';

  async function fetchManufacturers() {
    try {
      setLoading(true);
      const res = await fetch('/api/manufacturers');
      if (res.ok) {
        const data = await res.json();
        setManufacturers(data);
      } else {
        toast.error('ล้มเหลวในการดาวน์โหลดข้อมูลผู้ผลิต');
      }
    } catch (error) {
      console.error('Error fetching manufacturers:', error);
      toast.error('มีข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchManufacturers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({
      manufacturer_name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      note: '',
    });
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.manufacturer_name) {
      toast.error('กรุณากรอกชื่อผู้ผลิต');
      return;
    }

    const toastId = toast.loading('กำลังบันทึกข้อมูลผู้จัดจำหน่าย...');
    try {
      const res = await fetch('/api/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('บันทึกข้อมูลผู้ผลิตเรียบร้อยแล้ว', { id: toastId });
        setIsAddModalOpen(false);
        fetchManufacturers();
      } else {
        toast.error(result.error || 'บันทึกไม่สำเร็จ', { id: toastId });
      }
    } catch (error) {
      console.error('Error adding manufacturer:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ', { id: toastId });
    }
  };

  const openEditModal = (man: Manufacturer) => {
    setActiveManufacturer(man);
    setFormData({
      manufacturer_name: man.manufacturer_name,
      contact_name: man.contact_name,
      phone: man.phone,
      email: man.email,
      address: man.address,
      note: man.note,
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeManufacturer) return;

    const toastId = toast.loading('กำลังอัปเดตข้อมูลผู้จัดจำหน่าย...');
    try {
      const res = await fetch(`/api/manufacturers/${activeManufacturer.manufacturer_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('แก้ไขข้อมูลผู้จัดจำหน่ายเรียบร้อยแล้ว', { id: toastId });
        setIsEditModalOpen(false);
        setActiveManufacturer(null);
        fetchManufacturers();
      } else {
        toast.error(result.error || 'อัปเดตข้อมูลไม่สำเร็จ', { id: toastId });
      }
    } catch (error) {
      console.error('Error editing manufacturer:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', { id: toastId });
    }
  };

  const openDeleteModal = (man: Manufacturer) => {
    setActiveManufacturer(man);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeManufacturer) return;

    const toastId = toast.loading('กำลังลบข้อมูลผู้จัดจำหน่าย...');
    try {
      const res = await fetch(`/api/manufacturers/${activeManufacturer.manufacturer_id}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (res.ok) {
        toast.success('ลบข้อมูลผู้จัดจำหน่ายเรียบร้อยแล้ว', { id: toastId });
        setIsDeleteModalOpen(false);
        setActiveManufacturer(null);
        fetchManufacturers();
      } else {
        toast.error(result.error || 'ล้มเหลวในการลบข้อมูล', { id: toastId });
      }
    } catch (error) {
      console.error('Error deleting manufacturer:', error);
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล', { id: toastId });
    }
  };

  // Filter list
  const filteredManufacturers = manufacturers.filter((m) => {
    return (
      m.manufacturer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
            <Factory className="w-8 h-8 text-emerald-500" />
            รายชื่อผู้จัดจำหน่าย / บริษัทผู้ผลิต
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            ลงทะเบียนข้อมูลที่ติดต่อ ที่อยู่ และช่องทางการรับส่งยาของบริษัทคู่ค้า
          </p>
        </div>
        {isEditable && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-emerald-950/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            <span>ลงทะเบียนผู้ผลิตใหม่</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-3xl">
        <div className="relative w-full max-w-lg">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้ผลิต, เบอร์โทรติดต่อ, หรืออีเมลบริษัทคู่ค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-sm rounded-2xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Grid table */}
      {loading ? (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          กำลังดาวน์โหลดรายชื่อผู้ผลิต...
        </div>
      ) : (
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] text-slate-400 font-extrabold uppercase tracking-wider whitespace-nowrap">
                  <th className="py-4 px-6">รหัส / ชื่อผู้ผลิต</th>
                  <th className="py-4 px-6">ชื่อบุคคลติดต่อ</th>
                  <th className="py-4 px-6">เบอร์ติดต่อ</th>
                  <th className="py-4 px-6">อีเมลติดต่อ</th>
                  <th className="py-4 px-6">ที่อยู่จัดส่งเอกสาร</th>
                  <th className="py-4 px-6">หมายเหตุ</th>
                  {isEditable && <th className="py-4 px-6 text-right">จัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm">
                {filteredManufacturers.length === 0 ? (
                  <tr>
                    <td colSpan={isEditable ? 7 : 6} className="py-12 px-6 text-center text-slate-500 font-medium">
                      ไม่พบข้อมูลผู้ผลิตยา
                    </td>
                  </tr>
                ) : (
                  filteredManufacturers.map((man) => (
                    <tr key={man.manufacturer_id} className="hover:bg-slate-900/30 transition-colors group whitespace-nowrap">
                      <td className="py-4 px-6">
                        <span className="block text-[11px] font-bold text-emerald-400">{man.manufacturer_id}</span>
                        <span className="font-extrabold text-white block mt-0.5">{man.manufacturer_name}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {man.contact_name ? (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {man.contact_name}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {man.phone ? (
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            {man.phone}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {man.email ? (
                          <span className="flex items-center gap-1.5 underline decoration-slate-700 underline-offset-2">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            {man.email}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs max-w-xs truncate" title={man.address}>
                        {man.address ? (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {man.address}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs italic">
                        {man.note || <span className="text-slate-600">-</span>}
                      </td>
                      {isEditable && (
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(man)}
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => openDeleteModal(man)}
                                className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                                title="ลบข้อมูล"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-slate-800/60">
            {filteredManufacturers.length === 0 ? (
              <div className="py-12 px-6 text-center text-slate-500 font-medium">
                ไม่พบข้อมูลผู้ผลิตยา
              </div>
            ) : (
              filteredManufacturers.map((man) => (
                <div key={man.manufacturer_id} className="p-5 flex flex-col gap-4 bg-slate-900/10">
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="block text-[11px] font-bold text-emerald-400 font-mono tracking-wider">{man.manufacturer_id}</span>
                      <h4 className="font-extrabold text-white text-base mt-1">{man.manufacturer_name}</h4>
                    </div>
                    {isEditable && (
                      <div className="flex gap-2 shrink-0 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
                        <button
                          onClick={() => openEditModal(man)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => openDeleteModal(man)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                            title="ลบข้อมูล"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Info Grid */}
                  <div className="grid grid-cols-1 gap-3.5 mt-2 bg-slate-950/20 p-4 rounded-2xl border border-slate-800/40">
                    {man.contact_name ? (
                      <div className="flex items-start gap-2.5 text-slate-300 text-xs">
                        <User className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ชื่อผู้ติดต่อ</span>
                          <span className="font-medium text-slate-200 mt-0.5">{man.contact_name}</span>
                        </div>
                      </div>
                    ) : null}

                    {man.phone ? (
                      <div className="flex items-start gap-2.5 text-slate-300 text-xs">
                        <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">เบอร์ติดต่อ</span>
                          <span className="font-bold text-slate-200 mt-0.5">{man.phone}</span>
                        </div>
                      </div>
                    ) : null}

                    {man.email ? (
                      <div className="flex items-start gap-2.5 text-slate-300 text-xs">
                        <Mail className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">อีเมล</span>
                          <span className="text-slate-200 mt-0.5 break-all underline decoration-slate-700 underline-offset-2">{man.email}</span>
                        </div>
                      </div>
                    ) : null}

                    {man.address ? (
                      <div className="flex items-start gap-2.5 text-slate-300 text-xs">
                        <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ที่อยู่จัดส่งเอกสาร</span>
                          <span className="text-slate-300 mt-0.5 leading-relaxed">{man.address}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {man.note ? (
                    <div className="text-slate-400 text-xs italic bg-slate-950/10 p-3 rounded-xl border border-slate-900/60">
                      <span className="font-bold not-italic text-[9px] text-slate-500 uppercase tracking-wider block mb-1">หมายเหตุ</span>
                      {man.note}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Manufacturer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="text-emerald-500" />
                ลงทะเบียนผู้จัดจำหน่ายใหม่
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {/* Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">ชื่อผู้ผลิต / บริษัทจัดจำหน่าย *</label>
                <input
                  type="text"
                  name="manufacturer_name"
                  required
                  placeholder="เช่น บริษัท ยาไทย จำกัด"
                  value={formData.manufacturer_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ผู้แทนจำหน่าย / ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    name="contact_name"
                    placeholder="เช่น คุณเอกชัย มั่งคั่ง"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="เช่น 02-1234567"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">อีเมลติดต่อบริษัท (Email)</label>
                <input
                  type="email"
                  name="email"
                  placeholder="เช่น contact@thaimed.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">ที่อยู่วิสาหกิจ / สำนักงาน</label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="ป้อนข้อมูลสถานที่จำหน่าย..."
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">บันทึกเพิ่มเติม</label>
                <textarea
                  name="note"
                  rows={2}
                  value={formData.note}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Manufacturer Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden relative shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="text-emerald-500 w-5 h-5" />
                แก้ไขข้อมูลผู้จัดจำหน่าย
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {/* Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">ชื่อผู้ผลิต / บริษัทจัดจำหน่าย *</label>
                <input
                  type="text"
                  name="manufacturer_name"
                  required
                  value={formData.manufacturer_name}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">ผู้แทนจำหน่าย / ชื่อผู้ติดต่อ</label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-400 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">อีเมลติดต่อบริษัท</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">ที่อยู่วิสาหกิจ / สำนักงาน</label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 text-sm rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-extrabold text-slate-400 mb-1">บันทึกเพิ่มเติม</label>
                <textarea
                  name="note"
                  rows={2}
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
              <h3 className="text-lg font-bold text-white">คุณต้องการลบผู้ผลิตรายนี้จริงหรือไม่?</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                ผู้ผลิตยา <span className="font-extrabold text-rose-400">&quot;{activeManufacturer?.manufacturer_name}&quot; ({activeManufacturer?.manufacturer_id})</span> จะถูกลบออกจากระบบอย่างถาวร ยาบางตัวที่ผูกอยู่กับผู้ผลิตนี้จะยังคงอยู่แต่จะแสดงผู้ผลิตเป็น &quot;Unknown Manufacturer&quot;
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
                  ยืนยันลบผู้จัดจำหน่าย
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
