'use client';

import DirectoryManager from '@/components/DirectoryManager';

export default function BloodBanksPage() {
  return (
    <DirectoryManager apiBase="/admin/blood-banks" singular="Blood Bank" plural="Blood Banks" icon="🩸" />
  );
}