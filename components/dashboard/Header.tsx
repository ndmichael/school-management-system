'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';
import { createClient } from '@/lib/supabase/client';
import type { DashboardUser, UserRole } from '@/types/dashboard';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  student: 'Student',
  academic_staff: 'Academic Staff',
  non_academic_staff: 'Non-Academic Staff',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-500',
  student: 'bg-blue-500',
  academic_staff: 'bg-purple-500',
  non_academic_staff: 'bg-green-500',
};

type HeaderProps = {
  user: DashboardUser;
  title?: string;
  notificationCount?: number;
};

export function Header({ user, title, notificationCount = 0 }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const roleLabel = roleLabels[user.role];
  const avatarColor = roleColors[user.role];

  // close dropdown on navigation (prevents “stuck open”)
  useEffect(() => {
    setOpen(false);
  }, [router]);

  const hasNotifications = useMemo(() => notificationCount > 0, [notificationCount]);

  const handleLogout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out');
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Logout failed');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <h1 className="truncate text-xl font-bold">
          {title || `${roleLabel} Dashboard`}
        </h1>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Notifications"
            onClick={() => toast.info('Notifications coming soon')}
          >
            <Bell className="h-4 w-4 text-gray-600" />
            {hasNotifications ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            ) : null}
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${avatarColor}`}>
                <User className="h-4 w-4 text-white" />
              </div>

              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-xs text-gray-600">{roleLabel}</p>
              </div>

              <ChevronDown className="hidden h-4 w-4 sm:block" />
            </button>

            {open ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                />

                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white py-2 shadow-xl">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="truncate text-xs text-gray-600">{user.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/dashboard/${user.role}/settings`);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <Settings className="h-4 w-4" />
                    Profile
                  </button>

                  <hr className="my-2 border-gray-200" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
