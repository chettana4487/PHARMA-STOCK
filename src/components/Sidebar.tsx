'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Pill,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Factory,
  LogOut,
  Menu,
  X,
  Activity,
  Users,
} from 'lucide-react';

const navItems = [
  { name: 'แดชบอร์ด', href: '/', icon: LayoutDashboard },
  { name: 'จัดการยา', href: '/medicines', icon: Pill },
  { name: 'นำเข้าสต็อกยา', href: '/stock-in', icon: ArrowDownLeft },
  { name: 'เบิกจ่ายยา', href: '/stock-out', icon: ArrowUpRight },
  { name: 'ประวัติธุรกรรม', href: '/history', icon: History },
  { name: 'ประวัติผู้ป่วย', href: '/patients', icon: Users },
  { name: 'ผู้ผลิต/ผู้จัดจำหน่าย', href: '/manufacturers', icon: Factory },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const role = session?.user?.role || 'viewer';
  
  const getRoleBadgeColor = (roleStr: string) => {
    switch (roleStr.toLowerCase()) {
      case 'admin':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'staff':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-white tracking-wider">PHARMA STOCK</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="text-slate-300 hover:text-white focus:outline-none p-1 rounded-md border border-slate-700/50"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen pt-[57px] lg:pt-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Brand Header */}
          <div className="px-6 py-6 border-b border-slate-800/80 hidden lg:flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/30">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-wider leading-none">PHARMA STOCK</h1>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Medical System</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-6 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/10 text-emerald-300 border-l-4 border-emerald-500 pl-3 shadow-md shadow-emerald-950/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border-l-4 border-transparent'
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 shrink-0">
          {session?.user && (
            <div className="flex items-center gap-3 mb-4 px-2">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full border-2 border-emerald-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-700/30 flex items-center justify-center text-emerald-400 border-2 border-emerald-500/20 font-bold uppercase text-sm">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {session.user.name}
                </p>
                <p className="text-xs text-slate-500 truncate mb-1">
                  {session.user.email}
                </p>
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border tracking-wider ${getRoleBadgeColor(
                    role
                  )}`}
                >
                  {role}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/30 hover:border-rose-900/60 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
}
