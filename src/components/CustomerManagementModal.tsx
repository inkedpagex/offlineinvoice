import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  Users,
  MapPin,
  Phone,
  FileSpreadsheet,
  Receipt,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { Customer, SavedEstimate, ShopProfile } from '../types';
import { matchHinglish } from '../utils/hinglishMatcher';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSaveCustomers: (customers: Customer[]) => void;
  onSelectCustomer?: (customer: Customer) => void;
  history?: SavedEstimate[];
  shopProfile?: ShopProfile;
}

export const CustomerManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  customers,
  onSaveCustomers,
  onSelectCustomer,
  history = [],
  shopProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus logic
  useEffect(() => {
    if (isOpen) {
      if (isAddingNew || editingId) {
        setTimeout(() => {
          nameInputRef.current?.focus();
          nameInputRef.current?.select();
        }, 50);
      } else {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    }
  }, [isOpen, isAddingNew, editingId]);

  // Flash message timeout
  useEffect(() => {
    if (feedbackMsg) {
      const timer = setTimeout(() => setFeedbackMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedbackMsg]);

  // Customer bill count map from history
  const customerBillCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const est of history) {
      if (est.customerName && est.customerName.trim()) {
        const key = est.customerName.trim().toLowerCase();
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [history]);

  if (!isOpen) return null;

  // Filter customers with Hinglish fuzzy matcher
  const filteredCustomers = customers.filter((c) =>
    matchHinglish(c.name, searchTerm, c.address)
  );

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setAddress('');
    setPhone('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (c: Customer) => {
    setIsAddingNew(false);
    setEditingId(c.id);
    setName(c.name);
    setAddress(c.address || '');
    setPhone(c.phone || '');
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setName('');
    setAddress('');
    setPhone('');
  };

  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setFeedbackMsg({ type: 'error', text: 'Please enter customer / party name' });
      return;
    }

    if (isAddingNew) {
      // Check duplicate
      const duplicate = customers.find(
        (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        setFeedbackMsg({
          type: 'error',
          text: `Customer "${trimmedName}" already exists in directory.`,
        });
        return;
      }

      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: trimmedName,
        address: trimmedAddress,
        phone: trimmedPhone || undefined,
      };

      const updated = [newCust, ...customers];
      onSaveCustomers(updated);
      setFeedbackMsg({ type: 'success', text: `Customer "${trimmedName}" added successfully!` });
      handleCancelForm();
    } else if (editingId) {
      const updated = customers.map((c) => {
        if (c.id !== editingId) return c;
        return {
          ...c,
          name: trimmedName,
          address: trimmedAddress,
          phone: trimmedPhone || undefined,
        };
      });

      onSaveCustomers(updated);
      setFeedbackMsg({ type: 'success', text: `Customer "${trimmedName}" updated successfully!` });
      handleCancelForm();
    }
  };

  const handleDeleteCustomer = (id: string, custName: string) => {
    if (window.confirm(`Are you sure you want to delete customer "${custName}" from directory?`)) {
      const updated = customers.filter((c) => c.id !== id);
      onSaveCustomers(updated);
      setFeedbackMsg({ type: 'success', text: `Customer "${custName}" deleted.` });
      if (editingId === id) {
        handleCancelForm();
      }
    }
  };

  const handleExportCsv = () => {
    let csv = 'Customer ID,Customer Name,Address,Phone Number,Total Bills Count\n';
    for (const c of customers) {
      const billsCnt = customerBillCountMap.get(c.name.trim().toLowerCase()) || 0;
      const cleanName = `"${c.name.replace(/"/g, '""')}"`;
      const cleanAddr = `"${(c.address || '').replace(/"/g, '""')}"`;
      const cleanPhone = `"${(c.phone || '').replace(/"/g, '""')}"`;
      csv += `${c.id},${cleanName},${cleanAddr},${cleanPhone},${billsCnt}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const todayStr = new Date().toISOString().split('T')[0];
    link.download = `Customers_Directory_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 no-print transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl border border-blue-200 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2">
                <span>Customers & Parties Directory</span>
                <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {customers.length} Parties Saved
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {shopProfile?.name || 'Offline Billing'} • Auto-suggest party names & addresses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Export all customers to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {!isAddingNew && !editingId && (
              <button
                onClick={handleStartAdd}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Add new customer / party"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-black p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Strip */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2 text-xs font-bold flex items-center justify-between transition-all flex-shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-red-50 text-red-900 border-b border-red-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-500 hover:text-black">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar Strip (When not actively adding/editing) */}
        {!isAddingNew && !editingId && (
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search party by English or Hindi (e.g. atul, deepak, lodhiyan, gaushala)..."
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold bg-white"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-black text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0 hidden sm:inline">
              Showing {filteredCustomers.length} of {customers.length}
            </span>
          </div>
        )}

        {/* Add / Edit Customer Drawer / Form */}
        {(isAddingNew || editingId) && (
          <div className="p-4 sm:p-5 bg-blue-50/60 border-b-2 border-blue-300 flex-shrink-0 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">{isAddingNew ? '👤' : '✏️'}</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {isAddingNew ? 'Add New Customer / Party (नया ग्राहक जोड़ें)' : 'Edit Customer Details (ग्राहक सुधारें)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded hover:bg-white"
              >
                Cancel (रद्द करें)
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Party Name */}
                <div className="sm:col-span-5">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Customer / Party Name (ग्राहक का नाम) *
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. अतुल प्रोविजन, दीपक गुप्ता..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>

                {/* Address / Destination */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Address / Station (पता / स्थान)
                  </label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. गौशाला रोड, लोधियान, स्टेशन गेट..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  />
                </div>

                {/* Contact Phone */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Phone / Mobile (फ़ोन नंबर)
                  </label>
                  <input
                    ref={phoneInputRef}
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAddingNew ? 'Save Customer (सुरक्षित करें)' : 'Update Customer (अपडेट करें)'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Customers List Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30 text-blue-500" />
              <p className="font-bold text-sm text-slate-700">
                {searchTerm ? `No customers matching "${searchTerm}"` : 'No customers in directory yet.'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'Try searching with a different spelling or phonetic keyword.'
                  : 'New customers typed on the estimate screen are automatically saved here, or you can add them directly.'}
              </p>
              {!isAddingNew && !editingId && (
                <button
                  onClick={handleStartAdd}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add First Customer</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-10">#</th>
                    <th className="py-2.5 px-3">Customer / Party Name (नाम)</th>
                    <th className="py-2.5 px-3">Address / Destination (पता)</th>
                    <th className="py-2.5 px-3 w-32">Phone (फ़ोन)</th>
                    <th className="py-2.5 px-3 text-center w-24">Past Bills</th>
                    <th className="py-2.5 px-3 text-center w-40">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust, idx) => {
                    const pastCount = customerBillCountMap.get(cust.name.trim().toLowerCase()) || 0;
                    return (
                      <tr key={cust.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2 text-center font-bold text-slate-500 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-black text-black text-sm">
                          {cust.name}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          {cust.address ? (
                            <span className="flex items-center gap-1 text-slate-800">
                              <MapPin className="w-3 h-3 text-red-500 inline shrink-0" />
                              <span>{cust.address}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          {cust.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600 inline shrink-0" />
                              <span>{cust.phone}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {pastCount > 0 ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Receipt className="w-3 h-3" />
                              <span>{pastCount} bills</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">0 bills</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Bill / Select Customer */}
                            {onSelectCustomer && (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectCustomer(cust);
                                  onClose();
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-all active:scale-95 cursor-pointer shadow-2xs"
                                title="Create estimate bill for this customer"
                              >
                                <span>Bill Party</span>
                                <ArrowRight className="w-3 h-3 text-blue-600" />
                              </button>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cust)}
                              className="p-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Edit customer details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Delete customer from directory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0 text-xs font-bold text-slate-600">
          <div>
            Total {customers.length} registered parties in offline database
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-black font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
