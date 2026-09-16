import React, { useState } from 'react';
import { X, Plus, Search, Trash2, Edit2, RotateCcw, Check } from 'lucide-react';
import { Product } from '../types';
import defaultProducts from '../data/defaultProducts.json';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaveProducts: (products: Product[]) => void;
  currencySymbol: string;
}

export const ProductManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products,
  onSaveProducts,
  currencySymbol,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // New / Edit Form State
  const [name, setName] = useState('');
  const [rate, setRate] = useState<number | ''>('');
  const [mrp, setMrp] = useState<number | ''>('');
  const [packaging, setPackaging] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  if (!isOpen) return null;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.packaging && p.packaging.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setRate('');
    setMrp('');
    setPackaging('');
    setIsAddingNew(true);
  };

  const handleStartEdit = (p: Product) => {
    setIsAddingNew(false);
    setEditingId(p.id);
    setName(p.name);
    setRate(p.rate);
    setMrp(p.mrp || '');
    setPackaging(p.packaging || '');
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setName('');
    setRate('');
    setMrp('');
    setPackaging('');
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rate === '') return;

    const numericRate = typeof rate === 'number' ? rate : parseFloat(rate) || 0;
    const numericMrp = mrp === '' ? undefined : typeof mrp === 'number' ? mrp : parseFloat(mrp) || 0;

    if (isAddingNew) {
      const newProduct: Product = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        rate: numericRate,
        mrp: numericMrp,
        packaging: packaging.trim() || undefined,
      };
      onSaveProducts([newProduct, ...products]);
    } else if (editingId) {
      const updated = products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: name.trim(),
              rate: numericRate,
              mrp: numericMrp,
              packaging: packaging.trim() || undefined,
            }
          : p
      );
      onSaveProducts(updated);
    }

    handleCancelForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      onSaveProducts(products.filter((p) => p.id !== id));
      if (editingId === id) handleCancelForm();
    }
  };

  const handleResetToDefault = () => {
    if (confirm('Reset product list back to the original Excel catalog (78 items)? Any custom added items will be replaced.')) {
      onSaveProducts(defaultProducts as Product[]);
      handleCancelForm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 no-print">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/app-icon.png"
              alt="InvoicePro"
              className="w-7 h-7 rounded-lg object-contain shadow-sm border border-slate-200"
            />
            <h2 className="text-lg font-bold text-slate-800">
              Product & Item Catalog ({products.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-100 transition-colors"
              title="Reset to Excel default items"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Excel List</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Add New Button */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by product name or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {!isAddingNew && !editingId && (
            <button
              onClick={handleStartAdd}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Product</span>
            </button>
          )}
        </div>

        {/* Add/Edit Inline Form Panel */}
        {(isAddingNew || editingId) && (
          <form
            onSubmit={handleSaveItem}
            className="p-4 bg-sky-50/70 border-b border-sky-200 flex-shrink-0"
          >
            <h3 className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-2">
              {isAddingNew ? 'Add New Product' : 'Edit Product'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. D/F CHOCOFILLS (MRP 20)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rate / Price *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={rate}
                  onChange={(e) =>
                    setRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MRP (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="MRP"
                  value={mrp}
                  onChange={(e) =>
                    setMrp(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit / Packaging (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 120 PAC or 12 JAR"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="sm:col-span-2 flex items-end gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Product</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white rounded border border-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Product Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase">
              <tr>
                <th className="py-2.5 px-3 text-left">#</th>
                <th className="py-2.5 px-3 text-left">Product Name</th>
                <th className="py-2.5 px-3 text-right">MRP</th>
                <th className="py-2.5 px-3 text-right">Rate ({currencySymbol})</th>
                <th className="py-2.5 px-3 text-left">Packaging / Unit</th>
                <th className="py-2.5 px-3 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No products found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-slate-400 text-xs font-medium">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {p.name}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                      {p.mrp ? `${currencySymbol}${p.mrp}` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-sky-700 tabular-nums">
                      {currencySymbol}
                      {p.rate.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">
                      {p.packaging || '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="text-slate-400 hover:text-sky-600 p-1 rounded"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <span>
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-300 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
