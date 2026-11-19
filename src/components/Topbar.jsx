'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getAdmin, clearAuth } from '@/lib/auth';
import { MENU_ITEMS, ROLE_LABELS } from '@/constants/admin';

export default function Topbar({ onMenu }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setAdmin(getAdmin());
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current =
    MENU_ITEMS.find((i) => i.href === pathname) ??
    MENU_ITEMS.find((i) => i.href !== '/dashboard' && pathname.startsWith(i.href));
  const title = current ? current.label ?? current.title ?? current.name : 'Dashboard';
  const icon = current?.icon ?? '📊';

  const logout = async () => {
    try {
      await api.post('/admin/auth/logout');
    } catch {}
    clearAuth();
    router.replace('/login');
  };

  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200/60 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 lg:hidden"
        aria-label="Menu"
      >
        ☰
      </button>

      <h1 className="font-display text-base font-bold text-ink sm:text-lg">
        {icon} {title}
      </h1>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-gray-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {(admin?.fullName ?? admin?.name ?? 'A').charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-ink">
                {admin?.fullName ?? admin?.name ?? 'Admin'}
              </span>
              <span className="block text-[11px] leading-tight text-gray-400">
                {ROLE_LABELS[admin?.role] ?? ''}
              </span>
            </span>
            <span className="text-xs text-gray-400">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-xl">
              <div className="border-b border-gray-50 px-4 py-2.5">
                <p className="text-sm font-semibold text-ink">{admin?.fullName ?? admin?.name}</p>
                <p className="truncate text-xs text-gray-400">{admin?.email}</p>
              </div>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                🔐 Security & 2FA
              </Link>
              <button
                onClick={logout}
                className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}