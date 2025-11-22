'use client';

import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Calendar, Users, CheckCircle2, Clock } from 'lucide-react';
import { sessionsData, type Session } from '@/data/admin';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>(sessionsData);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(session => 
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Academic Sessions</h2>
          <p className="text-gray-600 mt-1">Manage academic years and semesters</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5" />
          <span>Add Session</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Sessions</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Active Session</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{sessions.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Completed</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{sessions.filter(s => s.status === 'completed').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Current Students</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">
            {sessions.find(s => s.status === 'active')?.students || 0}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id} className={`bg-white rounded-xl border-2 p-6 transition-all group hover:shadow-lg ${
            session.status === 'active' 
              ? 'border-green-200 bg-green-50/30' 
              : 'border-gray-200 hover:border-red-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                  session.status === 'active' 
                    ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                }`}>
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{session.name}</h3>
                  <p className="text-sm text-gray-600">{session.currentSemester}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                session.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {session.status}
              </span>
            </div>

            <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatDate(session.startDate)} - {formatDate(session.endDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>{session.students.toLocaleString()} Students Enrolled</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button 
                onClick={() => handleDelete(session.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                disabled={session.status === 'active'}
              >
                <Trash2 className={`w-4 h-4 ${session.status === 'active' ? 'text-gray-400' : 'text-red-600'}`} />
              </button>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No sessions found</p>
          </div>
        )}
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-4">
        {filteredSessions.map((session) => (
          <div key={session.id} className={`bg-white rounded-xl border-2 p-4 ${
            session.status === 'active' 
              ? 'border-green-200 bg-green-50/30' 
              : 'border-gray-200'
          }`}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                session.status === 'active' 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1">{session.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{session.currentSemester}</p>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  session.status === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {session.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs">{formatDate(session.startDate)} - {formatDate(session.endDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>{session.students.toLocaleString()} Students</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button 
                onClick={() => handleDelete(session.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                disabled={session.status === 'active'}
              >
                <Trash2 className={`w-4 h-4 ${session.status === 'active' ? 'text-gray-400' : 'text-red-600'}`} />
              </button>
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No sessions found</p>
          </div>
        )}
      </div>
    </div>
  );
}