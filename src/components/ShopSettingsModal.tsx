import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Save,
  FileText,
  Layers,
  Receipt,
  Database,
  Download,
  Upload,
  Trash2,
  Plus,
} from 'lucide-react';
import { ShopProfile } from '../types';
import { GaneshGraphic } from './GaneshGraphic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shopProfile: ShopProfile;
  onSave: (updated: ShopProfile) => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  productsCount?: number;
  historyCount?: number;
}

export const ShopSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shopProfile,
  onSave,
  onExportBackup,
  onImportBackup,
  productsCount = 0,
  historyCount = 0,
}) => {
  const [formData, setFormData] = useState<ShopProfile>({
    ...shopProfile,
    dsOptions: shopProfile.dsOptions && shopProfile.dsOptions.length > 0
      ? shopProfile.dsOptions
      : ['Gautam', 'Viresh', 'Counter Sale'],
  });
  const [newDsInput, setNewDsInput] = useState('');

  useEffect(() => {
    setFormData({
      ...shopProfile,
      dsOptions: shopProfile.dsOptions && shopProfile.dsOptions.length > 0
        ? shopProfile.dsOptions
        : ['Gautam', 'Viresh', 'Counter Sale'],
    });
  }, [shopProfile, isOpen]);

  const dsList = formData.dsOptions && formData.dsOptions.length > 0
    ? formData.dsOptions
    : ['Gautam', 'Viresh', 'Counter Sale'];

  const handleAddDsOption = () => {
    const trimmed = newDsInput.trim();
    if (!trimmed) return;
    if (!dsList.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        dsOptions: [...(prev.dsOptions || ['Gautam', 'Viresh', 'Counter Sale']), trimmed],
      }));
    }
    setNewDsInput('');
  };

  const handleRemoveDsOption = (optionToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      dsOptions: (prev.dsOptions || ['Gautam', 'Viresh', 'Counter Sale']).filter(
        (o) => o !== optionToRemove
      ),
    }));
  };

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo image should be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 400;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setFormData((prev) => ({ ...prev, logoUrl: canvas.toDataURL('image/png') }));
          } else {
            setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('QR image should be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, qrCodeUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 no-print transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg">
            <img
              src="/app-icon.png"
              alt="InvoicePro"
              className="w-8 h-8 rounded-lg object-contain shadow-sm border border-slate-200"
            />
            <span>Shop & Print Profile</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Fixed Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Content */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Personal Shop Logo (Optional) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Personal Shop Logo <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </label>
              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, logoUrl: undefined })}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors"
                  title="Remove this logo from bills"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>

            {formData.logoUrl ? (
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                <div className="w-16 h-12 rounded bg-slate-50 border border-slate-200 flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                  <img
                    src={formData.logoUrl}
                    alt="Shop Logo Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">Logo active on bills</p>
                  <p className="text-[11px] text-slate-500">Will print above your shop name</p>
                </div>
                <label className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors flex-shrink-0">
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
            ) : (
              <div>
                <label className="flex flex-col items-center justify-center gap-1.5 p-3.5 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-lg cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2 text-slate-600 group-hover:text-black font-semibold text-xs">
                    <Upload className="w-4 h-4 text-slate-500 group-hover:text-black" />
                    <span>Upload Personal Shop Logo (PNG, JPG)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Optional: If no logo is selected, only your Shop Name will appear.
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Bill Header Right Emblem: Lord Ganesh Ji vs Payment QR vs None */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Bill Header Right Symbol
              </label>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Tax-Safe Estimate Style
              </span>
            </div>

            {/* Selector Buttons: Ganesh Ji vs Payment QR vs None */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, headerRightType: 'ganesh' })}
                className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                  (!formData.headerRightType || formData.headerRightType === 'ganesh')
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-base leading-none select-none">🕉️</span>
                <span className="text-xs font-bold">Ganesh Ji</span>
                <span className="text-[9px] text-amber-800 font-semibold">श्री गणेशाय नमः</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, headerRightType: 'qr' })}
                className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                  formData.headerRightType === 'qr'
                    ? 'border-sky-500 bg-sky-50 text-sky-950 font-bold ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-base leading-none select-none">📱</span>
                <span className="text-xs font-bold">Payment QR</span>
                <span className="text-[9px] text-sky-800 font-semibold">UPI Scan & Pay</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, headerRightType: 'none' })}
                className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                  formData.headerRightType === 'none'
                    ? 'border-slate-500 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-base leading-none select-none">🚫</span>
                <span className="text-xs font-bold">None</span>
                <span className="text-[9px] text-slate-500 font-medium">Blank Header</span>
              </button>
            </div>

            {/* Ganesh Ji Active Info Banner */}
            {(!formData.headerRightType || formData.headerRightType === 'ganesh') && (
              <div className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <p className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <span>॥ श्री गणेशाय नमः ॥ Motif Active</span>
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Traditional Indian estimate format without QR code (complies with tax-safe non-GST estimate billing).
                  </p>
                </div>
                <div className="flex-shrink-0 bg-amber-50/80 border border-amber-200 rounded-lg p-1.5 flex items-center justify-center">
                  <GaneshGraphic size={42} isCompact={true} />
                </div>
              </div>
            )}

            {/* Payment QR Configuration (Visible when QR is chosen) */}
            {formData.headerRightType === 'qr' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">QR Code Details</span>
                  {formData.qrCodeUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, qrCodeUrl: undefined })}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors"
                      title="Remove uploaded QR image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove QR Image</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    UPI ID (Auto-generates dynamic QR)
                  </label>
                  <input
                    type="text"
                    value={formData.upiId || ''}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-mono font-bold text-slate-800 bg-white"
                    placeholder="e.g. 9876543210@paytm or shop@okhdfcbank"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Or Upload Standee QR Photo (GPay / PhonePe / Paytm / Bank)
                  </label>
                  {formData.qrCodeUrl ? (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
                      <img
                        src={formData.qrCodeUrl}
                        alt="Custom QR Preview"
                        className="w-12 h-12 object-contain border border-slate-200 rounded p-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800">Custom Standee QR uploaded</p>
                        <p className="text-[10px] text-slate-500">Will print directly in header box</p>
                      </div>
                      <label className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded cursor-pointer">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQrUpload}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 hover:border-slate-400 bg-white rounded cursor-pointer text-xs font-semibold text-slate-600">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>Upload QR Image File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleQrUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Shop / Business Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-semibold text-slate-800 transition-all"
              placeholder="e.g. Sharma General Traders"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tagline / Category
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-slate-700 transition-all"
              placeholder="e.g. Wholesale & Retail Distributors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contact Phone / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-slate-700 transition-all"
                placeholder="e.g. 9876543210"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estimate Header Title
              </label>
              <input
                type="text"
                value={formData.estimateTitle}
                onChange={(e) => setFormData({ ...formData, estimateTitle: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm font-bold text-slate-800 transition-all"
                placeholder="e.g. ESTIMATE BILL"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Shop Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm text-slate-700 transition-all"
              placeholder="e.g. Shop No. 12, Main Market Road"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Default Terms / Disclaimer Note (Hindi Goods Return Notice)
            </label>
            <textarea
              rows={2}
              value={formData.defaultTerms}
              onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-xs font-medium text-slate-800 transition-all"
              placeholder="e.g. नोट: बिका हुआ माल वापस नहीं होगा। भूल-चूक लेनी-देनी। आपके व्यापार के लिए धन्यवाद!"
            />
          </div>

          {/* DS (Dispatch / Salesperson / Counter) Options Configuration */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                DS (Dispatch / Salesperson) Dropdown Options
              </label>
              <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-bold">
                Quick 1-Click Dropdown
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2.5">
              Add salesman, delivery personnel, or counter names that will appear in the 1-click DS dropdown on bills.
            </p>

            {/* Existing DS Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {dsList.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs"
                >
                  <span>{opt}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDsOption(opt)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                    title={`Remove ${opt}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add New DS Option */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newDsInput}
                onChange={(e) => setNewDsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDsOption();
                  }
                }}
                placeholder="Type name (e.g. Gautam, Viresh, Counter Sale)..."
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
              />
              <button
                type="button"
                onClick={handleAddDsOption}
                className="px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 border border-sky-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Paper Format Selection Cards */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-sky-600" />
              <span>Default Paper Format</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, paperFormat: 'A4' })}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  formData.paperFormat === 'A4'
                    ? 'border-sky-500 bg-sky-50/70 text-sky-800 font-bold shadow-sm ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <FileText className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold">A4 Full</span>
                <span className="text-[9px] text-slate-400">1 Copy Full</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paperFormat: 'A4_2in1' })}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  formData.paperFormat === 'A4_2in1'
                    ? 'border-sky-500 bg-sky-50/70 text-sky-800 font-bold shadow-sm ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
                title="Print Original (Top) & Duplicate (Bottom) on single A4 sheet"
              >
                <Layers className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold">A4 (2-in-1)</span>
                <span className="text-[9px] text-emerald-600 font-bold">Orig + Dupl</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paperFormat: 'A5' })}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  formData.paperFormat === 'A5'
                    ? 'border-sky-500 bg-sky-50/70 text-sky-800 font-bold shadow-sm ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Layers className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold">A5 Slip</span>
                <span className="text-[9px] text-slate-400">Half Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, paperFormat: 'thermal80' })}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-center transition-all ${
                  formData.paperFormat === 'thermal80'
                    ? 'border-sky-500 bg-sky-50/70 text-sky-800 font-bold shadow-sm ring-2 ring-sky-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <Receipt className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold">80mm</span>
                <span className="text-[9px] text-slate-400">Thermal Roll</span>
              </button>
            </div>
          </div>

          {/* Backup & Restore Data Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Data Backup & Migration (Export / Import)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current Database: <span className="font-bold text-black">{productsCount} Products</span> • <span className="font-bold text-black">{historyCount} Past Estimates</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2.5">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-400 text-slate-800 hover:text-emerald-800 text-xs font-bold transition-all shadow-sm active:scale-98"
                title="Download full backup file to move to another PC"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Export Backup (.json)</span>
              </button>

              <label
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-sky-50 hover:border-sky-400 text-slate-800 hover:text-sky-800 text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
                title="Select a backup file to restore all products and past bills"
              >
                <Upload className="w-4 h-4 text-sky-600" />
                <span>Import Backup (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onImportBackup) {
                      onImportBackup(file);
                    }
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Use this to move your complete shop data to another PC or save a safety copy on a pen drive.
            </p>
          </div>

          </div>

          {/* Sticky Modal Footer - Always Visible */}
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-md shadow-sky-600/20 transition-all active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
