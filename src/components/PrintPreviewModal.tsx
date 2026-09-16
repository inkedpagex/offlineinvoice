import React from 'react';
import { X, Printer, Eye } from 'lucide-react';
import { ShopProfile, ActiveEstimate, PaperFormat } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { PaymentQRCode } from './PaymentQRCode';
import { formatQtyWithUnit } from '../utils/cfcHelper';

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

  const subtotal = estimate.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const discountVal = typeof estimate.discount === 'number' ? estimate.discount : 0;
  const grandTotal = Math.max(0, subtotal - discountVal);
  const totalInWords = numberToWords(grandTotal);

  // Reusable Single Copy Renderer (Clean Simple Lining, Pure B&W)
  const renderBillCopy = (copyType?: 'ORIGINAL' | 'DUPLICATE', isCompact: boolean = false) => (
    <div className={`bg-white text-black transition-all border-2 border-black ${isCompact ? 'p-3 text-[11px]' : 'p-5 sm:p-6 text-xs'}`}>
      {/* Top Copy Tag: Original / Duplicate Marker (No overlap with QR) */}
      {copyType && (
        <div className="flex justify-between items-center text-[8px] font-black uppercase border-b border-black pb-0.5 mb-1 text-black">
          <span>{copyType === 'ORIGINAL' ? 'ORIGINAL (Customer Copy)' : 'DUPLICATE (Office Copy)'}</span>
          <span className="font-mono text-[8px] text-black">ESTIMATE</span>
        </div>
      )}

      {/* Header (Left Logo | Center Shop Details | Right Payment QR) */}
      <div className="border-b-2 border-black pb-1.5 mb-2">

        <div className="grid grid-cols-12 items-center gap-1.5">
          {/* Left: Shop Logo (Bigger & closer to shop info) */}
          <div className="col-span-3 flex justify-end items-center pr-2">
            {shopProfile.logoUrl ? (
              <img
                src={shopProfile.logoUrl}
                alt="Logo"
                className={`${isCompact ? 'max-h-14 max-w-[125px]' : 'max-h-18 max-w-[150px]'} object-contain`}
              />
            ) : (
              <div className="w-6 h-6" />
            )}
          </div>

          {/* Center: Shop Info */}
          <div className="col-span-6 text-center">
            <h1 className={`${isCompact ? 'text-lg' : 'text-xl sm:text-2xl'} font-black uppercase tracking-tight text-black leading-tight`}>
              {shopProfile.name}
            </h1>
            {shopProfile.tagline && (
              <p className="text-[10px] sm:text-xs font-bold text-black mt-0.5">{shopProfile.tagline}</p>
            )}
            <p className="text-[10px] sm:text-xs text-black mt-0.5">
              {shopProfile.address} {shopProfile.phone && `• Ph: ${shopProfile.phone}`}
            </p>
            <div className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-black">
              — {shopProfile.estimateTitle || 'ESTIMATE BILL'} —
            </div>
          </div>

          {/* Right: Payment QR Code (Closer to shop info) */}
          <div className="col-span-3 flex flex-col justify-center items-start pl-2">
            {(shopProfile.upiId || shopProfile.qrCodeUrl) ? (
              <div className="flex flex-col items-center">
                <PaymentQRCode
                  upiId={shopProfile.upiId}
                  shopName={shopProfile.name}
                  grandTotal={grandTotal}
                  customQrUrl={shopProfile.qrCodeUrl}
                  size={isCompact ? 48 : 58}
                />
                <span className="text-[8px] font-bold uppercase text-black mt-0.5">Scan & Pay</span>
              </div>
            ) : (
              <div className="w-6 h-6" />
            )}
          </div>
        </div>
      </div>

      {/* Customer & Bill Meta Section (Clean Straight Lining, No Inner Gray Boxes) */}
      <div className="grid grid-cols-12 gap-2 border-y border-black py-1.5 mb-2 text-xs">
        {/* Customer Details */}
        <div className="col-span-7 space-y-0.5">
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-black uppercase text-[10px] min-w-[55px]">M/s / To:</span>
            <span className="font-black text-black text-xs sm:text-sm truncate">
              {estimate.customerName || '—'}
            </span>
          </div>
          {estimate.customerAddress && (
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-black text-[10px] min-w-[55px]">Address:</span>
              <span className="text-black text-[11px] truncate">{estimate.customerAddress}</span>
            </div>
          )}
        </div>

        {/* Est No, Date & DP (Directly under Date) */}
        <div className="col-span-5 flex flex-col justify-center items-end space-y-0.5 text-right border-l border-black pl-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-black text-[10px]">Est No:</span>
            <span className="font-black text-black text-xs font-mono">{estimate.estimateNumber}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-black text-[10px]">Date:</span>
            <span className="font-bold text-black text-[11px]">{estimate.date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-black text-[10px]">DP:</span>
            <span className="text-black text-[11px] font-semibold min-w-[50px] inline-block border-b border-black text-left pl-1">
              {estimate.dpName || '\u00A0'}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table (Includes CFC/Gatte + Qty + Rate + Amount + Padding Rows) */}
      <table className="w-full border-collapse border border-black mb-2 text-xs">
        <thead>
          <tr className="border-b-2 border-black bg-white font-black uppercase text-center text-[10px] sm:text-xs">
            <th className="border border-black py-1 px-1 w-7">#</th>
            <th className="border border-black py-1 px-2 text-left">Item Description</th>
            <th className="border border-black py-1 px-1.5 w-12 text-center">CFC</th>
            <th className="border border-black py-1 px-1.5 w-16 text-right">Qty</th>
            <th className="border border-black py-1 px-1.5 w-16 sm:w-20 text-right">Rate</th>
            <th className="border border-black py-1 px-2 w-20 sm:w-24 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {estimate.items.map((item, index) => (
            <tr key={item.id} className="border-b border-black">
              <td className="border border-black py-1 px-1 text-center font-bold text-[11px]">{index + 1}</td>
              <td className="border border-black py-1 px-2 font-bold text-[11px] sm:text-xs">
                {item.description || '—'}
                {item.caseCount && item.caseCount > 0 && (
                  <span className="text-[9px] text-black font-normal ml-1">
                    (1 Gatta = {item.caseCount} {item.unit || 'PAC'})
                  </span>
                )}
              </td>
              <td className="border border-black py-1 px-1.5 text-center font-semibold text-[11px] text-black">
                {item.cfc ? `${item.cfc}` : '—'}
              </td>
              <td className="border border-black py-1 px-1.5 text-right font-bold text-[11px]">
                {formatQtyWithUnit(item.qty, item.unit)}
              </td>
              <td className="border border-black py-1 px-1.5 text-right font-bold text-[11px]">
                {item.rate !== '' ? `${shopProfile.currencySymbol}${item.rate}` : '—'}
              </td>
              <td className="border border-black py-1 px-2 text-right font-black text-[11px] sm:text-xs">
                {shopProfile.currencySymbol}{item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals, Hindi Terms, Payment QR & Signatures */}
      <div className="grid grid-cols-12 gap-2 border-t-2 border-black pt-1.5 text-xs">
        {/* Left Column: Terms + QR Code + In Words */}
        <div className="col-span-7 flex flex-col justify-between">
          <div>
            <p className="font-black uppercase text-[9px] text-black">Terms / Notice:</p>
            <p className="text-[10px] sm:text-[11px] text-black font-semibold leading-snug mt-0.5">
              {estimate.notes || shopProfile.defaultTerms}
            </p>
          </div>

          {grandTotal > 0 && (
            <div className="mt-1.5 text-[10px] font-bold leading-tight">
              <span className="font-extrabold">Words: </span><span className="italic">{totalInWords}</span>
            </div>
          )}
        </div>

        {/* Right Column: Calculations & Signature (Clean Straight Lines) */}
        <div className="col-span-5 space-y-0.5">
          <div className="flex justify-between py-0.5 border-b border-black font-bold text-xs">
            <span>Subtotal:</span>
            <span>{shopProfile.currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          {discountVal > 0 && (
            <div className="flex justify-between py-0.5 border-b border-black text-xs">
              <span>Discount:</span>
              <span>- {shopProfile.currencySymbol}{discountVal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 border-y-2 border-black font-black text-xs sm:text-sm">
            <span>GRAND TOTAL:</span>
            <span>{shopProfile.currencySymbol}{grandTotal.toFixed(2)}</span>
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
