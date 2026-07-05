'use client';

import React, { Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Activity, ShieldAlert, KeyRound } from 'lucide-react';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  
  const error = searchParams.get('error');

  // If already logged in, redirect to home
  React.useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-black/60 relative overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-teal-600/10 rounded-full blur-2xl"></div>

      <div className="flex flex-col items-center text-center">
        {/* Glowing Medical Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-6">
          <Activity className="w-8 h-8 animate-pulse" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-wide mb-1">
          ระบบสต็อกเวชภัณฑ์ยา
        </h1>
        <p className="text-xs text-slate-400 font-medium tracking-widest uppercase mb-8">
          Medical Stock Management System
        </p>

        {/* Error Messaging */}
        {error && (
          <div className="w-full mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3 text-left">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">ปฏิเสธการเข้าถึง</p>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                อีเมล Google ของคุณยังไม่ได้รับการลงทะเบียนในระบบ หรือ ถูกเปลี่ยนสถานะเป็นปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ (Admin) เพื่อขอสิทธิ์เข้าใช้งาน
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          กรุณาเข้าสู่ระบบด้วยบัญชี Google ของสถาบันหรือที่ได้รับอนุญาต เพื่อเข้าจัดการสต็อก นำเข้า หรือเบิกจ่ายยา
        </p>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold px-6 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:shadow-emerald-950/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 0, 0)">
              <path d="M21.35,11.1H12v2.7h5.38C16.88,15.6,14.77,17,12,17c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.67,4.24,1.76l2.12-2.12C16.63,2.94,14.44,2,12,2C7.03,2,3,6.03,3,11s4.03,9,9,9c4.28,0,8-3.03,8-9C20,11.52,21.35,11.1,21.35,11.1z" fill="#4285F4" />
              <path d="M12,21c4.28,0,8-3.03,8-9c0-0.48-0.05-0.96-0.15-1.42H12v2.7h5.38c-0.5,1.8-2.61,3.2-5.38,3.2C8.69,16.48,6,13.79,6,11H3.27C4.1,16.48,8.69,21,12,21z" fill="#34A853" />
              <path d="M3.27,13c-0.18-0.64-0.27-1.31-0.27-2c0-0.69,0.09-1.36,0.27-2H1.2C0.43,10.22,0,11.59,0,13c0,1.41,0.43,2.78,1.2,4H3.27z" fill="#FBBC05" />
              <path d="M12,3c2.44,0,4.63,0.94,6.36,2.64l2.12-2.12C17.78,1.22,15.02,0,12,0C7.03,0,3,4.03,3,9h2.73C6.39,5.21,9.09,3,12,3z" fill="#EA4335" />
            </g>
          </svg>
          <span>เข้าสู่ระบบด้วย Google Account</span>
        </button>

        <div className="flex items-center gap-2 mt-8 text-[11px] text-slate-500 font-semibold tracking-wider">
          <KeyRound className="w-3.5 h-3.5" />
          <span>SECURE END-TO-END CONNECTION</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
      
      <Suspense fallback={
        <div className="text-slate-400 animate-pulse text-sm">กำลังโหลด...</div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
