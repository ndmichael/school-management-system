'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Modal } from './Modal';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Building2,
  Info,
} from 'lucide-react';

type ProgramType = 'Certificate' | 'Diploma' | 'Higher Diploma'
type ProgramLevel = 'Cert' | 'ND' | 'HND';

type DepartmentSummary = {
  id: string;
  name: string;
  code: string;
};

type ProgramForView = {
  id: string;
  name: string;
  code: string;
  type: ProgramType;
  level: ProgramLevel;
  department?: DepartmentSummary | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  requirements: string | null;
  features: string[] | null;
  description: string | null;
};

interface ViewProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: ProgramForView;
}

const programTypeLabel: Record<ProgramType, string> = {
  Certificate: 'Certificate',
  Diploma: 'Diploma',
  'Higher Diploma' : 'Higher Diploma'
}

const programLevelLabel: Record<ProgramLevel, string> = {
  Cert: 'Cert',
  ND: 'ND',
  HND: 'HND'
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/20">
      Inactive
    </Badge>
  );
}

export function ViewProgramModal({
  isOpen,
  onClose,
  program,
}: ViewProgramModalProps) {
  const [brokenImage, setBrokenImage] = useState(false);

  if (!isOpen) return null;

  const slug = slugify(program.name);
  const initials =
    program.code?.slice(0, 4).toUpperCase() ||
    program.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();

  const created = new Date(program.created_at);
  const updated = new Date(program.updated_at);

  const imageSrc = program.image_url || `/programs/${slug}.jpg`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Program details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header: title + status */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              Program overview
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {program.name}
              </h2>
              <p className="mt-0.5 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {program.code}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <StatusBadge active={program.is_active} />
            <p className="text-[11px] text-muted-foreground">
              Created{' '}
              {created.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Last updated{' '}
              {updated.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Image / visual */}
        <div className="relative h-32 w-full overflow-hidden rounded-2xl bg-primary-600/10">
          {brokenImage ? (
            <div className="flex h-full items-center justify-center bg-linear-to-br from-primary-600 to-primary-700 text-xl font-semibold text-white">
              {initials}
            </div>
          ) : (
            <Image
              src={imageSrc}
              alt={program.name}
              fill
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
              onError={() => setBrokenImage(true)}
            />
          )}
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge className="bg-secondary-500/10 text-secondary-700 hover:bg-secondary-500/20">
            {programTypeLabel[program.type]}
          </Badge>
          <Badge variant="outline" className="border-primary/30 text-primary">
            {programLevelLabel[program.level]}
          </Badge>
          {program.department && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[10px] text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {program.department.name} ({program.department.code})
            </span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            Description
          </h3>
          <p className="text-sm text-muted-foreground">
            {program.description
              ? program.description
              : 'No description has been added for this program yet.'}
          </p>
        </div>

        {/* Key details */}
        <div className="grid gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide">
              Type
            </p>
            <p className="mt-1 text-sm text-foreground">
              {programTypeLabel[program.type]}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide">
              Level
            </p>
            <p className="mt-1 text-sm text-foreground">
              {programLevelLabel[program.level]}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide">
              Department
            </p>
            <p className="mt-1 text-sm text-foreground">
              {program.department
                ? `${program.department.name} (${program.department.code})`
                : 'None assigned'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide">
              Status
            </p>
            <p className="mt-1 text-sm text-foreground">
              {program.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Admission requirements
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {program.requirements
              ? program.requirements
              : 'No admission requirements have been configured yet.'}
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Key features
          </h3>
          {program.features && program.features.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {program.features.map((f, idx) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No key features have been added yet.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
