import { FormEvent, useState } from 'react';
import { errorMessage } from '../api/client';
import { paymentsApi } from '../api/endpoints';
import type { PaymentMethod, RecordPaymentResult } from '../api/types';
import { formatDate, formatMoney, todayIso } from '../utils/format';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, TWO_DP } from '../utils/labels';
import ErrorMessage from './ErrorMessage';

interface RecordPaymentFormProps {
  invoiceId: number;
  invoiceDate: string;
  balanceDue: string;
  onRecorded: (result: RecordPaymentResult) => void;
}

type Errors = Partial<Record<'date' | 'amount' | 'method' | 'referenceNumber', string>>;

export default function RecordPaymentForm({ invoiceId, invoiceDate, balanceDue, onRecorded }: RecordPaymentFormProps) {
  const [date, setDate] = useState(() => (todayIso() < invoiceDate ? invoiceDate : todayIso()));
  const [amount, setAmount] = useState(balanceDue);
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!date) e.date = 'Payment date is required';
    else if (date < invoiceDate) e.date = `Cannot be before the invoice date (${formatDate(invoiceDate)})`;

    const a = amount.trim();
    if (!a) e.amount = 'Amount is required';
    else if (!TWO_DP.test(a) || Number(a) <= 0) e.amount = 'Amount must be greater than 0 (max 2 decimals)';
    // Overpayment is deliberately left to the server so its 400 message is shown here.

    if (!PAYMENT_METHODS.includes(method)) e.method = 'Select a payment method';
    if (referenceNumber.length > 100) e.referenceNumber = 'At most 100 characters';
    return e;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const result = await paymentsApi.create({
        invoiceId,
        date,
        amount: Number(amount),
        method,
        referenceNumber: referenceNumber.trim() || null,
      });
      setAmount(result.invoice.balanceDue);
      setReferenceNumber('');
      setErrors({});
      onRecorded(result);
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      {apiError && <ErrorMessage title="Payment rejected" message={apiError} />}

      <p className="muted small">
        Balance due: <strong>{formatMoney(balanceDue)}</strong>
      </p>

      <div className="grid-4">
        <label className="field">
          <span>Date *</span>
          <input
            type="date"
            value={date}
            min={invoiceDate}
            onChange={(e) => setDate(e.target.value)}
            className={errors.date ? 'invalid' : undefined}
          />
          {errors.date && <small className="error">{errors.date}</small>}
        </label>

        <label className="field">
          <span>Amount (₹) *</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`input-num ${errors.amount ? 'invalid' : ''}`}
          />
          {errors.amount && <small className="error">{errors.amount}</small>}
        </label>

        <label className="field">
          <span>Method *</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={errors.method ? 'invalid' : undefined}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
          {errors.method && <small className="error">{errors.method}</small>}
        </label>

        <label className="field">
          <span>Reference no.</span>
          <input
            type="text"
            value={referenceNumber}
            maxLength={100}
            placeholder={method === 'cash' ? 'Optional' : 'e.g. NEFT / UPI ref'}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className={errors.referenceNumber ? 'invalid' : undefined}
          />
          {errors.referenceNumber && <small className="error">{errors.referenceNumber}</small>}
        </label>
      </div>

      <div className="form-actions">
        <span className="muted small">
          Posts Dr {method === 'cash' ? 'Cash (1000)' : 'Bank (1010)'} / Cr Accounts Receivable (1100)
        </span>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Recording…' : 'Record payment'}
        </button>
      </div>
    </form>
  );
}