import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import InvoiceListPage from './pages/InvoiceListPage';
import NotFoundPage from './pages/NotFoundPage';
import OutstandingReportPage from './pages/OutstandingReportPage';
import TrialBalancePage from './pages/TrialBalancePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/invoices" replace />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<CreateInvoicePage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="reports/outstanding" element={<OutstandingReportPage />} />
        <Route path="reports/trial-balance" element={<TrialBalancePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}