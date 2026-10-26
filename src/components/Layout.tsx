import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/invoices', label: 'Invoices', end: true },
  { to: '/invoices/new', label: 'New invoice', end: true },
  { to: '/reports/outstanding', label: 'Outstanding', end: true },
  { to: '/reports/trial-balance', label: 'Trial balance', end: true },
];

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="container header-inner">
          <NavLink to="/invoices" className="brand">
            ERP Billing
          </NavLink>
          <nav className="nav">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
    </div>
  );
}