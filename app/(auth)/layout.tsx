import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50 flex flex-col">
      <header className="py-6 px-6 sm:px-8">
        <div className="max-w-md mx-auto">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 transition-transform hover:scale-[1.02]"
          >
            <div className="relative">
              {/* <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-600 to-red-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity" /> */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-r from-primary-600 via-primary-600 to-secondary-500 shadow-lg shadow-red-500/25 transition-all group-hover:shadow-xl group-hover:shadow-red-500/30">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
            </div>

            <div>
              <span className="block text-xl font-bold text-slate-900">SYK School</span>
              <p className="text-xs text-slate-600">of Health Technology</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 sm:px-8 py-10">
        <div className="mx-auto max-w-md flex items-center justify-center min-h-[60vh]">
          {children}
        </div>
      </main>

      <footer className="py-6 px-6 text-center">
        <p className="text-sm text-slate-600">
          © {new Date().getFullYear()} SYK School of Health Technology. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
