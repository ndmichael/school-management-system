'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  CalendarRange, 
  Users, 
  Clock 
} from 'lucide-react';

import { toast } from 'react-toastify';
import { AddSessionModal } from '@/components/modals/AddSessionModal';

type SessionStatus = 'active' | 'completed' | 'upcoming';

type SessionRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  registration_start_date: string | null;
  registration_end_date: string | null;
  application_fee: number | null;
  max_applications: number | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

type SessionUI = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SessionStatus;
  currentSemester: string;
  students: number; // placeholder for now
};

function mapRowToSession(row: SessionRow): SessionUI {
  const today = new Date();
  const start = new Date(row.start_date);
  const end = new Date(row.end_date);

  let status: SessionStatus;

  if (row.is_active) {
    status = 'active';
  } else if (end < today) {
    status = 'completed';
  } else {
    status = 'upcoming';
  }

  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status,
    // You don’t have semester columns yet, so we keep a neutral label
    currentSemester: 'Academic Session',
    // You don’t have students count on this table yet, so 0 for now
    students: 0,
  };
}

export default function SessionsPage() {
  const supabase = createClient();

  const [sessions, setSessions] = useState<SessionUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch sessions from Supabase
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) {
        console.error(error);
        toast.error(error.message || 'Failed to load sessions');
      } else {
        const mapped = (data ?? []).map((row) =>
          mapRowToSession(row as SessionRow),
        );
        setSessions(mapped);
      }

      setLoading(false);
      setInitialFetchDone(true);
    };

    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) =>
      session.name.toLowerCase().includes(q),
    );
  }, [sessions, searchQuery]);

  const handleAddSession = (row: SessionRow) => {
    const ui = mapRowToSession(row);
    setSessions((prev) => [ui, ...prev]);
    toast.success(`Session created: ${ui.name}`);
  };

  const handleDelete = async (id: string) => {
    const target = sessions.find((s) => s.id === id);
    const label = target ? target.name : 'this session';

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeletingId(id);

    const { error } = await supabase.from('sessions').delete().eq('id', id);

    if (error) {
      console.error(error);
      toast.error(error.message || 'Failed to delete session');
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success(`Session deleted: ${label}`);
    }

    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const completedCount = sessions.filter(
    (s) => s.status === 'completed',
  ).length;
  const activeStudents =
    sessions.find((s) => s.status === 'active')?.students ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Academic Sessions</h2>
          <p className="mt-1 text-gray-600">
            Manage academic years and session timelines
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Session</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-600 sm:text-sm">Total Sessions</p>
          <p className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {sessions.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-600 sm:text-sm">Active</p>
          <p className="text-2xl font-bold text-red-600 sm:text-3xl">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-600 sm:text-sm">Completed</p>
          <p className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {completedCount}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <p className="mb-1 text-xs text-gray-600 sm:text-sm">
            Current Students
          </p>
          <p className="text-2xl font-bold text-purple-600 sm:text-3xl">
            {activeStudents}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 pl-12 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="hidden gap-6 md:grid md:grid-cols-2 lg:grid-cols-3">
        {loading && !initialFetchDone ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-xl border border-gray-200 bg-gray-50 animate-pulse"
              />
            ))}
          </>
        ) : filteredSessions.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-200 bg-white py-12 text-center">
            <p className="text-gray-600">No sessions found</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`group rounded-xl border-2 p-6 transition-all bg-white hover:shadow-lg ${
                session.status === 'active'
                  ? 'border-green-200 bg-green-50/40'
                  : session.status === 'completed'
                  ? 'border-slate-200'
                  : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                      session.status === 'active'
                        ? 'bg-linear-to-br from-green-500 to-emerald-500'
                        : session.status === 'completed'
                        ? 'bg-linear-to-br from-slate-500 to-slate-700'
                        : 'bg-linear-to-br from-amber-500 to-orange-500'
                    }`}
                  >
                    <CalendarRange className="h-7 w-7 text-white" />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {session.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {session.currentSemester}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    session.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : session.status === 'completed'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {session.status}
                </span>
              </div>

              <div className="mb-4 space-y-3 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDate(session.startDate)} –{' '}
                    {formatDate(session.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>
                    {session.students.toLocaleString()} Students Enrolled
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200">
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </button>
                <button className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                  <Edit className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="rounded-lg p-2 transition-colors hover:bg-red-50 disabled:cursor-not-allowed"
                  disabled={session.status === 'active' || deletingId === session.id}
                >
                  <Trash2
                    className={`h-4 w-4 ${
                      session.status === 'active' || deletingId === session.id
                        ? 'text-gray-400'
                        : 'text-red-600'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile List */}
      <div className="space-y-4 md:hidden">
        {loading && !initialFetchDone ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-gray-200 bg-gray-50 animate-pulse"
            />
          ))
        ) : filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
            <p className="text-gray-600">No sessions found</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`rounded-xl border-2 bg-white p-4 ${
                session.status === 'active'
                  ? 'border-green-200 bg-green-50/40'
                  : session.status === 'completed'
                  ? 'border-slate-200'
                  : 'border-amber-200 bg-amber-50/40'
              }`}
            >

              <div className="mb-4 flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                    session.status === 'active'
                      ? 'bg-linear-to-br from-red-500 to-rose-500'
                      : 'bg-linear-to-br from-gray-400 to-gray-500'
                  }`}
                >
                  <CalendarRange className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-bold text-gray-900">
                    {session.name}
                  </h3>
                  <p className="mb-2 text-sm text-gray-600">
                    {session.currentSemester}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      session.status === 'active'
                        ? 'bg-red-100 text-red-700'
                        : session.status === 'completed'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>

              <div className="mb-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="text-xs">
                    {formatDate(session.startDate)} –{' '}
                    {formatDate(session.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>{session.students.toLocaleString()} Students</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-gray-200 pt-4">
                <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200">
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </button>
                <button className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                  <Edit className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(session.id)}
                  className="rounded-lg p-2 transition-colors hover:bg-red-50 disabled:cursor-not-allowed"
                  disabled={session.status === 'active' || deletingId === session.id}
                >
                  <Trash2
                    className={`h-4 w-4 ${
                      session.status === 'active' || deletingId === session.id
                        ? 'text-gray-400'
                        : 'text-red-600'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Session Modal */}
      <AddSessionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={handleAddSession}
      />
    </div>
  );
}
