import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Calendar, Landmark, Package, X, ShoppingCart, LogOut, User } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';
import { useNavigate } from 'react-router-dom';
import './AdminHeader.css';

export default function AdminHeader({ title = "Dashboard" }: { title?: string }) {
  const { inventory, cart, setIsCartOpen, currentUser, logout } = useDatabase();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [dubaiDate, setDubaiDate] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim() || !Array.isArray(inventory)) return [];
    return inventory.filter(m => {
      const name = m?.name?.toLowerCase() || '';
      const sku = m?.sku?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      return name.includes(query) || sku.includes(query);
    }).slice(0, 8);
  }, [searchQuery, inventory]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    // Live Dubai Time Date Setup
    const updateDubaiDate = () => {
      const dateStr = new Date().toLocaleDateString('en-US', {
        timeZone: 'Asia/Dubai',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      setDubaiDate(dateStr);
    };
    updateDubaiDate();
    
    // Update every hour to make sure it clicks over at midnight Dubai time
    const interval = setInterval(updateDubaiDate, 3600000);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const handleResultClick = (id: string) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(`/admin/inventory?search=${id}`);
  };

  return (
    <div className="admin-header">
      <div className="header-title">
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>
      </div>
      
      <div className="header-actions">
        <div className="search-bar" ref={searchRef}>
          <Search size={16} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search medicines, SKU.." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}

          {showResults && searchQuery.trim() && (
            <div className="search-results-dropdown shadow-lg animate-fade-in">
              {filteredResults.length > 0 ? (
                <>
                  <div className="results-header">Medicines Found ({filteredResults.length})</div>
                  {filteredResults.map(m => (
                    <div 
                      key={m.id} 
                      className="search-result-item"
                      onClick={() => handleResultClick(m.id)}
                    >
                      <div className="result-icon">
                        <Package size={16} />
                      </div>
                      <div className="result-info">
                        <h5>{m.name}</h5>
                        <p>{m.sku} · {m.category}</p>
                      </div>
                      <div className={`result-status ${(m.stock || 0) < 10 ? 'text-danger' : 'text-success'}`}>
                        {m.stock || 0} in stock
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-results">
                  <Package size={24} className="text-muted mb-2" />
                  <p>No medicines found for "<strong>{searchQuery}</strong>"</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="header-badge clickable-badge" style={{ position: 'relative' }} onClick={() => setIsCartOpen(true)}>
          <ShoppingCart size={16} className="text-primary" />
          <span>Cart {cart.length > 0 && `(${cart.length})`}</span>
        </div>
        
        <div className="header-badge">
          <Calendar size={16} className="text-primary" />
          <span>{dubaiDate}</span>
        </div>
        
        <div className="header-badge">
          <Landmark size={16} className="text-primary" />
          <span>Main Branch</span>
        </div>
        
        <div className="avatar" style={{ cursor: 'pointer', position: 'relative' }} ref={profileRef} onClick={() => setShowProfileMenu(!showProfileMenu)}>
          {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : 'AR'}
          
          {showProfileMenu && (
            <div className="profile-dropdown shadow-lg animate-fade-in" style={{ position: 'absolute', top: '120%', right: '0', background: 'white', border: '1px solid var(--color-border)', borderRadius: '8px', minWidth: '240px', maxWidth: '300px', zIndex: 100, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser?.name || 'Admin User'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', wordBreak: 'break-all' }}>{currentUser?.email || 'admin@pharmacy.com'}</div>
                <div style={{ fontSize: '0.7rem', display: 'inline-block', marginTop: '0.5rem', background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {currentUser?.role || 'Administrator'}
                </div>
              </div>
              <div style={{ padding: '0.5rem' }}>
                <div className="profile-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--color-danger)', cursor: 'pointer', borderRadius: '4px' }} onClick={() => { logout(); navigate('/login'); }}>
                  <LogOut size={16} /> Sign Out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
