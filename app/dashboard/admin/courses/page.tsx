'use client';

import { useState } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Eye, Download, BookOpen, Users } from 'lucide-react';
import { coursesData, type Course } from '@/data/admin';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>(coursesData);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState<string>('all');

  const programs = ['all', ...Array.from(new Set(courses.map(c => c.program)))];

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesProgram = filterProgram === 'all' || course.program === filterProgram;
    
    return matchesSearch && matchesProgram;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Courses Management</h2>
          <p className="text-gray-600 mt-1">Manage all courses and curriculum</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Courses</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{courses.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Active</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">{courses.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Students</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{courses.reduce((acc, c) => acc + c.students, 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Credits</p>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600">{courses.reduce((acc, c) => acc + c.credits, 0)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 sm:flex-none flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
              >
                {programs.map(prog => (
                  <option key={prog} value={prog}>
                    {prog === 'all' ? 'All Programs' : prog}
                  </option>
                ))}
              </select>
            </div>

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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[250px]">Course Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Program</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Level</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Credits</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Students</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-gray-900">{course.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{course.title}</p>
                      <p className="text-sm text-gray-600">{course.instructor}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{course.program}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full whitespace-nowrap">
                      {course.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-900">{course.credits}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{course.students}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      {course.status}
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
                        onClick={() => handleDelete(course.id)}
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

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No courses found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{course.instructor}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold">
                    {course.code}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    {course.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Program:</span>
                <span className="font-medium text-gray-900 text-right text-xs">{course.program}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Level:</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {course.level}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Credits:</span>
                <span className="font-medium text-gray-900">{course.credits}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Students:</span>
                <span className="font-medium text-gray-900">{course.students}</span>
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
                onClick={() => handleDelete(course.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No courses found</p>
          </div>
        )}
      </div>
    </div>
  );
}