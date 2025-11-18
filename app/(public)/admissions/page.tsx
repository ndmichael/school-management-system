'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { 
  admissionRequirements, 
  admissionSteps, 
  importantDates,
  faqItems 
} from '@/data/admissions';
import { PrimaryButton } from '@/components/shared';

export default function AdmissionsPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-secondary-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-semibold mb-6">
            <Calendar className="w-4 h-4" />
            <span>Applications Open - Apply Now</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 max-w-3xl mx-auto">
            Start Your Healthcare Journey
          </h1>
          <p className="text-lg text-primary-100 leading-relaxed max-w-2xl mx-auto mb-8">
            Join thousands of successful healthcare professionals. Our streamlined admission process makes it easy to begin your career.
          </p>

          <PrimaryButton href="/auth/register" className="bg-white text-primary-600 hover:bg-gray-50 shadow-xl">
            Apply Now
          </PrimaryButton>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg 
            className="relative block w-full h-12" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 1200 120" 
            preserveAspectRatio="none"
          >
            <path 
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
              className="fill-white"
            />
          </svg>
        </div>
      </section>

      {/* Admission Steps */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Simple Admission Process
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Four easy steps to secure your admission and start your journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {admissionSteps.map((item, index) => (
            <div key={index} className="relative">
              {/* Connecting Line */}
              {index < admissionSteps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-200 to-transparent" />
              )}

              <div className="relative bg-white rounded-2xl p-6 border border-gray-100 hover:border-primary-200 hover:shadow-xl transition-all group">
                {/* Step Number */}
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{item.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Admission Requirements
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ensure you meet these criteria before applying
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {admissionRequirements.map((requirement, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary-200 hover:shadow-xl transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-primary-600" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {requirement.category}
                </h3>
                
                <ul className="space-y-3">
                  {requirement.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Dates */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Important Dates
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Mark your calendar with these key admission dates
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {importantDates.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="w-6 h-6 text-primary-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{item.event}</span>
                </div>
                <span className="text-sm text-gray-600 font-medium">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Find answers to common admission questions
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-primary-200 transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
          
          <div className="relative">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Apply?
            </h2>
            <p className="text-primary-100 mb-8 max-w-2xl mx-auto">
              Take the first step towards your healthcare career. Our team is here to support you throughout the admission process.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <PrimaryButton href="/auth/register" className="bg-white text-primary-600 hover:bg-gray-50">
                Start Application
              </PrimaryButton>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
              >
                <span>Contact Admissions</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}