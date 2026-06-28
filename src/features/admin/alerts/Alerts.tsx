import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { Edit3, X, Calendar, CheckCircle, ShoppingCart } from 'lucide-react';
import './Alerts.css';

export default function Alerts() {
  const { inventory, markAlertAsReviewed, markAllAlertsAsReviewed, reviewedAlerts, updateMedicine } = useDatabase();
  const today = new Date();

  // Modal States
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReorder = (medId: string) => {
    const med = inventory.find(m => m.id === medId);
    if (med) {
      const saved = localStorage.getItem('pharma_reorder_requests');
      const requests = saved ? JSON.parse(saved) : [];
      if (!requests.some((r: any) => r.medId === med.id)) {
        requests.push({
          id: `REQ-${Date.now()}`,
          medId: med.id,
          name: med.name,
          sku: med.sku,
          qty: med.reorderPoint * 2 || 20,
          supplier: med.category === 'Cold Chain' ? 'Emirates MedSupply' : med.category === 'Controlled' ? 'Al Nahdi Pharma' : 'Gulf Pharma Dist.',
          date: new Date().toLocaleDateString('en-GB')
        });
        localStorage.setItem('pharma_reorder_requests', JSON.stringify(requests));
      }
      showToast(`Reorder request sent for ${med.name}`, 'info');
      console.log(`[AUDIT LOG] Reorder triggered for ${med.name} (${med.sku})`);
    }
  };

  const handleUpdateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMed && editValues) {
      try {
        await updateMedicine(selectedMed.id, editValues);
        showToast(`${selectedMed.name} updated successfully`);
        setShowManageModal(false);
      } catch (err) {
        showToast(`Failed to update medicine`, 'info');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const alertsList = useMemo(() => {
    const list: any[] = [];
    inventory.forEach(m => {
      const expDate = new Date(m.expiryDate);
      const daysDiff = (expDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

      // 1. Stock Checks (Critical < 3, Low < 10)
      if (m.stock < 3) {
        list.push({
          id: `alert-crit-${m.id}`,
          type: 'Critical Stock',
          badgeClass: 'badge-danger',
          style: { backgroundColor: '#fee2e2', color: '#dc2626' },
          title: `CRITICAL: ${m.name} — Only ${m.stock} left`,
          desc: `Inventory is below the critical threshold (3). Order immediately.`
        });
      } else if (m.stock < 10) {
        list.push({
          id: `alert-low-${m.id}`,
          type: 'Low Stock',
          badgeClass: 'badge-warning',
          style: { backgroundColor: '#ffedd5', color: '#ea580c' },
          title: `${m.name} — ${m.stock} units remaining`,
          desc: `Stock is below 10. Consider reordering soon.`
        });
      }

      // 2. Expiry Checks (Expired, or < 7 days)
      if (daysDiff < 0) {
        list.push({
          id: `alert-expired-${m.id}`,
          type: 'Expired',
          badgeClass: 'badge-danger',
          style: { backgroundColor: '#000', color: '#fff' },
          title: `EXPIRED: ${m.name}`,
          desc: `Item passed expiry on ${expDate.toLocaleDateString()}. REMOVE FROM SHELF.`
        });
      } else if (daysDiff <= 7) {
        list.push({
          id: `alert-exp-soon-${m.id}`,
          type: 'Expiring Soon',
          badgeClass: 'badge-danger',
          style: { backgroundColor: '#fee2e2', color: '#dc2626' },
          title: `${m.name} — Batch ${m.batch.split('-')[1]}`,
          desc: `Expires in ${Math.ceil(daysDiff)} days (${expDate.toLocaleDateString()}).`
        });
      }

      // 3. Perishable Check
      if (m.isPerishable) {
        list.push({
          id: `alert-perish-${m.id}`,
          medId: m.id,
          type: 'Storage Alert',
          badgeClass: 'badge-info',
          style: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
          title: `${m.name} — Perishable`,
          desc: `Requires monitored ${m.storage} storage.`
        });
      }
    });

    inventory.forEach(m => {
      // Find the alerts we just pushed and add medId if they don't have it
      list.forEach(a => {
        if (a.id.endsWith(m.id)) a.medId = m.id;
      });
    });

    // Filter out dismissed alerts for the main list view?
    // User said "notification gone", usually means sidebar.
    // I'll keep them in the list but maybe add a visual indicator or just let them stay.
    // Actually, I'll only show "Unreviewed" alerts here to make it a true inbox.
    return list.filter(a => !reviewedAlerts.includes(a.id) || a.id === 'alert-comp');
  }, [inventory, reviewedAlerts]);

  return (
    <div className="dashboard">
      <div className="dashboard-header mb-2">
        <h1>System Alerts</h1>
        <p className="text-muted">Act on inventory shortages and regulatory deadlines.</p>
      </div>

      <div className="panel alerts-panel" style={{ minHeight: '600px' }}>
        <div className="flex-between panel-header" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Active Issues</h3>
          <div className="flex-gap">
            {alertsList.length > 0 && alertsList[0].id !== 'alert-comp' && (
              <button 
                className="btn btn-sm btn-outline" 
                onClick={() => markAllAlertsAsReviewed(alertsList.map(a => a.id))}
              >
                Clear All
              </button>
            )}
            <span className="badge badge-danger">{alertsList.length} urgent</span>
          </div>
        </div>
        <div className="alerts-list">
          {alertsList.map(a => (
            <div key={a.id} className="alert-item" style={{ 
              padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px',
              display: 'flex', alignItems: 'flex-start', gap: '1rem', backgroundColor: '#fafafa'
            }}>
              <div style={{ minWidth: '80px', display: 'flex' }}>
                <span className={`badge ${a.badgeClass}`} style={{ ...a.style, padding: '0.3rem 0.6rem', width: '100%', justifyContent: 'center' }}>
                  {a.type}
                </span>
              </div>
              <div className="alert-content" style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.4rem', color: 'var(--color-text-main)' }}>{a.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>{a.desc}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  className={`btn btn-sm ${a.type === 'Low Stock' || a.type === 'Critical Stock' ? 'btn-primary' : 'btn-outline'}`} 
                  style={{ width: '100%' }}
                  onClick={() => {
                    if (a.type === 'Low Stock' || a.type === 'Critical Stock') {
                      handleReorder(a.medId);
                    } else {
                      const med = inventory.find(m => m.id === a.medId);
                      if (med) {
                        setSelectedMed(med);
                        setEditValues({
                          name: med.name,
                          price: med.price,
                          reorderPoint: med.reorderPoint
                        });
                        setShowManageModal(true);
                      }
                    }
                  }}
                >
                  {a.type === 'Low Stock' || a.type === 'Critical Stock' ? 'Reorder' : 'Manage'}
                </button>
                {a.id && (
                  <button 
                    className="btn btn-sm btn-outline" 
                    style={{ width: '100%', fontSize: '0.75rem' }}
                    onClick={() => markAlertAsReviewed(a.id)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
          {alertsList.length === 0 && <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>No active alerts. Everything is running smoothly!</p>}
        </div>
      </div>

      {/* Manage Medicine Modal */}
      {showManageModal && selectedMed && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <div className="flex-between mb-4">
              <h2><Edit3 size={20} /> Manage Medicine</h2>
              <button className="btn-icon" onClick={() => setShowManageModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateMedicine}>
              <div className="form-grid">
                <div className="form-group">
                    <label>Medicine Name</label>
                    <input 
                        className="form-control" 
                        value={editValues.name || ''} 
                        onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label>SKU</label>
                    <input className="form-control" value={selectedMed.sku} disabled />
                    <small className="text-muted">SKU cannot be changed</small>
                </div>
                <div className="form-group">
                    <label>Selling Price (AED)</label>
                    <input 
                        type="number" 
                        className="form-control" 
                        value={editValues.price || ''} 
                        onChange={(e) => setEditValues({...editValues, price: parseFloat(e.target.value)})}
                    />
                </div>
                <div className="form-group">
                    <label>Reorder Point</label>
                    <input 
                        type="number" 
                        className="form-control" 
                        value={editValues.reorderPoint || ''} 
                        onChange={(e) => setEditValues({...editValues, reorderPoint: parseInt(e.target.value)})}
                    />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Expiry Date</label>
                    <div className="input-with-icon">
                        <Calendar size={16} />
                        <input className="form-control" value={formatDate(selectedMed.expiryDate)} disabled />
                    </div>
                    <small className="text-danger">Expiry date cannot be edited for safety compliance.</small>
                </div>
              </div>
              <div className="flex-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowManageModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast animate-fade-in ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <ShoppingCart size={18} />}
            {toast.message}
        </div>
      )}
    </div>
  );
}
