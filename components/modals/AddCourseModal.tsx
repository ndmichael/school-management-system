'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Input, Select } from '@/components/shared';
import { programs } from '@/data/programs';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function AddCourseModal({ isOpen, onClose, onSubmit }: AddCourseModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    program: '',
    level: '100 Level',
    credits: '2',
    semester: 'First Semester',
    instructor: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: `CRS${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      ...formData,
      credits: parseInt(formData.credits),
      students: 0,
      status: 'active'
    });
    setFormData({
      code: '',
      title: '',
      program: '',
      level: '100 Level',
      credits: '2',
      semester: 'First Semester',
      instructor: '',
    });
    onClose();
  };

  const programOptions = programs.map(p => ({
    value: p.title,
    label: p.title
  }));

  const levelOptions = [
    { value: '100 Level', label: '100 Level' },
    { value: '200 Level', label: '200 Level' },
    { value: '300 Level', label: '300 Level' },
  ];

  const semesterOptions = [
    { value: 'First Semester', label: 'First Semester' },
    { value: 'Second Semester', label: 'Second Semester' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Course" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Course Code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="MLS301"
            required
          />
          <Input
            label="Credits"
            name="credits"
            type="number"
            min="1"
            max="6"
            value={formData.credits}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Course Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Clinical Chemistry II"
          required
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Program"
            name="program"
            value={formData.program}
            onChange={handleChange}
            options={programOptions}
            required
          />
          <Select
            label="Level"
            name="level"
            value={formData.level}
            onChange={handleChange}
            options={levelOptions}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Semester"
            name="semester"
            value={formData.semester}
            onChange={handleChange}
            options={semesterOptions}
            required
          />
          <Input
            label="Instructor"
            name="instructor"
            value={formData.instructor}
            onChange={handleChange}
            placeholder="Dr. Adebayo Johnson"
            required
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Add Course
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}