import { Link } from 'react-router-dom';

/** Temporary placeholder for screens delivered in a later stage. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <div className="card muted">
        This screen is added in the next stage. <Link to="/invoices">Back to invoices</Link>
      </div>
    </section>
  );
}