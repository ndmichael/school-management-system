'use client';

import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Eye, Building2, Users, BookOpen } from 'lucide-react';
import { departmentsData, type Department } from '@/data/admin';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>(departmentsData);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dept.hod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      setDepartments(departments.filter(d => d.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
          <p className="text-gray-600 mt-1">Manage academic departments</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Departments</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{departments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Staff</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">{departments.reduce((acc, d) => acc + d.staff, 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Students</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{departments.reduce((acc, d) => acc + d.students, 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{departments.filter(d => d.status === 'active').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((dept) => (
          <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-red-200 hover:shadow-lg transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {dept.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{dept.name}</h3>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-mono font-semibold">{dept.code}</span> • Est. {dept.established}
            </p>

            <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Head of Department:</span>
                <span className="font-medium text-gray-900 text-xs text-right">{dept.hod}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  <p className="text-lg font-bold text-gray-900">{dept.staff}</p>
                </div>
                <p className="text-xs text-gray-600">Staff</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <p className="text-lg font-bold text-gray-900">{dept.students}</p>
                </div>
                <p className="text-xs text-gray-600">Students</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <p className="text-lg font-bold text-gray-900">{dept.programs}</p>
                </div>
                <p className="text-xs text-gray-600">Programs</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <button 
                onClick={() => handleDelete(dept.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {filteredDepartments.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No departments found</p>
          </div>
        )}
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-4">
        {filteredDepartments.map((dept) => (
          <div key={dept.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{dept.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-mono font-semibold">{dept.code}</span> • Est. {dept.established}
                </p>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  {dept.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">HOD:</span>
                <span className="font-medium text-gray-900 text-right text-xs">{dept.hod}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{dept.staff}</p>
                  <p className="text-xs text-gray-600">Staff</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{dept.students}</p>
                  <p className="text-xs text-gray-600">Students</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{dept.programs}</p>
                  <p className="text-xs text-gray-600">Programs</p>
                </div>
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
                onClick={() => handleDelete(dept.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {filteredDepartments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No departments found</p>
          </div>
        )}
      </div>
    </div>
  );
}