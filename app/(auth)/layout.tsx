import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="py-6 px-6 sm:px-8">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">SYK School</span>
              <p className="text-xs text-gray-600">of Health Technology</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-8 py-12">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="py-6 px-6 text-center">
        <p className="text-sm text-gray-600">
          © {new Date().getFullYear()} SYK School of Health Technology. All rights reserved.
        </p>
      </footer>
    </div>
  );
}