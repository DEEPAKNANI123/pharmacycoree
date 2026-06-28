import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Calendar, 
  Loader2, 
  CheckCircle, 
  FileText, 
  X, 
  UploadCloud, 
  ShieldCheck, 
  Download, 
  ExternalLink 
} from 'lucide-react';
import './Compliance.css';

export default function Compliance() {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Custom Action Modal States
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewObligationId, setRenewObligationId] = useState<number | null>(null);
  const [renewDate, setRenewDate] = useState('');
  const [renewFileName, setRenewFileName] = useState<string | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseModalType, setLicenseModalType] = useState<'permit' | 'pharmacist' | null>(null);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newAuthority, setNewAuthority] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  const [obligations, setObligations] = useState<{
    id: number;
    name: string;
    authority: string;
    dueDate: string;
    statusOverride: string | null;
    isSubmitting: boolean;
    action: string;
  }[]>([
    { id: 1, name: 'VAT Return Q1 2026', authority: 'FTA UAE', dueDate: '2026-04-16', statusOverride: null, isSubmitting: false, action: 'Prepare' },
    { id: 2, name: 'MOHAP Narcotics Return', authority: 'MOHAP', dueDate: '2026-04-30', statusOverride: null, isSubmitting: false, action: 'Start' },
    { id: 3, name: 'Trade License Renewal', authority: 'DED', dueDate: '2026-05-01', statusOverride: null, isSubmitting: false, action: 'Apply' },
    { id: 4, name: 'DHA Pharmacy Permit', authority: 'DHA', dueDate: '2026-06-15', statusOverride: null, isSubmitting: false, action: 'View' },
    { id: 5, name: 'Pharmacist License', authority: 'DHA', dueDate: '2026-07-01', statusOverride: null, isSubmitting: false, action: 'View' },
  ]);

  // Dynamic Date Engine
  const calculateDaysLeft = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusText = (daysLeft: number, override: string | null) => {
    if (override) return override;
    if (daysLeft < 0) return 'Overdue';
    if (daysLeft <= 14) return 'Urgent';
    if (daysLeft <= 45) return 'Upcoming';
    return 'On Track';
  };

  const getDaysLeftText = (daysLeft: number) => {
    if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
    if (daysLeft === 0) return 'Due today';
    return `${daysLeft} days`;
  };

  const handleAddObligation = () => {
    if (newName && newAuthority && newDueDate) {
      setObligations(prev => [...prev, {
        id: Date.now(),
        name: newName,
        authority: newAuthority,
        dueDate: newDueDate,
        statusOverride: null,
        isSubmitting: false,
        action: 'View'
      }].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      
      setShowAddModal(false);
      setNewName('');
      setNewAuthority('');
      setNewDueDate('');
    }
  };

  const handleAction = async (id: number, actionName: string) => {
    const obligation = obligations.find(o => o.id === id);
    if (!obligation) return;

    if (actionName === 'Prepare') {
      navigate('/admin/vat-returns');
      return;
    }

    if (actionName === 'Start') {
      setObligations(prev => prev.map(o => o.id === id ? { ...o, isSubmitting: true } : o));
      
      try {
        await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-mohap-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            complianceId: id,
            action: 'MOHAP_NARCOTICS_SUBMISSION',
            date: new Date().toISOString()
          })
        });
      } catch (e) {
        console.error("Webhook failed", e);
      }

      setObligations(prev => prev.map(o => o.id === id ? { ...o, isSubmitting: false, statusOverride: 'Submitted', action: 'View Receipt' } : o));
      return;
    }

    if (actionName === 'View Receipt') {
      setShowReceiptModal(true);
      return;
    }

    if (actionName === 'Apply') {
      setRenewObligationId(id);
      setShowRenewModal(true);
      return;
    }

    if (actionName === 'View') {
      if (obligation.name.includes('Permit')) {
        setLicenseModalType('permit');
        setShowLicenseModal(true);
      } else if (obligation.name.includes('Pharmacist')) {
        setLicenseModalType('pharmacist');
        setShowLicenseModal(true);
      } else {
        alert(`Viewing details for: ${obligation.name}`);
      }
      return;
    }
  };

  return (
    <div className="compliance-container">
      <div className="compliance-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>Compliance Calendar</h1>
        <button className="btn btn-primary flex-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add Deadline
        </button>
      </div>

      <div className="compliance-panel overflow-hidden" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table className="compliance-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Obligation</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Authority</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Due Date</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Timeline</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {obligations.map((o) => {
              const daysLeftNum = calculateDaysLeft(o.dueDate);
              const statusText = getStatusText(daysLeftNum, o.statusOverride);
              const isUrgentOrOverdue = (daysLeftNum <= 14) && !o.statusOverride;
              
              let statusBadgeClass = 'badge ';
              if (statusText === 'On Track') statusBadgeClass += 'badge-success';
              else if (statusText === 'Upcoming') statusBadgeClass += 'badge-warning';
              else if (statusText === 'Urgent' || statusText === 'Overdue') statusBadgeClass += 'badge-danger';
              else if (statusText === 'Submitted') statusBadgeClass += 'badge-success'; // Override

              // CSS style overrides for statuses
              const getBadgeStyles = (status: string) => {
                if (status === 'On Track') return { background: '#dcfce7', color: '#16a34a' };
                if (status === 'Upcoming') return { background: '#ffedd5', color: '#ea580c' };
                if (status === 'Urgent' || status === 'Overdue') return { background: '#fee2e2', color: '#dc2626' };
                return { background: '#ecfdf5', color: '#0d9488' }; // Submitted
              };

              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td className="font-bold" style={{ padding: '1rem', color: '#0f172a', fontWeight: 'bold' }}>{o.name}</td>
                  <td className="text-muted" style={{ padding: '1rem', color: '#64748b' }}>{o.authority}</td>
                  <td style={{ padding: '1rem', color: '#334155' }}>{new Date(o.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}</td>
                  <td className={isUrgentOrOverdue ? 'text-danger font-bold' : ''} style={{ padding: '1rem', color: isUrgentOrOverdue ? '#dc2626' : '#334155', fontWeight: isUrgentOrOverdue ? 'bold' : 'normal' }}>
                    {o.statusOverride ? 'Completed' : getDaysLeftText(daysLeftNum)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span className={statusBadgeClass} style={{ padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', ...getBadgeStyles(statusText) }}>
                      {statusText}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => handleAction(o.id, o.action)}
                      className={`btn btn-sm px-4 py-1 text-xs ${isUrgentOrOverdue ? 'btn-primary' : 'btn-outline'}`}
                      style={{ 
                        background: isUrgentOrOverdue ? '#2563eb' : 'transparent',
                        color: isUrgentOrOverdue ? 'white' : '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        cursor: o.isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '100px',
                        padding: '0.35rem 0.75rem',
                        fontWeight: 'bold',
                        fontSize: '0.75rem'
                      }}
                      disabled={o.isSubmitting}
                    >
                      {o.isSubmitting ? <Loader2 size={14} className="animate-spin" /> : o.action}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Deadline Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Calendar className="text-primary" size={24} color="#2563eb" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Add New Deadline</h2>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Obligation Name</label>
              <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Civil Defense Inspection" />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Regulatory Authority</label>
              <input type="text" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={newAuthority} onChange={e => setNewAuthority(e.target.value)} placeholder="e.g. Dubai Municipality" />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Due Date</label>
              <input type="date" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleAddObligation} disabled={!newName || !newAuthority || !newDueDate}>Add to Calendar</button>
            </div>
          </div>
        </div>
      )}

      {/* MOHAP Receipt Modal */}
      {showReceiptModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#ecfdf5', color: '#0d9488', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>Filing Receipt</h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>MOHAP Submission Record</p>
                </div>
              </div>
              <button onClick={() => setShowReceiptModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.1px', color: '#64748b', fontWeight: 'bold' }}>Receipt ID</span>
                <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontFamily: 'monospace', fontWeight: 'bold' }}>MOHAP-TXN-2026-994821</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Reporting Period:</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>April 2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Entity Name:</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>PharmacyCore (Main Branch)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Submission Date:</span>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Verification Status:</span>
                  <span style={{ color: '#0f766e', fontWeight: 'bold', background: '#ccfbf1', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>SIGNED & FILED</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', background: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <FileText size={16} />
                    <span style={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>MOHAP_Narcotics_Return_Q2_2026.csv</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowReceiptModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#334155' }}>Close</button>
              <button 
                onClick={() => {
                  const receiptText = `MOHAP COMPLIANCE RECEIPT\n=======================\nReceipt ID: MOHAP-TXN-2026-994821\nEntity: PharmacyCore\nPeriod: April 2026\nStatus: SIGNED & FILED\nFile Name: MOHAP_Narcotics_Return_Q2_2026.csv\nTimestamp: ${new Date().toISOString()}`;
                  const blob = new Blob([receiptText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'MOHAP-Receipt-994821.txt';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }} 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#0d9488', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade License Renewal Modal */}
      {showRenewModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar className="text-primary" size={24} color="#2563eb" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>Renew Trade License</h2>
              </div>
              <button onClick={() => setShowRenewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '-0.5rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Please upload the new Trade License issued by the Dubai Department of Economy and Tourism (DET / DED) to extend the compliance deadline.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>New Expiry Date</label>
              <input type="date" className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={renewDate} onChange={e => setRenewDate(e.target.value)} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>Upload License Document</label>
              <div 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.pdf,image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) setRenewFileName(file.name);
                  };
                  input.click();
                }}
                style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <UploadCloud size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>
                  {renewFileName ? renewFileName : 'Click to select or drag PDF/Image'}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>Max file size: 5MB</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#334155' }} onClick={() => setShowRenewModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                onClick={async () => {
                  if (renewObligationId && renewDate) {
                    setIsRenewing(true);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    setObligations(prev => prev.map(o => o.id === renewObligationId ? {
                      ...o,
                      dueDate: renewDate,
                      statusOverride: null, 
                      action: 'View'
                    } : o));
                    
                    setIsRenewing(false);
                    setShowRenewModal(false);
                    setRenewDate('');
                    setRenewFileName(null);
                    setRenewObligationId(null);
                  }
                }}
                disabled={!renewDate || !renewFileName || isRenewing}
              >
                {isRenewing ? <Loader2 size={16} className="animate-spin" /> : 'Submit Renewal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DHA Digital License / Permit Modal */}
      {showLicenseModal && licenseModalType && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={24} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>
                  {licenseModalType === 'permit' ? 'DHA Pharmacy Permit' : 'DHA Pharmacist License'}
                </h2>
              </div>
              <button onClick={() => setShowLicenseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* Certificate Display */}
            {licenseModalType === 'permit' ? (
              <div style={{ border: '4px double #d97706', padding: '2rem', background: '#fffbeb', borderRadius: '8px', position: 'relative', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#b45309', textTransform: 'uppercase', letterSpacing: '2px' }}>GOVERNMENT OF DUBAI</span>
                  <h3 style={{ margin: '5px 0', color: '#1e3a8a', fontSize: '1.2rem', fontFamily: 'serif' }}>DUBAI HEALTH AUTHORITY</h3>
                  <div style={{ width: '40px', height: '2px', background: '#b45309', margin: '10px auto' }}></div>
                </div>

                <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontStyle: 'italic', color: '#6b7280' }}>This is to certify that the facility</p>
                  <h4 style={{ margin: '5px 0', fontSize: '1.1rem', color: '#1e1b4b', fontWeight: 'bold' }}>PHARMACYCORE (MAIN BRANCH)</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontStyle: 'italic', color: '#6b7280' }}>is permitted to practice pharmacy operations in Dubai</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid #fcd34d', paddingTop: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.7rem' }}>Permit Number:</span>
                    <strong style={{ color: '#1e3a8a' }}>DHA-PH-2026-004921</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.7rem' }}>License Type:</span>
                    <strong style={{ color: '#1e3a8a' }}>Community Pharmacy</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.7rem' }}>Issued Date:</span>
                    <strong style={{ color: '#1e3a8a' }}>June 15, 2025</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.7rem' }}>Expiry Date:</span>
                    <strong style={{ color: '#b45309' }}>June 15, 2026</strong>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: '15px', right: '15px', opacity: 0.1 }}>
                  <ShieldCheck size={80} color="#b45309" />
                </div>
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white', padding: '1.5rem', borderRadius: '12px', position: 'relative', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 10px 20px rgba(30,58,138,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Dubai Health Authority</span>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>Pharmacist Professional Card</h3>
                  </div>
                  <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>ACTIVE</span>
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={36} color="white" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>Dr. Sarah Al-Mansoori</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', opacity: 0.9 }}>Registered Clinical Pharmacist (RPh)</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem', fontSize: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.75rem' }}>
                  <div>
                    <span style={{ opacity: 0.7, display: 'block', fontSize: '0.65rem' }}>License No:</span>
                    <strong>DHA-LP-8849201</strong>
                  </div>
                  <div>
                    <span style={{ opacity: 0.7, display: 'block', fontSize: '0.65rem' }}>Category:</span>
                    <strong>Allopathic</strong>
                  </div>
                  <div>
                    <span style={{ opacity: 0.7, display: 'block', fontSize: '0.65rem' }}>Expiry Date:</span>
                    <strong style={{ color: '#fcd34d' }}>July 1, 2026</strong>
                  </div>
                  <div>
                    <span style={{ opacity: 0.7, display: 'block', fontSize: '0.65rem' }}>Authority:</span>
                    <strong>Health Regulation (DHA)</strong>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowLicenseModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: '#334155' }}>Close</button>
              <button 
                onClick={() => {
                  window.print();
                }} 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <ExternalLink size={16} /> Print / Verify License
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
