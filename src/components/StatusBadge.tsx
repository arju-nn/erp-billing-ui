import type { InvoiceStatus } from '../api/types';
import { STATUS_LABELS } from '../utils/format';

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}