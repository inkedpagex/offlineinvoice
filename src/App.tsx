import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Settings,
  FileText,
  Package,
  Layers,
  Receipt,
  Search,
  Clock,
} from 'lucide-react';
import { ShopProfile, ActiveEstimate, EstimateItem, Product, SavedEstimate } from './types';
import { ShopSettingsModal } from './components/ShopSettingsModal';
import { ProductManagementModal } from './components/ProductManagementModal';
import { EstimateHistoryModal } from './components/EstimateHistoryModal';
import { numberToWords } from './utils/numberToWords';
import defaultProducts from './data/defaultProducts.json';

declare global {
  interface Window {
    electronAPI?: {
      dbGet: (key: string) => Promise<any>;
      dbSet: (key: string, value: any) => Promise<boolean>;
      dbGetAll: () => Promise<Record<string, any>>;
      dbSaveAll: (data: Record<string, any>) => Promise<boolean>;
      isElectron?: boolean;
    };
  }
}

const DEFAULT_SHOP_PROFILE: ShopProfile = {
  name: 'MY SHOP / TRADERS',
  tagline: 'General Trading & Supplies',
  address: 'Main Market Road, City',
  phone: '9876543210',
  estimateTitle: 'ESTIMATE BILL',
  defaultTerms: 'This is an estimate memo, not a tax invoice.',
  paperFormat: 'A4',
  currencySymbol: '₹',
};

const getNextEstimateNumber = (historyList: SavedEstimate[]): string => {
  if (!historyList || historyList.length === 0) {
    return 'EST-101';
  }
  let maxNum = 100;
  for (const h of historyList) {
    const match = h.estimateNumber?.match(/\d+$/);
    if (match) {
      const val = parseInt(match[0], 10);
      if (!isNaN(val) && val > maxNum) {
        maxNum = val;
      }
    }
  }
  return `EST-${maxNum + 1}`;
};

