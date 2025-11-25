'use client';

import { useState } from 'react';
import Image from 'next/image';
import { studentPayments } from '@/data/student';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';
import { Textarea } from '@/components/shared/Textarea';
import { Eye, Upload } from 'lucide-react';
import { format } from 'date-fns';

export default function StudentPaymentsPage() {
  const [filterSemester, setFilterSemester] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Unique semesters for filter dropdown
  const semesters = Array.from(new Set(studentPayments.map(p => p.semester)));

  // Filter payments
  const filteredPayments = studentPayments.filter(p => {
    return (
      (filterSemester ? p.semester === filterSemester : true) &&
      (statusFilter ? p.status === statusFilter : true)
    );
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentProof) return alert('Please select a file');

    setSubmitting(true);

    // simulate upload
    setTimeout(() => {
      alert('Payment proof submitted successfully!');
      setPaymentProof(null);
      setDescription('');
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            label="Filter by Semester"
            options={[...semesters].map(s => ({ value: s, label: s }))}
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
          />
          <Select
            label="Filter by Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Receipt No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Payment Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Semester</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{payment.receiptNo || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">₦{payment.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{payment.paymentType}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{payment.semester}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      payment.status === 'verified' ? 'bg-green-100 text-green-700' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(payment.date), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No payments found for the selected filters</p>
          </div>
        )}
      </div>

      {/* Mobile Table-like Cards */}
      <div className="lg:hidden space-y-4">
        {filteredPayments.map(payment => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-900">{payment.paymentType}</span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                payment.status === 'verified' ? 'bg-green-100 text-green-700' :
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
              <div><span className="font-semibold">Receipt:</span> {payment.receiptNo || 'N/A'}</div>
              <div><span className="font-semibold">Amount:</span> ₦{payment.amount.toLocaleString()}</div>
              <div><span className="font-semibold">Semester:</span> {payment.semester}</div>
              <div><span className="font-semibold">Date:</span> {format(new Date(payment.date), 'dd MMM yyyy')}</div>
            </div>
          </div>
        ))}

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No payments found for the selected filters</p>
          </div>
        )}
      </div>

      {/* Upload Payment Proof Form */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Upload Payment Proof
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <Select
            label="Payment Type"
            options={[
              { value: 'Tuition Fee', label: 'Tuition Fee' },
              { value: 'Laboratory Fee', label: 'Laboratory Fee' },
              { value: 'Library Fee', label: 'Library Fee' },
              { value: 'Other', label: 'Other' },
            ]}
            required
          />

          <Input
            label="Select File"
            type="file"
            accept=".jpg,.png,.pdf"
            onChange={(e) => setPaymentProof(e.target.files ? e.target.files[0] : null)}
            required
          />

          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Upload Proof'}
          </button>
        </form>
      </div>
    </div>
  );
}
