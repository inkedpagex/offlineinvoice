import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  TrendingUp,
  Receipt,
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import { SavedEstimate, ShopProfile } from '../types';
import { formatDateDDMMYY, formatQtyWithUnit } from '../utils/cfcHelper';
import { matchHinglish } from '../utils/hinglishMatcher';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: SavedEstimate[];
  shopProfile: ShopProfile;
  onLoadEstimate?: (estimate: SavedEstimate) => void;
}

type ReportMode = 'daily' | 'monthly' | 'custom';
type ReportTab = 'bills' | 'products';

export const SalesReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  history,
  shopProfile,
  onLoadEstimate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // 'YYYY-MM'

  const [reportMode, setReportMode] = useState<ReportMode>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedDs, setSelectedDs] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ReportTab>('bills');
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  // Quick preset shortcuts
  const handleQuickDaily = (offsetDays: number = 0) => {
    setReportMode('daily');
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const dateStr = d.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  const handleQuickMonthly = (offsetMonths: number = 0) => {
    setReportMode('monthly');
    const d = new Date();
    d.setMonth(d.getMonth() - offsetMonths);
    const mStr = d.toISOString().slice(0, 7);
    setSelectedMonth(mStr);
  };

  // Filter bills based on period and criteria
  const filteredEstimates = useMemo(() => {
    return history.filter((est) => {
      // 1. Date filter
      if (reportMode === 'daily') {
        if (est.date !== selectedDate) return false;
      } else if (reportMode === 'monthly') {
        if (!est.date.startsWith(selectedMonth)) return false;
      } else if (reportMode === 'custom') {
        if (est.date < startDate || est.date > endDate) return false;
      }

      // 2. D.S. filter
      if (selectedDs !== 'all') {
        if (selectedDs === '__none__') {
          if (est.dpName && est.dpName.trim() !== '') return false;
        } else {
          if (est.dpName !== selectedDs) return false;
        }
      }

      // 3. Search query (Party name, bill number, address) with Hinglish support
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchCustomer = matchHinglish(est.customerName, searchTerm, est.customerAddress);
        const matchNum = est.estimateNumber?.toLowerCase().includes(q);
        const matchDs = est.dpName?.toLowerCase().includes(q);
        if (!matchCustomer && !matchNum && !matchDs) return false;
      }

      return true;
    });
  }, [history, reportMode, selectedDate, selectedMonth, startDate, endDate, selectedDs, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalDiscount = 0;
    let totalGrand = 0;
    let totalItemsQty = 0;
    let totalCfc = 0;

    for (const est of filteredEstimates) {
      totalGross += est.subtotal || 0;
      totalDiscount += est.discount || 0;
      totalGrand += est.grandTotal || 0;

      if (Array.isArray(est.items)) {
        for (const item of est.items) {
          const q = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty)) || 0;
          const c = typeof item.cfc === 'number' ? item.cfc : parseFloat(String(item.cfc)) || 0;
          totalItemsQty += q;
          totalCfc += c;
        }
      }
    }

    const billCount = filteredEstimates.length;
    const avgBillValue = billCount > 0 ? totalGrand / billCount : 0;

    return {
      billCount,
      totalGross,
      totalDiscount,
      totalGrand,
      totalItemsQty,
      totalCfc,
      avgBillValue,
    };
  }, [filteredEstimates]);

  // Product-wise sales aggregation
  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        unit: string;
        totalQty: number;
        totalCfc: number;
        totalAmount: number;
        billCount: number;
      }
    >();

    for (const est of filteredEstimates) {
      if (!Array.isArray(est.items)) continue;
      for (const item of est.items) {
        const desc = item.description?.trim();
        if (!desc) continue;
        const key = desc.toLowerCase();
        const q = typeof item.qty === 'number' ? item.qty : parseFloat(String(item.qty)) || 0;
        const c = typeof item.cfc === 'number' ? item.cfc : parseFloat(String(item.cfc)) || 0;
        const amt = typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount)) || 0;
        const u = item.unit || 'PAC';

        if (!map.has(key)) {
          map.set(key, {
            name: desc,
            unit: u,
            totalQty: q,
            totalCfc: c,
            totalAmount: amt,
            billCount: 1,
          });
        } else {
          const entry = map.get(key)!;
          entry.totalQty += q;
          entry.totalCfc += c;
          entry.totalAmount += amt;
          entry.billCount += 1;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredEstimates]);

  // Unique list of DS available
  const availableDsList = useMemo(() => {
    const set = new Set<string>();
    for (const h of history) {
      if (h.dpName && h.dpName.trim() !== '') {
        set.add(h.dpName.trim());
      }
    }
    if (shopProfile.dsOptions) {
      for (const ds of shopProfile.dsOptions) {
        if (ds.trim()) set.add(ds.trim());
      }
    }
    return Array.from(set);
  }, [history, shopProfile.dsOptions]);

  // Title for Report
  const reportHeading = useMemo(() => {
    if (reportMode === 'daily') {
      return `Daily Sales Report (${formatDateDDMMYY(selectedDate)})`;
    } else if (reportMode === 'monthly') {
      const [y, m] = selectedMonth.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      return `Monthly Sales Summary - ${monthName}`;
    } else {
      return `Custom Period Report (${formatDateDDMMYY(startDate)} to ${formatDateDDMMYY(endDate)})`;
    }
  }, [reportMode, selectedDate, selectedMonth, startDate, endDate]);

  const [printScope, setPrintScope] = useState<'active' | 'bills' | 'products' | 'both'>('active');

  // Direct Print Report Action
  const handlePrintReport = (scope: 'active' | 'bills' | 'products' | 'both' = 'active') => {
    setPrintScope(scope);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = '';
    if (activeTab === 'bills') {
      csv = 'Bill No,Date,Customer Name,Address,D.S.,Items Count,Gross Subtotal,Discount,Grand Total\n';
      for (const est of filteredEstimates) {
        const itemsCnt = est.items?.length || 0;
        const cleanName = `"${(est.customerName || '').replace(/"/g, '""')}"`;
        const cleanAddr = `"${(est.customerAddress || '').replace(/"/g, '""')}"`;
        const cleanDs = `"${(est.dpName || '').replace(/"/g, '""')}"`;
        csv += `${est.estimateNumber},${est.date},${cleanName},${cleanAddr},${cleanDs},${itemsCnt},${est.subtotal.toFixed(2)},${est.discount.toFixed(2)},${est.grandTotal.toFixed(2)}\n`;
      }
    } else {
      csv = 'Product Description,Total Gatte (CFC),Total Qty Sold,Unit,Bills Count,Total Revenue\n';
      for (const p of productSummary) {
        const cleanName = `"${p.name.replace(/"/g, '""')}"`;
        csv += `${cleanName},${p.totalCfc},${p.totalQty},${p.unit},${p.billCount},${p.totalAmount.toFixed(2)}\n`;
      }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Report_${reportMode}_${activeTab}_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shouldPrintBills =
    printScope === 'both' ||
    (printScope === 'active' && activeTab === 'bills') ||
    printScope === 'bills';

  const shouldPrintProducts =
    printScope === 'both' ||
    (printScope === 'active' && activeTab === 'products') ||
    printScope === 'products';

  if (!isOpen) return null;

  return (
    <>
      {/* Screen Interactive Modal (Hidden in Print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 no-print transition-all">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 shadow-2xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-black flex items-center gap-2">
                  <span>Sales & Estimate Reports</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {stats.billCount} Bills Found
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {shopProfile.name} • Daily, Monthly & Custom Period Analytics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* CSV Export Button */}
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Export report data as CSV file"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              {/* Primary Print Button */}
              <button
                onClick={() => handlePrintReport('active')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-slate-900 hover:bg-black rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                title={`Print current ${activeTab === 'bills' ? 'Invoices List' : 'Product-wise Breakdown'} report`}
              >
                <Printer className="w-3.5 h-3.5 text-slate-200" />
                <span>Print Report ({activeTab === 'bills' ? 'Invoices' : 'Products'})</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-black p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-white space-y-3 flex-shrink-0">
            {/* Row 1: Mode Switches + Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Mode Buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={() => setReportMode('daily')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    reportMode === 'daily'
                      ? 'bg-white text-black shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  📅 Daily Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('monthly')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    reportMode === 'monthly'
                      ? 'bg-white text-black shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  📊 Monthly Report
                </button>
                <button
                  type="button"
                  onClick={() => setReportMode('custom')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    reportMode === 'custom'
                      ? 'bg-white text-black shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  🗓️ Custom Range
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {reportMode === 'daily' && (
                  <>
                    <button
                      onClick={() => handleQuickDaily(0)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedDate === todayStr
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-black'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleQuickDaily(1)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                    >
                      Yesterday
                    </button>
                  </>
                )}

                {reportMode === 'monthly' && (
                  <>
                    <button
                      onClick={() => handleQuickMonthly(0)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        selectedMonth === currentMonthStr
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-950 font-black'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => handleQuickMonthly(1)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                    >
                      Last Month
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Date Inputs & Filter Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              {/* Date Pickers */}
              <div className="sm:col-span-6 flex items-center gap-2">
                {reportMode === 'daily' && (
                  <div className="flex items-center gap-2 w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-extrabold text-slate-700 uppercase">Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm font-black text-black focus:outline-none cursor-pointer flex-1"
                    />
                  </div>
                )}

                {reportMode === 'monthly' && (
                  <div className="flex items-center gap-2 w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-extrabold text-slate-700 uppercase">Month:</span>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm font-black text-black focus:outline-none cursor-pointer flex-1"
                    />
                  </div>
                )}

                {reportMode === 'custom' && (
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center gap-1.5 flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                      <span className="text-[11px] font-bold text-slate-600">From:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-xs font-black text-black focus:outline-none cursor-pointer w-full"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                      <span className="text-[11px] font-bold text-slate-600">To:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-xs font-black text-black focus:outline-none cursor-pointer w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* D.S. Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedDs}
                  onChange={(e) => setSelectedDs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer shadow-2xs"
                >
                  <option value="all">👥 All D.S. (Counter / Sales)</option>
                  {availableDsList.map((ds) => (
                    <option key={ds} value={ds}>
                      {ds}
                    </option>
                  ))}
                  <option value="__none__">— No D.S. Assigned —</option>
                </select>
              </div>

              {/* Search Customer / Bill */}
              <div className="sm:col-span-3 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter customer / bill (Hinglish)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Stats KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            {/* Total Revenue */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Total Net Revenue
              </span>
              <div className="text-base sm:text-xl font-black text-emerald-700 tracking-tight mt-0.5">
                {shopProfile.currencySymbol}
                {stats.totalGrand.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Gross: {shopProfile.currencySymbol}{stats.totalGross.toFixed(2)}
              </span>
            </div>

            {/* Total Bills */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Total Bills Count
              </span>
              <div className="text-base sm:text-xl font-black text-black tracking-tight mt-0.5">
                {stats.billCount} <span className="text-xs font-semibold text-slate-500">bills</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Avg: {shopProfile.currencySymbol}{stats.avgBillValue.toFixed(2)} / bill
              </span>
            </div>

            {/* Total Cartons / CFC */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Total Gatte (CFC) Sold
              </span>
              <div className="text-base sm:text-xl font-black text-indigo-700 tracking-tight mt-0.5">
                {stats.totalCfc} <span className="text-xs font-semibold text-slate-500">gatte</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Total Units: {stats.totalItemsQty} PAC
              </span>
            </div>

            {/* Total Discount */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Total Discount Given
              </span>
              <div className="text-base sm:text-xl font-black text-amber-700 tracking-tight mt-0.5">
                {shopProfile.currencySymbol}
                {stats.totalDiscount.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Across {stats.billCount} invoices
              </span>
            </div>
          </div>

          {/* View Tabs Selector */}
          <div className="flex items-center justify-between px-4 pt-2 border-b border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('bills')}
                className={`pb-2 text-xs sm:text-sm font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === 'bills'
                    ? 'border-black text-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                🧾 Invoices List ({filteredEstimates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('products')}
                className={`pb-2 text-xs sm:text-sm font-black border-b-2 transition-all cursor-pointer ${
                  activeTab === 'products'
                    ? 'border-black text-black'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                📦 Product-wise Breakdown ({productSummary.length} items)
              </button>
            </div>

            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">
                {reportHeading}
              </span>
            </div>
          </div>

          {/* Tab Content Table */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'bills' ? (
              filteredEstimates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">No estimate bills found for this period.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try selecting a different date, month, or changing D.S. filter.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-10">#</th>
                        <th className="py-2.5 px-3 w-20">Bill #</th>
                        <th className="py-2.5 px-3 w-24">Date</th>
                        <th className="py-2.5 px-3">Customer / Party Name</th>
                        <th className="py-2.5 px-3">Address</th>
                        <th className="py-2.5 px-3 w-24">D.S.</th>
                        <th className="py-2.5 px-2 text-center w-14">Items</th>
                        <th className="py-2.5 px-3 text-right w-24">Subtotal</th>
                        <th className="py-2.5 px-3 text-right w-20">Discount</th>
                        <th className="py-2.5 px-3 text-right w-28">Net Total</th>
                        <th className="py-2.5 px-2 text-center w-12">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEstimates.map((est, idx) => {
                        const isExpanded = expandedBillId === est.id;
                        return (
                          <React.Fragment key={est.id || idx}>
                            <tr
                              className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                                isExpanded ? 'bg-sky-50/60' : ''
                              }`}
                              onClick={() => setExpandedBillId(isExpanded ? null : est.id)}
                            >
                              <td className="py-2 px-2 text-center font-bold text-slate-500 text-xs">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-mono font-black text-black text-xs">
                                {est.estimateNumber}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-700 whitespace-nowrap">
                                {formatDateDDMMYY(est.date)}
                              </td>
                              <td className="py-2 px-3 font-black text-black text-sm">
                                {est.customerName || '—'}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-600 truncate max-w-[160px]">
                                {est.customerAddress || '—'}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-700">
                                {est.dpName ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">
                                    {est.dpName}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center font-bold text-slate-600">
                                {est.items?.length || 0}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-700 tabular-nums">
                                {shopProfile.currencySymbol}
                                {est.subtotal.toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-amber-700 tabular-nums">
                                {est.discount > 0 ? `${shopProfile.currencySymbol}${est.discount.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-emerald-800 text-sm tabular-nums">
                                {shopProfile.currencySymbol}
                                {est.grandTotal.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onLoadEstimate) {
                                      onLoadEstimate(est);
                                      onClose();
                                    }
                                  }}
                                  className="text-sky-600 hover:text-sky-900 p-1 rounded hover:bg-sky-100 transition-colors cursor-pointer"
                                  title="Load this bill into editor"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Bill Items Sub-Table */}
                            {isExpanded && est.items && (
                              <tr className="bg-slate-50 border-y border-slate-200">
                                <td colSpan={11} className="p-3 pl-12">
                                  <div className="bg-white rounded-lg border border-slate-300 p-3 shadow-2xs">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                        Line Items in Bill #{est.estimateNumber} ({est.items.length})
                                      </span>
                                      {onLoadEstimate && (
                                        <button
                                          onClick={() => {
                                            onLoadEstimate(est);
                                            onClose();
                                          }}
                                          className="text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 px-2.5 py-1 rounded border border-sky-200 cursor-pointer"
                                        >
                                          Open in Editor & Print ➔
                                        </button>
                                      )}
                                    </div>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                          <th className="py-1 text-left">Product</th>
                                          <th className="py-1 text-center w-14">CFC</th>
                                          <th className="py-1 text-right w-20">Qty</th>
                                          <th className="py-1 text-right w-20">Rate</th>
                                          <th className="py-1 text-right w-24">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium">
                                        {est.items.map((it, iIdx) => (
                                          <tr key={iIdx}>
                                            <td className="py-1 font-bold text-black">{it.description}</td>
                                            <td className="py-1 text-center font-bold text-slate-600">{it.cfc || '—'}</td>
                                            <td className="py-1 text-right font-bold text-black">{formatQtyWithUnit(it.qty, it.unit)}</td>
                                            <td className="py-1 text-right text-slate-600">{shopProfile.currencySymbol}{it.rate}</td>
                                            <td className="py-1 text-right font-black text-black">
                                              {shopProfile.currencySymbol}
                                              {typeof it.amount === 'number' ? it.amount.toFixed(2) : it.amount}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs text-black">
                      <tr>
                        <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider">
                          Grand Totals ({filteredEstimates.length} Bills):
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {shopProfile.currencySymbol}
                          {stats.totalGross.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-700 tabular-nums">
                          {shopProfile.currencySymbol}
                          {stats.totalDiscount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-800 text-sm tabular-nums">
                          {shopProfile.currencySymbol}
                          {stats.totalGrand.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            ) : (
              /* Product-wise Summary Tab */
              productSummary.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">No product data found in this period.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[11px] border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-2 text-center w-10">#</th>
                        <th className="py-2.5 px-3">Product Description</th>
                        <th className="py-2.5 px-3 text-center w-24">Gatte (CFC)</th>
                        <th className="py-2.5 px-3 text-right w-28">Total Qty Sold</th>
                        <th className="py-2.5 px-3 text-center w-20">Unit</th>
                        <th className="py-2.5 px-3 text-right w-24">Bills Count</th>
                        <th className="py-2.5 px-3 text-right w-32">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {productSummary.map((prod, pIdx) => (
                        <tr key={pIdx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2 text-center font-bold text-slate-500">{pIdx + 1}</td>
                          <td className="py-2 px-3 font-black text-black text-sm">{prod.name}</td>
                          <td className="py-2 px-3 text-center font-black text-indigo-700 text-sm">
                            {prod.totalCfc > 0 ? prod.totalCfc : '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-black text-sm tabular-nums">
                            {prod.totalQty}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-600">{prod.unit}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-600">{prod.billCount} bills</td>
                          <td className="py-2 px-3 text-right font-black text-emerald-800 text-sm tabular-nums">
                            {shopProfile.currencySymbol}
                            {prod.totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs text-black">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider">
                          Summary Totals ({productSummary.length} Products):
                        </td>
                        <td className="py-2.5 px-3 text-center text-indigo-800 text-sm">
                          {stats.totalCfc}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm">
                          {stats.totalItemsQty}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right">{stats.billCount} bills</td>
                        <td className="py-2.5 px-3 text-right text-emerald-800 text-sm tabular-nums">
                          {shopProfile.currencySymbol}
                          {stats.totalGrand.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0 text-xs font-bold text-slate-600">
            <div>
              Showing {filteredEstimates.length} bills • Net Sales: {shopProfile.currencySymbol}
              {stats.totalGrand.toFixed(2)}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrintReport('both')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer text-xs"
                title="Print both Invoices List & Product-wise Breakdown"
              >
                Print Full Report (Both)
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-black font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Clean Printable Report Sheet (Rendered only during window.print()) */}
      <div className="hidden print:block printable-area report-print-sheet p-4 bg-white text-black font-sans">
        {/* Printable Report Header */}
        <div className="border-b-2 border-black pb-2 mb-3 text-center">
          <h1 className="text-2xl font-black uppercase tracking-tight text-black">{shopProfile.name}</h1>
          {shopProfile.tagline && <p className="text-xs font-bold mt-0.5 text-black">{shopProfile.tagline}</p>}
          <p className="text-[11px] mt-0.5 text-black">
            {shopProfile.address} {shopProfile.phone && `• Ph: ${shopProfile.phone}`}
          </p>
          <div className="mt-2 text-sm font-black uppercase tracking-wider border-y-2 border-black py-1 text-black">
            — {reportHeading.toUpperCase()} —
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-black mt-1 px-1">
            <span>
              REPORT VIEW: {shouldPrintBills && shouldPrintProducts ? 'COMPLETE (INVOICES & PRODUCTS)' : shouldPrintProducts ? 'PRODUCT-WISE SALES ANALYSIS' : 'DETAILED INVOICES REGISTER'}
            </span>
            <span>
              D.S. FILTER: {selectedDs === 'all' ? 'ALL' : selectedDs.toUpperCase()}
            </span>
            <span>
              TOTAL BILLS: {stats.billCount}
            </span>
          </div>
        </div>

        {/* Printable Report Summary Cards */}
        <div className="grid grid-cols-6 border-2 border-black text-center mb-3 text-xs">
          <div className="p-1.5 border-r border-black">
            <span className="font-extrabold uppercase text-[8.5px] block">Total Invoices</span>
            <span className="font-black text-sm">{stats.billCount}</span>
          </div>
          <div className="p-1.5 border-r border-black">
            <span className="font-extrabold uppercase text-[8.5px] block">Total Gatte (CFC)</span>
            <span className="font-black text-sm">{stats.totalCfc}</span>
          </div>
          <div className="p-1.5 border-r border-black">
            <span className="font-extrabold uppercase text-[8.5px] block">Total Units Sold</span>
            <span className="font-black text-sm">{stats.totalItemsQty} PAC</span>
          </div>
          <div className="p-1.5 border-r border-black">
            <span className="font-extrabold uppercase text-[8.5px] block">Gross Subtotal</span>
            <span className="font-black text-sm">{shopProfile.currencySymbol}{stats.totalGross.toFixed(2)}</span>
          </div>
          <div className="p-1.5 border-r border-black">
            <span className="font-extrabold uppercase text-[8.5px] block">Total Discount</span>
            <span className="font-black text-sm">{shopProfile.currencySymbol}{stats.totalDiscount.toFixed(2)}</span>
          </div>
          <div className="p-1.5 bg-slate-100">
            <span className="font-extrabold uppercase text-[8.5px] block">Net Sales Realized</span>
            <span className="font-black text-sm">{shopProfile.currencySymbol}{stats.totalGrand.toFixed(2)}</span>
          </div>
        </div>

        {/* SECTION 1: Product-wise Summary Table (If active or both) */}
        {shouldPrintProducts && (
          <div className="mb-4">
            <div className="text-xs font-black uppercase tracking-wider border-b border-black pb-0.5 mb-1 flex justify-between items-center">
              <span>📦 Product-wise Sales & Volume Summary ({productSummary.length} Items)</span>
              <span className="text-[10px] font-bold">Total Gatte: {stats.totalCfc} | Revenue: {shopProfile.currencySymbol}{stats.totalGrand.toFixed(2)}</span>
            </div>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-slate-100 font-black uppercase text-[9.5px]">
                  <th className="border border-black py-1 px-1 w-7 text-center">#</th>
                  <th className="border border-black py-1 px-2 text-left">Product Description</th>
                  <th className="border border-black py-1 px-2 w-24 text-center">Gatte (CFC)</th>
                  <th className="border border-black py-1 px-2 w-28 text-right">Total Qty Sold</th>
                  <th className="border border-black py-1 px-1.5 w-16 text-center">Unit</th>
                  <th className="border border-black py-1 px-2 w-24 text-right">Bills Count</th>
                  <th className="border border-black py-1 px-2 w-32 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-black py-3 text-center font-bold text-slate-500">
                      No product sales recorded in this period.
                    </td>
                  </tr>
                ) : (
                  productSummary.map((prod, pIdx) => (
                    <tr key={pIdx} className="border-b border-black">
                      <td className="border border-black py-0.5 px-1 text-center font-bold text-[10px]">{pIdx + 1}</td>
                      <td className="border border-black py-0.5 px-2 font-black text-[11px] text-black">{prod.name}</td>
                      <td className="border border-black py-0.5 px-2 text-center font-black text-[11px]">
                        {prod.totalCfc > 0 ? prod.totalCfc : '—'}
                      </td>
                      <td className="border border-black py-0.5 px-2 text-right font-black text-[11px] tabular-nums">
                        {prod.totalQty}
                      </td>
                      <td className="border border-black py-0.5 px-1.5 text-center font-bold text-[10px]">{prod.unit}</td>
                      <td className="border border-black py-0.5 px-2 text-right font-bold text-[10.5px]">{prod.billCount} bills</td>
                      <td className="border border-black py-0.5 px-2 text-right font-black text-[11.5px] tabular-nums">
                        {shopProfile.currencySymbol}{prod.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-black bg-slate-100 text-xs">
                  <td colSpan={2} className="border border-black py-1 px-2 text-right uppercase tracking-wider">
                    Products Summary Total:
                  </td>
                  <td className="border border-black py-1 px-2 text-center font-black">
                    {stats.totalCfc}
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-black">
                    {stats.totalItemsQty}
                  </td>
                  <td className="border border-black"></td>
                  <td className="border border-black py-1 px-2 text-right">{stats.billCount} bills</td>
                  <td className="border border-black py-1 px-2 text-right font-black text-sm">
                    {shopProfile.currencySymbol}{stats.totalGrand.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* SECTION 2: Detailed Invoices Register Table (If active or both) */}
        {shouldPrintBills && (
          <div className="mb-4">
            <div className="text-xs font-black uppercase tracking-wider border-b border-black pb-0.5 mb-1 flex justify-between items-center">
              <span>🧾 Detailed Invoices Register ({filteredEstimates.length} Bills)</span>
              <span className="text-[10px] font-bold">Total Invoices: {filteredEstimates.length} | Net: {shopProfile.currencySymbol}{stats.totalGrand.toFixed(2)}</span>
            </div>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-slate-100 font-black uppercase text-[9.5px]">
                  <th className="border border-black py-1 px-1 w-7 text-center">#</th>
                  <th className="border border-black py-1 px-1.5 text-center w-14">Bill #</th>
                  <th className="border border-black py-1 px-2 text-left w-20">Date</th>
                  <th className="border border-black py-1 px-2 text-left">Customer / Party Name</th>
                  <th className="border border-black py-1 px-2 text-left">Address / Destination</th>
                  <th className="border border-black py-1 px-1.5 w-16 text-center">D.S.</th>
                  <th className="border border-black py-1 px-1 w-10 text-center">Items</th>
                  <th className="border border-black py-1 px-2 text-right w-20">Subtotal</th>
                  <th className="border border-black py-1 px-1.5 text-right w-14">Disc</th>
                  <th className="border border-black py-1 px-2 text-right w-24">Net Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredEstimates.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="border border-black py-3 text-center font-bold text-slate-500">
                      No invoices recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredEstimates.map((est, index) => (
                    <tr key={est.id || index} className="border-b border-black">
                      <td className="border border-black py-0.5 px-1 text-center font-bold text-[10px]">{index + 1}</td>
                      <td className="border border-black py-0.5 px-1.5 text-center font-mono font-black text-[11px]">{est.estimateNumber}</td>
                      <td className="border border-black py-0.5 px-2 font-bold whitespace-nowrap text-[10px]">{formatDateDDMMYY(est.date)}</td>
                      <td className="border border-black py-0.5 px-2 font-black text-[11px] text-black">{est.customerName || '—'}</td>
                      <td className="border border-black py-0.5 px-2 font-medium truncate max-w-[130px] text-[10px]">{est.customerAddress || '—'}</td>
                      <td className="border border-black py-0.5 px-1.5 text-center font-bold text-[10px]">{est.dpName || '—'}</td>
                      <td className="border border-black py-0.5 px-1 text-center font-bold text-[10px]">{est.items?.length || 0}</td>
                      <td className="border border-black py-0.5 px-2 text-right font-bold text-[10.5px] tabular-nums">{shopProfile.currencySymbol}{est.subtotal.toFixed(2)}</td>
                      <td className="border border-black py-0.5 px-1.5 text-right font-bold text-[10px] tabular-nums">{est.discount > 0 ? `${shopProfile.currencySymbol}${est.discount.toFixed(2)}` : '—'}</td>
                      <td className="border border-black py-0.5 px-2 text-right font-black text-[11.5px] tabular-nums">{shopProfile.currencySymbol}{est.grandTotal.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-black bg-slate-100 text-xs">
                  <td colSpan={7} className="border border-black py-1 px-2 text-right uppercase tracking-wider">
                    Invoices Grand Total ({filteredEstimates.length} Bills):
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-black tabular-nums">
                    {shopProfile.currencySymbol}{stats.totalGross.toFixed(2)}
                  </td>
                  <td className="border border-black py-1 px-1.5 text-right font-black tabular-nums">
                    {shopProfile.currencySymbol}{stats.totalDiscount.toFixed(2)}
                  </td>
                  <td className="border border-black py-1 px-2 text-right font-black text-sm tabular-nums">
                    {shopProfile.currencySymbol}{stats.totalGrand.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Printable Signature & Verification Line */}
        <div className="flex justify-between items-end pt-6 mt-4 border-t border-black text-xs">
          <div>
            <p className="text-[10px] font-black text-black uppercase tracking-wider">InvoicePro Offline Billing System</p>
            <p className="text-[9px] text-slate-600 mt-0.5">Report Printed on: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <div className="text-center">
            <div className="text-[9.5px] font-bold text-black mb-4">
              For {shopProfile.name}
            </div>
            <div className="border-t border-black w-48 pt-0.5 font-black text-[10px] text-black">
              Authorised Signatory / Manager
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
