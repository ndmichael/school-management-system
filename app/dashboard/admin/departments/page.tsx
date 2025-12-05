// app/(dashboard)/admin/departments/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Plus,
  Building2,
  Users,
  BookOpen,
  Edit,
  Trash2,
} from 'lucide-react';

import { PrimaryButton } from '@/components/shared/PrimaryButton';
import { AddDepartmentModal } from '@/components/modals/AddDepartmentModal';
import { EditDepartmentModal } from '@/components/modals/EditDepartmentModal';

// use your shared Input
import { Input } from '@/components/shared/Input';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-toastify';
import { cn } from '@/lib/utils';


type Department = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hod_profile_id: string | null;
};


export default function DepartmentsPage() {
  const supabase = createClient();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);


  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        toast.error(error.message || 'Failed to load departments');
      } else {
        setDepartments((data ?? []) as Department[]);
      }

      setLoading(false);
      setInitialFetchDone(true);
    };

    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;

    return departments.filter((dept) => {
      return (
        dept.name.toLowerCase().includes(q) ||
        dept.code.toLowerCase().includes(q) ||
        (dept.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [departments, searchQuery]);

  const handleDelete = async (id: string) => {
    const target = departments.find((d) => d.id === id);
    const label = target ? `${target.code} – ${target.name}` : 'this department';

    if (
      !window.confirm(
        `Are you sure you want to delete ${label}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(id);

    const { error } = await supabase.from('departments').delete().eq('id', id);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete department');
    } else {
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      toast.success(`Department deleted: ${label}`);
    }

    setDeletingId(null);
  };

  const handleCreated = (dept: Department) => {
    setDepartments((prev) => [dept, ...prev]);
    toast.success(`Department created: ${dept.code} — ${dept.name}`);
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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
        <Building2 className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">
        No departments yet
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Start by creating your first department. You can always edit or add
        more later.
      </p>
      <div className="mt-4">
        <PrimaryButton onClick={() => setIsAddModalOpen(true)}>
          Create department
        </PrimaryButton>
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-3 w-3" />
            </span>
            Admin · Structure
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Departments
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Manage academic departments for your health school. These
            departments will be used to organize programs, sessions, and
            courses.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-2xl md:hidden"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>

          <PrimaryButton
            className="hidden md:inline-flex"
            onClick={() => setIsAddModalOpen(true)}
          >
            New department
          </PrimaryButton>
        </div>
      </div>

      {/* Filters / search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, code, or description..."
            trailingIcon={<Search className="h-4 w-4" />}
            className="h-10 rounded-2xl bg-background/60 text-sm"
            aria-label="Search departments"
          />
        </div>

        {departments.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-6 items-center rounded-full bg-muted px-2">
              {filteredDepartments.length} visible
            </span>
            <span>·</span>
            <span>{departments.length} total</span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading && !initialFetchDone ? (
        skeletonState
      ) : filteredDepartments.length === 0 ? (
        emptyState
      ) : (
        <ScrollArea className="h-[calc(100vh-260px)] pr-1">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredDepartments.map((dept) => {
              const initials =
                dept.code?.slice(0, 3).toUpperCase() ||
                dept.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 3)
                  .toUpperCase();

              const created = new Date(dept.created_at);

              return (
                <Card
                  key={dept.id}
                  className={cn(
                    'group rounded-3xl border border-border/60 bg-card/70 backdrop-blur-sm',
                    'hover:border-primary/60 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/5',
                    'transition-all duration-200'
                  )}
                >
                  <CardContent className="flex flex-col gap-4 p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-xs font-semibold text-primary">
                          {initials}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h2 className="line-clamp-1 text-sm font-semibold">
                              {dept.name}
                            </h2>
                          </div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {dept.code}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {renderStatusBadge(dept.is_active)}
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

                    {/* Description */}
                    {dept.description && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">
                        {dept.description}
                      </p>
                    )}

                    {/* Footer meta */}
                    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>Students</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Courses</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          onClick={() => setEditingDept(dept)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(dept.id)}
                          disabled={deletingId === dept.id}
                        >
                          {deletingId === dept.id ? (
                            <Skeleton className="h-3 w-3 rounded-full" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create department modal 
         NOTE: if your AddDepartmentModal has different props 
         (e.g. isOpen / onClose / onSuccess), either:
         - update that component to accept open/onOpenChange/onCreated, OR
         - adjust this call accordingly.
      */}
      

      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={(dept) => {
          setDepartments((prev) => [dept, ...prev]);
          // extra toast is optional; modal already toasts
          toast.success(`Department created: ${dept.code} — ${dept.name}`);
        }}
      />

      {editingDept && (
      <EditDepartmentModal
        department={editingDept}
        onClose={() => setEditingDept(null)}
        onSaved={(updated) => {
          setDepartments((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
          setEditingDept(null);
        }}
      />
    )}



    </>
  );
}
