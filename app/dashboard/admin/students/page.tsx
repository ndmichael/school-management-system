'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Search, Filter, Plus, Edit, Trash2, Eye, Download, Mail, Phone, MoreVertical } from 'lucide-react';
import { studentsData, type Student } from '@/data/admin';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(studentsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Students Management</h2>
          <p className="text-gray-600 mt-1">Manage all registered students</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Students</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{students.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{students.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Suspended</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600">{students.filter(s => s.status === 'suspended').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">New This Month</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">12</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-3">
            {/* Status Filter */}
            <div className="flex-1 sm:flex-none flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>

            {/* Export */}
            <button className="inline-flex items-center gap-2 px-4 sm:px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm whitespace-nowrap">
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[300px]">Student</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Program</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Level</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <Image
                          src={student.avatar}
                          alt={student.name}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                        <p className="text-sm text-gray-600 truncate">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-900">{student.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{student.program}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
                      {student.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' :
                      student.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No students found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src={student.avatar}
                  alt={student.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{student.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{student.email}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {student.id}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    student.status === 'active' ? 'bg-green-100 text-green-700' :
                    student.status === 'suspended' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {student.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Program:</span>
                <span className="font-medium text-gray-900 text-right">{student.program}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Level:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {student.level}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => handleDelete(student.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No students found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Showing {filteredStudents.length} of {students.length} students
        </p>
        <div className="flex gap-2">
          <button className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Previous
          </button>
          <button className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
            1
          </button>
          <button className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            2
          </button>
          <button className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}