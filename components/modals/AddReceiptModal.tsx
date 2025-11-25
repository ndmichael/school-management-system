'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { DollarSign, Search, CreditCard, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { studentsData, sessionsData } from '@/data/admin';
import type { Student, Session } from '@/data/admin';

interface AddReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptFormData) => void;
}

interface ReceiptFormData {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  date: string;
  status: string;
  semester: string;
}

interface FormData {
  studentId: string;
  amount: string;
  paymentType: string;
  paymentMethod: string;
  semester: string;
  date: string;
}

interface FormErrors {
  studentId?: string;
  amount?: string;
  paymentType?: string;
  paymentMethod?: string;
  semester?: string;
  date?: string;
}

interface SearchableStudentSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// Searchable Student Select Component
const SearchableStudentSelect: React.FC<SearchableStudentSelectProps> = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = studentsData.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.program.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = studentsData.find((s) => s.id === value);

  return (
    <div className="space-y-2 relative">
      <label className="block text-sm font-semibold text-gray-700">
        Select Student <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-3 border rounded-xl transition-all outline-none text-left flex items-center justify-between ${
            error ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
          }`}
        >
          {selectedStudent ? (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={selectedStudent.avatar} 
                alt={selectedStudent.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{selectedStudent.name}</div>
                <div className="text-sm text-gray-500 truncate">{selectedStudent.id} • {selectedStudent.level}</div>
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Search and select student</span>
          )}
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-hidden">
              <div className="p-3 border-b border-gray-100 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, ID, email, or program..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        onChange(student.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-3"
                    >
                      <img 
                        src={student.avatar} 
                        alt={student.name}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500 truncate">{student.id} • {student.program}</div>
                        <div className="text-xs text-gray-400">{student.level} • {student.status}</div>
                      </div>
                      {student.id === value && (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-12 text-center text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No students found</p>
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

export function AddReceiptModal({ isOpen, onClose, onSubmit }: AddReceiptModalProps) {
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    amount: '',
    paymentType: '',
    paymentMethod: '',
    semester: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};
    
    if (!formData.studentId) {
      newErrors.studentId = 'Student selection is required';
    }
    
    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (isNaN(parseFloat(formData.amount))) {
      newErrors.amount = 'Amount must be a valid number';
    }
    
    if (!formData.paymentType) {
      newErrors.paymentType = 'Payment type is required';
    }
    
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    
    if (!formData.semester) {
      newErrors.semester = 'Semester is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Payment date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        newErrors.date = 'Payment date cannot be in the future';
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

    const selectedStudent = studentsData.find(s => s.id === formData.studentId);
    const currentYear = new Date().getFullYear();
    const receiptNo = `RCP-${currentYear}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const receiptData: ReceiptFormData = {
      id: `RCP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      receiptNo,
      studentId: formData.studentId,
      studentName: selectedStudent?.name || '',
      amount: parseFloat(formData.amount),
      paymentType: formData.paymentType,
      paymentMethod: formData.paymentMethod,
      date: formData.date,
      status: 'verified',
      semester: formData.semester,
    };

    onSubmit(receiptData);

    // Reset form
    setFormData({
      studentId: '',
      amount: '',
      paymentType: '',
      paymentMethod: '',
      semester: '',
      date: new Date().toISOString().split('T')[0],
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const paymentTypes = [
    { value: 'Tuition Fee', label: 'Tuition Fee' },
    { value: 'Acceptance Fee', label: 'Acceptance Fee' },
    { value: 'Registration Fee', label: 'Registration Fee' },
    { value: 'Examination Fee', label: 'Examination Fee' },
    { value: 'Laboratory Fee', label: 'Laboratory Fee' },
    { value: 'Library Fee', label: 'Library Fee' },
    { value: 'Hostel Fee', label: 'Hostel Fee' },
    { value: 'Medical Fee', label: 'Medical Fee' },
    { value: 'Sports Fee', label: 'Sports Fee' },
    { value: 'ID Card Fee', label: 'ID Card Fee' },
    { value: 'Clearance Fee', label: 'Clearance Fee' },
    { value: 'Transcript Fee', label: 'Transcript Fee' },
    { value: 'Other', label: 'Other' },
  ];

  const paymentMethods = [
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Online Payment', label: 'Online Payment (Paystack/Flutterwave)' },
    { value: 'POS', label: 'POS Payment' },
    { value: 'Cash', label: 'Cash Payment' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'Mobile Money', label: 'Mobile Money (Opay/Palmpay)' },
  ];

  // Get active sessions and format for dropdown
  const activeSessions = sessionsData
    .filter(s => s.status === 'active')
    .map(s => ({
      value: `${s.currentSemester} ${s.name}`,
      label: `${s.currentSemester} ${s.name}`
    }));

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-NG', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  };

  const selectedStudent = studentsData.find(s => s.id === formData.studentId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Payment Receipt" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Receipt Information</p>
            <p className="text-blue-700">
              All receipts are automatically verified upon generation. Students will receive email confirmation of payment.
            </p>
          </div>
        </div>

        {/* Student Selection */}
        <SearchableStudentSelect
          value={formData.studentId}
          onChange={(value) => handleInputChange('studentId', value)}
          error={errors.studentId}
        />

        {/* Payment Type and Amount */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Payment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.paymentType}
              onChange={(e) => handleInputChange('paymentType', e.target.value)}
              className={`w-full px-4 py-3 border rounded-xl transition-all outline-none ${
                errors.paymentType ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
              }`}
            >
              <option value="">Select payment type</option>
              {paymentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.paymentType && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.paymentType}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Amount (₦) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="e.g., 150000"
                min="0"
                step="0.01"
                className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none ${
                  errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.amount}
              </p>
            )}
            {formData.amount && parseFloat(formData.amount) > 0 && !errors.amount && (
              <p className="text-sm text-green-600 font-medium">
                ₦{formatCurrency(formData.amount)}
              </p>
            )}
          </div>
        </div>

        {/* Payment Method and Date */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none appearance-none ${
                  errors.paymentMethod ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                }`}
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.paymentMethod && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.paymentMethod}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full pl-11 px-4 py-3 border rounded-xl transition-all outline-none ${
                  errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
                }`}
              />
            </div>
            {errors.date && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.date}
              </p>
            )}
          </div>
        </div>

        {/* Semester/Session */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Semester/Session <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.semester}
            onChange={(e) => handleInputChange('semester', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl transition-all outline-none ${
              errors.semester ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent'
            }`}
          >
            <option value="">Select semester/session</option>
            {activeSessions.length > 0 ? (
              activeSessions.map((session) => (
                <option key={session.value} value={session.value}>
                  {session.label}
                </option>
              ))
            ) : (
              <option value="" disabled>No active sessions available</option>
            )}
          </select>
          {errors.semester && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.semester}
            </p>
          )}
        </div>

        {/* Receipt Preview */}
        {selectedStudent && formData.amount && parseFloat(formData.amount) > 0 && (
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-2 border-red-200 rounded-xl p-5 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Receipt Preview
            </h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Student Name</span>
                  <p className="font-semibold text-gray-900 text-lg">{selectedStudent.name}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Student ID</span>
                  <p className="font-mono font-semibold text-gray-700">{selectedStudent.id}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Program</span>
                  <p className="font-medium text-gray-700">{selectedStudent.program}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Amount</span>
                  <p className="font-bold text-2xl text-red-600">
                    ₦{formatCurrency(formData.amount)}
                  </p>
                </div>
                {formData.paymentType && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Payment Type</span>
                    <p className="font-semibold text-gray-900">{formData.paymentType}</p>
                  </div>
                )}
                {formData.paymentMethod && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Payment Method</span>
                    <p className="font-medium text-gray-700">{formData.paymentMethod}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:shadow-xl"
          >
            <CheckCircle className="w-5 h-5" />
            Generate Receipt
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