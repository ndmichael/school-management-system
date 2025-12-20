'use client';

import { Modal } from './Modal';
import type { SessionUI } from '@/types/session';
import { CalendarRange, Clock, Users, CreditCard, AlertCircle } from 'lucide-react';

interface ViewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionUI | null;
}

export function ViewSessionModal({ isOpen, onClose, session }: ViewSessionModalProps) {
  if (!isOpen || !session) return null;

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Not set';

  // ✅ safe optional field readers (no `any`)
  const getOptionalString = (obj: unknown, key: string): string | null => {
    if (obj && typeof obj === 'object' && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : null;
    }
    return null;
  };

  const getOptionalNumber = (obj: unknown, key: string): number | null => {
    if (obj && typeof obj === 'object' && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === 'number' ? value : null;
    }
    return null;
  };

  const registrationStartDate = getOptionalString(session, 'registrationStartDate');
  const registrationEndDate = getOptionalString(session, 'registrationEndDate');
  const applicationFee = getOptionalNumber(session, 'applicationFee');
  const maxApplications = getOptionalNumber(session, 'maxApplications');

  const shortYear = session.name.split(' ')[0];
  const subtitle = session.name.replace(shortYear, '').trim() || 'Academic Session';

  const statusLabel =
    session.status === 'active'
      ? 'Active session'
      : session.status === 'completed'
      ? 'Completed session'
      : 'Upcoming session';

  const statusColor =
    session.status === 'active'
      ? 'bg-green-100 text-green-700'
      : session.status === 'completed'
      ? 'bg-slate-100 text-slate-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session details" size="lg">
      <div className="space-y-6">
        {/* Header card */}
        <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 text-white">
            <CalendarRange className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="leading-tight">
                <h3 className="text-xl font-bold text-gray-900">{shortYear}</h3>
                <p className="text-sm text-gray-600">{subtitle}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                {session.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{statusLabel}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Session dates</span>
            </div>
            <p className="text-gray-900">
              {formatDate(session.startDate)} – {formatDate(session.endDate)}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Registration window</span>
            </div>
            {registrationStartDate && registrationEndDate ? (
              <p className="text-gray-900">
                {formatDate(registrationStartDate)} – {formatDate(registrationEndDate)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">Not configured</p>
            )}
          </div>
        </div>

        {/* Numbers */}
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 text-xs text-gray-500">Students</div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">
                {session.students.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 text-xs text-gray-500">Application fee</div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-400" />
              <span className="text-lg font-semibold text-gray-900">
                {applicationFee != null ? applicationFee.toLocaleString() : 'Not set'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 text-xs text-gray-500">Max applications</div>
            <span className="text-lg font-semibold text-gray-900">
              {maxApplications != null ? maxApplications.toLocaleString() : 'Not set'}
            </span>
          </div>
        </div>

        {/* Note */}
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <AlertCircle className="mt-0.5 h-4 w-4 text-gray-400" />
          <p>
            These settings control application windows and how this session is highlighted across
            the portal. You can change them anytime from the Edit session action.
          </p>
        </div>
      </div>
    </Modal>
  );
}
