'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { sessionsData } from '@/data/admin';
import type { Session } from '@/data/admin';
import { Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SessionFormData) => void;
}

interface SessionFormData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  currentSemester: string;
  status: string;
  students: number;
}

interface FormData {
  name: string;
  startDate: string;
  endDate: string;
  currentSemester: string;
}

interface FormErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  currentSemester?: string;
}

export function AddSessionModal({ isOpen, onClose, onSubmit }: AddSessionModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    startDate: '',
    endDate: '',
    currentSemester: 'First Semester',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    // Validate session name format
    if (!formData.name.trim()) {
      newErrors.name = 'Session name is required';
    } else if (!/^\d{4}\/\d{4}$/.test(formData.name.trim())) {
      newErrors.name = 'Session format must be YYYY/YYYY (e.g., 2024/2025)';
    } else {
      const [year1, year2] = formData.name.split('/').map(Number);
      if (year2 !== year1 + 1) {
        newErrors.name = 'Second year must be exactly one year after first year';
      }
    }
    
    // Check for duplicate session name
    const duplicateSession = sessionsData.find(
      session => session.name === formData.name.trim()
    );
    if (duplicateSession) {
      newErrors.name = 'A session with this name already exists';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    // Validate date relationships
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
      
      // Calculate duration in days
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Academic sessions are typically 10-13 months (300-400 days)
      if (diffDays < 300) {
        newErrors.endDate = 'Session must be at least 10 months (300 days) long';
      } else if (diffDays > 400) {
        newErrors.endDate = 'Session cannot exceed 13 months (400 days)';
      }
    }
    
    // Check for overlapping sessions
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      
      const overlapping = sessionsData.find(session => {
        const sessionStart = new Date(session.startDate);
        const sessionEnd = new Date(session.endDate);
        
        return (
          (start >= sessionStart && start <= sessionEnd) ||
          (end >= sessionStart && end <= sessionEnd) ||
          (start <= sessionStart && end >= sessionEnd)
        );
      });
      
      if (overlapping) {
        newErrors.startDate = `Overlaps with existing session: ${overlapping.name}`;
      }
    }
    
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors = validate();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const sessionData: SessionFormData = {
      id: `SES${(sessionsData.length + 1).toString().padStart(3, '0')}`,
      name: formData.name.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      currentSemester: formData.currentSemester,
      status: 'active',
      students: 0,
    };

    onSubmit(sessionData);

    // Reset form
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      currentSemester: 'First Semester',
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Auto-generate session name from start date
  const handleStartDateChange = (date: string) => {
    handleInputChange('startDate', date);
    
    if (date) {
      const year = new Date(date).getFullYear();
      const sessionName = `${year}/${year + 1}`;
      setFormData(prev => ({ ...prev, startDate: date, name: sessionName }));
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  // Calculate session duration
  const calculateDuration = (): number | null => {
    if (!formData.startDate || !formData.endDate) return null;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const duration = calculateDuration();
  const semesterOptions = [
    { value: 'First Semester', label: 'First Semester' },
    { value: 'Second Semester', label: 'Second Semester' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Academic Session" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Session Guidelines</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Academic sessions must be 10-13 months long (300-400 days)</li>
              <li>Sessions cannot overlap with existing sessions</li>
              <li>Session name format: YYYY/YYYY (e.g., 2024/2025)</li>
              <li>Only one session can be active at a time</li>
            </ul>
          </div>
        </div>

        {/* Session Name */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Session Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., 2024/2025"
            className={`w-full px-4 py-3 border rounded-xl transition-all outline-none ${
              errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
            }`}
          />
          {errors.name && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.name}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Tip: Select a start date to auto-generate the session name
          </p>
        </div>

        {/* Start and End Dates */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none ${
                  errors.startDate ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                }`}
              />
            </div>
            {errors.startDate && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.startDate}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              End Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                min={formData.startDate}
                className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none ${
                  errors.endDate ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                }`}
              />
            </div>
            {errors.endDate && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.endDate}
              </p>
            )}
          </div>
        </div>

        {/* Current Semester */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Starting Semester <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.currentSemester}
            onChange={(e) => handleInputChange('currentSemester', e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
          >
            {semesterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Session Duration Preview */}
        {duration !== null && (
          <div className={`border-2 rounded-xl p-4 ${
            duration >= 300 && duration <= 400
              ? 'bg-green-50 border-green-200'
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                duration >= 300 && duration <= 400 ? 'text-green-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">Session Duration</p>
                <p className={`text-sm ${
                  duration >= 300 && duration <= 400 ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {duration} days ({Math.floor(duration / 30)} months)
                </p>
                {(duration < 300 || duration > 400) && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Recommended duration: 10-13 months (300-400 days)
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Session Preview */}
    {formData.name && formData.startDate && formData.endDate && Object.keys(errors).length === 0 && duration && duration >= 300 && duration <= 400 && (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Session Preview
        </h4>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Session Name:</span>
            <p className="font-semibold text-gray-900">{formData.name}</p>
          </div>
          <div>
            <span className="text-gray-600">Duration:</span>
            <p className="font-semibold text-gray-900">{duration} days</p>
          </div>
          <div>
            <span className="text-gray-600">Start Date:</span>
            <p className="font-semibold text-gray-900">
              {new Date(formData.startDate).toLocaleDateString('en-NG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div>
            <span className="text-gray-600">End Date:</span>
            <p className="font-semibold text-gray-900">
              {new Date(formData.endDate).toLocaleDateString('en-NG', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Action Buttons */}
    <div className="flex gap-4 pt-4 border-t border-gray-200">
      <button
        type="submit"
        className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
      >
        <CheckCircle className="w-5 h-5" />
        Add Session
      </button>
      <button
        type="button"
        onClick={onClose}
        className="px-8 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all"
      >
        Cancel
      </button>
    </div>
  </form>
</Modal>
);
}