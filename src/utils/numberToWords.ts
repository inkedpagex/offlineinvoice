const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let word = '';
  if (n >= 100) {
    word += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    word += tens[Math.floor(n / 10)] + ' ';
    n %= 10;
  }
  if (n > 0) {
    word += ones[n] + ' ';
  }
  return word.trim();
}

/**
 * Converts a positive number to Indian numbering format in words
 * e.g. 15200 => "Fifteen Thousand Two Hundred"
 */
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (isNaN(num) || num < 0) return '';

  const integerPart = Math.floor(num);
  let remaining = integerPart;

  let result = '';

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;

  const hundreds = remaining;

  if (crore > 0) {
    result += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (hundreds > 0) {
    result += convertBelowThousand(hundreds) + ' ';
  }

  return result.trim() + ' Only';
}
