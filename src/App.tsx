import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Plus,
  Trash2,
  Settings,
  Package,
  Search,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { ShopProfile, ActiveEstimate, EstimateItem, Product, SavedEstimate } from './types';
import { ShopSettingsModal } from './components/ShopSettingsModal';
import { ProductManagementModal } from './components/ProductManagementModal';
import { EstimateHistoryModal } from './components/EstimateHistoryModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { PaymentQRCode } from './components/PaymentQRCode';
import { GaneshGraphic } from './components/GaneshGraphic';
import { numberToWords } from './utils/numberToWords';
import { parsePackaging, calculateQtyFromCfc, calculateCfcFromQty, formatQtyWithUnit, formatDateDDMMYY } from './utils/cfcHelper';
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
  defaultTerms: 'नोट: बिका हुआ माल वापस नहीं होगा। भूल-चूक लेनी-देनी। आपके व्यापार के लिए धन्यवाद!',
  paperFormat: 'A4',
  currencySymbol: '₹',
  headerRightType: 'ganesh',
  dsOptions: ['Gautam', 'Viresh', 'Counter Sale'],
};

const getNextEstimateNumber = (historyList: SavedEstimate[]): string => {
  if (!historyList || historyList.length === 0) {
    return '101';
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
  return `${maxNum + 1}`;
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
  return '101';
};

export const App: React.FC = () => {
  // Shop Settings State (stored in localStorage + Electron disk storage)
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => {
    const saved = localStorage.getItem('shop_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.defaultTerms || parsed.defaultTerms.includes('Goods once sold') || parsed.defaultTerms.trim() === '') {
          parsed.defaultTerms = DEFAULT_SHOP_PROFILE.defaultTerms;
        }
        return parsed;
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Active Estimate State (Restores whatever was typed so customer name & items are never lost)
  const [estimate, setEstimate] = useState<ActiveEstimate>(() => {
    const savedDraft = localStorage.getItem('active_draft_estimate');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.items && parsed.items.length > 0) {
          if (parsed.estimateNumber && typeof parsed.estimateNumber === 'string' && parsed.estimateNumber.startsWith('EST-')) {
            parsed.estimateNumber = parsed.estimateNumber.replace(/^EST-?/i, '');
          }
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
      customerAddress: '',
      customerContact: '',
      dpName: '',
      items: [{ id: '1', description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
      discount: '',
      notes: DEFAULT_SHOP_PROFILE.defaultTerms,
    };
  });

  // References to focus elements for seamless keyboard navigation
  const itemInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const itemCfcRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const itemQtyRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const itemRateRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const itemAmountRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

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
              draft.estimateNumber = '101';
            } else if (draft.estimateNumber && typeof draft.estimateNumber === 'string' && draft.estimateNumber.startsWith('EST-')) {
              draft.estimateNumber = draft.estimateNumber.replace(/^EST-?/i, '');
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
  const subtotal = estimate.items.reduce((sum, item) => {
    const num = typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount)) || 0);
    return sum + num;
  }, 0);
  const discountVal = typeof estimate.discount === 'number' ? estimate.discount : 0;
  const grandTotal = Math.max(0, subtotal - discountVal);
  const totalInWords = numberToWords(grandTotal);

  // Automatically save current estimate to local history database
  const saveCurrentEstimateToHistory = () => {
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0) || (typeof i.amount === 'number' && i.amount > 0)) ||
      estimate.customerName.trim() !== '';

    if (!hasContent) return;

    const newSaved: SavedEstimate = {
      id: `est-${Date.now()}`,
      estimateNumber: estimate.estimateNumber,
      date: estimate.date,
      customerName: estimate.customerName,
      customerAddress: estimate.customerAddress || '',
      customerContact: estimate.customerContact,
      dpName: estimate.dpName || '',
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

  // Handlers for Items (Clean string handling with smart CFC <-> Qty conversion, DP & direct editable Amount)
  const handleItemChange = (
    id: string,
    field: keyof Omit<EstimateItem, 'id'>,
    value: string
  ) => {
    setEstimate((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== id) return item;

        let newCfc: number | string = item.cfc || '';
        let newQty: number | string = item.qty;
        let newRate: number | string = item.rate;
        let newAmt: number | string = item.amount;
        let newDesc = item.description;
        let newDp = item.dp || '';
        let newUnit = item.unit;
        const caseCount = item.caseCount;

        if (field === 'description') {
          newDesc = value;
          setActiveDropdownRowId(id);
          setSelectedSuggestionIndex(0);
        } else if (field === 'dp') {
          newDp = value;
        } else if (field === 'cfc') {
          newCfc = value;
          // Auto-calculate Qty from CFC if product has caseCount
          if (caseCount && caseCount > 0) {
            const calculatedQty = calculateQtyFromCfc(value, caseCount);
            if (calculatedQty !== '') {
              newQty = calculatedQty;
            }
          }
          const numericQty = typeof newQty === 'number' ? newQty : (parseFloat(String(newQty)) || 0);
          const numericRate = typeof newRate === 'number' ? newRate : (parseFloat(String(newRate)) || 0);
          newAmt = Math.round(numericQty * numericRate * 100) / 100;
        } else if (field === 'qty') {
          newQty = value;
          // Auto-calculate CFC from Qty if product has caseCount
          if (caseCount && caseCount > 0) {
            const { cfc } = calculateCfcFromQty(value, caseCount);
            newCfc = cfc;
          }
          const numericQty = typeof newQty === 'number' ? newQty : (parseFloat(String(newQty)) || 0);
          const numericRate = typeof newRate === 'number' ? newRate : (parseFloat(String(newRate)) || 0);
          newAmt = Math.round(numericQty * numericRate * 100) / 100;
        } else if (field === 'rate') {
          newRate = value;
          const numericQty = typeof newQty === 'number' ? newQty : (parseFloat(String(newQty)) || 0);
          const numericRate = typeof newRate === 'number' ? newRate : (parseFloat(String(newRate)) || 0);
          newAmt = Math.round(numericQty * numericRate * 100) / 100;
        } else if (field === 'amount') {
          newAmt = value;
          const numericQty = typeof newQty === 'number' ? newQty : (parseFloat(String(newQty)) || 0);
          const numericAmt = typeof newAmt === 'number' ? newAmt : (parseFloat(String(newAmt)) || 0);
          if (numericQty > 0 && value !== '') {
            newRate = Math.round((numericAmt / numericQty) * 100) / 100;
          }
        } else if (field === 'unit') {
          newUnit = value;
        }

        return {
          ...item,
          description: newDesc,
          dp: newDp,
          cfc: newCfc,
          qty: newQty,
          rate: newRate,
          amount: newAmt,
          unit: newUnit,
        };
      });

      return { ...prev, items: updatedItems };
    });
  };

  // Quick Add Product from Catalog Modal directly into active estimate
  const handleAddProductFromCatalog = (product: Product) => {
    const parsed = parsePackaging(product.packaging);
    const itemUnit = product.unit || parsed.unit || 'PAC';
    const itemCaseCount = product.caseCount !== undefined ? product.caseCount : parsed.caseCount;

    let initialCfc: number | string = itemCaseCount && itemCaseCount > 0 ? 1 : '';
    let initialQty: number | string = itemCaseCount && itemCaseCount > 0 ? itemCaseCount : 1;
    const numericQty = typeof initialQty === 'number' ? initialQty : (parseFloat(String(initialQty)) || 1);
    const calcAmount = Math.round(numericQty * product.rate * 100) / 100;

    setEstimate((prev) => {
      const isFirstItemEmpty =
        prev.items.length === 1 &&
        !prev.items[0].description.trim() &&
        !prev.items[0].rate;

      const newItem: EstimateItem = {
        id: Date.now().toString(),
        description: product.name,
        dp: prev.dpName || '',
        cfc: initialCfc,
        qty: initialQty,
        rate: product.rate,
        amount: calcAmount,
        unit: itemUnit,
        caseCount: itemCaseCount,
      };

      if (isFirstItemEmpty) {
        return {
          ...prev,
          items: [newItem],
        };
      } else {
        return {
          ...prev,
          items: [...prev.items, newItem],
        };
      }
    });
  };

  // Select item from autocomplete suggestions and attach packaging / conversion factor
  const handleSelectProduct = (itemId: string, product: Product) => {
    const parsed = parsePackaging(product.packaging);
    const itemUnit = product.unit || parsed.unit || 'PAC';
    const itemCaseCount = product.caseCount !== undefined ? product.caseCount : parsed.caseCount;

    setEstimate((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id !== itemId) return item;

        let initialCfc: number | string = item.cfc || '';
        let initialQty: number | string = item.qty;

        // If user already typed CFC e.g. 2
        if (initialCfc !== '' && itemCaseCount && itemCaseCount > 0) {
          initialQty = calculateQtyFromCfc(initialCfc, itemCaseCount);
        } else if (itemCaseCount && itemCaseCount > 0 && (!initialQty || Number(initialQty) <= 1)) {
          // Default 1 Gatta = itemCaseCount PAC
          initialCfc = 1;
          initialQty = itemCaseCount;
        }

        const numericQty = typeof initialQty === 'number' ? initialQty : (parseFloat(String(initialQty)) || 1);
        const calcAmount = Math.round(numericQty * product.rate * 100) / 100;

        return {
          ...item,
          description: product.name,
          dp: item.dp || '',
          rate: product.rate,
          unit: itemUnit,
          caseCount: itemCaseCount,
          cfc: initialCfc,
          qty: initialQty,
          amount: calcAmount,
        };
      });
      return { ...prev, items: updatedItems };
    });
    setActiveDropdownRowId(null);
    setSelectedSuggestionIndex(-1);

    // Auto-focus CFC or Qty after picking product
    setTimeout(() => {
      if (itemCfcRefs.current[itemId]) {
        itemCfcRefs.current[itemId]?.focus();
        itemCfcRefs.current[itemId]?.select();
      } else if (itemQtyRefs.current[itemId]) {
        itemQtyRefs.current[itemId]?.focus();
        itemQtyRefs.current[itemId]?.select();
      }
    }, 50);
  };

  const handleAddItem = () => {
    const newId = Date.now().toString();
    setEstimate((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: newId, description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0, unit: 'PAC' },
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
        items: [{ id: '1', description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
      }));
      return;
    }
    setEstimate((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  // Keyboard shortcut: Press Enter on Rate to focus Amount
  const handleRateKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      itemAmountRefs.current[id]?.focus();
      itemAmountRefs.current[id]?.select();
    }
  };

  // Keyboard shortcut: Press Enter on Amount to jump to next row or add row
  const handleAmountKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === estimate.items.length - 1) {
        handleAddItem();
      } else {
        const nextId = estimate.items[index + 1]?.id;
        if (nextId && itemInputRefs.current[nextId]) {
          itemInputRefs.current[nextId]?.focus();
        }
      }
    }
  };

  // Helper to extract numeric value from estimate number (e.g. 'EST-102' -> 102)
  const getEstNumberVal = (estNum: string): number => {
    const match = estNum?.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const currentNum = getEstNumberVal(estimate.estimateNumber);

  // Sorted history by estimate number ascending
  const sortedHistory = [...history].sort(
    (a, b) => getEstNumberVal(a.estimateNumber) - getEstNumberVal(b.estimateNumber)
  );

  const hasPrevBill = sortedHistory.some(
    (h) => getEstNumberVal(h.estimateNumber) < currentNum
  ) || (history.length > 0 && !history.some((h) => h.estimateNumber === estimate.estimateNumber));

  // Navigate to Previous Bill in History (Saves current draft & loads previous bill)
  const handlePrevBill = () => {
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0)) ||
      estimate.customerName.trim() !== '';

    let currentHistory = history;
    if (hasContent) {
      saveCurrentEstimateToHistory();
      const existingIdx = history.findIndex((e) => e.estimateNumber === estimate.estimateNumber);
      const newSaved: SavedEstimate = {
        id: `est-${Date.now()}`,
        estimateNumber: estimate.estimateNumber,
        date: estimate.date,
        customerName: estimate.customerName,
        customerAddress: estimate.customerAddress || '',
        customerContact: estimate.customerContact,
        items: estimate.items,
        subtotal: subtotal,
        discount: discountVal,
        grandTotal: grandTotal,
        notes: estimate.notes,
        createdAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        currentHistory = [...history];
        currentHistory[existingIdx] = newSaved;
      } else {
        currentHistory = [newSaved, ...history];
      }
    }

    const curNum = getEstNumberVal(estimate.estimateNumber);
    const sorted = [...currentHistory].sort(
      (a, b) => getEstNumberVal(a.estimateNumber) - getEstNumberVal(b.estimateNumber)
    );

    // Find the immediately preceding bill (largest number < curNum)
    const earlierBills = sorted.filter((h) => getEstNumberVal(h.estimateNumber) < curNum);
    if (earlierBills.length > 0) {
      const prevEst = earlierBills[earlierBills.length - 1];
      setEstimate({
        estimateNumber: prevEst.estimateNumber,
        date: prevEst.date,
        customerName: prevEst.customerName || '',
        customerAddress: prevEst.customerAddress || '',
        customerContact: prevEst.customerContact || '',
        dpName: prevEst.dpName || '',
        items: prevEst.items && prevEst.items.length > 0 ? prevEst.items : [{ id: '1', description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
        discount: prevEst.discount || '',
        notes: prevEst.notes || shopProfile.defaultTerms,
      });
    } else if (sorted.length > 0) {
      // Load earliest available bill
      const fallbackEst = sorted[0];
      setEstimate({
        estimateNumber: fallbackEst.estimateNumber,
        date: fallbackEst.date,
        customerName: fallbackEst.customerName || '',
        customerAddress: fallbackEst.customerAddress || '',
        customerContact: fallbackEst.customerContact || '',
        dpName: fallbackEst.dpName || '',
        items: fallbackEst.items && fallbackEst.items.length > 0 ? fallbackEst.items : [{ id: '1', description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
        discount: fallbackEst.discount || '',
        notes: fallbackEst.notes || shopProfile.defaultTerms,
      });
    }
  };

  // Dedicated "Next Bill" Action (Saves current estimate, navigates forward in history, or starts next sequential number)
  const handleNextBill = () => {
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0)) ||
      estimate.customerName.trim() !== '';

    let currentHistory = history;
    if (hasContent) {
      saveCurrentEstimateToHistory();
      const existingIdx = history.findIndex((e) => e.estimateNumber === estimate.estimateNumber);
      const newSaved: SavedEstimate = {
        id: `est-${Date.now()}`,
        estimateNumber: estimate.estimateNumber,
        date: estimate.date,
        customerName: estimate.customerName,
        customerAddress: estimate.customerAddress || '',
        customerContact: estimate.customerContact,
        dpName: estimate.dpName || '',
        items: estimate.items,
        subtotal: subtotal,
        discount: discountVal,
        grandTotal: grandTotal,
        notes: estimate.notes,
        createdAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        currentHistory = [...history];
        currentHistory[existingIdx] = newSaved;
      } else {
        currentHistory = [newSaved, ...history];
      }
    }

    const curNum = getEstNumberVal(estimate.estimateNumber);
    const sorted = [...currentHistory].sort(
      (a, b) => getEstNumberVal(a.estimateNumber) - getEstNumberVal(b.estimateNumber)
    );

    // Look for a subsequent saved bill in history (smallest number > curNum)
    const subsequentBills = sorted.filter((h) => getEstNumberVal(h.estimateNumber) > curNum);
    if (subsequentBills.length > 0) {
      const nextEst = subsequentBills[0];
      setEstimate({
        estimateNumber: nextEst.estimateNumber,
        date: nextEst.date,
        customerName: nextEst.customerName || '',
        customerAddress: nextEst.customerAddress || '',
        customerContact: nextEst.customerContact || '',
        dpName: nextEst.dpName || '',
        items: nextEst.items && nextEst.items.length > 0 ? nextEst.items : [{ id: '1', description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
        discount: nextEst.discount || '',
        notes: nextEst.notes || shopProfile.defaultTerms,
      });
    } else {
      // Create new next sequential bill
      const maxHistoryNum = sorted.reduce((max, h) => Math.max(max, getEstNumberVal(h.estimateNumber)), 100);
      const nextNum = Math.max(curNum, maxHistoryNum) + 1;
      setEstimate({
        estimateNumber: `${nextNum}`,
        date: new Date().toISOString().split('T')[0],
        customerName: '',
        customerAddress: '',
        customerContact: '',
        dpName: '',
        items: [{ id: Date.now().toString(), description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
        discount: '',
        notes: shopProfile.defaultTerms,
      });
    }
  };

  // Clear / New Estimate Action
  const handleNewEstimate = () => {
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0)) ||
      estimate.customerName.trim() !== '';

    let nextEstNumber = '101';

    if (hasContent) {
      saveCurrentEstimateToHistory();
      const match = estimate.estimateNumber.match(/\d+$/);
      const currentCounter = match ? parseInt(match[0], 10) : 100;
      nextEstNumber = `${currentCounter + 1}`;
    } else {
      nextEstNumber = getNextEstimateNumber(history);
    }

    setEstimate({
      estimateNumber: nextEstNumber,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerAddress: '',
      customerContact: '',
      dpName: '',
      items: [{ id: Date.now().toString(), description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
      discount: '',
      notes: shopProfile.defaultTerms,
    });
  };

  // Print Action (Saves current bill & automatically advances to next bill)
  const handlePrint = () => {
    setActiveDropdownRowId(null);
    const hasContent =
      estimate.items.some((i) => i.description.trim() !== '' || (typeof i.rate === 'number' && i.rate > 0)) ||
      estimate.customerName.trim() !== '';

    // 1. Auto-save current estimate to local history database if it has items/customer
    if (hasContent) {
      saveCurrentEstimateToHistory();
    }

    // 2. Open print dialog
    window.print();

    // 3. Immediately advance to next sequential bill for fast counter workflow!
    if (hasContent) {
      const match = estimate.estimateNumber.match(/\d+$/);
      const currentCounter = match ? parseInt(match[0], 10) : 100;
      const nextCounter = currentCounter + 1;

      setTimeout(() => {
        setEstimate({
          estimateNumber: `${nextCounter}`,
          date: new Date().toISOString().split('T')[0],
          customerName: '',
          customerAddress: '',
          customerContact: '',
          dpName: '',
          items: [{ id: Date.now().toString(), description: '', dp: '', cfc: '', qty: 1, rate: '', amount: 0 }],
          discount: '',
          notes: shopProfile.defaultTerms,
        });
      }, 500);
    }
  };

  // Load a past estimate from history
  const handleLoadPastEstimate = (past: SavedEstimate) => {
    setEstimate({
      estimateNumber: past.estimateNumber,
      date: past.date,
      customerName: past.customerName,
      customerAddress: past.customerAddress || '',
      customerContact: past.customerContact,
      dpName: past.dpName || '',
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

  // Global Keyboard Shortcuts (Ctrl+P to print, Ctrl+N for new, Alt+Left for prev, Alt+Right for next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If any modal is active, do not hijack typing or shortcut actions
      if (isProductsOpen || isSettingsOpen || isHistoryOpen || isPreviewOpen) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewEstimate();
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevBill();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextBill();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [estimate, history, isProductsOpen, isSettingsOpen, isHistoryOpen, isPreviewOpen]);

  // Reusable Single Copy for 2-in-1 Print Rendering (Clean Simple Lining, Zero Page Waste)
  const renderPrintCopy = (copyType: 'ORIGINAL' | 'DUPLICATE') => {
    const headerRightMode = shopProfile.headerRightType || 'ganesh';

    return (
      <div className="copy-half-sheet bg-white text-black p-2 text-[10px] leading-tight flex flex-col justify-between border-2 border-black">
        {/* Top Part: Header + Customer Details */}
        <div>
          {/* Top Copy Tag: Original / Duplicate Marker */}
          {copyType && (
            <div className="flex justify-between items-center text-[8px] font-black uppercase border-b border-black pb-0.5 mb-1 text-black">
              <span>{copyType === 'ORIGINAL' ? 'ORIGINAL (Customer Copy)' : 'DUPLICATE (Office Copy)'}</span>
              <span className="font-mono text-[8px] text-black">ESTIMATE</span>
            </div>
          )}

          {/* Header (Left Logo | Center Shop Details | Right Ganesh Ji / Payment QR) */}
          <div className="border-b-2 border-black pb-1 mb-1">
            <div className="grid grid-cols-12 items-center gap-1">
              {/* Left: Shop Logo */}
              <div className="col-span-3 flex justify-end items-center pr-2">
                {shopProfile.logoUrl ? (
                  <img
                    src={shopProfile.logoUrl}
                    alt="Logo"
                    className="max-h-11 max-w-[100px] object-contain"
                  />
                ) : (
                  <div className="w-4 h-4" />
                )}
              </div>

              {/* Center: Shop Info */}
              <div className="col-span-6 text-center">
                <h1 className="text-base font-black uppercase tracking-tight text-black leading-tight">
                  {shopProfile.name}
                </h1>
                {shopProfile.tagline && (
                  <p className="text-[9px] font-bold text-black mt-0.5">{shopProfile.tagline}</p>
                )}
                <p className="text-[8.5px] text-black mt-0.5">
                  {shopProfile.address} {shopProfile.phone && `• Ph: ${shopProfile.phone}`}
                </p>
                <div className="mt-0.5 text-[8.5px] font-black uppercase tracking-wider text-black">
                  — {shopProfile.estimateTitle || 'ESTIMATE BILL'} —
                </div>
              </div>

              {/* Right: Lord Ganesh Ji Emblem (Default) OR Payment QR */}
              <div className="col-span-3 flex flex-col justify-center items-start pl-2">
                {headerRightMode === 'ganesh' ? (
                  <GaneshGraphic size={36} isCompact={true} />
                ) : headerRightMode === 'qr' && (shopProfile.upiId || shopProfile.qrCodeUrl) ? (
                  <div className="flex flex-col items-center">
                    <PaymentQRCode
                      upiId={shopProfile.upiId}
                      shopName={shopProfile.name}
                      grandTotal={grandTotal}
                      customQrUrl={shopProfile.qrCodeUrl}
                      size={40}
                    />
                    <span className="text-[6.5px] font-bold uppercase text-black">Scan & Pay</span>
                  </div>
                ) : (
                  <div className="w-4 h-4" />
                )}
              </div>
            </div>
          </div>

          {/* Sub-Header Strip: ESTIMATE | S. No. | Date */}
          <div className="flex justify-between items-center border-b border-black py-0.5 px-1 mb-1 text-[10px] bg-white">
            <div className="flex items-center gap-2">
              <span className="font-black text-[10.5px] uppercase tracking-wider text-black">ESTIMATE</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-black text-[9px] uppercase">S. No.:</span>
                <span className="font-black text-black text-xs font-mono">{estimate.estimateNumber}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-black text-[9px] uppercase">Date:</span>
                <span className="font-black text-black text-[10px]">{formatDateDDMMYY(estimate.date)}</span>
              </div>
            </div>
          </div>

          {/* Customer Details: Full Width Maximum Space + Large Bold Fonts */}
          <div className="border-b border-black pb-1 mb-1 text-[10px] space-y-1">
            {/* Row 1: Name (100% Full Width) */}
            <div className="flex items-baseline gap-1.5 w-full">
              <span className="font-black text-black uppercase text-[10.5px] min-w-[44px]">Name:</span>
              <span className="font-black text-black text-xs sm:text-[14px] leading-tight flex-1 border-b border-dotted border-black pb-0.5">
                {estimate.customerName || '—'}
              </span>
            </div>

            {/* Row 2: Add (Address) + D.S. */}
            <div className="flex items-baseline justify-between gap-3 w-full">
              <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                <span className="font-extrabold text-black uppercase text-[9.5px] min-w-[44px]">Add:</span>
                <span className="font-bold text-black text-[11px] sm:text-xs leading-tight truncate flex-1 border-b border-dotted border-black pb-0.5">
                  {estimate.customerAddress || '—'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 flex-shrink-0 pl-2">
                <span className="font-black text-black uppercase text-[9.5px]">D.S.:</span>
                <span className="font-black text-black text-[10.5px] min-w-[50px] text-center border-b border-dotted border-black pb-0.5">
                  {estimate.dpName || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black mb-1 text-[9.5px]">
            <thead>
              <tr className="border-b border-black bg-white font-black uppercase text-center text-[9px]">
                <th className="border border-black py-0.5 px-1 w-6">#</th>
                <th className="border border-black py-0.5 px-1.5 text-left">Item Description</th>
                <th className="border border-black py-0.5 px-1 w-11 text-center">CFC</th>
                <th className="border border-black py-0.5 px-1 w-16 text-right">Qty</th>
                <th className="border border-black py-0.5 px-1 w-16 text-right">Rate</th>
                <th className="border border-black py-0.5 px-1.5 w-20 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item, index) => {
                const itemAmt = typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount)) || 0);
                return (
                  <tr key={item.id} className="border-b border-black">
                    <td className="border border-black py-0.5 px-1 text-center font-bold text-[9px]">{index + 1}</td>
                    <td className="border border-black py-0.5 px-1.5 font-bold text-[10px] sm:text-[11px]">
                      {item.description || '—'}
                      {item.caseCount && item.caseCount > 0 && (
                        <span className="text-[8px] text-black font-normal ml-1">
                          (1 Gatta = {item.caseCount} {item.unit || 'PAC'})
                        </span>
                      )}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-center font-semibold text-[9px] text-black">
                      {item.cfc ? `${item.cfc}` : '—'}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-right font-bold text-[9.5px]">
                      {formatQtyWithUnit(item.qty, item.unit)}
                    </td>
                    <td className="border border-black py-0.5 px-1 text-right font-bold text-[9.5px]">
                      {item.rate !== '' ? `${shopProfile.currencySymbol}${item.rate}` : '—'}
                    </td>
                    <td className="border border-black py-0.5 px-1.5 text-right font-black text-[10px] sm:text-[10.5px]">
                      {shopProfile.currencySymbol}{itemAmt.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Part: Totals, Notice & Receiver Signatures */}
        <div>
          <div className="grid grid-cols-12 gap-1 border-t border-black pt-0.5 text-[9.5px]">
            <div className="col-span-7 flex flex-col justify-between">
              <div>
                <p className="font-black uppercase text-[8px] text-black">Terms / Notice:</p>
                <p className="text-[8.5px] text-black font-semibold leading-tight mt-0.5">
                  {estimate.notes || shopProfile.defaultTerms}
                </p>
              </div>

              {grandTotal > 0 && (
                <div className="mt-0.5 text-[8.5px] font-bold leading-tight">
                  <span className="font-extrabold">Words: </span><span className="italic">{totalInWords}</span>
                </div>
              )}
            </div>

            <div className="col-span-5 space-y-0.2">
              <div className="flex justify-between py-0.2 border-b border-black font-bold text-[9px]">
                <span>Subtotal:</span>
                <span>{shopProfile.currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between py-0.2 border-b border-black text-[9px]">
                  <span>Discount:</span>
                  <span>- {shopProfile.currencySymbol}{discountVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5 border-y-2 border-black font-black text-[10.5px]">
                <span>TOTAL:</span>
                <span>{shopProfile.currencySymbol}{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Dual Signature Block */}
          <div className="flex justify-between items-end pt-2 mt-0.5 border-t border-dashed border-black">
            <div className="text-center">
              <div className="border-t border-black w-28 sm:w-32 pt-0.5 font-bold text-[8.5px] text-black">
                Receiver&apos;s Signature
              </div>
              <div className="text-[7.5px] text-black">
                (हस्ताक्षर ग्राहक / प्राप्तकर्ता)
              </div>
            </div>

            <div className="text-center">
              <div className="text-[8px] font-bold text-black mb-3">
                For {shopProfile.name}
              </div>
              <div className="border-t border-black w-32 sm:w-36 pt-0.5 font-black text-[8.5px] text-black">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex flex-col items-center"
      onClick={() => setActiveDropdownRowId(null)}
    >
      {/* Top Application Bar (Hidden during Print) */}
      <header className="w-full bg-white border-b border-slate-200 px-3 sm:px-5 py-2 sticky top-0 z-40 shadow-xs no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
          {/* Zone 1: Left Brand & Shop Details */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img
              src="/horizontal-logo.png"
              alt="InvoicePro"
              className="h-7 sm:h-8 object-contain select-none"
            />
            <div className="hidden md:block h-5 w-px bg-slate-200"></div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[140px]">
                {shopProfile.name}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-tight">
                Offline Billing
              </span>
            </div>
          </div>

          {/* Zone 2: Dedicated Bill Stepper / Navigator (Distinct & Separated) */}
          <div className="flex items-center bg-slate-100 border border-slate-300 p-1 rounded-xl shadow-xs gap-1">
            {/* Previous Bill Button */}
            <button
              onClick={handlePrevBill}
              disabled={!hasPrevBill}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                hasPrevBill
                  ? 'bg-white hover:bg-slate-50 text-slate-800 shadow-xs active:scale-95 border border-slate-200 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed bg-transparent'
              }`}
              title="Go to Previous Bill in History (Alt+Left)"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Prev Bill</span>
            </button>

            {/* Current Bill Badge / Display */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg shadow-inner">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Bill:</span>
              <span className="text-xs font-black text-black font-mono tracking-tight">
                {estimate.estimateNumber}
              </span>
            </div>

            {/* Next Bill Button (Distinct Emerald Button) */}
            <button
              onClick={handleNextBill}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-200 hover:bg-emerald-300 border border-emerald-400 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Save current bill & proceed to Next Bill (Alt+Right)"
            >
              <span>Next Bill</span>
              <ChevronRight className="w-4 h-4 text-emerald-800" />
            </button>

            {/* New Bill Button */}
            <button
              onClick={handleNewEstimate}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-slate-700 hover:text-black hover:bg-white rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Start Blank New Bill (Ctrl+N)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          {/* Zone 3: Tools & Output Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Paper Format Selector Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={shopProfile.paperFormat}
                onChange={(e) =>
                  handleSaveShopProfile({
                    ...shopProfile,
                    paperFormat: e.target.value as any,
                  })
                }
                className="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 shadow-xs"
                title="Select Printing Paper Format"
              >
                <option value="A4_2in1">✂️ A4 2-in-1 (Original + Duplicate)</option>
                <option value="A4">📄 A4 Standard Full Page</option>
                <option value="A5">📑 A5 Slip / Voucher</option>
                <option value="thermal80">🧾 Thermal 80mm</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
            </div>

            {/* Products Button */}
            <button
              onClick={() => setIsProductsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Manage Products Catalog"
            >
              <Package className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">Products</span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {products.length}
              </span>
            </button>

            {/* History Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="View Past Saved Estimates"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden lg:inline">History</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {history.length}
              </span>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 p-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Shop Settings & Payment QR"
            >
              <Settings className="w-4 h-4 text-slate-600" />
            </button>

            {/* Preview Button */}
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-300 transition-all active:scale-95 shadow-xs cursor-pointer"
              title="Preview Exact Print Layout"
            >
              <Eye className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Preview</span>
            </button>

            {/* Print Button (Primary Call To Action) */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-black text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer"
              title="Print & Save Estimate Bill (Ctrl+P)"
            >
              <Printer className="w-4 h-4 text-slate-200" />
              <span>Print</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] bg-slate-700 text-white rounded font-mono">
                Ctrl+P
              </kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Main Interactive Workspace */}
      <main
        className={`w-full ${
          shopProfile.paperFormat === 'thermal80'
            ? 'max-w-md'
            : 'max-w-4xl'
        } p-3 sm:p-5 print:p-0 my-2 flex-1 transition-all ${
          shopProfile.paperFormat === 'A4_2in1' ? 'print:hidden' : ''
        }`}
      >
        <div
          id="estimate-bill-print-area"
          className={`bg-white rounded-xl shadow-sm border-2 border-black p-5 sm:p-7 printable-area transition-all ${
            shopProfile.paperFormat === 'thermal80'
              ? 'format-thermal80 mx-auto'
              : shopProfile.paperFormat === 'A5'
              ? 'format-A5'
              : 'format-A4'
          }`}
        >
          {/* Bill Header (Left Logo | Center Shop Info | Right Payment QR) */}
          <div className="border-b-2 border-black pb-2 mb-2">
            <div className="grid grid-cols-12 items-center gap-2">
              {/* Left: Shop Logo (Bigger & closer to shop name) */}
              <div className="col-span-3 flex justify-end items-center pr-3">
                {shopProfile.logoUrl ? (
                  <img
                    src={shopProfile.logoUrl}
                    alt="Shop Logo"
                    className="h-16 sm:h-20 max-w-[150px] object-contain"
                  />
                ) : (
                  <div className="w-10 h-10" />
                )}
              </div>

              {/* Center: Shop Info */}
              <div className="col-span-6 text-center">
                <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase print:text-base leading-tight">
                  {shopProfile.name}
                </h2>
                {shopProfile.tagline && (
                  <p className="text-xs sm:text-sm font-semibold text-black leading-tight mt-0.5">
                    {shopProfile.tagline}
                  </p>
                )}
                <p className="text-xs text-black mt-0.5 leading-tight">
                  {shopProfile.address} {shopProfile.phone && `• Ph: ${shopProfile.phone}`}
                </p>
                <div className="mt-1 text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                  — {shopProfile.estimateTitle || 'ESTIMATE BILL'} —
                </div>
              </div>

              {/* Right: Lord Ganesh Ji Emblem (Default) OR Payment QR */}
              <div className="col-span-3 flex flex-col justify-center items-start pl-3">
                {(shopProfile.headerRightType || 'ganesh') === 'ganesh' ? (
                  <GaneshGraphic size={54} />
                ) : shopProfile.headerRightType === 'qr' && (shopProfile.upiId || shopProfile.qrCodeUrl) ? (
                  <div className="flex flex-col items-center">
                    <PaymentQRCode
                      upiId={shopProfile.upiId}
                      shopName={shopProfile.name}
                      grandTotal={grandTotal}
                      customQrUrl={shopProfile.qrCodeUrl}
                      size={58}
                    />
                    <span className="text-[8px] font-black uppercase tracking-wider text-black mt-0.5">
                      Scan & Pay
                    </span>
                  </div>
                ) : (
                  <div className="w-10 h-10" />
                )}
              </div>
            </div>
          </div>

          {/* Estimate Meta Strip (ESTIMATE Title | S. No. | Date) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-black py-1 px-2 mb-2 bg-slate-50 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="font-black uppercase tracking-wider text-black text-xs sm:text-sm">
                — {shopProfile.estimateTitle || 'ESTIMATE BILL'} —
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* S. No. */}
              <div className="flex items-center bg-white border border-black rounded px-2 py-0.5 shadow-2xs">
                <span className="font-extrabold text-black text-xs uppercase mr-1.5 text-slate-700">S. No.:</span>
                <input
                  type="text"
                  value={estimate.estimateNumber}
                  onChange={(e) =>
                    setEstimate({ ...estimate, estimateNumber: e.target.value })
                  }
                  className="w-16 font-black text-black text-xs sm:text-sm bg-transparent border-none focus:outline-none font-mono text-left"
                />
              </div>

              {/* Date */}
              <div className="flex items-center bg-white border border-black rounded px-2 py-0.5 shadow-2xs">
                <span className="font-extrabold text-black text-xs uppercase mr-1.5 text-slate-700">Date:</span>
                <input
                  type="date"
                  value={estimate.date}
                  onChange={(e) => setEstimate({ ...estimate, date: e.target.value })}
                  className="w-32 font-bold text-black text-xs sm:text-sm bg-transparent border-none focus:outline-none text-left cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Customer Details: Full Width Maximum Space + Large Bold Fonts */}
          <div className="border-b border-black pb-2 mb-2 space-y-1.5 bg-white">
            {/* Row 1: Name (100% Full Width, Big Bold Font) */}
            <div className="flex items-center gap-2 w-full">
              <span className="font-black text-black text-sm sm:text-base uppercase min-w-[50px]">Name:</span>
              <input
                type="text"
                placeholder="Customer / Party Name (Full space available)"
                value={estimate.customerName}
                onChange={(e) =>
                  setEstimate({ ...estimate, customerName: e.target.value })
                }
                className="w-full bg-white border-b-2 border-slate-300 hover:border-black focus:border-black px-2 py-0.5 font-black text-black text-base sm:text-lg focus:outline-none print:border-none"
              />
            </div>

            {/* Row 2: Add (Address) + D.S. */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="font-bold text-black text-xs sm:text-sm uppercase min-w-[50px]">Add:</span>
                <input
                  type="text"
                  placeholder="Customer Address / Destination"
                  value={estimate.customerAddress || ''}
                  onChange={(e) =>
                    setEstimate({ ...estimate, customerAddress: e.target.value })
                  }
                  className="w-full bg-white border-b border-slate-300 hover:border-black focus:border-black px-2 py-0.5 font-bold text-black text-xs sm:text-sm focus:outline-none print:border-none"
                />
              </div>

              {/* D.S. Dropdown */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-extrabold text-black text-xs uppercase min-w-[32px] text-slate-700">D.S.:</span>
                <select
                  value={estimate.dpName || ''}
                  onChange={(e) => {
                    if (e.target.value === '__add_custom__') {
                      const customName = window.prompt('Enter custom DS / Salesperson name:');
                      if (customName && customName.trim()) {
                        setEstimate({ ...estimate, dpName: customName.trim() });
                      }
                    } else {
                      setEstimate({ ...estimate, dpName: e.target.value });
                    }
                  }}
                  className="font-bold text-black text-xs sm:text-sm bg-slate-50 border border-black rounded px-2.5 py-1 shadow-2xs focus:outline-none cursor-pointer text-slate-900"
                  title="Select DS (Dispatch / Salesperson / Counter)"
                >
                  <option value="">— Select D.S. —</option>
                  {(shopProfile.dsOptions && shopProfile.dsOptions.length > 0
                    ? shopProfile.dsOptions
                    : ['Gautam', 'Viresh', 'Counter Sale']
                  ).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {estimate.dpName &&
                    !(shopProfile.dsOptions || ['Gautam', 'Viresh', 'Counter Sale']).includes(estimate.dpName) && (
                      <option value={estimate.dpName}>{estimate.dpName}</option>
                    )}
                  <option value="__add_custom__">+ Other / Custom Name...</option>
                </select>
              </div>
            </div>
          </div>

          {/* Line Items Table (Clean CFC/Gatte + Qty + Rate + Amount) */}
          <div className="overflow-visible mb-2">
            <table className="w-full border-collapse text-xs sm:text-sm print-table">
              <thead>
                <tr className="bg-white text-black border-y-2 border-black font-black uppercase text-xs tracking-wider">
                  <th className="py-1.5 px-1.5 text-center w-8">#</th>
                  <th className="py-1.5 px-2 text-left">Item Description</th>
                  <th className="py-1.5 px-1 text-center w-14 sm:w-16">CFC</th>
                  <th className="py-1.5 px-1.5 text-right w-24 sm:w-28">Qty</th>
                  <th className="py-1.5 px-1.5 text-right w-24 sm:w-28">Rate</th>
                  <th className="py-1.5 px-2 text-right w-28 sm:w-32">Amount</th>
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
                          onFocus={() => {
                            setActiveDropdownRowId(item.id);
                            setSelectedSuggestionIndex(0);
                          }}
                          onKeyDown={(e) => {
                            if (matchingSuggestions.length > 0) {
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setSelectedSuggestionIndex((prev) =>
                                  prev < matchingSuggestions.length - 1 ? prev + 1 : 0
                                );
                                return;
                              }
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setSelectedSuggestionIndex((prev) =>
                                  prev > 0 ? prev - 1 : matchingSuggestions.length - 1
                                );
                                return;
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                setActiveDropdownRowId(null);
                                setSelectedSuggestionIndex(-1);
                                return;
                              }
                              if (e.key === 'Enter' || e.key === 'Tab') {
                                if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < matchingSuggestions.length) {
                                  e.preventDefault();
                                  handleSelectProduct(item.id, matchingSuggestions[selectedSuggestionIndex]);
                                  return;
                                }
                              }
                            }

                            if (e.key === 'Enter') {
                              e.preventDefault();
                              itemCfcRefs.current[item.id]?.focus();
                              itemCfcRefs.current[item.id]?.select();
                            }
                          }}
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
                                <span>Suggested Products (↑/↓ + Enter)</span>
                              </span>
                              <span className="text-[10px] text-slate-700 font-bold bg-white px-1.5 py-0.2 rounded border border-slate-300">
                                {matchingSuggestions.length} items
                              </span>
                            </div>
                            {matchingSuggestions.map((prod, sIdx) => {
                              const parsed = parsePackaging(prod.packaging);
                              const displayUnit = prod.unit || parsed.unit || 'PAC';
                              const displayCase = prod.caseCount || parsed.caseCount;

                              return (
                                <button
                                  key={prod.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(item.id, prod)}
                                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between border-b border-slate-100 last:border-none transition-colors ${
                                    selectedSuggestionIndex === sIdx
                                      ? 'bg-sky-100 text-sky-950 font-bold'
                                      : 'hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="truncate pr-2">
                                    <div className="font-bold text-black text-xs sm:text-sm truncate">
                                      {prod.name}
                                    </div>
                                    <div className="text-[10px] text-slate-600 flex items-center gap-2 mt-0.5">
                                      {displayCase ? (
                                        <span className="bg-slate-100 px-1 rounded border border-slate-200 font-medium">
                                          1 Gatta = <strong className="text-black">{displayCase} {displayUnit}</strong>
                                        </span>
                                      ) : (
                                        <span>Unit: {prod.packaging || displayUnit}</span>
                                      )}
                                      {prod.cfcRate ? (
                                        <span className="text-emerald-700 font-semibold">
                                          Gatta Rate: {shopProfile.currencySymbol}{prod.cfcRate}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0 pl-2">
                                    <div className="font-black text-black text-xs sm:text-sm tabular-nums">
                                      {shopProfile.currencySymbol}
                                      {prod.rate.toFixed(2)}
                                      <span className="text-[10px] text-slate-500 font-normal ml-0.5">/{displayUnit}</span>
                                    </div>
                                    {prod.mrp && (
                                      <div className="text-[10px] text-slate-400 line-through">
                                        MRP {prod.mrp}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* CFC / Gatte Input Column */}
                      <td className="py-1 px-1 text-center">
                        <input
                          ref={(el) => (itemCfcRefs.current[item.id] = el)}
                          type="text"
                          inputMode="decimal"
                          placeholder="—"
                          value={item.cfc || ''}
                          onChange={(e) =>
                            handleItemChange(item.id, 'cfc', e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              itemQtyRefs.current[item.id]?.focus();
                              itemQtyRefs.current[item.id]?.select();
                            }
                          }}
                          className="w-full text-center bg-transparent px-1 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black font-bold text-black tabular-nums print:p-0 text-xs sm:text-sm"
                          title="CFC (Number of Gatte / Cartons)"
                        />
                      </td>

                      {/* Qty Column with Unit Badge */}
                      <td className="py-1 px-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            ref={(el) => (itemQtyRefs.current[item.id] = el)}
                            type="text"
                            inputMode="decimal"
                            placeholder="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleItemChange(item.id, 'qty', e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                itemRateRefs.current[item.id]?.focus();
                                itemRateRefs.current[item.id]?.select();
                              }
                            }}
                            className="w-full min-w-0 text-right bg-transparent px-1.5 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black font-bold text-black tabular-nums print:p-0 text-xs sm:text-sm"
                          />
                          {item.unit && (
                            <span className="text-[10px] text-slate-500 font-bold uppercase select-none flex-shrink-0 no-print">
                              {item.unit}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rate Column */}
                      <td className="py-1 px-1.5 text-right">
                        <input
                          ref={(el) => (itemRateRefs.current[item.id] = el)}
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) =>
                            handleItemChange(item.id, 'rate', e.target.value)
                          }
                          onKeyDown={(e) => handleRateKeyDown(e, item.id)}
                          className="w-full text-right bg-transparent px-1 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black font-bold text-black tabular-nums print:p-0 text-xs sm:text-sm"
                        />
                      </td>

                      {/* Directly Editable Amount Column */}
                      <td className="py-1 px-1.5 text-right">
                        <div className="flex items-center justify-end">
                          <span className="text-black font-bold text-xs mr-0.5 select-none">{shopProfile.currencySymbol}</span>
                          <input
                            ref={(el) => (itemAmountRefs.current[item.id] = el)}
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={item.amount !== undefined && item.amount !== null ? item.amount : ''}
                            onChange={(e) =>
                              handleItemChange(item.id, 'amount', e.target.value)
                            }
                            onKeyDown={(e) => handleAmountKeyDown(e, index)}
                            className="w-full text-right bg-transparent px-1 py-0.5 h-7 rounded focus:outline-none focus:bg-slate-50 focus:ring-1 focus:ring-black font-black text-black tabular-nums print:p-0 text-xs sm:text-sm"
                            title="Line Amount (editable directly)"
                          />
                        </div>
                      </td>

                      {/* Delete Row Action */}
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
                (Enter on Amount)
              </span>
            </button>
          </div>

          {/* Bill Summary & Totals Block (Simple Clean Lining, No Nested Boxes) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 border-t-2 border-black pt-2 text-xs sm:text-sm">
            {/* Left Column: Terms + Words + Payment QR Code */}
            <div className="sm:col-span-7 flex flex-col justify-between">
              <div>
                <label className="block text-[10px] font-bold text-black uppercase tracking-wider mb-0.5">
                  Terms / Return Notice (Hindi)
                </label>
                <textarea
                  rows={2}
                  value={estimate.notes}
                  onChange={(e) => setEstimate({ ...estimate, notes: e.target.value })}
                  className="w-full text-xs text-black bg-white border border-slate-300 rounded p-1.5 focus:outline-none focus:border-black print:border-none print:p-0 font-medium leading-relaxed"
                  placeholder="Terms or return notice in Hindi..."
                />
              </div>

              {/* Total In Words */}
              {grandTotal > 0 && (
                <div className="text-xs text-black leading-tight mt-2">
                  <span className="font-extrabold">Words: </span>
                  <span className="italic font-bold">{totalInWords}</span>
                </div>
              )}
            </div>

            {/* Calculations (Right Column) - Clean Lines, No Rounded Pill Box */}
            <div className="sm:col-span-5 space-y-0.5">
              <div className="flex justify-between items-center text-xs sm:text-sm py-0.5 border-b border-black font-semibold">
                <span className="text-black">Subtotal:</span>
                <span className="font-black text-black tabular-nums">
                  {shopProfile.currencySymbol}
                  {subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs sm:text-sm py-0.5 border-b border-black">
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

              {/* Grand Total - Clean Classic Double Horizontal Lines */}
              <div className="border-y-2 border-black py-1 my-1 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                  TOTAL:
                </span>
                <span className="text-base sm:text-lg font-black tabular-nums text-black">
                  {shopProfile.currencySymbol}
                  {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Dual Signature Section (Receiver on Left, Shop Authorised on Right) */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 print:border-black flex items-end justify-between text-xs text-black">
            <div className="text-center">
              <div className="border-t border-black w-36 sm:w-44 pt-1 font-bold text-[10px] sm:text-xs text-black">
                Receiver&apos;s Signature
              </div>
              <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 print:text-black mt-0.5">
                (हस्ताक्षर ग्राहक / प्राप्तकर्ता)
              </div>
            </div>

            <div className="text-[10px] text-black italic hidden sm:block">
              * E. & O.E. (भूल-चूक लेनी-देनी)
            </div>

            <div className="text-center">
              <div className="text-[9.5px] sm:text-[10.5px] font-bold text-black mb-5 sm:mb-6">
                For {shopProfile.name}
              </div>
              <div className="border-t border-black w-36 sm:w-48 pt-1 font-black text-[10px] sm:text-xs text-black">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* A4 2-in-1 Dedicated Print Container (Rendered during Print when format is A4_2in1) */}
      {shopProfile.paperFormat === 'A4_2in1' && (
        <div className="print-only format-A4-2in1-container w-full bg-white text-black p-0 m-0">
          {/* Top: Original Copy */}
          {renderPrintCopy('ORIGINAL')}

          {/* Simple Perforation Divider (Clean single dashed line - No emojis) */}
          <div className="cut-line-separator w-full border-t border-dashed border-black" />

          {/* Bottom: Duplicate Copy */}
          {renderPrintCopy('DUPLICATE')}
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        shopProfile={shopProfile}
        estimate={estimate}
        onPrint={handlePrint}
        onChangeFormat={(fmt) => handleSaveShopProfile({ ...shopProfile, paperFormat: fmt })}
      />

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
        onAddProductToEstimate={handleAddProductFromCatalog}
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

