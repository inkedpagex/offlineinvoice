import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  upiId?: string;
  shopName: string;
  grandTotal?: number;
  customQrUrl?: string;
  size?: number;
  className?: string;
}

export const PaymentQRCode: React.FC<Props> = ({
  upiId,
  shopName,
  grandTotal,
  customQrUrl,
  size = 80,
  className = '',
}) => {
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (customQrUrl) {
      setGeneratedDataUrl(null);
      return;
    }

    if (upiId && upiId.trim()) {
      const cleanUpi = upiId.trim();
      const cleanName = shopName.trim().slice(0, 30) || 'Merchant';
      
      let upiUri = 'upi://pay?pa=' + encodeURIComponent(cleanUpi) + '&pn=' + encodeURIComponent(cleanName) + '&cu=INR';
      if (typeof grandTotal === 'number' && grandTotal > 0) {
        upiUri += '&am=' + grandTotal.toFixed(2);
      }

      QRCode.toDataURL(upiUri, {
        margin: 1,
        width: size * 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url: string) => {
          setGeneratedDataUrl(url);
        })
        .catch((err: any) => {
          console.error('Failed to generate UPI QR code:', err);
        });
    } else {
      setGeneratedDataUrl(null);
    }
  }, [upiId, shopName, grandTotal, customQrUrl, size]);

  const activeImage = customQrUrl || generatedDataUrl;

  if (!activeImage && (!upiId || !upiId.trim())) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center justify-center p-1.5 border border-black rounded bg-white text-center ${className}`}>
      <div className="text-[9px] font-black uppercase tracking-wider text-black mb-0.5">
        Scan & Pay (UPI)
      </div>
      {activeImage ? (
        <img
          src={activeImage}
          alt="Payment QR"
          className="object-contain"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      ) : (
        <div
          className="bg-slate-100 flex items-center justify-center text-[8px] text-slate-500 font-bold border border-slate-300"
          style={{ width: `${size}px`, height: `${size}px` }}
        >
          Loading QR...
        </div>
      )}
      {upiId && (
        <div className="text-[8px] font-mono font-bold text-slate-800 mt-0.5 truncate max-w-[110px]">
          {upiId}
        </div>
      )}
    </div>
  );
};
