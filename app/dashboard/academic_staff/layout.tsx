import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/requireRole'

type Props = {
  children: ReactNode
}

export default async function StudentLayout({ children }: Props) {
  await requireRole('academic_staff')
  return <>{children}</>
}
