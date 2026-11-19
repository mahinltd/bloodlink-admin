'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, saveAdmin, clearAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!getToken()) {
        router.replace('/login');
        return;
      }
      try {
        // Token এখনো valid কিনা + latest admin info
        const res = await api.get('/admin/auth/me');
        const admin = res?.data?.admin ?? res?.data;
        if (admin) saveAdmin(admin);
        setVerified(true);
      } catch {
        clearAuth();
        router.replace('/login');
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F6F8]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="mt-4 text-sm font-medium text-ink/50">Verifying session...</p>
        </div>
      </div>
    );
  }

  return children;
}