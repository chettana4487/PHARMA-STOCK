'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Activity } from 'lucide-react';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.push('/login');
    }
  }, [status, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="relative flex items-center justify-center mb-4">
          {/* Pulsing ring animation */}
          <div className="absolute w-20 h-20 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wider text-emerald-400/90 animate-pulse">
          กำลังตรวจสอบสิทธิ์เข้าใช้งานระบบ...
        </p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Let the redirect trigger
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0b0f19]">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
