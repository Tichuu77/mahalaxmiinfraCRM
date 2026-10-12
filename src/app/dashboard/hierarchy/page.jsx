'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HierarchyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/users');
  }, [router]);

  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-8 w-64 bg-slate-200 rounded-lg" />
      <div className="h-4 w-96 bg-slate-100 rounded" />
      <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
    </div>
  );
}
