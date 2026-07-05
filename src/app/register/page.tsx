'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Activity, UserPlus, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      }

      toast.success('ลงทะเบียนสำเร็จ!');
      setSuccess(true);
    } catch (err: any) {
      toast.error(err.message || 'ไม่สามารถลงทะเบียนได้ในขณะนี้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
      
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-black/60 relative overflow-hidden">
        {/* Visual Accents */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-teal-600/10 rounded-full blur-2xl"></div>

        <div className="flex flex-col items-center text-center">
          {/* Glowing Medical Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-6">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-2xl font-black text-white tracking-wide mb-1">
            ลงทะเบียนสิทธิ์ใช้งาน
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mb-6">
            Register New Account
          </p>

          {success ? (
            <div className="w-full py-6 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold text-lg">ลงทะเบียนเรียบร้อยแล้ว!</h3>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed px-4">
                  บัญชีของคุณได้รับการเปิดใช้งานในระบบเรียบร้อย คุณสามารถเข้าสู่ระบบด้วยบัญชี Google ของอีเมลนี้ได้ทันที
                </p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                ไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุลของคุณ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  อีเมล Google ของคุณ (สำหรับเข้าสู่ระบบ)
                </label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                  บทบาทผู้ใช้งานที่ต้องการขอ
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="staff">Staff (เจ้าหน้าที่คลังยา - นำเข้า/เบิกจ่าย)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ - จัดการข้อมูล/ผู้ใช้)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-6 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-emerald-950/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:-translate-y-0 disabled:pointer-events-none mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนสิทธิ์ใช้งาน'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300 font-bold px-6 py-3.5 rounded-2xl transition-all duration-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับไปเข้าสู่ระบบ</span>
              </button>
            </form>
          )}

          <div className="flex items-center gap-2 mt-8 text-[11px] text-slate-500 font-semibold tracking-wider">
            <KeyRound className="w-3.5 h-3.5" />
            <span>SECURE END-TO-END CONNECTION</span>
          </div>
        </div>
      </div>
    </div>
  );
}
