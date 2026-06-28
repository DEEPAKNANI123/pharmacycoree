import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  ShieldPlus, LayoutDashboard, Bell, Grip, 
  Archive, Clipboard, FileSignature, 
  ThermometerSnowflake, DollarSign, Percent, CheckCircle, LogOut,
  ShoppingCart, ScanFace, Users, BarChart3, Settings, Pill, Server
} from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import './AdminSidebar.css';

export default function AdminSidebar() {
  const { inventory, reviewedAlerts, logout } = useDatabase();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const alertsCount = useMemo(() => {
    let count = 0;
    const today = new Date();
    
    if (!Array.isArray(inventory)) return 0;
    
    inventory.forEach(m => {
      const expDate = new Date(m.expiryDate);
      const daysDiff = (expDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
      
      if (m.stock < 10) {
        const alertId = m.stock < 3 ? `alert-crit-${m.id}` : `alert-low-${m.id}`;
        if (!reviewedAlerts.includes(alertId)) count++;
      }
      if (daysDiff <= 7) {
        const alertId = daysDiff < 0 ? `alert-expired-${m.id}` : `alert-exp-soon-${m.id}`;
        if (!reviewedAlerts.includes(alertId)) count++;
      }
      if (m.isPerishable) {
        const alertId = `alert-perish-${m.id}`;
        if (!reviewedAlerts.includes(alertId)) count++;
      }
    });
    return count;
  }, [inventory, reviewedAlerts]);

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <ShieldPlus size={24} color="white" />
        </div>
        <div>
          <h2 className="brand-title">PharmaCore</h2>
          <span className="brand-subtitle">Main Branch · Dubai</span>
        </div>
      </div>

      <div className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-section-title">OVERVIEW</h3>
          <NavLink to="/admin/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/alerts" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Bell size={18} />
            <span>Alerts</span>
            {alertsCount > 0 && <span className="nav-badge">{alertsCount}</span>}
          </NavLink>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">OPERATIONS</h3>
          <NavLink to="/admin/pos" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Grip size={18} />
            <span>POS / Sales</span>
          </NavLink>
          <NavLink to="/admin/inventory" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Archive size={18} />
            <span>Inventory</span>
          </NavLink>
          <NavLink to="/admin/procurement" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShoppingCart size={18} />
            <span>Procurement</span>
          </NavLink>
          <NavLink to="/admin/grn" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Clipboard size={18} />
            <span>GRN Receiving</span>
          </NavLink>
          <NavLink to="/admin/rx-validation" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileSignature size={18} />
            <span>Rx Validation</span>
          </NavLink>
          <NavLink to="/admin/e-prescribe" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Pill size={18} />
            <span>e-Prescribe</span>
          </NavLink>
          <NavLink to="/admin/cold-store" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <ThermometerSnowflake size={18} />
            <span>Cold Store</span>
          </NavLink>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">FINANCE</h3>
          <NavLink to="/admin/treasury" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <DollarSign size={18} />
            <span>Treasury / Cash</span>
          </NavLink>
          <NavLink to="/admin/vat-returns" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Percent size={18} />
            <span>VAT & Returns</span>
          </NavLink>
          <NavLink to="/admin/compliance" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <CheckCircle size={18} />
            <span>Compliance</span>
          </NavLink>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">PEOPLE</h3>
          <NavLink to="/admin/hr-payroll" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <ScanFace size={18} />
            <span>HR & Payroll</span>
          </NavLink>
          <NavLink to="/admin/customers" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Users size={18} />
            <span>Customers</span>
          </NavLink>
        </div>

        <div className="nav-section">
          <h3 className="nav-section-title">REPORTS</h3>
          <NavLink to="/admin/reports" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={18} />
            <span>Reports</span>
          </NavLink>
          <NavLink to="/admin/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </div>

        <div className="nav-section mt-auto" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          <button className="nav-item text-danger" onClick={handleLogout} style={{ border: 'none', background: 'none', width: '100%', cursor: 'pointer' }}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
