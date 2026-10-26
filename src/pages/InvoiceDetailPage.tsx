import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { invoicesApi } from '../api/endpoints';
import type { RecordPaymentResult } from '../api/types';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import RecordPaymentForm from '../components/RecordPaymentForm';
import StatusBadge from '../components/StatusBadge';
import { useApi } from '../hooks/useApi';
import { formatDate, formatMoney, isOverdue } from '../utils/format';
import { PAYMENT_METHOD_LABELS } from '../utils/labels';

export default function InvoiceDetailPage() {
  const { id: idParam } = useParams();
  const id = /^\d+$/.test(idParam ?? '') ? Number(idParam) : null;
  const navigate = useNavigate();
  const location = useLocation();

  const [flash, setFlash] = useState<string | null>(() => {
    const state = location.state as { flash?: unknown } | null;
    return state && typeof state.flash === 'string' ? state.flash : null;
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'issue' | 'delete' | null>(null);

  const invoice = useApi(
    (signal) => (id === null ? Promise.reject(new Error('Invalid invoice id')) : invoicesApi.get(id, signal)),
    [id],
  );

  if (id === null) {
    return <ErrorMessage title="Invoice not found" message={`"${idParam ?? ''}" is not a valid invoice id.`} />;
  }
  if (invoice.loading && !invoice.data) return <Loading label="Loading invoice…" />;
  if (invoice.error || !invoice.data) {
    return (
      <section>
        <Link to="/invoices" className="btn btn-link">
          ← Back to invoices
        </Link>
        <ErrorMessage
          title="Could not load invoice"
          message={invoice.error ?? 'Invoice not found'}
          onRetry={invoice.reload}
        />
      </section>
    );
  }

  const inv = invoice.data;
  const canPay = inv.status === 'issued' || inv.status === 'partly_paid';

  async function issue() {
    if (!window.confirm(`Issue ${inv.invoiceNumber}? It will be posted to the ledger and can no longer be edited.`)) return;
    setBusy('issue');
    setActionError(null);
    try {
      const updated = await invoicesApi.issue(inv.id);
      setFlash(`Invoice ${updated.invoiceNumber} issued and posted to the ledger.`);
      invoice.reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete draft ${inv.invoiceNumber}? This cannot be undone.`)) return;
    setBusy('delete');
    setActionError(null);
    try {
      await invoicesApi.remove(inv.id);
      navigate('/invoices', { replace: true });
    } catch (err) {
      setActionError(errorMessage(err));
      setBusy(null);
    }
  }

  function onPaymentRecorded(result: RecordPaymentResult) {
    const status = result.invoice.status === 'paid' ? 'Invoice is now fully paid.' : `Balance due ${formatMoney(result.invoice.balanceDue)}.`;
    setFlash(`Payment of ${formatMoney(result.payment.amount)} recorded. ${status}`);
    invoice.reload();
  }

  return (
    <section>
      <div className="page-header">
        <div className="title-row">
          <Link to="/invoices" className="btn btn-link">
            ← Invoices
          </Link>
          <h1 className="mono">{inv.invoiceNumber}</h1>
          <StatusBadge status={inv.status} />
          {isOverdue(inv.status, inv.dueDate) && <span className="tag-overdue">Overdue</span>}
        </div>
        {inv.status === 'draft' && (
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={() => void remove()} disabled={busy !== null}>
              {busy === 'delete' ? 'Deleting…' : 'Delete draft'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void issue()} disabled={busy !== null}>
              {busy === 'issue' ? 'Issuing…' : 'Issue invoice'}
            </button>
          </div>
        )}
      </div>

      {flash && (
        <div className="alert alert-success" role="status">
          <span>{flash}</span>
          <button type="button" className="btn btn-link btn-sm" onClick={() => setFlash(null)}>
            Dismiss
          </button>
        </div>
      )}
      {actionError && <ErrorMessage title="Action failed" message={actionError} />}

      <div className="detail-grid">
        <div className="card">
          <h2 className="card-title">Customer</h2>
          {inv.customer ? (
            <dl className="kv">
              <dt>Name</dt>
              <dd>{inv.customer.name}</dd>
              <dt>Email</dt>
              <dd>{inv.customer.email}</dd>
              <dt>Phone</dt>
              <dd>{inv.customer.phone}</dd>
              <dt>GSTIN</dt>
              <dd className="mono">{inv.customer.gstNumber ?? '—'}</dd>
            </dl>
          ) : (
            <p className="muted">Customer #{inv.customerId}</p>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Summary</h2>
          <dl className="kv">
            <dt>Invoice date</dt>
            <dd>{formatDate(inv.invoiceDate)}</dd>
            <dt>Due date</dt>
            <dd>{formatDate(inv.dueDate)}</dd>
            <dt>Subtotal</dt>
            <dd className="num">{formatMoney(inv.subtotal)}</dd>
            <dt>GST</dt>
            <dd className="num">{formatMoney(inv.taxAmount)}</dd>
            <dt>Total</dt>
            <dd className="num strong">{formatMoney(inv.total)}</dd>
            <dt>Paid</dt>
            <dd className="num">{formatMoney(inv.amountPaid)}</dd>
            <dt>Balance due</dt>
            <dd className="num strong">{inv.status === 'draft' ? '—' : formatMoney(inv.balanceDue)}</dd>
          </dl>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Items</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">GST %</th>
                <th className="num">Line total</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="num">{Number(item.quantity)}</td>
                  <td className="num">{formatMoney(item.unitPrice)}</td>
                  <td className="num">{Number(item.taxRate)}%</td>
                  <td className="num">{formatMoney(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Subtotal</td>
                <td className="num">{formatMoney(inv.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4}>GST</td>
                <td className="num">{formatMoney(inv.taxAmount)}</td>
              </tr>
              <tr>
                <td colSpan={4}>Total</td>
                <td className="num">{formatMoney(inv.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Payment history</h2>
        {inv.payments.length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.date)}</td>
                    <td>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</td>
                    <td className="mono">{p.referenceNumber ?? '—'}</td>
                    <td className="num">{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total paid</td>
                  <td className="num">{formatMoney(inv.amountPaid)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Record payment</h2>
        {canPay ? (
          <RecordPaymentForm
            key={`${inv.id}-${inv.amountPaid}`}
            invoiceId={inv.id}
            invoiceDate={inv.invoiceDate}
            balanceDue={inv.balanceDue}
            onRecorded={onPaymentRecorded}
          />
        ) : inv.status === 'draft' ? (
          <p className="muted">Issue this invoice before recording payments.</p>
        ) : (
          <p className="muted">This invoice is fully paid.</p>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Journal entries</h2>
        {inv.journalEntries.length === 0 ? (
          <p className="muted">Drafts create no journal entries. Issuing posts Dr Accounts Receivable / Cr Sales / Cr GST Payable.</p>
        ) : (
          inv.journalEntries.map((je) => (
            <div key={je.id} className="journal-entry">
              <div className="journal-head">
                <span className="mono">JE #{je.id}</span>
                <span>{formatDate(je.date)}</span>
                <span className="muted">{je.description}</span>
              </div>
              <table className="table compact">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th className="num">Debit</th>
                    <th className="num">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {je.lines.map((l, i) => (
                    <tr key={i}>
                      <td>
                        <span className="mono">{l.accountCode}</span> {l.accountName}
                      </td>
                      <td className="num">{Number(l.debit) > 0 ? formatMoney(l.debit) : ''}</td>
                      <td className="num">{Number(l.credit) > 0 ? formatMoney(l.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </section>
  );
}