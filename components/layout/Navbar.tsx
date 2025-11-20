// components/layout/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  BookOpen,
  Users,
  Award
} from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    {
      label: 'About',
      href: '/about',
      dropdown: [
        { label: 'Our Story', href: '/about/story', icon: BookOpen },
        { label: 'Our Team', href: '/about/team', icon: Users },
        { label: 'Accreditation', href: '/about/accreditation', icon: Award },
      ]
    },
    { label: 'Programs', href: '/programs' },
    { label: 'Admissions', href: '/admissions' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/40"
          : "bg-white/30 backdrop-blur-sm"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">

          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-secondary-500 rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-primary-600 to-secondary-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                SYK School of Health Tech
              </span>
              <p className="text-xs text-gray-600 -mt-1 tracking-wide">Portal</p>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.dropdown && setActiveDropdown(link.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={link.href}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1",
                    "text-gray-700 hover:text-primary-600 hover:bg-primary-50"
                  )}
                >
                  {link.label}
                  {link.dropdown && (
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        activeDropdown === link.label && "rotate-180"
                      )}
                    />
                  )}
                </Link>

                {/* DROPDOWN */}
                {link.dropdown && activeDropdown === link.label && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {link.dropdown.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-primary-50 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                            <Icon className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA BUTTONS */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/apply"
              className="relative px-6 py-2 rounded-lg font-medium text-sm bg-primary-600 text-white overflow-hidden group"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-secondary-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* MOBILE NAV BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen
              ? <X className="w-6 h-6 text-gray-700" />
              : <Menu className="w-6 h-6 text-gray-700" />}
          </button>

        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-xl animate-in slide-in-from-top duration-300">
          <div className="px-6 py-6 space-y-2">
            {navLinks.map((link) => (
              <div key={link.label}>
                <Link
                  href={link.href}
                  className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>

                {/* Mobile dropdown */}
                {link.dropdown && (
                  <div className="ml-4 mt-2 space-y-1">
                    {link.dropdown.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Mobile CTA */}
            <div className="pt-4 space-y-2">
              <Link
                href="/auth/login"
                className="block w-full text-center px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/apply"
                className="block w-full text-center px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
