'use client';

import { usePathname } from 'next/navigation';
import { Sidebar, Header } from '@/components/dashboard';

// Function to detect role from pathname
function getRoleFromPath(pathname: string): 'admin' | 'student' | 'academic_staff' | 'non_academic_staff' {
  if (pathname.startsWith('/dashboard/admin')) return 'admin';
  if (pathname.startsWith('/dashboard/student')) return 'student';
  if (pathname.startsWith('/dashboard/academic_staff')) return 'academic_staff';
  if (pathname.startsWith('/dashboard/non_academic_staff')) return 'non_academic_staff';
  return 'admin'; // Default fallback
}

// Function to get page title from pathname
function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  
  // If it's just the role dashboard (e.g., /dashboard/admin)
  if (segments.length === 2) return 'Dashboard';
  
  // Capitalize and format the last segment
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = getRoleFromPath(pathname);
  const pageTitle = getPageTitle(pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="lg:ml-64">
        <Header title={pageTitle} role={role} />
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}