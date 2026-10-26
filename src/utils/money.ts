/**
 * Client-side preview of the server's invoice maths (integer paise, tax rounded per line).
 * The server recalculates everything on save; this only drives the live totals.
 */
export interface LinePreviewInput {
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface LinePreview {
  lineTotalPaise: number;
  taxPaise: number;
}

export function toPaise(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function fromPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}

export function previewLine(line: LinePreviewInput): LinePreview {
  const quantityHundredths = Math.round(line.quantity * 100);
  const unitPricePaise = Math.round(line.unitPrice * 100);
  const taxRateBp = Math.round(line.taxRate * 100);
  if (!(quantityHundredths > 0) || !(unitPricePaise > 0) || !(taxRateBp >= 0)) {
    return { lineTotalPaise: 0, taxPaise: 0 };
  }
  const lineTotalPaise = Math.round((quantityHundredths * unitPricePaise) / 100);
  const taxPaise = Math.round((lineTotalPaise * taxRateBp) / 10000);
  return { lineTotalPaise, taxPaise };
}

export function previewInvoice(lines: LinePreviewInput[]) {
  const previews = lines.map(previewLine);
  const subtotal = previews.reduce((s, p) => s + p.lineTotalPaise, 0);
  const tax = previews.reduce((s, p) => s + p.taxPaise, 0);
  return { lines: previews, subtotal, tax, total: subtotal + tax };
}