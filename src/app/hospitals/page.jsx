'use client';

import DirectoryManager from '@/components/DirectoryManager';

export default function HospitalsPage() {
  return (
    <DirectoryManager apiBase="/admin/hospitals" singular="Hospital" plural="Hospitals" icon="🏥" />
  );
}