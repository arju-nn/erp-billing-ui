import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p className="muted">
        The page you are looking for does not exist. <Link to="/invoices">Go to invoices</Link>
      </p>
    </section>
  );
}
