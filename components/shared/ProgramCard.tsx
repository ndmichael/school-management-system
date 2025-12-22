'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Users, Award } from 'lucide-react';

interface ProgramCardProps {
  id?: string; // optional in case you want to build href from id later
  title: string;
  description: string;
  duration: string;
  students: number | string;
  level: string;
  image: string;
  href?: string;          // ✅ optional
  featured?: boolean;
  onSelect?: () => void;  // ✅ optional
}

export function ProgramCard({
  title,
  description,
  duration,
  students,
  level,
  image,
  href,
  featured = false,
  onSelect,
}: ProgramCardProps) {
  const safeHref = href ?? '#';

  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer bg-white rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
        featured ? 'border-primary-200 shadow-lg' : 'border-gray-200 shadow-md'
      }`}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect();
            }
          : undefined
      }
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden bg-linear-to-br from-primary-100 to-secondary-100">
        <Image
          src={image}
          alt={title}
          fill
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {featured && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-full">
            Most Popular
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
            {title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>
              {typeof students === 'number' ? `${students} Students` : students}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            <span>{level}</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={safeHref}
          onClick={(e) => {
            // If no real link, prevent useless navigation
            if (safeHref === '#') e.preventDefault();
            onSelect?.();
          }}
          className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm group-hover:gap-3 transition-all"
        >
          <span>View Program</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
