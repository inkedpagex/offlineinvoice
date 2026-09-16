import React, { useState } from 'react';
import { X, Search, Trash2, Eye, FileText, Download } from 'lucide-react';
import { SavedEstimate } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: SavedEstimate[];
  onLoadEstimate: (estimate: SavedEstimate) => void;
  onDeleteEstimate: (id: string) => void;
  currencySymbol: string;
  onExportBackup?: () => void;
}

export const EstimateHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  history,
  onLoadEstimate,
  onDeleteEstimate,
  currencySymbol,
  onExportBackup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((est) => {
    const term = searchTerm.toLowerCase();
    return (
      est.estimateNumber.toLowerCase().includes(term) ||
      (est.customerName && est.customerName.toLowerCase().includes(term)) ||
      (est.customerContact && est.customerContact.toLowerCase().includes(term)) ||
      est.date.includes(term)
    );
  });

  const totalAmount = history.reduce((sum, e) => sum + e.grandTotal, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/app-icon.png"
              alt="InvoicePro"
              className="w-8 h-8 rounded-lg object-contain shadow-sm border border-slate-200"
            />
            <div>
              <h2 className="text-base sm:text-lg font-black text-black">
                Past Estimates History ({history.length})
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Locally saved database • Total Billed: {currencySymbol}{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-black p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Estimate No, Customer Name, Phone, Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            {onExportBackup && history.length > 0 && (
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-sm transition-all active:scale-95"
                title="Export complete database backup file (.json)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Export Backup (.json)</span>
              </button>
            )}
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Showing {filteredHistory.length} of {history.length} records
            </span>
          </div>
        </div>

        {/* History Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 text-black font-extrabold text-xs uppercase">
              <tr>
                <th className="py-2.5 px-3 text-left w-28">Date</th>
                <th className="py-2.5 px-3 text-left w-32">Estimate No</th>
                <th className="py-2.5 px-3 text-left">Customer / M/s</th>
                <th className="py-2.5 px-3 text-left w-32">Items</th>
                <th className="py-2.5 px-3 text-right w-36">Grand Total</th>
                <th className="py-2.5 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No past estimates found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Whenever you create or print an estimate, it automatically saves here!
                    </p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 font-medium text-xs">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-3 font-black text-black text-xs">
                      <span className="border border-black px-2 py-0.5 rounded bg-white">
                        {item.estimateNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-black">
                      {item.customerName || (
                        <span className="text-slate-400 font-normal italic">Walk-in Customer</span>
                      )}
                      {item.customerContact && (
                        <span className="text-xs text-slate-500 font-normal ml-2">
                          ({item.customerContact})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-xs font-medium">
                      {item.items.length} {item.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-black tabular-nums text-sm">
                      {currencySymbol}
                      {item.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            onLoadEstimate(item);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-black bg-white hover:bg-slate-100 rounded border border-black shadow-sm transition-all active:scale-95"
                          title="Open & Re-print this estimate"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Load</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete estimate ${item.estimateNumber} from history?`)) {
                              onDeleteEstimate(item.id);
                            }
                          }}
                          className="text-slate-300 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
          <span className="font-semibold">
            All data is saved locally on this PC in permanent offline storage.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold text-black bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
