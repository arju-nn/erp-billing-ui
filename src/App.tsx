
import { Navigate, Route, Routes } from 'react-router-dom';
import ComingSoon from './components/ComingSoon';
import Layout from './components/Layout';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoiceListPage from './pages/InvoiceListPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/invoices" replace />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<CreateInvoicePage />} />
        {/* Replaced in Stage 6 */}
        <Route path="invoices/:id" element={<ComingSoon title="Invoice detail" />} />
        <Route path="reports/outstanding" element={<ComingSoon title="Outstanding report" />} />
        <Route path="reports/trial-balance" element={<ComingSoon title="Trial balance" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}