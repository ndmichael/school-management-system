'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  Building2,
  Calendar,
  Receipt,
  FileText,
  Settings,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react'
import type { DashboardUser, UserRole } from '@/types/dashboard'

type RoleConfig = {
  color: string
  hoverColor: string
  activeColor: string
  lightBg: string
  textColor: string
  label: string
  items: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }[]
}

const roleConfig: Record<UserRole, RoleConfig> = {
  admin: {
    color: 'bg-red-600',
    hoverColor: 'hover:bg-red-700',
    activeColor: 'bg-red-700',
    lightBg: 'bg-red-50',
    textColor: 'text-red-600',
    label: 'Admin',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/admin' },
      { icon: Users, label: 'Students', href: '/dashboard/admin/students' },
      { icon: FileText, label: 'Applications', href: '/dashboard/admin/applications' },
      { icon: UserCog, label: 'Staff', href: '/dashboard/admin/staff' },
      { icon: BookOpen, label: 'Courses', href: '/dashboard/admin/courses' },
      { icon: BookOpen, label: 'Courses Offerings', href: '/dashboard/admin/course-offerings' },
      { icon: Building2, label: 'Departments', href: '/dashboard/admin/departments' },

      { icon: GraduationCap, label: 'Programs', href: '/dashboard/admin/programs' },

      { icon: Calendar, label: 'Sessions', href: '/dashboard/admin/sessions' },
      { icon: Receipt, label: 'Receipts', href: '/dashboard/admin/receipts' },
      // { icon: FileText, label: 'Reports', href: '/dashboard/admin/reports' },
      { icon: Settings, label: 'Settings', href: '/dashboard/admin/settings' },
    ],
  },
  student: {
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
    activeColor: 'bg-blue-700',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600',
    label: 'Student',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/student' },
      { icon: Receipt, label: 'Payments', href: '/dashboard/student/payments' },
      { icon: FileText, label: 'Downloads', href: '/dashboard/student/downloads' },
      { icon: FileText, label: 'Results', href: '/dashboard/student/results' },
      { icon: Users, label: 'Profile', href: '/dashboard/student/profile' },
    ],
  },
  academic_staff: {
    color: 'bg-purple-600',
    hoverColor: 'hover:bg-purple-700',
    activeColor: 'bg-purple-700',
    lightBg: 'bg-purple-50',
    textColor: 'text-purple-600',
    label: 'Academic Staff',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/academic_staff' },
      { icon: BookOpen, label: 'Courses', href: '/dashboard/academic_staff/courses' },
      // { icon: Users, label: 'Students', href: '/dashboard/academic_staff/students' },
      { icon: FileText, label: 'Results', href: '/dashboard/academic_staff/results' },
      { icon: Settings, label: 'Settings', href: '/dashboard/academic_staff/settings' },
    ],
  },
  non_academic_staff: {
    color: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
    activeColor: 'bg-green-700',
    lightBg: 'bg-green-50',
    textColor: 'text-green-600',
    label: 'Non-Academic Staff',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/non_academic_staff' },
      { icon: Receipt, label: 'Receipts', href: '/dashboard/non_academic_staff/receipts' },
      { icon: Users, label: 'Students', href: '/dashboard/non_academic_staff/students' },
      { icon: Settings, label: 'Settings', href: '/dashboard/non_academic_staff/settings' },
    ],
  },
}

type SidebarProps = {
  user: DashboardUser
}

export function Sidebar({ user }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const config = roleConfig[user.role]

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(prev => !prev)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-40 transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <Link href="/" className="flex items-center gap-3 group">
              <div
                className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900">SYK School</span>
                <p className="text-xs text-gray-600">{config.label}</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {config.items.map(item => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive ? `${config.activeColor} text-white` : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className={`${config.lightBg} rounded-xl p-4`}>
              <p className="text-sm font-medium text-gray-900">{config.label}</p>
              <p className="text-xs text-gray-600 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
