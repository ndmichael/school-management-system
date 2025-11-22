'use client';

import { useState } from 'react';
import { Download, FileText, Calendar, TrendingUp, Users, DollarSign, BookOpen, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('this-month');

  const reportCategories = [
    {
      title: 'Student Reports',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      reports: [
        { name: 'Student Enrollment Report', description: 'Complete list of enrolled students' },
        { name: 'Student Performance Report', description: 'Academic performance analysis' },
        { name: 'Attendance Report', description: 'Student attendance records' },
        { name: 'Graduation Report', description: 'List of graduating students' },
      ]
    },
    {
      title: 'Financial Reports',
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      reports: [
        { name: 'Revenue Report', description: 'Total revenue and income breakdown' },
        { name: 'Payment Report', description: 'Student payment records' },
        { name: 'Outstanding Fees Report', description: 'Unpaid tuition and fees' },
        { name: 'Expense Report', description: 'Operational expenses' },
      ]
    },
    {
      title: 'Academic Reports',
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600',
      reports: [
        { name: 'Course Enrollment Report', description: 'Students per course' },
        { name: 'Grade Distribution Report', description: 'Grade analysis by course' },
        { name: 'Faculty Performance Report', description: 'Staff teaching metrics' },
        { name: 'Program Statistics', description: 'Program-wise analysis' },
      ]
    },
    {
      title: 'Administrative Reports',
      icon: BarChart3,
      color: 'from-orange-500 to-orange-600',
      reports: [
        { name: 'Department Report', description: 'Department-wise statistics' },
        { name: 'Staff Report', description: 'Complete staff records' },
        { name: 'Session Summary', description: 'Academic session overview' },
        { name: 'Custom Report', description: 'Generate custom reports' },
      ]
    },
  ];

  const quickStats = [
    { label: 'Reports Generated', value: '156', change: '+12%', icon: FileText },
    { label: 'This Month', value: '24', change: '+8%', icon: Calendar },
    { label: 'Downloads', value: '892', change: '+15%', icon: Download },
    { label: 'Categories', value: '4', change: '0%', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-600 mt-1">Generate and download various reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-green-600">{stat.change}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Report Period:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
          >
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-semester">This Semester</option>
            <option value="this-year">This Academic Year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category, catIndex) => {
          const CategoryIcon = category.icon;
          return (
            <div key={catIndex} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}>
                  <CategoryIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {category.reports.map((report, repIndex) => (
                  <div key={repIndex} className="group p-4 border border-gray-200 rounded-xl hover:border-red-200 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-red-600 transition-colors">
                      {report.name}
                    </h4>
                    <p className="text-xs text-gray-600">{report.description}</p>
                    <button className="mt-3 w-full px-3 py-2 bg-gray-100 hover:bg-red-600 hover:text-white text-sm font-medium rounded-lg transition-all">
                      Generate Report
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recently Generated</h3>
        <div className="space-y-3">
          {[
            { name: 'Student Enrollment Report - Nov 2024', date: '2 hours ago', size: '2.4 MB' },
            { name: 'Revenue Report - Q4 2024', date: '1 day ago', size: '1.8 MB' },
            { name: 'Grade Distribution Report', date: '3 days ago', size: '3.2 MB' },
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{report.name}</p>
                  <p className="text-xs text-gray-600">{report.date} • {report.size}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-white rounded-lg transition-colors">
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}