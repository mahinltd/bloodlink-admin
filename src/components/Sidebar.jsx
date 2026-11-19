'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MENU_ITEMS, ROLE_LABELS, getMenuForRole } from '@/constants/admin';
import { getAdmin } from '@/lib/auth';

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    setAdmin(getAdmin());
  }, []);

  const role = admin?.role ?? 'super_admin';
  let items = MENU_ITEMS;
  try {
    if (typeof getMenuForRole === 'function') items = getMenuForRole(role);
  } catch {
    items = MENU_ITEMS;
  }

  const isActive = (href) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      {/* sidebar: flex column, পুরো height */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 shrink-0 flex-col bg-ink transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* logo — shrink-0, সবসময় উপরে pinned */}
        <div className="shrink-0 px-5 pb-3 pt-5">
          <Link href="/dashboard" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-white.png" alt="BloodLink" className="h-9 w-auto rounded-md" />
          </Link>
        </div>

        {/* nav — flex-1 + min-h-0: শুধু এই অংশ scroll করে */}
        <nav className="sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const label = item.label ?? item.title ?? item.name ?? '';
            const icon = item.icon ?? '•';
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* footer — shrink-0, সবসময় নিচে pinned, sidebar-এরই bg */}
        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {(admin?.fullName ?? admin?.name ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {admin?.fullName ?? admin?.name ?? 'Admin'}
              </p>
              <p className="truncate text-xs text-white/50">{ROLE_LABELS[role] ?? role}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-white/30">
            BloodLink Admin v1.0 • Every action is audit-logged
          </p>
        </div>
      </aside>
    </>
  );
}