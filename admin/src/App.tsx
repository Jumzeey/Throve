import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth, RequireRoute } from './auth/guards';
import { AppShell } from './components/layout/AppShell';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { AuditPage } from './pages/AuditPage';
import { DisputesPage } from './pages/DisputesPage';
import { ListingsPage } from './pages/ListingsPage';
import { LivePage } from './pages/LivePage';
import { LoginPage } from './pages/LoginPage';
import { OperationsPage } from './pages/OperationsPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { RefundsPage } from './pages/RefundsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { UsersPage } from './pages/UsersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route
              path="/"
              element={
                <RequireRoute route="operations">
                  <OperationsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/users"
              element={
                <RequireRoute route="users">
                  <UsersPage />
                </RequireRoute>
              }
            />
            <Route
              path="/listings"
              element={
                <RequireRoute route="listings">
                  <ListingsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireRoute route="reports">
                  <ReportsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/live"
              element={
                <RequireRoute route="live">
                  <LivePage />
                </RequireRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <RequireRoute route="orders">
                  <OrdersPage />
                </RequireRoute>
              }
            />
            <Route
              path="/disputes"
              element={
                <RequireRoute route="disputes">
                  <DisputesPage />
                </RequireRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <RequireRoute route="payments">
                  <PaymentsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/refunds"
              element={
                <RequireRoute route="refunds">
                  <RefundsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/payouts"
              element={
                <RequireRoute route="payouts">
                  <PayoutsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <RequireRoute route="reviews">
                  <ReviewsPage />
                </RequireRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <RequireRoute route="audit">
                  <AuditPage />
                </RequireRoute>
              }
            />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