const getInitialEstimateNumber = (): string => {
  try {
    const saved = localStorage.getItem('offline_estimates_history');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return getNextEstimateNumber(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to parse history for estimate number', e);
  }
  return 'EST-101';
};

export const App: React.FC = () => {
  // Shop Settings State (stored in localStorage + Electron disk storage)
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => {
    const saved = localStorage.getItem('shop_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse shop profile', e);
      }
    }
    return DEFAULT_SHOP_PROFILE;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Products State (Loaded from localStorage or default Excel list)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('offline_products_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse products', e);
      }
    }
    return defaultProducts as Product[];
  });

  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [activeDropdownRowId, setActiveDropdownRowId] = useState<string | null>(null);

  // Past Estimates History State (stored in localStorage + Electron disk storage)
  const [history, setHistory] = useState<SavedEstimate[]>(() => {
    const saved = localStorage.getItem('offline_estimates_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    return [];
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Active Estimate State (Restores whatever was typed so customer name & items are never lost)
  const [estimate, setEstimate] = useState<ActiveEstimate>(() => {
    const savedDraft = localStorage.getItem('active_draft_estimate');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.items && parsed.items.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse active draft', e);
      }
    }
    return {
      estimateNumber: getInitialEstimateNumber(),
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerContact: '',
      items: [{ id: '1', description: '', qty: 1, rate: '', amount: 0 }],
      discount: '',
      notes: DEFAULT_SHOP_PROFILE.defaultTerms,
    };
  });

  // Reference to focus new item descriptions
  const itemInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Hydrate from permanent electron disk database on startup
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.dbGetAll().then((data) => {
        if (data && typeof data === 'object') {
          if (data.shop_profile) {
            setShopProfile(data.shop_profile);
            localStorage.setItem('shop_profile', JSON.stringify(data.shop_profile));
          }
          if (data.offline_products_catalog && Array.isArray(data.offline_products_catalog) && data.offline_products_catalog.length > 0) {
            setProducts(data.offline_products_catalog);
            localStorage.setItem('offline_products_catalog', JSON.stringify(data.offline_products_catalog));
          }
          if (data.offline_estimates_history && Array.isArray(data.offline_estimates_history)) {
            setHistory(data.offline_estimates_history);
            localStorage.setItem('offline_estimates_history', JSON.stringify(data.offline_estimates_history));
          }
          if (data.active_draft_estimate && typeof data.active_draft_estimate === 'object') {
            const draft = data.active_draft_estimate;
            const historyList = (data.offline_estimates_history && Array.isArray(data.offline_estimates_history))
              ? data.offline_estimates_history
              : [];
            
            const isDraftEmpty =
              !draft.customerName?.trim() &&
              !draft.customerContact?.trim() &&
              (!draft.items || draft.items.every((i: any) => !i.description?.trim() && !i.rate));

            if (isDraftEmpty && historyList.length === 0) {
              draft.estimateNumber = 'EST-101';
            }
            setEstimate(draft);
            localStorage.setItem('active_draft_estimate', JSON.stringify(draft));
          }
        }
      }).catch((err) => {
        console.error('Failed to read from electron storage:', err);
      });
    }
  }, []);

  // Auto-save active draft to localStorage and Electron disk whenever user types
  useEffect(() => {
    localStorage.setItem('active_draft_estimate', JSON.stringify(estimate));
    window.electronAPI?.dbSet('active_draft_estimate', estimate);
  }, [estimate]);

  // Sync shop profile to localStorage and Electron disk
  const handleSaveShopProfile = (updated: ShopProfile) => {
    setShopProfile(updated);
    localStorage.setItem('shop_profile', JSON.stringify(updated));
    window.electronAPI?.dbSet('shop_profile', updated);
  };

  // Sync products to localStorage and Electron disk
  const handleSaveProducts = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem('offline_products_catalog', JSON.stringify(updatedProducts));
    window.electronAPI?.dbSet('offline_products_catalog', updatedProducts);
  };

  // Calculations
  const subtotal = estimate.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const discountVal = typeof estimate.discount === 'number' ? estimate.discount : 0;
  const grandTotal = Math.max(0, subtotal - discountVal);
  const totalInWords = numberToWords(grandTotal);

  // Automatically save current estimate to local history database
  const saveCurrentEstimateToHistory = () => {
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0)) ||
      estimate.customerName.trim() !== '';

    if (!hasContent) return;

    const newSaved: SavedEstimate = {
      id: `est-${Date.now()}`,
      estimateNumber: estimate.estimateNumber,
      date: estimate.date,
      customerName: estimate.customerName,
      customerContact: estimate.customerContact,
      items: estimate.items,
      subtotal: subtotal,
      discount: discountVal,
      grandTotal: grandTotal,
      notes: estimate.notes,
      createdAt: new Date().toISOString(),
    };

    setHistory((prev) => {
      const existingIndex = prev.findIndex((e) => e.estimateNumber === estimate.estimateNumber);
      let updated: SavedEstimate[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = newSaved;
      } else {
        updated = [newSaved, ...prev];
      }
      localStorage.setItem('offline_estimates_history', JSON.stringify(updated));
      window.electronAPI?.dbSet('offline_estimates_history', updated);
      return updated;
    });
  };

  // Handlers for Items
  const handleItemChange = (
    id: string,
    field: keyof Omit<EstimateItem, 'id' | 'amount'>,
    value: string
  ) => {
    setEstimate((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== id) return item;

        let newQty = item.qty;
        let newRate = item.rate;
        let newDesc = item.description;

        if (field === 'description') {
          newDesc = value;
          setActiveDropdownRowId(id);
        } else if (field === 'qty') {
          newQty = value === '' ? '' : parseFloat(value) || 0;
        } else if (field === 'rate') {
          newRate = value === '' ? '' : parseFloat(value) || 0;
        }

        const numericQty = typeof newQty === 'number' ? newQty : 0;
        const numericRate = typeof newRate === 'number' ? newRate : 0;
        const calculatedAmount = Math.round(numericQty * numericRate * 100) / 100;

        return {
          ...item,
          description: newDesc,
          qty: newQty,
          rate: newRate,
          amount: calculatedAmount,
        };
      });

      return { ...prev, items: updatedItems };
    });
  };

  // Select item from autocomplete suggestions
  const handleSelectProduct = (itemId: string, product: Product) => {
    setEstimate((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const currentQty = typeof item.qty === 'number' && item.qty > 0 ? item.qty : 1;
        const calcAmount = Math.round(currentQty * product.rate * 100) / 100;
        return {
          ...item,
          description: product.name,
          rate: product.rate,
          qty: currentQty,
          amount: calcAmount,
        };
      });
      return { ...prev, items: updatedItems };
    });
    setActiveDropdownRowId(null);
  };

  const handleAddItem = () => {
    const newId = Date.now().toString();
    setEstimate((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: newId, description: '', qty: 1, rate: '', amount: 0 },
      ],
    }));

    // Auto-focus description on the newly added row
    setTimeout(() => {
      if (itemInputRefs.current[newId]) {
        itemInputRefs.current[newId]?.focus();
      }
    }, 50);
  };

  const handleRemoveItem = (id: string) => {
    if (estimate.items.length === 1) {
      setEstimate((prev) => ({
        ...prev,
        items: [{ id: '1', description: '', qty: 1, rate: '', amount: 0 }],
      }));
      return;
    }
    setEstimate((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  // Keyboard shortcut: Press Enter on Rate to add next row
  const handleRateKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === estimate.items.length - 1) {
        handleAddItem();
      }
    }
  };

  // Clear / New Estimate Action
  const handleNewEstimate = () => {
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0)) ||
      estimate.customerName.trim() !== '';

    let nextEstNumber = 'EST-101';

    if (hasContent) {
      // Save current estimate to history before starting new one
      saveCurrentEstimateToHistory();

      // Current bill had content, so increment to next number
      const match = estimate.estimateNumber.match(/\d+$/);
      const currentCounter = match ? parseInt(match[0], 10) : 100;
      nextEstNumber = `EST-${currentCounter + 1}`;
    } else {
      // If current bill is empty, do NOT skip/jump numbers! Calculate from existing history
      nextEstNumber = getNextEstimateNumber(history);
    }

    setEstimate({
      estimateNumber: nextEstNumber,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerContact: '',
      items: [{ id: Date.now().toString(), description: '', qty: 1, rate: '', amount: 0 }],
      discount: '',
      notes: shopProfile.defaultTerms,
    });
  };

  // Print Action
  const handlePrint = () => {
    setActiveDropdownRowId(null);
    // Auto-save to local history database
    saveCurrentEstimateToHistory();

    const match = estimate.estimateNumber.match(/\d+$/);
    if (match) {
      localStorage.setItem('last_estimate_number', match[0]);
    }
    window.print();
  };

  // Load a past estimate from history
  const handleLoadPastEstimate = (past: SavedEstimate) => {
    setEstimate({
      estimateNumber: past.estimateNumber,
      date: past.date,
      customerName: past.customerName,
      customerContact: past.customerContact,
      items: past.items,
      discount: past.discount,
      notes: past.notes,
    });
  };

  // Delete an estimate from history
  const handleDeletePastEstimate = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      localStorage.setItem('offline_estimates_history', JSON.stringify(updated));
      window.electronAPI?.dbSet('offline_estimates_history', updated);
      return updated;
    });
  };

  // Export full backup file (.json)
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      appName: 'Estimate Bill Printer',
      exportedAt: new Date().toISOString(),
      shopProfile,
      products,
      history,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Estimate_Backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import / Restore from backup file (.json)
  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.products && !parsed.history && !parsed.shopProfile) {
          alert('Invalid backup file! Please select a valid Estimate Printer backup JSON file.');
          return;
        }

        const countProducts = Array.isArray(parsed.products) ? parsed.products.length : 0;
        const countHistory = Array.isArray(parsed.history) ? parsed.history.length : 0;

        const confirmMsg = `Backup file contains:\n• ${countProducts} Products\n• ${countHistory} Past Estimates History\n\nDo you want to restore this data on this computer?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }

        if (parsed.products && Array.isArray(parsed.products)) {
          setProducts(parsed.products);
          localStorage.setItem('offline_products_catalog', JSON.stringify(parsed.products));
          window.electronAPI?.dbSet('offline_products_catalog', parsed.products);
        }
        if (parsed.history && Array.isArray(parsed.history)) {
          setHistory(parsed.history);
          localStorage.setItem('offline_estimates_history', JSON.stringify(parsed.history));
          window.electronAPI?.dbSet('offline_estimates_history', parsed.history);
        }
        if (parsed.shopProfile && typeof parsed.shopProfile === 'object') {
          setShopProfile(parsed.shopProfile);
          localStorage.setItem('shop_profile', JSON.stringify(parsed.shopProfile));
          window.electronAPI?.dbSet('shop_profile', parsed.shopProfile);
        }

        alert(`✅ Restore Successful!\nLoaded ${countProducts} products and ${countHistory} past estimate bills.`);
      } catch (err) {
        alert('Failed to parse backup file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  // Global Keyboard Shortcuts (Ctrl+P to print, Ctrl+N for new)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewEstimate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [estimate]);

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col items-center"
      onClick={() => setActiveDropdownRowId(null)}
    >
      {/* Top Application Bar (Hidden during Print) */}
      <header className="w-full bg-white border-b border-slate-200 px-4 py-2.5 sticky top-0 z-40 shadow-sm no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/horizontal-logo.png"
              alt="InvoicePro"
              className="h-7 sm:h-8 object-contain select-none"
            />
            <div className="hidden sm:block h-5 w-px bg-slate-200"></div>
            <p className="hidden sm:block text-xs text-slate-500 font-medium truncate max-w-[200px]">
              {shopProfile.name}
            </p>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Paper Format Segmented Switch */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 shadow-inner">
              <button
                type="button"
                onClick={() =>
                  handleSaveShopProfile({ ...shopProfile, paperFormat: 'A5' })
                }
                className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md transition-all ${
                  shopProfile.paperFormat === 'A5'
                    ? 'bg-white text-black shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-black'
                }`}
                title="A5 Compact Slip / Voucher"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>A5 (Slip)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSaveShopProfile({ ...shopProfile, paperFormat: 'A4' })
                }
                className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md transition-all ${
                  shopProfile.paperFormat === 'A4'
                    ? 'bg-white text-black shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-black'
                }`}
                title="A4 Standard Full Page"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSaveShopProfile({ ...shopProfile, paperFormat: 'thermal80' })
                }
                className={`flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md transition-all ${
                  shopProfile.paperFormat === 'thermal80'
                    ? 'bg-white text-black shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-black'
                }`}
                title="80mm Continuous Thermal Roll"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Thermal</span>
              </button>
            </div>

            {/* Past History Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-sm"
              title="View & Search Past Estimates History"
            >
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              <span>History ({history.length})</span>
            </button>

            {/* Products Button */}
            <button
              onClick={() => setIsProductsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-sm"
              title="Manage Products List (Add, Edit, View)"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Products ({products.length})</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-sm"
              title="Configure Shop Details"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* New / Clear Button */}
            <button
              onClick={handleNewEstimate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-sm"
              title="Save current and start new estimate (Ctrl+N)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>New</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-slate-100 text-slate-700 rounded font-mono border border-slate-200">Ctrl+N</kbd>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 text-xs sm:text-sm font-black text-white bg-black hover:bg-slate-800 rounded-lg shadow-md transition-all active:scale-95"
              title="Print & Save Estimate Bill (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-slate-700 text-white rounded font-mono">Ctrl+P</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (Large & Clear on Desktop, Ink-Saving Pure B&W on Print) */}
      <main
        className={`w-full ${
          shopProfile.paperFormat === 'thermal80'
            ? 'max-w-md'
            : 'max-w-4xl'
        } p-3 sm:p-6 print:p-0 my-2 sm:my-3 flex-1 transition-all`}
      >
        <div
          id="estimate-bill-print-area"
          className={`bg-white rounded-xl shadow border border-slate-300 p-5 sm:p-7 print:p-0 print:border-none print:shadow-none print:rounded-none printable-area transition-all ${
            shopProfile.paperFormat === 'thermal80'
              ? 'format-thermal80 mx-auto'
              : shopProfile.paperFormat === 'A5'
              ? 'format-A5'
              : 'format-A4'
          }`}
        >
          {/* Bill Header */}
          <div className="text-center border-b-2 border-black pb-2 mb-3">
            {shopProfile.logoUrl && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <img
                  src={shopProfile.logoUrl}
                  alt="Shop Logo"
                  className="h-10 sm:h-12 max-w-[220px] object-contain"
                />
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase print:text-base leading-tight">
              {shopProfile.name}
            </h2>
            {shopProfile.tagline && (
              <p className="text-xs sm:text-sm font-semibold text-slate-700 print:text-black leading-tight mt-0.5">
                {shopProfile.tagline}
              </p>
            )}
            <p className="text-xs text-slate-700 print:text-black mt-0.5 leading-tight">
              {shopProfile.address} {shopProfile.phone && `• Ph: ${shopProfile.phone}`}
            </p>
            <div className="mt-2 inline-block border-2 border-black px-4 py-0.5 rounded text-xs sm:text-sm font-black uppercase tracking-wider bg-white text-black leading-normal">
              {shopProfile.estimateTitle || 'ESTIMATE BILL'}
            </div>
          </div>

          {/* Estimate Meta & Customer Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 border-2 border-black rounded-lg p-2.5 sm:p-3 mb-3 bg-white print:border print:rounded-none text-xs sm:text-sm">
            {/* Left: Customer Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black min-w-[65px] text-xs sm:text-sm">M/s / To:</span>
                <input
                  type="text"
                  placeholder="Customer Name (optional)"
                  value={estimate.customerName}
                  onChange={(e) =>
                    setEstimate({ ...estimate, customerName: e.target.value })
                  }
                  className="w-full bg-white border-b border-dashed border-slate-300 sm:border-transparent hover:border-black focus:border-black px-1.5 py-0.5 h-7 font-bold text-black text-xs sm:text-sm focus:outline-none print:border-none print:p-0"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black min-w-[65px] text-xs sm:text-sm">Contact:</span>
                <input
                  type="text"
                  placeholder="Phone / City"
                  value={estimate.customerContact}
                  onChange={(e) =>
                    setEstimate({ ...estimate, customerContact: e.target.value })
                  }
                  className="w-full bg-white border-b border-dashed border-slate-300 sm:border-transparent hover:border-black focus:border-black px-1.5 py-0.5 h-7 text-black text-xs sm:text-sm focus:outline-none print:border-none print:p-0 font-medium"
                />
              </div>
            </div>

            {/* Right: Estimate No & Date */}
            <div className="space-y-1.5 sm:text-right flex flex-col justify-center">
              <div className="flex sm:justify-end items-center gap-1.5">
                <span className="font-bold text-black text-xs sm:text-sm">Est No:</span>
                <input
                  type="text"
                  value={estimate.estimateNumber}
                  onChange={(e) =>
                    setEstimate({ ...estimate, estimateNumber: e.target.value })
                  }
                  className="w-28 sm:text-right font-black text-black text-xs sm:text-sm bg-white border-b border-dashed border-slate-300 sm:border-transparent hover:border-black focus:border-black px-1.5 py-0.5 h-7 focus:outline-none print:border-none print:p-0"
                />
              </div>

              <div className="flex sm:justify-end items-center gap-1.5">
                <span className="font-bold text-black text-xs sm:text-sm">Date:</span>
                <input
                  type="date"
                  value={estimate.date}
                  onChange={(e) => setEstimate({ ...estimate, date: e.target.value })}
                  className="w-36 sm:text-right font-semibold text-black text-xs sm:text-sm bg-white border-b border-dashed border-slate-300 sm:border-transparent hover:border-black focus:border-black px-1.5 py-0.5 h-7 focus:outline-none print:border-none print:p-0"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-visible mb-2">
            <table className="w-full border-collapse text-xs sm:text-sm print-table">
              <thead>
                <tr className="bg-white text-black border-y-2 border-black font-black uppercase text-xs tracking-wider">
                  <th className="py-1.5 px-1.5 text-center w-8">#</th>
                  <th className="py-1.5 px-2 text-left">Item Description</th>
                  <th className="py-1.5 px-1.5 text-right w-16">Qty</th>
                  <th className="py-1.5 px-1.5 text-right w-20">Rate</th>
                  <th className="py-1.5 px-2 text-right w-24">Amount</th>
                  <th className="py-1.5 px-1 text-center w-8 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-black">
                {estimate.items.map((item, index) => {
                  const matchingSuggestions =
                    activeDropdownRowId === item.id && item.description.trim().length > 0
                      ? products
                          .filter((p) =>
                            p.name.toLowerCase().includes(item.description.toLowerCase())
                          )
                          .slice(0, 8)
                      : [];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 print:hover:bg-transparent relative transition-colors"
                    >
                      <td className="py-1 px-1.5 text-center text-slate-600 print:text-black font-bold text-xs">
                        {index + 1}
                      </td>
                      <td className="py-1 px-2 relative">
                        <input
                          ref={(el) => (itemInputRefs.current[item.id] = el)}
                          type="text"
                          placeholder="Type product name (auto-suggests)..."
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(item.id, 'description', e.target.value)
                          }
                          onFocus={() => setActiveDropdownRowId(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full font-bold text-black bg-transparent px-1.5 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black print:p-0 text-xs sm:text-sm"
                        />

                        {/* Autocomplete Floating Dropdown */}
                        {matchingSuggestions.length > 0 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1 w-96 max-h-56 overflow-y-auto bg-white border border-black rounded shadow-xl z-50 no-print text-left"
                          >
                            <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-extrabold text-black uppercase tracking-wider flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Search className="w-3 h-3" />
                                <span>Suggested Products</span>
                              </span>
                              <span className="text-[10px] text-slate-700 font-bold bg-white px-1.5 py-0.2 rounded border border-slate-300">
                                {matchingSuggestions.length} items
                              </span>
                            </div>
                            {matchingSuggestions.map((prod) => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => handleSelectProduct(item.id, prod)}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center justify-between border-b border-slate-100 last:border-none transition-colors"
                              >
                                <div className="truncate pr-2">
                                  <div className="font-bold text-black text-xs sm:text-sm truncate">
                                    {prod.name}
                                  </div>
                                  {prod.packaging && (
                                    <div className="text-[10px] text-slate-500">
                                      Unit: <span className="text-black font-semibold">{prod.packaging}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0 pl-2">
                                  <div className="font-black text-black text-xs sm:text-sm tabular-nums">
                                    {shopProfile.currencySymbol}
                                    {prod.rate.toFixed(2)}
                                  </div>
                                  {prod.mrp && (
                                    <div className="text-[10px] text-slate-400 line-through">
                                      MRP {prod.mrp}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-1 px-1.5 text-right">
                        <input
                          type="number"
                          step="any"
                          placeholder="1"
                          value={item.qty}
                          onChange={(e) =>
                            handleItemChange(item.id, 'qty', e.target.value)
                          }
                          className="w-full text-right bg-transparent px-1 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black font-bold text-black tabular-nums print:p-0 text-xs sm:text-sm"
                        />
                      </td>
                      <td className="py-1 px-1.5 text-right">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(item.id, 'rate', e.target.value)
                          }
                          onKeyDown={(e) => handleRateKeyDown(e, index)}
                          className="w-full text-right bg-transparent px-1 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black font-bold text-black tabular-nums print:p-0 text-xs sm:text-sm"
                        />
                      </td>
                      <td className="py-1 px-2 text-right font-black text-black tabular-nums text-xs sm:text-sm">
                        {shopProfile.currencySymbol}
                        {item.amount.toFixed(2)}
                      </td>
                      <td className="py-1 px-1 text-center no-print">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-300 hover:text-red-600 p-0.5 rounded transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Row Button (Hidden during print) */}
          <div className="no-print mb-2">
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-black bg-white hover:bg-slate-50 rounded border border-slate-300 transition-all active:scale-98 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Item</span>
              <span className="text-[10px] text-slate-500 font-medium ml-1">
                (Enter on Rate)
              </span>
            </button>
          </div>

          {/* Bill Summary & Totals Block */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 border-t-2 border-black pt-2.5 text-xs sm:text-sm">
            {/* Notes / Disclaimer (Left Column) */}
            <div className="sm:col-span-7 flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-0.5">
                  Terms / Note
                </label>
                <textarea
                  rows={2}
                  value={estimate.notes}
                  onChange={(e) => setEstimate({ ...estimate, notes: e.target.value })}
                  className="w-full text-xs text-black bg-white border border-slate-300 rounded p-1.5 focus:outline-none focus:border-black print:border-none print:p-0"
                  placeholder="Terms or note..."
                />
              </div>

              {/* Total In Words (Clean thin box) */}
              {grandTotal > 0 && (
                <div className="mt-1 text-xs text-black bg-white p-1.5 rounded border border-slate-300 print:border print:border-black print:rounded-none leading-tight">
                  <span className="font-extrabold">Words: </span>
                  <span className="italic font-bold">{totalInWords}</span>
                </div>
              )}
            </div>

            {/* Calculations (Right Column) */}
            <div className="sm:col-span-5 space-y-1">
              <div className="flex justify-between items-center text-xs sm:text-sm py-0.5 border-b border-slate-200 print:border-black font-semibold">
                <span className="text-black">Subtotal:</span>
                <span className="font-black text-black tabular-nums">
                  {shopProfile.currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm py-0.5 border-b border-slate-200 print:border-black">
                <span className="text-black font-semibold">Discount:</span>
                <div className="flex items-center gap-1 w-20 justify-end">
                  <span className="text-black font-bold text-xs">{shopProfile.currencySymbol}</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={estimate.discount}
                    onChange={(e) =>
                      setEstimate({
                        ...estimate,
                        discount: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-16 text-right bg-white border border-slate-300 sm:border-transparent hover:border-black focus:border-black rounded px-1 py-0.5 text-xs sm:text-sm font-bold text-black tabular-nums focus:outline-none print:border-none print:p-0"
                  />
                </div>
              </div>

              {/* Grand Total Box */}
              <div className="border-2 border-black bg-white rounded-lg p-1.5 sm:p-2 px-2.5 flex justify-between items-center print:rounded-none">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                  TOTAL:
                </span>
                <span className="text-lg sm:text-xl font-black tabular-nums text-black">
                  {shopProfile.currencySymbol}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note (Compact, No Signatory) */}
          <div className="mt-2.5 pt-1.5 border-t border-black text-center text-xs text-black italic font-medium">
            * Thank you for your business!
          </div>
        </div>
      </main>

      {/* Shop Settings Modal */}
      <ShopSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        shopProfile={shopProfile}
        onSave={handleSaveShopProfile}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        productsCount={products.length}
        historyCount={history.length}
      />

      {/* Product Management Modal */}
      <ProductManagementModal
        isOpen={isProductsOpen}
        onClose={() => setIsProductsOpen(false)}
        products={products}
        onSaveProducts={handleSaveProducts}
        currencySymbol={shopProfile.currencySymbol}
      />

      {/* Estimate History Modal */}
      <EstimateHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onLoadEstimate={handleLoadPastEstimate}
        onDeleteEstimate={handleDeletePastEstimate}
        currencySymbol={shopProfile.currencySymbol}
        onExportBackup={handleExportBackup}
      />
    </div>
  );
};

export default App;
