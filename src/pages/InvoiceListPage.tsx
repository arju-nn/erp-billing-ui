import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { customersApi, invoicesApi } from '../api/endpoints';
import type { InvoiceStatus } from '../api/types';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';
import { formatDate, formatMoney, isOverdue, STATUS_LABELS } from '../utils/format';
import { fromPaise, toPaise } from '../utils/money';

const STATUSES: InvoiceStatus[] = ['draft', 'issued', 'partly_paid', 'paid'];

function parseStatus(value: string | null): InvoiceStatus | undefined {
  return STATUSES.find((s) => s === value);
}

export default function InvoiceListPage() {
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const customerIdParam = params.get('customerId') ?? '';
  const customerId = /^\d+$/.test(customerIdParam) ? Number(customerIdParam) : undefined;

  const customers = useApi((signal) => customersApi.list(signal), []);
  const invoices = useApi(
    (signal) => invoicesApi.list({ status, customerId }, signal),
    [status, customerId],
  );

  const setFilter = (key: 'status' | 'customerId', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const totals = useMemo(() => {
    const rows = invoices.data ?? [];
    return {
      total: fromPaise(rows.reduce((s, i) => s + toPaise(i.total), 0)),
      paid: fromPaise(rows.reduce((s, i) => s + toPaise(i.amountPaid), 0)),
      balance: fromPaise(
        rows.filter((i) => i.status !== 'draft').reduce((s, i) => s + toPaise(i.balanceDue), 0),
      ),
    };
  }, [invoices.data]);

  const hasFilters = Boolean(status || customerId);

  return (
    <section>
      <div className="page-header">
        <h1>Invoices</h1>
        <Link to="/invoices/new" className="btn btn-primary">
          + New invoice
        </Link>
      </div>

      <div className="card filters">
        <label className="field">
          <span>Status</span>
          <select value={status ?? ''} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Customer</span>
          <select
            value={customerId ? String(customerId) : ''}
            onChange={(e) => setFilter('customerId', e.target.value)}
            disabled={customers.loading}
          >
            <option value="">{customers.loading ? 'Loading customers…' : 'All customers'}</option>
            {(customers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button type="button" className="btn btn-link" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        )}
      </div>

      {customers.error && <ErrorMessage title="Could not load customers" message={customers.error} />}

      {invoices.loading && !invoices.data ? (
        <Loading label="Loading invoices…" />
      ) : invoices.error ? (
        <ErrorMessage title="Could not load invoices" message={invoices.error} onRetry={invoices.reload} />
      ) : (invoices.data ?? []).length === 0 ? (
        <div className="card empty">
          {hasFilters ? 'No invoices match these filters.' : 'No invoices yet.'}{' '}
          <Link to="/invoices/new">Create one</Link>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice no.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th className="num">Total</th>
                <th className="num">Paid</th>
                <th className="num">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(invoices.data ?? []).map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/invoices/${inv.id}`} className="mono">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td>{inv.customer?.name ?? `#${inv.customerId}`}</td>
                  <td>{formatDate(inv.invoiceDate)}</td>
                  <td>
                    {formatDate(inv.dueDate)}
                    {isOverdue(inv.status, inv.dueDate) && <span className="tag-overdue">Overdue</span>}
                  </td>
                  <td className="num">{formatMoney(inv.total)}</td>
                  <td className="num">{formatMoney(inv.amountPaid)}</td>
                  <td className="num">{inv.status === 'draft' ? '—' : formatMoney(inv.balanceDue)}</td>
                  <td>
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  {(invoices.data ?? []).length} invoice{(invoices.data ?? []).length === 1 ? '' : 's'}
                  {invoices.loading && <span className="muted"> · refreshing…</span>}
                </td>
                <td className="num">{formatMoney(totals.total)}</td>
                <td className="num">{formatMoney(totals.paid)}</td>
                <td className="num">{formatMoney(totals.balance)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}