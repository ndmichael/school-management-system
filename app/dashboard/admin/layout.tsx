import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/requireRole'

type Props = {
  children: ReactNode
}

export default async function AdminLayout({ children }: Props) {
  await requireRole('admin')
  return <>{children}</>
}
