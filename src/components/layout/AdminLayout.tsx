import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import GlobalCartDrawer from '../GlobalCartDrawer';

export default function AdminLayout() {
  const location = useLocation();
  
  const title = useMemo(() => {
    if (location.pathname.includes('dashboard')) return 'Dashboard';
    if (location.pathname.includes('pos')) return 'POS / Sales';
    if (location.pathname.includes('inventory')) return 'Inventory';
    if (location.pathname.includes('procurement')) return 'Procurement';
    if (location.pathname.includes('grn')) return 'GRN Receiving';
    return 'PharmaCore';
  }, [location.pathname]);

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-main">
        <AdminHeader title={title} />
        <div className="admin-content" style={{ backgroundColor: 'var(--color-bg-app)' }}>
          <Outlet />
        </div>
      </div>
      <GlobalCartDrawer />
    </div>
  );
}
