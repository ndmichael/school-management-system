'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Input, Select } from '@/components/shared';
import { programs } from '@/data/programs';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function AddStudentModal({ isOpen, onClose, onSubmit }: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    program: '',
    level: '100 Level',
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
      id: `STU${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      program: formData.program,
      level: formData.level,
      status: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${formData.firstName}&backgroundColor=b6e3f4`
    });
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      program: '',
      level: '100 Level',
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Student" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john.doe@student.syk.edu.ng"
            required
          />
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+234 800 000 0000"
            required
          />
        </div>

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

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Add Student
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