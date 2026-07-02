import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, ShoppingBag, User, LogOut, ShieldPlus, Video } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import PatientChatbot from './PatientChatbot';
import './PatientLayout.css';

export default function PatientLayout() {
  const { currentUser, logout, cart } = useDatabase();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/Signin');
  };

  return (
    <div className="patient-app-container">
      <header className="patient-header">
        <div className="patient-header-inner">
          <div className="left-section">
            <div className="flex-center gap-2" style={{ cursor: 'pointer' }} onClick={() => navigate('/patient/dashboard')}>
              <div style={{ background: 'var(--color-primary)', padding: '8px', borderRadius: '12px' }}>
                <ShieldPlus size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>PharmaCore</h2>
            </div>

            <nav className="desktop-nav">
              <NavLink to="/patient/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Home size={18} />
                <span>Home</span>
              </NavLink>
              <NavLink to="/patient/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Search size={18} />
                <span>Shop All</span>
              </NavLink>
              <NavLink to="/patient/telehealth" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Video size={18} />
                <span>Telehealth</span>
              </NavLink>
              <NavLink to="/patient/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <User size={18} />
                <span>My Profile</span>
              </NavLink>
            </nav>
          </div>

          <div className="right-actions">
            <NavLink to="/patient/cart" className={({ isActive }) => `btn-icon ${isActive ? 'active' : ''}`} style={{ position: 'relative' }}>
              <ShoppingBag size={22} className="text-muted" />
              {cart.length > 0 && <span className="cart-badge">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>}
            </NavLink>
            <div className="flex-center gap-3 ml-4 user-meta" style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '1.5rem' }}>
              <div className="text-right d-none d-md-block">
                <p className="text-xs font-bold">{currentUser?.name}</p>
                <p className="text-[10px] text-muted">{currentUser?.email}</p>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="patient-main animate-slide-up">
        <Outlet />
      </main>
      
      <PatientChatbot />
    </div>
  );
}
