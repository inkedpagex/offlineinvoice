/**
 * CFC (Case Fill Count / Conversion Factor Chain) Utility
 * Handles multi-unit quantity parsing, conversion, and formatting for distribution & wholesale billing.
 */

export interface ParsedPackaging {
  caseCount?: number;
  unit: string;
  cfcUnit: string;
}

/**
 * Extracts case count and units from packaging string
 * e.g. "120 PAC" => { caseCount: 120, unit: 'PAC', cfcUnit: 'Gatta' }
 * e.g. "200 PAC ,  10 SET" => { caseCount: 200, unit: 'PAC', cfcUnit: 'Gatta' }
 * e.g. "84 PAC" => { caseCount: 84, unit: 'PAC', cfcUnit: 'Gatta' }
 */
export function parsePackaging(packaging?: string): ParsedPackaging {
  if (!packaging || typeof packaging !== 'string') {
    return { caseCount: undefined, unit: 'Pcs', cfcUnit: 'Gatta' };
  }

  const trimmed = packaging.trim();

  // Look for leading or prominent number followed by unit (PAC, PCS, PKT, BOX, etc.)
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)/i);
  if (match) {
    const num = parseFloat(match[1]);
    const u = match[2].toUpperCase();
    return {
      caseCount: !isNaN(num) && num > 0 ? num : undefined,
      unit: u,
      cfcUnit: 'Gatta',
    };
  }

  // Fallback pattern search anywhere in string (e.g. "120 PAC")
  const subMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(PAC|PCS|PKT|PIECE|BOX|BAG|TIN|JAR|BTL)/i);
  if (subMatch) {
    const num = parseFloat(subMatch[1]);
    const u = subMatch[2].toUpperCase();
    return {
      caseCount: !isNaN(num) && num > 0 ? num : undefined,
      unit: u,
      cfcUnit: 'Gatta',
    };
  }

  return {
    caseCount: undefined,
    unit: trimmed || 'Pcs',
    cfcUnit: 'Gatta',
  };
}

/**
 * Calculates total base quantity from CFC (Gatta count) & Case count
 */
export function calculateQtyFromCfc(
  cfcVal: number | string,
  caseCount?: number
): number | '' {
  if (cfcVal === '' || cfcVal === undefined || cfcVal === null) return '';
  const numCfc = typeof cfcVal === 'number' ? cfcVal : parseFloat(cfcVal);
  if (isNaN(numCfc)) return '';
  if (!caseCount || caseCount <= 0) return numCfc;
  return Math.round(numCfc * caseCount * 100) / 100;
}

/**
 * Calculates CFC (Gatta count) from total base quantity & Case count
 */
export function calculateCfcFromQty(
  qtyVal: number | string,
  caseCount?: number
): { cfc: number | string; isExact: boolean; loose: number } {
  if (qtyVal === '' || qtyVal === undefined || qtyVal === null) {
    return { cfc: '', isExact: true, loose: 0 };
  }
  const numQty = typeof qtyVal === 'number' ? qtyVal : parseFloat(qtyVal);
  if (isNaN(numQty)) return { cfc: '', isExact: true, loose: 0 };
  if (!caseCount || caseCount <= 0) {
    return { cfc: '', isExact: true, loose: 0 };
  }

  const exactGatte = numQty / caseCount;
  const wholeGatte = Math.floor(exactGatte);
  const loose = Math.round((numQty - wholeGatte * caseCount) * 100) / 100;

  if (loose === 0) {
    return { cfc: wholeGatte, isExact: true, loose: 0 };
  }

  // Returns decimal fraction representation (e.g. 1.5)
  return {
    cfc: Math.round(exactGatte * 100) / 100,
    isExact: false,
    loose,
  };
}

/**
 * Formats quantity display for invoices and print layouts
 * e.g. "240 PAC"
 */
export function formatQtyWithUnit(
  qty: number | string,
  unit?: string
): string {
  const strQty = String(qty || 0);
  const u = unit ? ` ${unit}` : '';
  return `${strQty}${u}`;
}
