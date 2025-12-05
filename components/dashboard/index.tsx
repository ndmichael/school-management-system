'use client'

import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import type { DashboardUser } from '@/types/dashboard'

type Props = {
  user: DashboardUser
  children: ReactNode
}

export function DashboardShell({ user, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col ml-0 lg:ml-64">
        <Header user={user} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
