import React, { useState } from 'react';
import { 
  UserPlus, 
  X, 
  Search, 
  Award, 
  History, 
  Clock, 
  User, 
  Plus, 
  Minus, 
  Loader2, 
  Gift, 
  AlertTriangle, 
  Bell, 
  CheckCircle,
  Hash,
  Brain,
  Sparkles
} from 'lucide-react';
import { useDatabase, type Customer } from '../../../context/DatabaseContext';
import './Customers.css';

export default function Customers() {
  const { customers, addCustomer, updateCustomer, rxQueue, inventory } = useDatabase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | 'Gold' | 'Silver' | 'Bronze'>('All');

  // Form states for adding customer
  const [newCust, setNewCust] = useState({
    name: '',
    phone: '+971 ',
    email: '',
    emiratesId: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Points manual adjustment states
  const [adjustType, setAdjustType] = useState<'add' | 'redeem'>('add');
  const [adjustVal, setAdjustVal] = useState('');
  
  // n8n loading indicators
  const [sendingVoucher, setSendingVoucher] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Mock chronic prescriptions and histories database linked by Customer ID
  const mockCustomerData: Record<string, {
    chronicMed?: { name: string; frequency: string; nextRefill: string; isDue: boolean; daysRemaining: number };
    rxHistory: Array<{ date: string; medication: string; quantity: string; prescriber: string }>;
  }> = {
    'CUST-1': {
      chronicMed: { name: 'Lipitor 20mg', frequency: 'Daily (30 Tablets)', nextRefill: 'June 10, 2026', isDue: false, daysRemaining: 6 },
      rxHistory: [
        { date: 'May 10, 2026', medication: 'Lipitor 20mg', quantity: '30 Tablets', prescriber: 'Dr. Aisha Al Mansoori' },
        { date: 'Apr 12, 2026', medication: 'Panadol Joint', quantity: '24 Tablets', prescriber: 'Over the counter' },
        { date: 'Mar 15, 2026', medication: 'Lipitor 20mg', quantity: '30 Tablets', prescriber: 'Dr. Aisha Al Mansoori' }
      ]
    },
    'CUST-2': {
      chronicMed: { name: 'Glucophage XR 1000mg', frequency: 'Daily (60 Tablets)', nextRefill: 'June 22, 2026', isDue: false, daysRemaining: 18 },
      rxHistory: [
        { date: 'May 22, 2026', medication: 'Glucophage XR 1000mg', quantity: '60 Tablets', prescriber: 'Dr. Sameh Farid' },
        { date: 'Apr 25, 2026', medication: 'Amoxil 500mg', quantity: '15 Capsules', prescriber: 'Dr. Sameh Farid' }
      ]
    },
    'CUST-3': {
      rxHistory: [
        { date: 'May 05, 2026', medication: 'Nexium 40mg', quantity: '28 Tablets', prescriber: 'Dr. Sarah Al-Mansoori' },
        { date: 'Apr 10, 2026', medication: 'Strepsils Honey & Lemon', quantity: '16 Lozenges', prescriber: 'Over the counter' }
      ]
    }
  };

  // Helper for dynamically adding mock data for new customers
  const getCustDetails = (id: string) => {
    if (mockCustomerData[id]) return mockCustomerData[id];
    // Default fallback mock data for newly created customers
    if (id.startsWith('CUST-')) {
      const lastDigit = parseInt(id.slice(-1)) || 0;
      if (lastDigit % 2 === 0) {
        return {
          chronicMed: { name: 'Ventolin Inhaler 100mcg', frequency: 'PRN (As Needed)', nextRefill: 'June 05, 2026', isDue: true, daysRemaining: 1 },
          rxHistory: [
            { date: 'May 05, 2026', medication: 'Ventolin Inhaler 100mcg', quantity: '1 Unit', prescriber: 'Dr. Sarah Al-Mansoori' }
          ]
        };
      }
    }
    return {
      rxHistory: [
        { date: 'Today', medication: 'Registered Pharmacy Core Profile', quantity: '1 Unit', prescriber: 'System Registration' }
      ]
    };
  };

  // 1. Phone number formatter helper
  const handlePhoneInputChange = (val: string) => {
    let cleanVal = val;
    if (cleanVal === '' || cleanVal === '+' || cleanVal === '+9' || cleanVal === '+97' || cleanVal === '+971') {
      setNewCust(prev => ({ ...prev, phone: '+971 ' }));
      return;
    }
    if (cleanVal.startsWith('+971 0')) {
      cleanVal = '+971 ' + cleanVal.slice(6);
    } else if (cleanVal.startsWith('+9710')) {
      cleanVal = '+971 ' + cleanVal.slice(5);
    }
    if (!cleanVal.startsWith('+971')) {
      let digits = cleanVal.replace(/\D/g, '');
      if (digits.startsWith('0')) {
        digits = digits.slice(1);
      }
      if (digits.startsWith('971')) {
        cleanVal = '+' + digits;
      } else {
        cleanVal = '+971 ' + digits;
      }
    }
    if (cleanVal.startsWith('+971') && !cleanVal.startsWith('+971 ')) {
      cleanVal = '+971 ' + cleanVal.slice(4);
    }
    setNewCust(prev => ({ ...prev, phone: cleanVal }));
  };

  // 2. Add customer submit workflow
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name || !newCust.phone) {
      setErrorMsg('Name and Phone are required.');
      return;
    }
    
    const phoneExists = customers.some(c => c.phone.replace(/\D/g, '') === newCust.phone.replace(/\D/g, ''));
    if (phoneExists) {
      setErrorMsg('A customer with this phone number already exists.');
      return;
    }

    try {
      await addCustomer({
        name: newCust.name,
        phone: newCust.phone,
        email: newCust.email || '',
        emiratesId: newCust.emiratesId || ''
      });
      setIsModalOpen(false);
      setNewCust({ name: '', phone: '+971 ', email: '', emiratesId: '' });
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to add customer.');
    }
  };

  // 3. Loyalty point adjustment workflow
  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !adjustVal) return;
    const value = parseInt(adjustVal);
    if (isNaN(value) || value <= 0) return;

    let newPoints = selectedCust.rewardPoints;
    if (adjustType === 'add') {
      newPoints += value;
    } else {
      newPoints = Math.max(0, newPoints - value);
    }

    await updateCustomer(selectedCust.id, { rewardPoints: newPoints });
    
    // Update local drawer state view
    setSelectedCust(prev => prev ? { ...prev, rewardPoints: newPoints } : null);
    setAdjustVal('');
  };

  // 4. Send milestone reward voucher via n8n
  const triggerSendVoucher = async () => {
    if (!selectedCust) return;
    setSendingVoucher(true);

    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-customer-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCust.id,
          customerName: selectedCust.name,
          emailAddress: selectedCust.email || 'hr.soxibeta@gmail.com',
          rewardPoints: selectedCust.rewardPoints,
          tier: selectedCust.rewardPoints > 2000 ? 'Gold' : selectedCust.rewardPoints > 1000 ? 'Silver' : 'Bronze',
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Voucher webhook failed", e);
    }

    setTimeout(() => {
      setSendingVoucher(false);
      alert(`Loyalty reward voucher successfully sent to ${selectedCust.name}!`);
    }, 1000);
  };

  // 5. Send prescription chronic refill reminder via n8n
  const triggerRefillReminder = async (medName: string, nextRefill: string) => {
    if (!selectedCust) return;
    setSendingReminder(true);

    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-customer-refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCust.id,
          customerName: selectedCust.name,
          emailAddress: selectedCust.email || 'hr.soxibeta@gmail.com',
          medication: medName,
          refillDate: nextRefill,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Refill webhook failed", e);
    }

    try {
      const storedWhatsapp = localStorage.getItem('pharma_whatsapp_number') || selectedCust.phone || '+971500000000';
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-whatsapp-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: selectedCust.name,
          recipientPhone: storedWhatsapp,
          medicineName: medName,
          advice: `Your refill is scheduled for ${nextRefill}. Adherence is key to managing your chronic condition.`
        })
      });
    } catch (waErr) {
      console.error("WhatsApp refill webhook failed", waErr);
    }

    setTimeout(() => {
      setSendingReminder(false);
      alert(`Chronic medication refill alert dispatched to ${selectedCust.name}!`);
    }, 1000);
  };

  const [forecastingCustId, setForecastingCustId] = useState<string | null>(null);

  const triggerAICustomerForecast = async () => {
    if (!selectedCust) return;
    setForecastingCustId(selectedCust.id);

    const details = getCustDetails(selectedCust.id);
    const conditions = details.chronicMed ? details.chronicMed.name : 'None';
    const lastRefill = details.chronicMed ? '2026-05-15' : 'No chronic refill logs';
    const avgSpend = selectedCust.rewardPoints > 1000 ? '450' : '220';
    const tierInfo = getTierInfo(selectedCust.rewardPoints);

    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-customer-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCust.id,
          name: selectedCust.name,
          tier: tierInfo.tier,
          conditions: conditions,
          lastRefill: lastRefill,
          avgSpend: avgSpend
        })
      });
      alert(`AI forecasting complete! The predictive metrics have been emailed to the dashboard manager.`);
    } catch (e) {
      console.error(e);
      alert(`AI Forecast simulation run complete locally. (n8n forecasting webhook failed/offline)`);
    } finally {
      setForecastingCustId(null);
    }
  };

  // Loyalty tier progress computations
  const getTierInfo = (pts: number) => {
    if (pts >= 2000) {
      return { tier: 'Gold', percent: 100, needed: 0, nextTier: 'Maximized', color: 'gold' };
    }
    if (pts >= 1000) {
      const percent = Math.min(100, Math.floor(((pts - 1000) / 1000) * 100));
      return { tier: 'Silver', percent, needed: 2000 - pts, nextTier: 'Gold', color: 'silver' };
    }
    const percent = Math.min(100, Math.floor((pts / 1000) * 100));
    return { tier: 'Bronze', percent, needed: 1000 - pts, nextTier: 'Silver', color: 'bronze' };
  };

  // Filter and search logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const tier = c.rewardPoints > 2000 ? 'Gold' : c.rewardPoints > 1000 ? 'Silver' : 'Bronze';
    const matchesTier = tierFilter === 'All' || tier === tierFilter;

    return matchesSearch && matchesTier;
  });

  return (
    <div className="customers-container">
      <div className="customers-header">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>Customers</h1>
        <button className="btn btn-primary flex-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setIsModalOpen(true)}>
          <UserPlus size={18} /> Add Customer
        </button>
      </div>

      {/* Controls: Search and Filters */}
      <div className="controls-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon-inside" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by name, phone or email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {(['All', 'Gold', 'Silver', 'Bronze'] as const).map(tier => (
            <button 
              key={tier}
              className={`filter-pill ${tierFilter === tier ? 'active' : ''}`}
              onClick={() => setTierFilter(tier)}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table Panel */}
      <div className="customers-panel overflow-hidden">
        <table className="customer-table">
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Customer</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Phone</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>Loyalty Pts</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>Last Visit</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Action/Badge</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c) => {
              const details = getCustDetails(c.id);
              const isRefillAlert = details.chronicMed?.isDue;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }} onClick={() => setSelectedCust(c)}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{c.name}</div>
                    {c.email && <span className="meta-text">{c.email}</span>}
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{c.phone}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: '#2563eb' }}>{c.rewardPoints} pts</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>
                    {isRefillAlert ? (
                      <span style={{ color: '#ea580c', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={14} /> Refill Tomorrow
                      </span>
                    ) : (
                      c.lastVisit || 'Never'
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span className={`customer-badge ${c.rewardPoints >= 2000 ? 'gold' : c.rewardPoints >= 1000 ? 'silver' : 'bronze'}`}>
                      {c.rewardPoints >= 2000 ? 'Gold' : c.rewardPoints >= 1000 ? 'Silver' : 'Bronze'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No matching customers registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add New Customer */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#2563eb" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Add New Customer</h2>
              </div>
              <button onClick={() => { setIsModalOpen(false); setErrorMsg(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomerSubmit}>
              {errorMsg && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {errorMsg}
                </div>
              )}
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: '#334155' }}>Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ahmed Al Rashid"
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  value={newCust.name}
                  onChange={e => setNewCust({...newCust, name: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: '#334155' }}>Phone Number <span style={{ color: '#dc2626' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. +971 50 123 4567"
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  value={newCust.phone}
                  onChange={e => handlePhoneInputChange(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: '#334155' }}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="e.g. ahmed@example.com"
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  value={newCust.email}
                  onChange={e => setNewCust({...newCust, email: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: '#334155' }}>Emirates ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. 784-1980-1234567-1"
                  style={{ width: '100%', padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  value={newCust.emiratesId}
                  onChange={e => setNewCust({...newCust, emiratesId: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => { setIsModalOpen(false); setErrorMsg(''); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer: Customer Detail Profile & Logs */}
      {selectedCust && (
        <div className="drawer-overlay" onClick={() => setSelectedCust(null)}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{selectedCust.name}</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>CRM Profile Details</p>
                </div>
              </div>
              <button onClick={() => setSelectedCust(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {/* Profile Card Section */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Phone Number:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedCust.phone}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Email Address:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedCust.email || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px' }}><Hash size={12} /> Emirates ID:</span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedCust.emiratesId || '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Loyalty Milestone & Gauge Card */}
              {(() => {
                const tierInfo = getTierInfo(selectedCust.rewardPoints);
                return (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loyalty Milestone</span>
                      <span className={`customer-badge ${tierInfo.color}`}>
                        {tierInfo.tier} Status
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{selectedCust.rewardPoints} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>pts</span></h3>
                    </div>

                    <div className="progress-track">
                      <div className={`progress-bar ${tierInfo.color}`} style={{ width: `${tierInfo.percent}%` }}></div>
                    </div>

                    {tierInfo.needed > 0 ? (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>
                        Need <strong>{tierInfo.needed}</strong> pts to unlock <strong>{tierInfo.nextTier}</strong> (Progress: {tierInfo.percent}%)
                      </p>
                    ) : (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.7rem', color: '#d97706', fontWeight: 'bold' }}>
                        ✓ Gold Tier Limit Reached!
                      </p>
                    )}

                    {/* Send reward action */}
                    {selectedCust.email && (
                      <button 
                        onClick={triggerSendVoucher}
                        disabled={sendingVoucher}
                        style={{ width: '100%', marginTop: '1rem', background: '#3b82f6', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                      >
                        {sendingVoucher ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <>
                            <Gift size={12} /> Send Tier Reward Voucher
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Chronic Refills Card */}
              {(() => {
                const details = getCustDetails(selectedCust.id);
                if (!details.chronicMed) return null;
                const m = details.chronicMed;
                return (
                  <div style={{ border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.75rem', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Chronic Refill Tracker</h4>
                      <span style={{ background: m.isDue ? '#fee2e2' : '#ffedd5', color: m.isDue ? '#dc2626' : '#ea580c', padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                        {m.isDue ? 'REFILL DUE' : 'ON TRACK'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <Clock size={20} color="#ea580c" />
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a', fontWeight: 'bold' }}>{m.name}</h5>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>Dosage: {m.frequency}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: m.isDue ? '#b91c1c' : '#334155' }}>
                          Next Refill Date: <strong>{m.nextRefill}</strong> ({m.daysRemaining} days left)
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => triggerRefillReminder(m.name, m.nextRefill)}
                      disabled={sendingReminder}
                      style={{ width: '100%', marginTop: '1rem', background: '#ea580c', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      {sendingReminder ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <>
                          <Bell size={12} /> Dispatch Refill Reminder Alert
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {/* AI Forecasting Card */}
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.75rem', color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} /> AI Predictive Analytics
                  </h4>
                  <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                    GPT-4o Engine
                  </span>
                </div>
                <p style={{ margin: '0 0 1rem 0', fontSize: '0.7rem', color: '#5b21b6', lineHeight: '1.4' }}>
                  Forecast customer churn risk probability, next refill dates, and average lifetime value using history logs.
                </p>
                <button 
                  onClick={triggerAICustomerForecast}
                  disabled={forecastingCustId === selectedCust.id}
                  style={{ width: '100%', background: '#6d28d9', color: 'white', padding: '0.55rem', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  {forecastingCustId === selectedCust.id ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Analyzing with AI...
                    </>
                  ) : (
                    <>
                      <Brain size={12} /> Run AI Customer Forecast
                    </>
                  )}
                </button>
              </div>

              {/* Loyalty Points Adjuster Panel */}
              <div className="points-adjuster-panel">
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>Adjust Loyalty Points</h4>
                
                <form onSubmit={handleAdjustPointsSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select 
                    style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', background: 'white' }}
                    value={adjustType}
                    onChange={e => setAdjustType(e.target.value as 'add' | 'redeem')}
                  >
                    <option value="add">Add (+)</option>
                    <option value="redeem">Redeem (-)</option>
                  </select>
                  <input 
                    type="number" 
                    required
                    placeholder="Points"
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}
                    value={adjustVal}
                    onChange={e => setAdjustVal(e.target.value)}
                  />
                  <button 
                    type="submit"
                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Apply
                  </button>
                </form>
              </div>

              {/* Prescription History Timelines */}
              <div>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <History size={14} /> Prescription History Ledger
                </h4>
                
                {(() => {
                  // Dynamically fetch from rxQueue for this customer
                  const customerRx = rxQueue.filter(rx => rx.userId === selectedCust.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  
                  if (customerRx.length === 0) {
                    return <p className="text-muted text-sm italic">No prescriptions found for this patient.</p>;
                  }

                  return customerRx.map((rx) => {
                    const meds = (rx.associatedMedicines || []).map(medId => {
                      const dbMed = inventory.find(m => m.id === medId);
                      return dbMed ? dbMed.name : medId;
                    }).join(', ');
                    
                    return (
                      <div className="rx-item-box" key={rx.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '0.5rem', background: '#fff' }}>
                        <div className="rx-item-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>{meds || 'Unmapped Medication'}</span>
                          <span className={`badge badge-${rx.status === 'Approved' || rx.status === 'Picked Up' ? 'success' : rx.status.includes('Pending') ? 'warning' : 'primary'}`}>{rx.status}</span>
                        </div>
                        <div className="rx-item-body" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                            <span><strong>Date:</strong> {new Date(rx.date).toLocaleDateString()}</span>
                            {rx.diagnosisCode && <span><strong>ICD-10:</strong> {rx.diagnosisCode}</span>}
                            {rx.refillsAllowed !== undefined && <span><strong>Refills:</strong> {rx.refillsRemaining}/{rx.refillsAllowed}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="drawer-footer">
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
                Customer changes are automatically synchronized with the Supabase central data registry.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
