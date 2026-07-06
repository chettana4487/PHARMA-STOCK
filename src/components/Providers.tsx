'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster 
        position="top-right"
        containerClassName="no-print"
        toastOptions={{
          className: 'bg-slate-900 text-white rounded-lg shadow-xl border border-slate-700/50',
          duration: 3000,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(51, 65, 85, 0.5)',
          },
        }}
      />
    </SessionProvider>
  );
}
