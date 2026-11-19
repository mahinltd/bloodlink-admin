'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AuthGuard from './AuthGuard';
import { getToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/login'];

export default function Shell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublic) {
      setReady(true);
      return;
    }
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [pathname, isPublic, router]);

  // route বদলালে mobile menu বন্ধ
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isPublic) return <>{children}</>;

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F6F6F8]">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      {/* root: পুরো screen, window scroll বন্ধ */}
      <div className="flex h-dvh overflow-hidden bg-[#F6F6F8]">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMenuOpen(true)} />
          {/* শুধু এই অংশ scroll হয় */}
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}