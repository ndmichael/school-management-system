'use client';

import { Modal } from './Modal';
import { X } from 'lucide-react';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any>;
}

export function ViewDetailsModal({ isOpen, onClose, title, data }: ViewDetailsModalProps) {
  if (!data) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          // Skip internal fields
          if (key === 'id' || key === 'avatar') return null;
          
          // Format key to be readable
          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();

          return (
            <div key={key} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
              <span className="text-sm font-medium text-gray-600 w-1/3">{label}:</span>
              <span className="text-sm text-gray-900 w-2/3 text-right font-medium">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}