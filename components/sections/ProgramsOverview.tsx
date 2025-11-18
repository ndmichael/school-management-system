'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { programs } from '@/data';
import { SectionHeader, ProgramCard } from '@/components/shared';

export function ProgramsOverview() {
  return (
    <section className="py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        
        <SectionHeader
          badge="Our Programs"
          title="Explore Healthcare Programs"
          description="Choose from our comprehensive range of accredited health technology programs designed to prepare you for a successful healthcare career."
          centered
        />

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program) => (
            <ProgramCard key={program.id} {...program} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            <span>View All Programs</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}