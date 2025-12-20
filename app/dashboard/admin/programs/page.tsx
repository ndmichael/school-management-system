'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Plus,
  GraduationCap,
  Building2,
  SlidersHorizontal,
  Layers,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

import { AdminPrimaryButton } from "@/components/shared/AdminPrimaryButton";
import { Input } from '@/components/shared/Input';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';
import { AddProgramModal } from '@/components/modals/AddProgramModal';
import { EditProgramModal } from '@/components/modals/EditProgramModal';
import { ViewProgramModal } from '@/components/modals/ViewProgramModal';

type ProgramType = 'certificate' | 'diploma' | 'nd' | 'hnd' | 'post_basic';
type ProgramLevel = 'basic' | 'post_basic' | 'nd' | 'hnd';

type DepartmentSummary = {
  id: string;
  name: string;
  code: string;
};

type ProgramRow = {
  id: string;
  name: string;
  code: string;
  type: ProgramType;
  level: ProgramLevel;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  image_url: string | null;
  requirements: string | null;
  features: string[] | null;
  description: string | null;
};

type Program = ProgramRow & {
  department?: DepartmentSummary | null;
};

const programTypeLabel: Record<ProgramType, string> = {
  certificate: 'Certificate',
  diploma: 'Diploma',
  nd: 'ND',
  hnd: 'HND',
  post_basic: 'Post Basic',
};

