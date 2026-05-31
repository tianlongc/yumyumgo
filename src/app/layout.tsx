import React, { useEffect } from 'react';
import { useSessionStore } from '../store/useSessionStore';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = useSessionStore((s) => s.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-[#F8FAFC] dark:bg-[#0B1325] text-[#1a1513] dark:text-[#F8FAFC] relative overflow-y-auto flex flex-col border-x border-gray-100 dark:border-gray-800 shadow-2xl transition-colors duration-300">
      <main className="flex-1 flex flex-col w-full h-full p-0 relative z-10">
        {children}
      </main>
    </div>
  );
}
