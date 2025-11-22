'use client';

import { useState } from 'react';
import { Search, Filter, Plus, Eye, Download, Receipt, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { receiptsData, type Receipt } from '@/data/admin';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>(receiptsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || receipt.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const totalRevenue = receipts.reduce((acc, r) => acc + r.amount, 0);
  const verifiedRevenue = receipts.filter(r => r.status === 'verified').reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Receipts</h2>
          <p className="text-gray-600 mt-1">Track and manage all payment receipts</p>
        </div>
        <button className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
          <Plus className="w-5 h-5" />
          <span>New Receipt</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Receipts</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{receipts.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Total Revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Verified</p>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">{receipts.filter(r => r.status === 'verified').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
          <p className="text-gray-600 text-xs sm:text-sm mb-1">Pending</p>
          <p className="text-2xl sm:text-3xl font-bold text-orange-600">{receipts.filter(r => r.status === 'pending').length}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 sm:flex-none flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[140px]">Receipt No.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[200px]">Student</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[140px]">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Payment Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[140px]">Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-semibold text-gray-900">{receipt.receiptNo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{receipt.studentName}</p>
                      <p className="text-sm text-gray-600">{receipt.studentId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{formatCurrency(receipt.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{receipt.paymentType}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{receipt.paymentMethod}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{formatDate(receipt.date)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      receipt.status === 'verified' ? 'bg-green-100 text-green-700' :
                      receipt.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReceipts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No receipts found</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredReceipts.map((receipt) => (
          <div key={receipt.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                receipt.status === 'verified' ? 'bg-green-500' :
                receipt.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
              }`}>
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-semibold text-gray-900 mb-1">{receipt.receiptNo}</p>
                <p className="font-medium text-gray-900">{receipt.studentName}</p>
                <p className="text-sm text-gray-600">{receipt.studentId}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                receipt.status === 'verified' ? 'bg-green-100 text-green-700' :
                receipt.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {receipt.status}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold text-gray-900">{formatCurrency(receipt.amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium text-gray-900">{receipt.paymentType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Method:</span>
                <span className="text-gray-900">{receipt.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Date:</span>
                <span className="text-gray-900">{formatDate(receipt.date)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        ))}

        {filteredReceipts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">No receipts found</p>
          </div>
        )}
      </div>
    </div>
  );
}