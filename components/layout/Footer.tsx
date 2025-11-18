'use client';

import Link from 'next/link';
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Send
} from 'lucide-react';
import { useState } from 'react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      setEmail('');
    }, 1000);
  };

  const quickLinks = [
    { label: 'About Us', href: '/about' },
    { label: 'Programs', href: '/programs' },
    { label: 'Admissions', href: '/admissions' },
    { label: 'Contact', href: '/contact' },
  ];

  const social = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="relative bg-gray-950 text-gray-300">
      
      {/* Decorative Sloppy Top */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden">
        <svg className="h-16 w-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path
            d="M0,50 C150,120 350,-20 600,40 C850,100 1050,20 1200,60 L1200,0 L0,0 Z"
            className="fill-gray-950"
          />
        </svg>
      </div>

      <div className="relative pt-20 pb-12 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">

          {/* BRAND */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-xl">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">EduHealth Portal</h2>
                <p className="text-gray-400 text-xs">Excellence in Education</p>
              </div>
            </div>

            <p className="text-gray-400 leading-relaxed mb-6">
              Training the next generation of healthcare professionals through modern,
              technology-driven education.
            </p>

            <div className="space-y-3">
              <a href="tel:+123456789" className="flex items-center gap-3 hover:text-white transition">
                <Phone className="w-4 h-4" />
                +1 (234) 567-890
              </a>
              <a href="mailto:info@eduhealth.edu" className="flex items-center gap-3 hover:text-white transition">
                <Mail className="w-4 h-4" />
                info@eduhealth.edu
              </a>
              <p className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1" />
                123 Healthcare District, New York, NY
              </p>
            </div>
          </div>

          {/* LINKS */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="hover:text-white transition text-sm"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* NEWSLETTER */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Stay Updated</h3>
            <p className="text-sm text-gray-400 mb-4">
              Join our newsletter for updates & announcements.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <button
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                {submitting ? 'Subscribing…' : 'Subscribe'}
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6">
              <p className="text-sm mb-3">Follow Us</p>
              <div className="flex gap-3">
                {social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center hover:bg-gray-800 transition"
                  >
                    <s.icon className="w-4 h-4 text-gray-300" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col md:flex-row justify-between text-sm text-gray-500">
          <span>© {new Date().getFullYear()} EduHealth Portal. All rights reserved.</span>

          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/cookies" className="hover:text-white transition">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
