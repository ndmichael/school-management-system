'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Input, Select } from '@/components/shared';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function AddStaffModal({ isOpen, onClose, onSubmit }: AddStaffModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    role: 'Academic Staff',
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
      id: `STF${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      ...formData,
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
      avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${formData.name}&backgroundColor=c0aede`
    });
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      role: 'Academic Staff',
    });
    onClose();
  };

  const departmentOptions = [
    { value: 'Medical Laboratory Science', label: 'Medical Laboratory Science' },
    { value: 'Community Health', label: 'Community Health' },
    { value: 'Pharmacy Technology', label: 'Pharmacy Technology' },
    { value: 'Environmental Health', label: 'Environmental Health' },
    { value: 'Administration', label: 'Administration' },
  ];

  const roleOptions = [
    { value: 'Academic Staff', label: 'Academic Staff' },
    { value: 'Non-Academic Staff', label: 'Non-Academic Staff' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Staff Member" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Dr. John Doe"
          required
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john.doe@syk.edu.ng"
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
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            options={departmentOptions}
            required
          />
          <Select
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
            required
          />
        </div>

        <Input
          label="Position"
          name="position"
          value={formData.position}
          onChange={handleChange}
          placeholder="e.g., Senior Lecturer, Admin Officer"
          required
        />

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
          >
            Add Staff
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