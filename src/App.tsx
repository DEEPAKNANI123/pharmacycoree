import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';

// Layouts
import AdminLayout from './components/layout/AdminLayout';
import PatientLayout from './components/patient/PatientLayout';

// Admin Pages (Lazy Loaded)
const Dashboard = lazy(() => import('./features/admin/dashboard/Dashboard'));
const PosSales = lazy(() => import('./features/admin/posSales/PosSales'));
const Inventory = lazy(() => import('./features/admin/inventory/Inventory'));
const Alerts = lazy(() => import('./features/admin/alerts/Alerts'));
const RxValidation = lazy(() => import('./features/admin/rxValidation/RxValidation'));
const Procurement = lazy(() => import('./features/admin/procurement/Procurement'));
const GRNReceiving = lazy(() => import('./features/admin/gRNReceiving/GRNReceiving'));
const ColdStore = lazy(() => import('./features/admin/coldStore/ColdStore'));
const Treasury = lazy(() => import('./features/admin/treasury/Treasury'));
const VatReturns = lazy(() => import('./features/admin/vatReturns/VatReturns'));
const Compliance = lazy(() => import('./features/admin/compliance/Compliance'));
const HrPayroll = lazy(() => import('./features/admin/hrPayroll/HrPayroll'));
const Customers = lazy(() => import('./features/admin/customers/Customers'));
const ReportsPage = lazy(() => import('./features/admin/reportsPage/ReportsPage'));
const SettingsPage = lazy(() => import('./features/admin/settingsPage/SettingsPage'));
const AdminPrescribe = lazy(() => import('./features/admin/adminPrescribe/AdminPrescribe'));

// Patient Pages (Lazy Loaded)
const PatientDashboard = lazy(() => import('./features/patient/patientDashboard/PatientDashboard'));
const PatientSearch = lazy(() => import('./features/patient/patientSearch/PatientSearch'));
const PatientCart = lazy(() => import('./features/patient/patientCart/PatientCart'));
const PatientProfile = lazy(() => import('./features/patient/patientProfile/PatientProfile'));
const PatientTelehealth = lazy(() => import('./features/patient/patientTelehealth/PatientTelehealth'));

// Essential Pages (Static)
import Login from './features/auth/login/Login';

// Premium Loader Component
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-base)',
      gap: '1.5rem'
    }}>
      <div className="loader-spinner" style={{
        width: '40px',
        height: '40px',
        border: '3px solid #f3f3f3',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        letterSpacing: '0.05em'
      }}>PHARMACORE IS LOADING...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function ProtectedRoute({ children, role }: { children: React.ReactNode, role: 'admin' | 'patient' }) {
  const { currentUser, isLoading } = useDatabase();
  
  if (isLoading) {
    return <PageLoader />;
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (currentUser.role !== role) {
    return <Navigate to={currentUser.role === 'admin' ? '/admin/dashboard' : '/patient/dashboard'} />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <DatabaseProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pos" element={<PosSales />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="rx-validation" element={<RxValidation />} />
              <Route path="procurement" element={<Procurement />} />
              <Route path="grn" element={<GRNReceiving />} />
              <Route path="cold-store" element={<ColdStore />} />
              <Route path="treasury" element={<Treasury />} />
              <Route path="vat-returns" element={<VatReturns />} />
              <Route path="compliance" element={<Compliance />} />
              <Route path="hr-payroll" element={<HrPayroll />} />
              <Route path="customers" element={<Customers />} />
              <Route path="e-prescribe" element={<AdminPrescribe />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Patient Routes */}
            <Route path="/patient" element={
              <ProtectedRoute role="patient">
                <PatientLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<PatientDashboard />} />
              <Route path="search" element={<PatientSearch />} />
              <Route path="cart" element={<PatientCart />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="telehealth" element={<PatientTelehealth />} />
              <Route path="*" element={<Navigate to="/patient/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </DatabaseProvider>
  );
}

export default App;

