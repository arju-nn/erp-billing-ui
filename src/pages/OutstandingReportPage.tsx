import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../api/endpoints';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useApi } from '../hooks/useApi';
import { formatDate, formatMoney, todayIso } from '../utils/format';

export default function OutstandingReportPage() {
  const [asOf, setAsOf] = useState(todayIso());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const report = useApi((signal) => reportsApi.outstanding(asOf || undefined, signal), [asOf]);

  const toggle = (customerId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });

  const data = report.data;

  return (
    <section>
      <div className="page-header">
        <h1>Outstanding by customer</h1>
        <label className="field field-inline">
          <span>As of</span>
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </label>
      </div>

      {report.loading && !data ? (
        <Loading label="Loading report…" />
      ) : report.error ? (
        <ErrorMessage title="Could not load report" message={report.error} onRetry={report.reload} />
      ) : !data || data.customers.length === 0 ? (
        <div className="card empty">Nothing outstanding. Every issued invoice is fully paid.</div>
      ) : (
        <>
          <div className="stat-row">
            <div className="card stat">
              <span className="muted small">Total outstanding</span>
              <strong>{formatMoney(data.totalOutstanding)}</strong>
            </div>
            <div className="card stat">
              <span className="muted small">Overdue</span>
              <strong className={Number(data.totalOverdue) > 0 ? 'text-danger' : undefined}>
                {formatMoney(data.totalOverdue)}
              </strong>
            </div>
            <div className="card stat">
              <span className="muted small">Customers owing</span>
              <strong>{data.customerCount}</strong>
            </div>
          </div>

          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th aria-label="Expand" />
                  <th>Customer</th>
                  <th className="num">Invoices</th>
                  <th>Oldest due</th>
                  <th className="num">Invoiced</th>
                  <th className="num">Paid</th>
                  <th className="num">Overdue</th>
                  <th className="num">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => {
                  const open = expanded.has(c.customerId);
                  return (
                    <Fragment key={c.customerId}>
                      <tr className="clickable" onClick={() => toggle(c.customerId)}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-icon btn-expand"
                            aria-expanded={open}
                            aria-label={open ? 'Hide invoices' : 'Show invoices'}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(c.customerId);
                            }}
                          >
                            {open ? '▾' : '▸'}
                          </button>
                        </td>
                        <td>
                          <div>{c.customerName}</div>
                          <div className="muted small">{c.customerEmail}</div>
                        </td>
                        <td className="num">{c.invoiceCount}</td>
                        <td>{formatDate(c.oldestDueDate)}</td>
                        <td className="num">{formatMoney(c.totalInvoiced)}</td>
                        <td className="num">{formatMoney(c.totalPaid)}</td>
                        <td className={`num ${Number(c.overdue) > 0 ? 'text-danger' : ''}`}>{formatMoney(c.overdue)}</td>
                        <td className="num strong">{formatMoney(c.outstanding)}</td>
                      </tr>
                      {open &&
                        c.invoices.map((inv) => (
                          <tr key={`${c.customerId}-${inv.id}`} className="sub-row">
                            <td />
                            <td>
                              <Link to={`/invoices/${inv.id}`} className="mono">
                                {inv.invoiceNumber}
                              </Link>
                              <span className="muted small"> · issued {formatDate(inv.invoiceDate)}</span>
                            </td>
                            <td />
                            <td>
                              {formatDate(inv.dueDate)}
                              {inv.daysOverdue > 0 && (
                                <span className="tag-overdue">{inv.daysOverdue}d overdue</span>
                              )}
                            </td>
                            <td className="num">{formatMoney(inv.total)}</td>
                            <td className="num">{formatMoney(inv.amountPaid)}</td>
                            <td className="num">{inv.daysOverdue > 0 ? formatMoney(inv.balanceDue) : ''}</td>
                            <td className="num">{formatMoney(inv.balanceDue)}</td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td colSpan={5}>
                    Total ({data.customerCount} customer{data.customerCount === 1 ? '' : 's'})
                    {report.loading && <span className="muted"> · refreshing…</span>}
                  </td>
                  <td className="num">{formatMoney(data.totalOverdue)}</td>
                  <td className="num">{formatMoney(data.totalOutstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="muted small">
            Issued and partly paid invoices only; drafts are excluded. Sorted by outstanding balance, largest first.
          </p>
        </>
      )}
    </section>
  );
}