const programLevelLabel: Record<ProgramLevel, string> = {
  basic: 'Basic',
  post_basic: 'Post Basic',
  nd: 'ND',
  hnd: 'HND',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type ProgramImageProps = {
  program: Program;
};

function ProgramImage({ program }: ProgramImageProps) {
  const [broken, setBroken] = useState(false);
  const slug = slugify(program.name);
  const initials =
    program.code?.slice(0, 4).toUpperCase() ||
    program.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();

  if (broken || !slug) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl bg-gradient-to-br from-admin-600 to-admin-700 text-lg font-semibold text-white">
        {initials}
      </div>
    );
  }

  const src = program.image_url || `/programs/${slug}.jpg`;

  return (
    <div className="relative h-28 overflow-hidden rounded-2xl bg-admin-600/10">
      <Image
        src={src}
        alt={program.name}
        fill
        sizes="(min-width: 1024px) 300px, 100vw"
        className="object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

export default function ProgramsPage() {
  const supabase = createClient();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | string>('all');
  const [selectedType, setSelectedType] = useState<'all' | ProgramType>('all');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [viewingProgram, setViewingProgram] = useState<Program | null>(null);

  useEffect(() => {
    const fetchAll = async (): Promise<void> => {
      setLoading(true);

      const [
        { data: deptData, error: deptError },
        { data: programData, error: programError },
      ] = await Promise.all([
        supabase
          .from('departments')
          .select('id, name, code')
          .order('name')
          .returns<DepartmentSummary[]>(),
        supabase
          .from('programs')
          .select('*')
          .order('created_at', { ascending: false })
          .returns<ProgramRow[]>(),
      ]);

      if (deptError) {
        console.error(deptError);
        toast.error(deptError.message || 'Failed to load departments');
      } else {
        setDepartments(deptData ?? []);
      }

      if (programError) {
        console.error(programError);
        toast.error(programError.message || 'Failed to load programs');
      } else {
        const deptMap = new Map<string, DepartmentSummary>(
          (deptData ?? []).map((d) => [d.id, d]),
        );

        const withDept: Program[] = (programData ?? []).map((p) => ({
          ...p,
          department: p.department_id ? deptMap.get(p.department_id) ?? null : null,
        }));

        setPrograms(withDept);
      }

      setLoading(false);
      setInitialFetchDone(true);
    };

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return programs.filter((prog) => {
      const matchesSearch =
        !q ||
        prog.name.toLowerCase().includes(q) ||
        prog.code.toLowerCase().includes(q) ||
        (prog.description ?? '').toLowerCase().includes(q) ||
        (prog.department?.name ?? '').toLowerCase().includes(q);

      const matchesDept =
        selectedDepartment === 'all' || prog.department_id === selectedDepartment;

      const matchesType = selectedType === 'all' || prog.type === selectedType;

      return matchesSearch && matchesDept && matchesType;
    });
  }, [programs, searchQuery, selectedDepartment, selectedType]);

  const handleDelete = async (id: string): Promise<void> => {
    const target = programs.find((p) => p.id === id);
    const label = target ? `${target.code} – ${target.name}` : 'this program';

    if (
      !window.confirm(
        `Are you sure you want to delete ${label}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(id);

    const { error } = await supabase.from('programs').delete().eq('id', id);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete program');
    } else {
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Program deleted: ${label}`);
    }

    setDeletingId(null);
  };

  const handleProgramCreated = (row: ProgramRow): void => {
    const dept = row.department_id
      ? departments.find((d) => d.id === row.department_id) ?? null
      : null;

    const program: Program = {
      ...row,
      department: dept,
    };

    setPrograms((prev) => [program, ...prev]);
    toast.success(`Program created: ${program.code} — ${program.name}`);
  };

  const handleProgramUpdated = (row: ProgramRow): void => {
    const dept = row.department_id
      ? departments.find((d) => d.id === row.department_id) ?? null
      : null;

    setPrograms((prev) =>
      prev.map((p) =>
        p.id === row.id
          ? {
              ...row,
              department: dept,
            }
          : p,
      ),
    );

    toast.success(`Program updated: ${row.code} — ${row.name}`);
  };

  const renderStatusBadge = (isActive: boolean) => {
    if (isActive) {
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
  };

  const emptyState = (
    <div className="flex h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-muted bg-muted/30 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-admin-600/10">
        <GraduationCap className="h-6 w-6 text-admin-600" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">No programs yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create academic programs under your departments. You can assign levels and
        types like Certificate, ND, HND, or Post Basic.
      </p>
      <div className="mt-4">
        <AdminPrimaryButton onClick={() => setIsAddModalOpen(true)}>
          New Program
        </AdminPrimaryButton>
      </div>
    </div>
  );

  const skeletonState = (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <Card
          key={idx}
          className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-sm"
        >
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.is_active).length;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-admin-600/5 px-3 py-1 text-xs font-medium text-admin-600">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-xl bg-admin-600/10">
              <GraduationCap className="h-3 w-3" />
            </span>
            Admin · Programs
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Programs
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Manage academic programs across departments. These programs connect
            departments to sessions and courses.
          </p>
        </div>

        <div className="flex flex-col items-end gap-3 md:flex-row md:items-center">
          {totalPrograms > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                <Layers className="h-3 w-3" />
                {totalPrograms} programs
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Active: {activePrograms}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl md:hidden"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>

            <AdminPrimaryButton
              onClick={() => setIsAddModalOpen(true)}
            >
              New program
            </AdminPrimaryButton>
          </div>
        </div>
      </div>

      {/* Filters / search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or department..."
            className="h-10 rounded-2xl bg-background/60 pl-9 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
            <SlidersHorizontal className="h-3 w-3" />
            Filters
          </span>

          {/* Department filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedDepartment}
              onChange={(e) =>
                setSelectedDepartment(e.target.value === 'all' ? 'all' : e.target.value)
              }
              className="h-8 rounded-xl border border-border bg-background px-3 text-xs outline-none transition-colors hover:border-admin-600/40 focus-visible:border-admin-600 focus-visible:ring-1 focus-visible:ring-admin-600"
            >
              <option value="all">All departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(
                  e.target.value === 'all' ? 'all' : (e.target.value as ProgramType),
                )
              }
              className="h-8 rounded-xl border border-border bg-background px-3 text-xs outline-none transition-colors hover:border-admin-600/40 focus-visible:border-admin-600 focus-visible:ring-1 focus-visible:ring-admin-600"
            >
              <option value="all">All types</option>
              <option value="certificate">Certificate</option>
              <option value="diploma">Diploma</option>
              <option value="nd">ND</option>
              <option value="hnd">HND</option>
              <option value="post_basic">Post Basic</option>
            </select>
          </div>

          {programs.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2">
                {filteredPrograms.length} visible
              </span>
              <span>·</span>
              <span>{programs.length} total</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && !initialFetchDone ? (
        skeletonState
      ) : filteredPrograms.length === 0 ? (
        emptyState
      ) : (
        <ScrollArea className="h-[calc(100vh-260px)] pr-1">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredPrograms.map((prog) => {
              const created = new Date(prog.created_at);

              return (
                <Card
                  key={prog.id}
                  className={cn(
                    'group rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm',
                    'hover:border-admin-600/60 hover:bg-card/90 hover:shadow-lg hover:shadow-admin-600/5',
                    'transition-all duration-200',
                  )}
                >
                  <CardContent className="flex flex-col gap-4 p-5">
                    <ProgramImage program={prog} />

                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="line-clamp-1 text-sm font-semibold">{prog.name}</h2>
                          {prog.department && (
                            <Badge
                              variant="outline"
                              className="border-admin-600/30 bg-admin-600/5 text-[10px] font-medium uppercase tracking-wide text-admin-600"
                            >
                              {prog.department.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                          {prog.code}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(prog.is_active)}
                        <p className="text-[11px] text-muted-foreground">
                          Created{' '}
                          {created.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {/* changed from secondary to admin to match admin theme */}
                      <Badge className="bg-admin-600/10 text-admin-700 hover:bg-admin-600/20">
                        {programTypeLabel[prog.type]}
                      </Badge>

                      <Badge variant="outline" className="border-admin-600/30 text-admin-600">
                        {programLevelLabel[prog.level]}
                      </Badge>

                      {prog.department && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {prog.department.name}
                        </span>
                      )}
                    </div>

                    {prog.description && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">
                        {prog.description}
                      </p>
                    )}

                    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-3">
                        {prog.features && prog.features.length > 0 && (
                          <span>{prog.features.length} key features</span>
                        )}
                        {prog.requirements && <span className="truncate">Admission requirements set</span>}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => setViewingProgram(prog)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => setEditingProgram(prog)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-admin-700 hover:bg-admin-50 hover:text-admin-800"
                          onClick={() => handleDelete(prog.id)}
                          disabled={deletingId === prog.id}
                        >
                          {deletingId === prog.id ? (
                            <Skeleton className="h-3 w-3 rounded-full" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 " />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <AddProgramModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleProgramCreated}
        departments={departments}
      />

      {editingProgram && (
        <EditProgramModal
          isOpen={true}
          onClose={() => setEditingProgram(null)}
          program={editingProgram}
          departments={departments}
          onUpdated={(row) => {
            handleProgramUpdated(row);
            setEditingProgram(null);
          }}
        />
      )}

      {viewingProgram && (
        <ViewProgramModal
          isOpen={true}
          onClose={() => setViewingProgram(null)}
          program={viewingProgram}
        />
      )}
    </>
  );
}
