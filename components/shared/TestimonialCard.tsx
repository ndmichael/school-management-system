'use client';

import Image from 'next/image';
import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

interface TestimonialCardProps {
  name: string;
  program: string;
  year: string;
  image: string;
  content: string;
  rating: number;
  position: string;
}

export function TestimonialCard({
  name,
  program,
  year,
  image,
  content,
  rating,
  position
}: TestimonialCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="relative bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] h-full flex flex-col"
    >
      {/* Floating Quote Badge */}
      <div className="absolute -top-5 -left-5 w-14 h-14 bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl flex items-center justify-center shadow-xl">
        <Quote className="w-7 h-7 text-white" />
      </div>

      {/* Rating */}
      <div className="flex gap-1 mb-6">
        {[...Array(rating)].map((_, i) => (
          <Star
            key={i}
            className="w-5 h-5 text-yellow-400 fill-yellow-400 drop-shadow-sm"
          />
        ))}
      </div>

      {/* Content */}
      <p className="text-gray-700 leading-relaxed mb-8 text-[15px] italic">
        “{content}”
      </p>

      {/* Author */}
      <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
        <div className="relative w-16 h-16">
          <Image
            src={image}
            alt={name}
            fill
            className="rounded-full object-cover ring-4 ring-primary-50 shadow-md"
          />
          {/* Online badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-[3px] border-white shadow" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-lg">{name}</h4>
          <p className="text-sm text-gray-600">{program}</p>
          <p className="text-xs text-gray-500 mt-0.5">{position}</p>
        </div>
      </div>
    </motion.div>
  );
}
