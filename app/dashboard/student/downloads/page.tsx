'use client';

import { useState } from 'react';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Download } from 'lucide-react';

interface DownloadFile {
  id: string;
  course: string;
  title: string;
  type: string;
  uploadDate: string;
  size: string;
  url: string;
  semester: string;
}

const mockDownloads: DownloadFile[] = [
  {
    id: 'DL001',
    course: 'Clinical Chemistry II',
    title: 'Practical Lab Manual',
    type: 'PDF',
    uploadDate: '2024-09-10',
    size: '2.3MB',
    url: '/downloads/clinical-chemistry-lab.pdf',
    semester: 'First Semester 2024/2025',
  },
  {
    id: 'DL002',
    course: 'Medical Microbiology',
    title: 'Lecture Slides',
    type: 'PDF',
    uploadDate: '2024-09-12',
    size: '1.8MB',
    url: '/downloads/medical-microbiology-slides.pdf',
    semester: 'First Semester 2024/2025',
  },
  {
    id: 'DL003',
    course: 'Hematology',
    title: 'Assignment 1',
    type: 'DOCX',
    uploadDate: '2024-09-15',
    size: '120KB',
    url: '/downloads/hematology-assignment.docx',
    semester: 'First Semester 2024/2025',
  },
];

export default function StudentDownloadsPage() {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [search, setSearch] = useState('');

  const coursesOptions = Array.from(new Set(mockDownloads.map(d => d.course))).map(course => ({
    value: course,
    label: course,
  }));

  const semesterOptions = Array.from(new Set(mockDownloads.map(d => d.semester))).map(sem => ({
    value: sem,
    label: sem,
  }));

  const filteredDownloads = mockDownloads.filter(file => {
    return (
      (selectedCourse ? file.course === selectedCourse : true) &&
      (selectedSemester ? file.semester === selectedSemester : true) &&
      (search ? file.title.toLowerCase().includes(search.toLowerCase()) : true)
    );
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Downloads</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select
          label="Course"
          options={coursesOptions}
          value={selectedCourse}
          onChange={(value) => setSelectedCourse(value)}
        />
        <Select
          label="Semester"
          options={semesterOptions}
          value={selectedSemester}
          onChange={(value) => setSelectedCourse(value)}
        />
        <Input
          label="Search"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Course</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Uploaded On</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Size</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDownloads.map(file => (
                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{file.course}</td>
                  <td className="px-6 py-4">{file.title}</td>
                  <td className="px-6 py-4">{file.type}</td>
                  <td className="px-6 py-4">{file.uploadDate}</td>
                  <td className="px-6 py-4">{file.size}</td>
                  <td className="px-6 py-4">
                    <a
                      href={file.url}
                      download
                      className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDownloads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No files found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredDownloads.map(file => (
          <div key={file.id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            <p className="font-semibold text-gray-900">{file.title}</p>
            <p className="text-sm text-gray-600">{file.course} | {file.type} | {file.size}</p>
            <p className="text-xs text-gray-500">{file.uploadDate}</p>
            <a
              href={file.url}
              download
              className="mt-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors text-center flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          </div>
        ))}
        {filteredDownloads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No files found</p>
          </div>
        )}
      </div>
    </div>
  );
}
