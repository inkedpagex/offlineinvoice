import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Search, Trash2, Edit2, RotateCcw, Check, Layers, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import defaultProducts from '../data/defaultProducts.json';
import { parsePackaging } from '../utils/cfcHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSaveProducts: (products: Product[]) => void;
  currencySymbol: string;
  onAddProductToEstimate?: (product: Product) => void;
}

export const ProductManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  products,
  onSaveProducts,
  currencySymbol,
  onAddProductToEstimate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // New / Edit Form State (Kept as clean strings for 100% reliable keyboard typing & decimals)
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [cfcRate, setCfcRate] = useState('');
  const [mrp, setMrp] = useState('');
  const [packaging, setPackaging] = useState('');
  const [unit, setUnit] = useState('PAC');
  const [caseCount, setCaseCount] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Input element refs for keyboard flow
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const unitInputRef = useRef<HTMLInputElement | null>(null);
  const caseCountInputRef = useRef<HTMLInputElement | null>(null);
  const rateInputRef = useRef<HTMLInputElement | null>(null);
  const cfcRateInputRef = useRef<HTMLInputElement | null>(null);
  const mrpInputRef = useRef<HTMLInputElement | null>(null);
  const packagingInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus input when Add or Edit form opens
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
    setCfcRate('');
    setMrp('');
    setPackaging('120 PAC');
    setUnit('PAC');
    setCaseCount('120');
    setIsAddingNew(true);
  };

  const handleStartEdit = (p: Product) => {
    setIsAddingNew(false);
    setEditingId(p.id);
    setName(p.name);
    setRate(p.rate !== undefined ? String(p.rate) : '');
    setCfcRate(p.cfcRate !== undefined && p.cfcRate !== null ? String(p.cfcRate) : '');
    setMrp(p.mrp !== undefined && p.mrp !== null ? String(p.mrp) : '');
    setPackaging(p.packaging || '');

    const parsed = parsePackaging(p.packaging);
    setUnit(p.unit || parsed.unit || 'PAC');
    setCaseCount(
      p.caseCount !== undefined
        ? String(p.caseCount)
        : parsed.caseCount !== undefined
        ? String(parsed.caseCount)
        : ''
    );
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setName('');
    setRate('');
    setCfcRate('');
    setMrp('');
    setPackaging('');
    setUnit('PAC');
    setCaseCount('');
  };

  // Auto-suggest Gatta Rate when Rate and CaseCount are set
  const handleRateChange = (newRate: string) => {
    setRate(newRate);
    const numR = parseFloat(newRate);
    const numC = parseFloat(caseCount);
    if (!isNaN(numR) && !isNaN(numC) && numC > 0 && (!cfcRate || cfcRate === '0')) {
      setCfcRate(String(Math.round(numR * numC * 100) / 100));
    }
  };

  // Auto-suggest Piece Rate when Gatta Rate and CaseCount are set
  const handleCfcRateChange = (newCfcRate: string) => {
    setCfcRate(newCfcRate);
    const numCfcR = parseFloat(newCfcRate);
    const numC = parseFloat(caseCount);
    if (!isNaN(numCfcR) && !isNaN(numC) && numC > 0 && (!rate || rate === '0')) {
      setRate(String(Math.round((numCfcR / numC) * 100) / 100));
    }
  };

  // Auto-update packaging text when Case Count or Unit changes
  const handleCaseCountChange = (newCount: string) => {
    setCaseCount(newCount);
    if (newCount.trim()) {
      setPackaging(`${newCount.trim()} ${unit.trim() || 'PAC'}`);
      const numR = parseFloat(rate);
      const numC = parseFloat(newCount);
      if (!isNaN(numR) && !isNaN(numC) && numC > 0) {
        setCfcRate(String(Math.round(numR * numC * 100) / 100));
      }
    }
  };

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    if (caseCount.trim()) {
      setPackaging(`${caseCount.trim()} ${newUnit.trim()}`);
    }
  };

  const handleSaveItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || rate.trim() === '') return;

    const numericRate = parseFloat(rate) || 0;
    const numericCfcRate = cfcRate.trim() === '' ? undefined : (parseFloat(cfcRate) || undefined);
    const numericMrp = mrp.trim() === '' ? undefined : (parseFloat(mrp) || undefined);
    const numericCaseCount = caseCount.trim() === '' ? undefined : (parseFloat(caseCount) || undefined);
    const finalPackaging = packaging.trim() || (numericCaseCount ? `${numericCaseCount} ${unit}` : undefined);

    if (isAddingNew) {
      const newProduct: Product = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        rate: numericRate,
        cfcRate: numericCfcRate,
        mrp: numericMrp,
        packaging: finalPackaging,
        unit: unit.trim() || 'PAC',
        caseCount: numericCaseCount,
        cfcUnit: 'Gatta',
      };
      onSaveProducts([newProduct, ...products]);
      setSuccessMsg(`✅ Added "${name.trim()}" to catalog!`);
    } else if (editingId) {
      const updated = products.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: name.trim(),
              rate: numericRate,
              cfcRate: numericCfcRate,
              mrp: numericMrp,
              packaging: finalPackaging,
              unit: unit.trim() || 'PAC',
              caseCount: numericCaseCount,
              cfcUnit: 'Gatta',
            }
          : p
      );
      onSaveProducts(updated);
      setSuccessMsg(`✅ Updated "${name.trim()}" successfully!`);
    }

    setTimeout(() => setSuccessMsg(null), 3000);
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

  // Keyboard navigation shortcuts inside modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (isAddingNew || editingId) {
        handleCancelForm();
      } else {
        onClose();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      if (isAddingNew || editingId) {
        e.preventDefault();
        e.stopPropagation();
        handleSaveItem();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print"
      onKeyDown={handleModalKeyDown}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
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
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-200 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-500 text-white px-4 py-2 text-xs font-bold text-center animate-in fade-in flex-shrink-0">
            {successMsg}
          </div>
        )}

        {/* Toolbar: Search + Add New Button */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
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
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow transition-colors active:scale-95"
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
            className="p-4 bg-sky-50/80 border-b border-sky-200 flex-shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-sky-900 uppercase tracking-wider">
                {isAddingNew ? 'Add New Product' : 'Edit Product'}
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                (Press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded text-slate-700 font-mono">Enter</kbd> to jump next / save)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  placeholder="e.g. D/F CHOCOFILLS (MRP 35)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      unitInputRef.current?.focus();
                      unitInputRef.current?.select();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Base Unit (Pcs/Pack)
                </label>
                <input
                  ref={unitInputRef}
                  type="text"
                  placeholder="e.g. PAC / Pcs"
                  value={unit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      caseCountInputRef.current?.focus();
                      caseCountInputRef.current?.select();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium uppercase"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pcs Per Gatta (CFC Count)
                </label>
                <input
                  ref={caseCountInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 120"
                  value={caseCount}
                  onChange={(e) => handleCaseCountChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      rateInputRef.current?.focus();
                      rateInputRef.current?.select();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold text-sky-800"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Piece / Pack Rate * ({currencySymbol})
                </label>
                <input
                  ref={rateInputRef}
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={rate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      cfcRateInputRef.current?.focus();
                      cfcRateInputRef.current?.select();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold tabular-nums"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gatta / CFC Rate ({currencySymbol})
                </label>
                <input
                  ref={cfcRateInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 3798.00"
                  value={cfcRate}
                  onChange={(e) => handleCfcRateChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      mrpInputRef.current?.focus();
                      mrpInputRef.current?.select();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold text-slate-900 tabular-nums"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MRP (Optional)
                </label>
                <input
                  ref={mrpInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="MRP"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      packagingInputRef.current?.focus();
                      packagingInputRef.current?.select();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Packaging Label
                </label>
                <input
                  ref={packagingInputRef}
                  type="text"
                  placeholder="e.g. 120 PAC"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveItem();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-medium"
                />
              </div>

              <div className="sm:col-span-12 flex items-center justify-between pt-1 border-t border-sky-100 mt-1">
                <div className="text-xs text-sky-900 font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    Conversion: 1 Gatta = <span className="font-black">{caseCount || '—'} {unit || 'Pcs'}</span>
                    {cfcRate ? ` @ ${currencySymbol}${cfcRate}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white rounded border border-slate-300 active:scale-95 transition-all"
                  >
                    Cancel (Esc)
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded shadow active:scale-95 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Product</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Product Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase z-10">
              <tr>
                <th className="py-2.5 px-3 text-left">#</th>
                <th className="py-2.5 px-3 text-left">Product Name</th>
                <th className="py-2.5 px-3 text-right">MRP</th>
                <th className="py-2.5 px-3 text-right">Piece Rate</th>
                <th className="py-2.5 px-3 text-right">Gatta / CFC Rate</th>
                <th className="py-2.5 px-3 text-left">Packaging / Conversion</th>
                <th className="py-2.5 px-3 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No products found matching &quot;{searchTerm}&quot;
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p, index) => {
                  const parsed = parsePackaging(p.packaging);
                  const displayUnit = p.unit || parsed.unit || 'PAC';
                  const displayCaseCount = p.caseCount || parsed.caseCount;

                  return (
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
                        {currencySymbol}{p.rate.toFixed(2)}
                        <span className="text-[10px] text-slate-500 font-normal ml-0.5">/{displayUnit}</span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {p.cfcRate ? (
                          <>
                            {currencySymbol}{p.cfcRate.toFixed(2)}
                            <span className="text-[10px] text-slate-500 font-normal ml-0.5">/Gatta</span>
                          </>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 text-xs">
                        {displayCaseCount ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-700">
                            1 Gatta = <strong className="text-black">{displayCaseCount} {displayUnit}</strong>
                          </span>
                        ) : (
                          p.packaging || '-'
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onAddProductToEstimate && (
                            <button
                              onClick={() => {
                                onAddProductToEstimate(p);
                                setSuccessMsg(`🛒 Added "${p.name}" to current bill!`);
                                setTimeout(() => setSuccessMsg(null), 2500);
                              }}
                              className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                              title="Add this item directly into current bill"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Add</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="text-slate-400 hover:text-sky-600 p-1.5 rounded hover:bg-sky-50 transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded border border-slate-300 shadow-sm transition-all"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
