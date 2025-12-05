'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { toast } from 'react-toastify'
import { createClient } from '@/lib/supabase/client'
import type { DashboardUser, UserRole } from '@/types/dashboard'

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  student: 'Student',
  academic_staff: 'Academic Staff',
  non_academic_staff: 'Non-Academic Staff',
}

type HeaderProps = {
  user: DashboardUser
  title?: string
}

export function Header({ user, title }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out')
      router.replace('/login')
    } catch (error) {
      console.error('Logout failed', error)
      toast.error('Logout failed')
    }
  }

  const roleLabel = roleLabels[user.role]

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <h1 className="text-xl font-bold truncate">
          {title || `${roleLabel} Dashboard`}
        </h1>

        <div className="flex items-center gap-4">
          <button className="relative w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
              3
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setOpen(prev => !prev)}
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded-lg"
            >
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-xs text-gray-600">{roleLabel}</p>
              </div>
              <ChevronDown className="w-4 h-4 hidden sm:block" />
            </button>

            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-gray-600 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setOpen(false)
                      router.push(`/dashboard/${user.role}/profile`)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Profile
                  </button>
                  <hr className="my-2 border-gray-200" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-red-600 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
