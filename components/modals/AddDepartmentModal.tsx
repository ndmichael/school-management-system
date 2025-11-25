'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { staffData, departmentsData } from '@/data/admin';
import type { Staff, Department } from '@/data/admin';
import { Building2, Calendar, Search, AlertCircle, CheckCircle, Users } from 'lucide-react';

interface AddDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormData) => void;
}

interface DepartmentFormData {
  id: string;
  name: string;
  code: string;
  hod: string;
  staff: number;
  students: number;
  programs: number;
  status: string;
  established: string;
}

interface FormData {
  name: string;
  code: string;
  hod: string;
  established: string;
}

interface FormErrors {
  name?: string;
  code?: string;
  hod?: string;
  established?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// Searchable HOD Select Component
const SearchableHODSelect: React.FC<SearchableSelectProps> = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only academic staff for HOD position
  const academicStaff = staffData.filter(staff => staff.role === 'Academic Staff');

  const filteredStaff = academicStaff.filter((staff) =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStaff = academicStaff.find((s) => s.id === value);

  return (
    <div className="space-y-2 relative">
      <label className="block text-sm font-semibold text-gray-700">
        Head of Department <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 border rounded-xl transition-all outline-none text-left flex items-center justify-between ${
            error ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
          }`}
        >
          {selectedStaff ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={selectedStaff.avatar} 
                alt={selectedStaff.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{selectedStaff.name}</div>
                <div className="text-sm text-gray-500 truncate">{selectedStaff.position}</div>
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Search and select HOD</span>
          )}
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden">
              <div className="p-3 border-b border-gray-100 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, position, or department..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => {
                        onChange(staff.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                    >
                      <img 
                        src={staff.avatar} 
                        alt={staff.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{staff.name}</div>
                        <div className="text-sm text-gray-500 truncate">{staff.position}</div>
                        <div className="text-xs text-gray-400">{staff.department}</div>
                      </div>
                      {staff.id === value && (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No staff found</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export function AddDepartmentModal({ isOpen, onClose, onSubmit }: AddDepartmentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    hod: '',
    established: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Department name must be at least 3 characters';
    }
    
    // Check for duplicate department name
    const duplicateName = departmentsData.find(
      dept => dept.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (duplicateName) {
      newErrors.name = 'A department with this name already exists';
    }
    
    if (!formData.code.trim()) {
      newErrors.code = 'Department code is required';
    } else if (formData.code.length < 2 || formData.code.length > 5) {
      newErrors.code = 'Code must be between 2-5 characters';
    }
    
    // Check for duplicate department code
    const duplicateCode = departmentsData.find(
      dept => dept.code.toLowerCase() === formData.code.trim().toLowerCase()
    );
    if (duplicateCode) {
      newErrors.code = 'A department with this code already exists';
    }
    
    if (!formData.hod) {
      newErrors.hod = 'Head of Department is required';
    }
    
    if (!formData.established) {
      newErrors.established = 'Establishment year is required';
    } else {
      const currentYear = new Date().getFullYear();
      const year = parseInt(formData.established);
      
      if (year < 1900 || year > currentYear) {
        newErrors.established = `Year must be between 1900 and ${currentYear}`;
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

    const selectedStaff = staffData.find(s => s.id === formData.hod);
    
    const departmentData: DepartmentFormData = {
      id: `DEPT${(departmentsData.length + 1).toString().padStart(3, '0')}`,
      name: formData.name.trim(),
      code: formData.code.toUpperCase().trim(),
      hod: selectedStaff?.name || '',
      staff: 0,
      students: 0,
      programs: 0,
      status: 'active',
      established: formData.established,
    };

    onSubmit(departmentData);

    // Reset form
    setFormData({ name: '', code: '', hod: '', established: '' });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const currentYear = new Date().getFullYear();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Department" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Department Guidelines</p>
            <p className="text-blue-700">
              Only academic staff can be assigned as Head of Department. Department codes must be unique and typically 3-5 characters.
            </p>
          </div>
        </div>

        {/* Department Name and Code */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Department Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Medical Laboratory Science"
                className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none ${
                  errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Department Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
              placeholder="e.g., MLS"
              maxLength={5}
              className={`w-full px-4 py-3 border rounded-xl transition-all outline-none uppercase ${
                errors.code ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              }`}
            />
            {errors.code && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.code}
              </p>
            )}
            {formData.code && !errors.code && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Code: {formData.code.toUpperCase()}
              </p>
            )}
          </div>
        </div>

        {/* HOD Selection */}
        <SearchableHODSelect
          value={formData.hod}
          onChange={(value) => handleInputChange('hod', value)}
          error={errors.hod}
        />

        {/* Year Established */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Year Established <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={formData.established}
              onChange={(e) => handleInputChange('established', e.target.value)}
              placeholder={`e.g., ${currentYear - 10}`}
              min="1900"
              max={currentYear}
              className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none ${
                errors.established ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              }`}
            />
          </div>
          {errors.established && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.established}
            </p>
          )}
        </div>

        {/* Preview */}
        {formData.name && formData.code && formData.hod && formData.established && Object.keys(errors).length === 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Department Preview
            </h4>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <p className="font-semibold text-gray-900">{formData.name}</p>
              </div>
              <div>
                <span className="text-gray-600">Code:</span>
                <p className="font-semibold text-gray-900">{formData.code.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-gray-600">HOD:</span>
                <p className="font-semibold text-gray-900">
                  {staffData.find(s => s.id === formData.hod)?.name}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Established:</span>
                <p className="font-semibold text-gray-900">{formData.established}</p>
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
            Add Department
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