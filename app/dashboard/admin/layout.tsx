import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/requireRole";

type Props = { children: ReactNode };

export default async function AdminLayout({ children }: Props) {
  await requireRole("admin");

  // min-w-0 is the key: it allows tables/grids to shrink inside flex parents
  return <main className="w-full min-w-0">{children}</main>;
}
