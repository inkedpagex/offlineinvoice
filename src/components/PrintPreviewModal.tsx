import React from 'react';
import { X, Printer, Eye } from 'lucide-react';
import { ShopProfile, ActiveEstimate, PaperFormat } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { PaymentQRCode } from './PaymentQRCode';
import { GaneshGraphic } from './GaneshGraphic';
import { formatQtyWithUnit, formatDateDDMMYY } from '../utils/cfcHelper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shopProfile: ShopProfile;
  estimate: ActiveEstimate;
  onPrint: () => void;
  onChangeFormat: (format: PaperFormat) => void;
}

export const PrintPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shopProfile,
  estimate,
  onPrint,
  onChangeFormat,
}) => {
  if (!isOpen) return null;

  const subtotal = estimate.items.reduce((sum, item) => {
    const num = typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount)) || 0);
    return sum + num;
  }, 0);
  const discountVal = typeof estimate.discount === 'number' ? estimate.discount : (parseFloat(String(estimate.discount)) || 0);
  const grandTotal = Math.max(0, subtotal - discountVal);
  const totalInWords = numberToWords(grandTotal);

  const headerRightMode = shopProfile.headerRightType || 'ganesh';

  // Reusable Single Copy Renderer (Clean Simple Lining, Pure B&W)
  const renderBillCopy = (copyLabel?: string, isCompact: boolean = false) => (
    <div className={`bg-white text-black border-2 border-black rounded-xs shadow-sm font-sans mb-4 ${isCompact ? 'p-2.5 sm:p-3 text-[10.5px]' : 'p-3 sm:p-4 text-xs'}`}>
      <div>
        {/* Top Copy Label */}
        {copyLabel && (
          <div className="flex justify-between items-center text-[9px] font-black uppercase border-b border-black pb-0.5 mb-1.5 text-black">
            <span>{copyLabel}</span>
            <span className="font-mono text-[9px] text-black">ESTIMATE</span>
          </div>
        )}

        {/* Header Info */}
        <div className="border-b-2 border-black pb-1.5 mb-1.5">
          <div className="grid grid-cols-12 items-center gap-2">
            {/* Shop Logo */}
            <div className="col-span-3 flex justify-end items-center pr-2">
              {shopProfile.logoUrl ? (
                <img
                  src={shopProfile.logoUrl}
                  alt="Logo"
                  className="max-h-12 max-w-[120px] object-contain"
                />
              ) : (
                <div className="w-6 h-6" />
              )}
            </div>

            {/* Center Shop Details */}
            <div className="col-span-6 text-center">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black leading-tight">
                {shopProfile.name}
              </h1>
              {shopProfile.tagline && (
                <p className="text-[10px] font-bold text-black mt-0.5">{shopProfile.tagline}</p>
              )}
              <p className="text-[9.5px] text-black mt-0.5">
                {shopProfile.address} {shopProfile.phone && `• Ph: ${shopProfile.phone}`}
              </p>
              <div className="mt-0.5 text-[9.5px] font-black uppercase tracking-wider text-black">
                — {shopProfile.estimateTitle || 'ESTIMATE BILL'} —
              </div>
            </div>

            {/* Right Emblem: Ganesh Ji or Payment QR */}
            <div className="col-span-3 flex flex-col justify-center items-start pl-2">
              {headerRightMode === 'ganesh' ? (
                <GaneshGraphic size={42} isCompact={true} />
              ) : headerRightMode === 'qr' && (shopProfile.upiId || shopProfile.qrCodeUrl) ? (
                <div className="flex flex-col items-center">
                  <PaymentQRCode
                    upiId={shopProfile.upiId}
                    shopName={shopProfile.name}
                    grandTotal={grandTotal}
                    customQrUrl={shopProfile.qrCodeUrl}
                    size={48}
                  />
                  <span className="text-[7.5px] font-bold uppercase text-black mt-0.5">Scan & Pay</span>
                </div>
              ) : (
                <div className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>

        {/* Customer & Bill Meta Section (Structured, Balanced, Crisp Print Layout) */}
        <div className="grid grid-cols-12 gap-2 border-y border-black py-1 mb-1.5 items-center">
          {/* Customer Details: Prominent M/s Name & Address */}
          <div className="col-span-6 space-y-0.5 pr-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-black uppercase text-[11px] sm:text-xs min-w-[55px]">M/s / To:</span>
              <span className="font-black text-black text-sm sm:text-base leading-tight truncate">
                {estimate.customerName || '—'}
              </span>
            </div>
            {estimate.customerAddress && (
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-black text-[10.5px] sm:text-[11.5px] min-w-[55px]">Address:</span>
                <span className="text-black text-xs sm:text-sm font-semibold leading-tight truncate">
                  {estimate.customerAddress}
                </span>
              </div>
            )}
          </div>

          {/* Right: Est No, Date & DS in Clean Structured Boxes */}
          <div className="col-span-6 flex items-center justify-end gap-x-2 text-right border-l border-black pl-2 whitespace-nowrap">
            {/* Est No */}
            <div className="flex items-center gap-1 border border-black bg-white px-2 py-0.5 rounded-xs">
              <span className="font-bold text-black text-[9.5px] uppercase">Est No:</span>
              <span className="font-black text-black text-xs sm:text-sm font-mono">{estimate.estimateNumber}</span>
            </div>

            {/* Date in dd-mm-yy */}
            <div className="flex items-center gap-1 border border-black bg-white px-2 py-0.5 rounded-xs">
              <span className="font-bold text-black text-[9.5px] uppercase">Date:</span>
              <span className="font-black text-black text-xs">{formatDateDDMMYY(estimate.date)}</span>
            </div>

            {/* DS */}
            <div className="flex items-center gap-1 border border-black bg-white px-2 py-0.5 rounded-xs">
              <span className="font-bold text-black text-[9.5px] uppercase">DS:</span>
              <span className="font-black text-black text-xs min-w-[36px] text-center">
                {estimate.dpName || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-black mb-1.5">
          <thead>
            <tr className="border-b-2 border-black bg-white font-black uppercase text-center text-[10px] sm:text-[11px]">
              <th className="border border-black py-0.5 px-1 w-7">#</th>
              <th className="border border-black py-0.5 px-2 text-left">Item Description</th>
              <th className="border border-black py-0.5 px-1.5 w-12 text-center">CFC</th>
              <th className="border border-black py-0.5 px-1.5 w-20 sm:w-24 text-right">Qty</th>
              <th className="border border-black py-0.5 px-1.5 w-20 sm:w-24 text-right">Rate</th>
              <th className="border border-black py-0.5 px-2 w-24 sm:w-28 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.items.map((item, index) => {
              const itemAmt = typeof item.amount === 'number' ? item.amount : (parseFloat(String(item.amount)) || 0);
              return (
                <tr key={item.id} className="border-b border-black">
                  <td className="border border-black py-0.5 px-1 text-center font-bold text-[10.5px]">{index + 1}</td>
                  <td className="border border-black py-0.5 px-2 font-bold text-xs sm:text-[13px]">
                    {item.description || '—'}
                    {item.caseCount && item.caseCount > 0 && (
                      <span className="text-[9.5px] text-black font-normal ml-1">
                        (1 Gatta = {item.caseCount} {item.unit || 'PAC'})
                      </span>
                    )}
                  </td>
                  <td className="border border-black py-0.5 px-1.5 text-center font-semibold text-[11px] text-black">
                    {item.cfc ? `${item.cfc}` : '—'}
                  </td>
                  <td className="border border-black py-0.5 px-1.5 text-right font-bold text-xs">
                    {formatQtyWithUnit(item.qty, item.unit)}
                  </td>
                  <td className="border border-black py-0.5 px-1.5 text-right font-bold text-xs">
                    {item.rate !== '' ? `${shopProfile.currencySymbol}${item.rate}` : '—'}
                  </td>
                  <td className="border border-black py-0.5 px-2 text-right font-black text-xs sm:text-[13px]">
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
        <div className="grid grid-cols-12 gap-2 border-t-2 border-black pt-1">
          {/* Left Column: Terms + In Words */}
          <div className="col-span-7 flex flex-col justify-between">
            <div>
              <p className="font-black uppercase text-[8.5px] text-black">Terms / Notice:</p>
              <p className="text-[9.5px] sm:text-[10.5px] text-black font-semibold leading-tight mt-0.5">
                {estimate.notes || shopProfile.defaultTerms}
              </p>
            </div>

            {grandTotal > 0 && (
              <div className="mt-1 text-[9.5px] font-bold leading-tight">
                <span className="font-extrabold">Words: </span><span className="italic">{totalInWords}</span>
              </div>
            )}
          </div>

          {/* Right Column: Calculations */}
          <div className="col-span-5 space-y-0.5">
            <div className="flex justify-between py-0.2 border-b border-black font-bold text-xs">
              <span>Subtotal:</span>
              <span>{shopProfile.currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between py-0.2 border-b border-black text-xs">
                <span>Discount:</span>
                <span>- {shopProfile.currencySymbol}{discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-0.5 border-y-2 border-black font-black text-xs sm:text-sm">
              <span>GRAND TOTAL:</span>
              <span>{shopProfile.currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Dual Signature Section: Receiver Signature (Left) & Authorised Signatory (Right) */}
        <div className="flex justify-between items-end pt-3 mt-1 border-t border-dashed border-slate-300">
          <div className="text-center">
            <div className="border-t border-black w-32 sm:w-40 pt-0.5 font-bold text-[9.5px] sm:text-[10.5px] text-black">
              Receiver&apos;s Signature
            </div>
            <div className="text-[8px] text-black">
              (हस्ताक्षर ग्राहक / प्राप्तकर्ता)
            </div>
          </div>

          <div className="text-center">
            <div className="text-[9px] sm:text-[10px] font-bold text-black mb-4 sm:mb-5">
              For {shopProfile.name}
            </div>
            <div className="border-t border-black w-36 sm:w-44 pt-0.5 font-black text-[9.5px] sm:text-[10.5px] text-black">
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 no-print animate-in fade-in duration-150">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-700">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-sky-400" />
            <span className="font-extrabold text-sm sm:text-base">Real Paper Print Preview</span>
            <span className="text-xs text-slate-400 hidden sm:inline">• (Exact layout sent to printer)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Format Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => onChangeFormat('A4')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  shopProfile.paperFormat === 'A4'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => onChangeFormat('A4_2in1')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  shopProfile.paperFormat === 'A4_2in1'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Print 2 Copies on 1 Sheet (Original Top + Duplicate Bottom)"
              >
                A4 (2-in-1)
              </button>
              <button
                type="button"
                onClick={() => onChangeFormat('A5')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  shopProfile.paperFormat === 'A5'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A5 Slip
              </button>
              <button
                type="button"
                onClick={() => onChangeFormat('thermal80')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  shopProfile.paperFormat === 'thermal80'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container (Realistic Viewport) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/50 flex justify-center items-start">
          {shopProfile.paperFormat === 'A4_2in1' ? (
            /* A4 2-in-1 Container with Scissor Cut-Line */
            <div
              className="bg-white text-black shadow-2xl transition-all w-[680px] p-4 flex flex-col"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {/* Top Copy: Original */}
              {renderBillCopy('ORIGINAL', true)}

              {/* Center Simple Perforation Line (No emojis) */}
              <div className="my-3 border-t border-dashed border-slate-400 w-full" />

              {/* Bottom Copy: Duplicate */}
              {renderBillCopy('DUPLICATE', true)}
            </div>
          ) : (
            /* Single Sheet (A4 / A5 / Thermal) */
            <div
              className={`bg-white text-black shadow-2xl transition-all ${
                shopProfile.paperFormat === 'thermal80'
                  ? 'w-[320px] p-4 text-[11px]'
                  : shopProfile.paperFormat === 'A5'
                  ? 'w-[520px] p-6 text-xs'
                  : 'w-[680px] p-8 text-xs'
              }`}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {renderBillCopy(undefined, shopProfile.paperFormat === 'thermal80')}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-t border-slate-700 flex-shrink-0">
          <span className="text-xs text-slate-400">
            Current format: <strong className="text-white">{shopProfile.paperFormat.toUpperCase()}</strong> • Ink-saving B&W
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPrint();
              }}
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-black text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-lg shadow-sky-600/30 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
