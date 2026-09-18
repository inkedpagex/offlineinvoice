import React from 'react';

interface Props {
  size?: number;
  className?: string;
  isCompact?: boolean;
}

export const GaneshGraphic: React.FC<Props> = ({
  size = 54,
  className = '',
  isCompact = false,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <img
        src="/ganesh-ji.png"
        alt="॥ श्री गणेशाय नमः ॥"
        className="object-contain"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <span
        className={`font-black text-black tracking-wider leading-none mt-0.5 ${
          isCompact ? 'text-[8px]' : 'text-[9.5px] sm:text-[10px]'
        }`}
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        ॥ श्री गणेशाय नमः ॥
      </span>
      <span className="text-[7px] font-bold text-black uppercase tracking-widest mt-0.5 opacity-80">
        शुभ लाभ
      </span>
    </div>
  );
};
