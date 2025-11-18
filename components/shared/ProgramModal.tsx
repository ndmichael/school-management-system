'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X, Clock, Users, Award, CheckCircle2, Calendar, GraduationCap } from 'lucide-react';
import { Program } from '@/data/programs';
import { PrimaryButton } from './PrimaryButton';

interface ProgramModalProps {
  program: Program | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProgramModal({ program, isOpen, onClose }: ProgramModalProps) {
  if (!isOpen || !program) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div 
            className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Image Header */}
            <div className="relative h-64 rounded-t-3xl overflow-hidden">
              <Image 
                src={program.image} 
                alt={program.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              {program.featured && (
                <div className="absolute top-6 left-6 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Title & Meta */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {program.title}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="font-medium">{program.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary-600" />
                    <span className="font-medium">{program.students} Students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary-600" />
                    <span className="font-medium">{program.level}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">About This Program</h3>
                <p className="text-gray-600 leading-relaxed">
                  {program.description}
                </p>
              </div>

              {/* Key Features */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">What You'll Learn</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {program.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-primary-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    <h4 className="font-semibold text-gray-900">Start Date</h4>
                  </div>
                  <p className="text-sm text-gray-600">Next intake: January 2025</p>
                </div>
                <div className="p-4 bg-secondary-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="w-5 h-5 text-secondary-600" />
                    <h4 className="font-semibold text-gray-900">Certification</h4>
                  </div>
                  <p className="text-sm text-gray-600">Nationally Recognized {program.level}</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                <PrimaryButton href="/auth/register">
                  Apply Now
                </PrimaryButton>
                <button
                  onClick={onClose}
                  className="px-8 py-4 text-base rounded-xl font-semibold border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}