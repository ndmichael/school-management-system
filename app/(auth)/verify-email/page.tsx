'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { PrimaryButton } from '@/components/shared';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);

  const handleResend = () => {
    setIsResending(true);
    setTimeout(() => setIsResending(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md text-center"
    >
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10">
        {/* Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-primary-600" />
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Check Your Email
        </h1>
        <p className="text-gray-600 mb-8">
          We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
        </p>

        {/* Resend Button */}
        <button
          onClick={handleResend}
          disabled={isResending}
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
          <span>{isResending ? 'Sending...' : 'Resend verification email'}</span>
        </button>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <span>Back to login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}