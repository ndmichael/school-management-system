"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Clock,
  Users,
  Award,
} from "lucide-react";
import type { ReactNode } from "react";

interface ProgramCardProps {
  id?: string;
  title: string;
  description: string;
  duration: string;
  students: number | string;
  level: string;
  image: string;
  href?: string;
  featured?: boolean;
  onSelect?: () => void;

  /**
   * Keep false while enrollment data is incomplete.
   * Change to true later to show the real student count.
   */
  showStudentCount?: boolean;
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
  showStudentCount = false,
}: ProgramCardProps) {
  const safeHref = href ?? "#";

  const studentsLabel = showStudentCount
    ? formatStudentCount(students)
    : "Enrollment ongoing";

  return (
    <div
      onClick={onSelect}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        featured
          ? "border-primary-200 shadow-lg"
          : "border-gray-200 shadow-md"
      }`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <div className="relative h-56 overflow-hidden bg-linear-to-br from-primary-100 to-secondary-100">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {featured && (
          <div className="absolute right-4 top-4 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white">
            Most Popular
          </div>
        )}
      </div>

      <div className="space-y-4 p-6">
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors group-hover:text-primary-600">
            {title}
          </h3>

          <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
            {description}
          </p>
        </div>

        {/* Keep all metadata on one line */}
        <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-sm text-gray-600">
          <MetaItem
            icon={<Clock className="h-4 w-4" />}
            value={duration}
          />

          <MetaItem
            icon={<Users className="h-4 w-4" />}
            value={studentsLabel}
          />

          <MetaItem
            icon={<Award className="h-4 w-4" />}
            value={level}
          />
        </div>

        <Link
          href={safeHref}
          onClick={(event) => {
            event.stopPropagation();

            if (safeHref === "#") {
              event.preventDefault();
            }

            onSelect?.();
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition-all group-hover:gap-3"
        >
          <span>View Program</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function formatStudentCount(students: number | string): string {
  if (typeof students === "number") {
    if (students <= 0) return "Enrollment pending";

    return `${students.toLocaleString()} ${
      students === 1 ? "Student" : "Students"
    }`;
  }

  const normalized = students.trim();

  return normalized || "Enrollment pending";
}

function MetaItem({
  icon,
  value,
}: {
  icon: ReactNode;
  value: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span className="shrink-0 text-gray-500">
        {icon}
      </span>

      <span>{value || "—"}</span>
    </div>
  );
}