import { useState } from 'react';
import { reportsApi } from '../api/endpoints';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useApi } from '../hooks/useApi';
import { formatDate, formatMoney } from '../utils/format';
import { ACCOUNT_TYPE_LABELS } from '../utils/labels';

export default function TrialBalancePage() {
  const [asOf, setAsOf] = useState('');
  const [hideZero, setHideZero] = useState(false);

  const tb = useApi((signal) => reportsApi.trialBalance(asOf || undefined, signal), [asOf]);
  const data = tb.data;

  const rows = (data?.rows ?? []).filter(
    (r) => !hideZero || Number(r.debit) !== 0 || Number(r.credit) !== 0,
  );

  return (
    <section>
      <div className="page-header">
        <h1>Trial balance</h1>
        <div className="actions">
          <label className="field field-inline">
            <span>As of</span>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </label>
          {asOf && (
            <button type="button" className="btn btn-link" onClick={() => setAsOf('')}>
              All dates
            </button>
          )}
        </div>
      </div>

      {tb.loading && !data ? (
        <Loading label="Loading trial balance…" />
      ) : tb.error ? (
        <ErrorMessage title="Could not load trial balance" message={tb.error} onRetry={tb.reload} />
      ) : !data ? null : (
        <>
          <div className={`alert ${data.totals.balanced ? 'alert-success' : 'alert-error'}`} role="status">
            <span>
              {data.totals.balanced
                ? `Balanced: debits and credits both total ${formatMoney(data.totals.debit)}`
                : `NOT balanced: difference ${formatMoney(data.totals.difference)}`}
              {data.asOf ? ` (as of ${formatDate(data.asOf)})` : ' (all posted entries)'}
            </span>
          </div>

          <div className="card filters">
            <label className="checkbox">
              <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
              <span>Hide zero-balance accounts</span>
            </label>
          </div>

          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th className="num">Debit</th>
                  <th className="num">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.accountId}>
                    <td className="mono">{r.code}</td>
                    <td>{r.name}</td>
                    <td className="muted">{ACCOUNT_TYPE_LABELS[r.type] ?? r.type}</td>
                    <td className="num">{Number(r.debit) !== 0 ? formatMoney(r.debit) : '—'}</td>
                    <td className="num">{Number(r.credit) !== 0 ? formatMoney(r.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    Grand total
                    {tb.loading && <span className="muted"> · refreshing…</span>}
                  </td>
                  <td className="num">{formatMoney(data.totals.debit)}</td>
                  <td className="num">{formatMoney(data.totals.credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="card">
            <h2 className="card-title">Accounting equation</h2>
            <dl className="kv kv-wide">
              <dt>Assets</dt>
              <dd className="num">{formatMoney(data.summary.assets)}</dd>
              <dt>Liabilities</dt>
              <dd className="num">{formatMoney(data.summary.liabilities)}</dd>
              <dt>Equity</dt>
              <dd className="num">{formatMoney(data.summary.equity)}</dd>
              <dt>Net income (income − expenses)</dt>
              <dd className="num">
                {formatMoney(data.summary.netIncome)}{' '}
                <span className="muted small">
                  ({formatMoney(data.summary.income)} − {formatMoney(data.summary.expenses)})
                </span>
              </dd>
              <dt>Assets = Liabilities + Equity + Net income</dt>
              <dd className={data.summary.equationBalanced ? 'text-success strong' : 'text-danger strong'}>
                {data.summary.equationBalanced ? '✓ Holds' : '✗ Does not hold'}
              </dd>
            </dl>
            <p className="muted small">
              Gross journal totals: debit {formatMoney(data.grossTotals.debit)} / credit{' '}
              {formatMoney(data.grossTotals.credit)}
            </p>
          </div>
        </>
      )}
    </section>
  );
}