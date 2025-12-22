'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {  Menu, X } from 'lucide-react';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' }, // No dropdown
    { label: 'Programs', href: '/programs' },
    { label: 'Admissions', href: '/admissions' },
    { label: 'Contact', href: '/contact' },
  ];

  // Smooth scroll handler for About section anchors
  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (pathname === '/about') {
      e.preventDefault();
      const targetId = (e.currentTarget.getAttribute('href') || '').replace('/about', '');
      const element = document.querySelector(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setIsMobileMenuOpen(false);
      }
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/40'
          : 'bg-white/30 backdrop-blur-sm'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO */}
          <Image
            src="/brand/logo.png"
            alt="SYK Health Tech"
            width={140}
            height={40}
            priority
          />

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={link.label === 'About' ? handleAboutClick : undefined}
                className="px-4 py-2 rounded-lg font-medium text-sm text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                {link.label}
              </Link>
            ))}

            {/* CTA */}
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
            {isMobileMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-xl animate-in slide-in-from-top duration-300">
          <div className="px-6 py-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={link.label === 'About' ? handleAboutClick : () => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile CTA */}
            <div className="pt-4 space-y-2">
              <Link
                href="/login"
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
