import { FormEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import { customersApi, invoicesApi } from '../api/endpoints';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useApi } from '../hooks/useApi';
import { addDaysIso, formatMoney, todayIso } from '../utils/format';
import { fromPaise, previewInvoice } from '../utils/money';

interface LineDraft {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

type Errors = Record<string, string>;

const DEFAULT_TAX_RATE = '18';
const GST_RATES = ['0', '5', '12', '18', '28'];
const TWO_DP = /^\d+(\.\d{1,2})?$/;

function validate(customerId: string, invoiceDate: string, dueDate: string, lines: LineDraft[]): Errors {
  const errors: Errors = {};
  if (!customerId) errors.customerId = 'Select a customer';
  if (!invoiceDate) errors.invoiceDate = 'Invoice date is required';
  if (!dueDate) errors.dueDate = 'Due date is required';
  if (invoiceDate && dueDate && dueDate < invoiceDate) errors.dueDate = 'Due date cannot be before invoice date';
  if (lines.length === 0) errors.lines = 'Add at least one line item';

  for (const l of lines) {
    const k = `line-${l.key}`;
    if (!l.description.trim()) errors[`${k}-description`] = 'Required';

    if (!l.quantity.trim()) errors[`${k}-quantity`] = 'Required';
    else if (!TWO_DP.test(l.quantity.trim()) || Number(l.quantity) <= 0)
      errors[`${k}-quantity`] = 'Must be > 0 (max 2 decimals)';

    if (!l.unitPrice.trim()) errors[`${k}-unitPrice`] = 'Required';
    else if (!TWO_DP.test(l.unitPrice.trim()) || Number(l.unitPrice) <= 0)
      errors[`${k}-unitPrice`] = 'Must be > 0 (max 2 decimals)';

    if (!TWO_DP.test(l.taxRate.trim()) || Number(l.taxRate) > 100)
      errors[`${k}-taxRate`] = '0 to 100';
  }
  return errors;
}

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const customers = useApi((signal) => customersApi.list(signal), []);

