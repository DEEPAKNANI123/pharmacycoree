import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useBlocker } from 'react-router-dom';
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
const RevenueAnalytics = lazy(() => import('./features/admin/revenue/RevenueAnalytics'));

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
  const { currentUser, isLoading, logout } = useDatabase();
  
  // Native blocking of back button / navigation to login while authenticated
  const blocker = useBlocker(
    ({ nextLocation }) => currentUser !== null && (nextLocation.pathname === '/login' || nextLocation.pathname === '/')
  );

  React.useEffect(() => {
    if (blocker.state === 'blocked') {
      // 1. Immediately reset the blocker to revert the URL back to the dashboard
      blocker.reset();
      
      // 2. Show the confirmation dialog asynchronously so the URL has time to revert
      setTimeout(() => {
        const confirmLogout = window.confirm("Are you sure you want to sign out?");
        if (confirmLogout) {
          logout(); // This clears user state and forces a natural redirect to /login
        }
      }, 50);
    }
  }, [blocker.state, logout, blocker]);

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

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <Login /> },
  {
    path: "/admin",
    element: <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "pos", element: <PosSales /> },
      { path: "inventory", element: <Inventory /> },
      { path: "alerts", element: <Alerts /> },
      { path: "rx-validation", element: <RxValidation /> },
      { path: "procurement", element: <Procurement /> },
      { path: "grn", element: <GRNReceiving /> },
      { path: "cold-store", element: <ColdStore /> },
      { path: "treasury", element: <Treasury /> },
      { path: "vat-returns", element: <VatReturns /> },
      { path: "compliance", element: <Compliance /> },
      { path: "hr-payroll", element: <HrPayroll /> },
      { path: "customers", element: <Customers /> },
      { path: "e-prescribe", element: <AdminPrescribe /> },
      { path: "revenue", element: <RevenueAnalytics /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/admin/dashboard" replace /> }
    ]
  },
  {
    path: "/patient",
    element: <ProtectedRoute role="patient"><PatientLayout /></ProtectedRoute>,
    children: [
      { path: "dashboard", element: <PatientDashboard /> },
      { path: "search", element: <PatientSearch /> },
      { path: "cart", element: <PatientCart /> },
      { path: "profile", element: <PatientProfile /> },
      { path: "telehealth", element: <PatientTelehealth /> },
      { path: "*", element: <Navigate to="/patient/dashboard" replace /> }
    ]
  },
  { path: "*", element: <Navigate to="/login" replace /> }
]);

function App() {
  return (
    <DatabaseProvider>
      <Suspense fallback={<PageLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </DatabaseProvider>
  );
}

export default App;

