// components/layout/Footer.tsx
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
  ArrowRight,
  Send
} from 'lucide-react';
import { useState } from 'react';

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Handle newsletter signup
    setTimeout(() => {
      setIsSubmitting(false);
      setEmail('');
    }, 1000);
  };

  const footerLinks = {
    'Quick Links': [
      { label: 'About Us', href: '/about' },
      { label: 'Programs', href: '/programs' },
      { label: 'Admissions', href: '/admissions' },
      { label: 'Faculty', href: '/faculty' },
      { label: 'Campus Life', href: '/campus' },
    ],
    'Resources': [
      { label: 'Student Portal', href: '/auth/login' },
      { label: 'Library', href: '/library' },
      { label: 'Career Services', href: '/careers' },
      { label: 'Research', href: '/research' },
      { label: 'Alumni Network', href: '/alumni' },
    ],
    'Support': [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faq' },
      { label: 'Scholarships', href: '/scholarships' },
      { label: 'Financial Aid', href: '/financial-aid' },
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
    { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:bg-sky-500' },
    { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:bg-pink-600' },
    { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:bg-blue-700' },
    { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:bg-red-600' },
  ];

  return (
    <footer className="relative bg-gray-900 text-white overflow-hidden">
      {/* Wave Divider */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
        <svg className="relative block w-full h-16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-gray-50"></path>
        </svg>
      </div>

      <div className="container-custom relative pt-24 pb-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
          {/* Brand Section */}
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <span className="text-xl font-bold">EduHealth Portal</span>
                <p className="text-xs text-gray-400">Excellence in Education</p>
              </div>
            </Link>

            <p className="text-gray-400 leading-relaxed">
              Empowering the next generation of healthcare professionals through innovative 
              education, cutting-edge research, and compassionate care.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a href="tel:+1234567890" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-sm">+1 (234) 567-8900</span>
              </a>
              <a href="mailto:info@eduhealth.edu" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-sm">info@eduhealth.edu</span>
              </a>
              <div className="flex items-start gap-3 text-gray-400">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-sm">123 Healthcare Ave, Medical District<br />New York, NY 10001</span>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group text-sm"
                    >
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -ml-5 group-hover:ml-0 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-white">Stay Updated</h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to our newsletter for the latest updates and news.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn btn-primary btn-md group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                  <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-secondary-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </form>

            {/* Social Links */}
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-3">Follow Us</p>
              <div className="flex gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      aria-label={social.label}
                      className={`w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:text-white transition-all duration-300 transform hover:scale-110 ${social.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} EduHealth Portal. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
                Cookie Policy
              </Link>
              <Link href="/accessibility" className="text-gray-400 hover:text-white transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl -z-10" />
    </footer>
  );
}