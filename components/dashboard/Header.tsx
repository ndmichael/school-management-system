'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface HeaderProps {
  title: string;
  role: 'admin' | 'student' | 'academic_staff' | 'non_academic_staff';
}

const roleLabels = {
  admin: 'Admin',
  student: 'Student',
  academic_staff: 'Academic Staff',
  non_academic_staff: 'Non-Academic Staff'
};

export function Header({ title, role }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-4">
        {/* Page Title - Adjusted for mobile */}
        <div className="flex-1 min-w-0 lg:ml-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <button className="relative w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center font-semibold">
              3
            </span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">{roleLabels[role]}</p>
                <p className="text-xs text-gray-600">View Profile</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{roleLabels[role]}</p>
                    <p className="text-xs text-gray-600">user@sykschool.edu.ng</p>
                  </div>
                  <Link
                    href={`/dashboard/${role}/settings`}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <hr className="my-2 border-gray-200" />
                  <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-red-600 text-sm">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}