  const keyRef = useRef(1);
  const newLine = (): LineDraft => ({
    key: keyRef.current++,
    description: '',
    quantity: '1',
    unitPrice: '',
    taxRate: DEFAULT_TAX_RATE,
  });

  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDaysIso(todayIso(), 30));
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'issue' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = useMemo(
    () => validate(customerId, invoiceDate, dueDate, lines),
    [customerId, invoiceDate, dueDate, lines],
  );
  const fieldError = (key: string) => (submitted ? errors[key] : undefined);

  const preview = useMemo(
    () =>
      previewInvoice(
        lines.map((l) => ({
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
        })),
      ),
    [lines],
  );

  const updateLine = (key: number, field: keyof Omit<LineDraft, 'key'>, value: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: number) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  async function submit(issue: boolean) {
    setSubmitted(true);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    if (issue && !window.confirm('Issuing posts the invoice to the ledger and it can no longer be edited. Continue?')) {
      return;
    }

    setSaving(issue ? 'issue' : 'draft');
    try {
      const created = await invoicesApi.create({
        customerId: Number(customerId),
        invoiceDate,
        dueDate,
        issue,
        items: lines.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          taxRate: Number(l.taxRate),
        })),
      });
      navigate(`/invoices/${created.id}`, {
        state: {
          flash: issue
            ? `Invoice ${created.invoiceNumber} issued and posted to the ledger.`
            : `Draft ${created.invoiceNumber} saved.`,
        },
      });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(false);
  };

  if (customers.loading && !customers.data) return <Loading label="Loading customers…" />;
  if (customers.error) {
    return <ErrorMessage title="Could not load customers" message={customers.error} onRetry={customers.reload} />;
  }

  const customerList = Array.isArray(customers.data) ? customers.data : [];

  return (
    <section>
      <div className="page-header">
        <h1>New invoice</h1>
        <Link to="/invoices" className="btn btn-link">
          ← Back to invoices
        </Link>
      </div>

      {formError && <ErrorMessage title="Could not save invoice" message={formError} />}

      <form className="card form" onSubmit={onSubmit} noValidate>
        <div className="grid-3">
          <label className="field">
            <span>Customer *</span>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={fieldError('customerId') ? 'invalid' : undefined}
            >
              <option value="">{customerList.length ? 'Select a customer' : 'No customers found'}</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.gstNumber ? ` (${c.gstNumber})` : ''}
                </option>
              ))}
            </select>
            {fieldError('customerId') && <small className="error">{fieldError('customerId')}</small>}
          </label>

          <label className="field">
            <span>Invoice date *</span>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className={fieldError('invoiceDate') ? 'invalid' : undefined}
            />
            {fieldError('invoiceDate') && <small className="error">{fieldError('invoiceDate')}</small>}
          </label>

          <label className="field">
            <span>Due date *</span>
            <input
              type="date"
              value={dueDate}
              min={invoiceDate || undefined}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldError('dueDate') ? 'invalid' : undefined}
            />
            {fieldError('dueDate') && <small className="error">{fieldError('dueDate')}</small>}
          </label>
        </div>

        <h2>Line items</h2>
        <div className="table-wrap">
          <table className="table lines-table">
            <thead>
              <tr>
                <th>Description *</th>
                <th className="num">Qty *</th>
                <th className="num">Unit price (₹) *</th>
                <th className="num">GST %</th>
                <th className="num">Line total</th>
                <th className="num">Tax</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, index) => {
                const k = `line-${l.key}`;
                const p = preview.lines[index];
                return (
                  <tr key={l.key}>
                    <td>
                      <input
                        type="text"
                        value={l.description}
                        placeholder="e.g. Consulting (days)"
                        maxLength={255}
                        onChange={(e) => updateLine(l.key, 'description', e.target.value)}
                        className={fieldError(`${k}-description`) ? 'invalid' : undefined}
                      />
                      {fieldError(`${k}-description`) && (
                        <small className="error">{fieldError(`${k}-description`)}</small>
                      )}
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, 'quantity', e.target.value)}
                        className={`input-num ${fieldError(`${k}-quantity`) ? 'invalid' : ''}`}
                      />
                      {fieldError(`${k}-quantity`) && <small className="error">{fieldError(`${k}-quantity`)}</small>}
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        value={l.unitPrice}
                        placeholder="0.00"
                        onChange={(e) => updateLine(l.key, 'unitPrice', e.target.value)}
                        className={`input-num ${fieldError(`${k}-unitPrice`) ? 'invalid' : ''}`}
                      />
                      {fieldError(`${k}-unitPrice`) && (
                        <small className="error">{fieldError(`${k}-unitPrice`)}</small>
                      )}
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        list="gst-rates"
                        value={l.taxRate}
                        onChange={(e) => updateLine(l.key, 'taxRate', e.target.value)}
                        className={`input-num input-narrow ${fieldError(`${k}-taxRate`) ? 'invalid' : ''}`}
                      />
                      {fieldError(`${k}-taxRate`) && <small className="error">{fieldError(`${k}-taxRate`)}</small>}
                    </td>
                    <td className="num">{formatMoney(fromPaise(p?.lineTotalPaise ?? 0))}</td>
                    <td className="num muted">{formatMoney(fromPaise(p?.taxPaise ?? 0))}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-icon"
                        onClick={() => removeLine(l.key)}
                        disabled={lines.length === 1}
                        title={lines.length === 1 ? 'An invoice needs at least one line' : 'Remove line'}
                        aria-label="Remove line"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="gst-rates">
            {GST_RATES.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <button type="button" className="btn btn-secondary" onClick={addLine}>
          + Add line
        </button>

        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span>{formatMoney(fromPaise(preview.subtotal))}</span>
          </div>
          <div>
            <span>GST</span>
            <span>{formatMoney(fromPaise(preview.tax))}</span>
          </div>
          <div className="grand">
            <span>Total</span>
            <span>{formatMoney(fromPaise(preview.total))}</span>
          </div>
          <small className="muted">Totals are recalculated by the server when you save.</small>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-secondary" disabled={saving !== null}>
            {saving === 'draft' ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-primary" disabled={saving !== null} onClick={() => void submit(true)}>
            {saving === 'issue' ? 'Issuing…' : 'Issue invoice'}
          </button>
        </div>
      </form>
    </section>
  );
}