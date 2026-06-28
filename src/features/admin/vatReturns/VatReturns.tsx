import { useState } from 'react';
import { Loader2, FileText, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import './VatReturns.css';

export default function VatReturns() {
  const [showWizard, setShowWizard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic state for tax returns
  const [returnsList, setReturnsList] = useState([
    {
      id: 'Q1-2026',
      title: 'Q1 2026 VAT Return',
      status: 'pending',
      dueDate: 'Apr 16',
      amount: 8610,
      submittedDate: null
    },
    {
      id: 'Q4-2025',
      title: 'Q4 2025 VAT Return',
      status: 'filed',
      dueDate: 'Jan 16',
      amount: 7940,
      submittedDate: 'Jan 14'
    },
    {
      id: 'Q3-2025',
      title: 'Q3 2025 VAT Return',
      status: 'filed',
      dueDate: 'Oct 16',
      amount: 8120,
      submittedDate: 'Oct 12'
    }
  ]);

  const handleSubmit = async (id: string) => {
    setIsSubmitting(true);
    
    try {
      // Fire the n8n webhook to email the accountant!
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-vat-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          returnId: id,
          amount: 8610,
          date: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Webhook failed, but proceeding to file locally", e);
    }

    setReturnsList(prev => 
      prev.map(r => 
        r.id === id 
          ? { ...r, status: 'filed', submittedDate: 'Just now' }
          : r
      )
    );
    setIsSubmitting(false);
  };

  return (
    <div className="vat-container">
      <div className="vat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>VAT & Statutory Returns</h1>
        <button className="btn btn-primary" onClick={() => setShowWizard(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileSpreadsheet size={18} /> Prepare Return
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        <div className="vat-summary-panel" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm font-bold mb-4 opacity-70">Q1 2026 VAT Summary</h3>
          <div className="vat-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="vat-line-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-sm">Standard-rated supplies</span>
              <span className="font-bold text-sm">AED 296,400</span>
            </div>
            <div className="vat-line-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-sm">Zero-rated supplies</span>
              <span className="font-bold text-sm">AED 44,200</span>
            </div>
            <div className="vat-line-item" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <span className="text-sm">Exempt supplies</span>
              <span className="font-bold text-sm">AED 12,100</span>
            </div>
            <div className="vat-line-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-sm font-bold" style={{ color: '#dc2626' }}>Output VAT (5%)</span>
              <span className="font-bold text-sm" style={{ color: '#dc2626' }}>AED 14,820</span>
            </div>
            <div className="vat-line-item" style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
              <span className="text-sm" style={{ color: '#16a34a' }}>Input VAT (recoverable)</span>
              <span className="font-bold text-sm" style={{ color: '#16a34a' }}>AED 6,210</span>
            </div>
            <div className="vat-line-item vat-total-row" style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
              <span className="text-lg font-bold">Net VAT Payable</span>
              <span className="text-lg font-bold" style={{ color: '#dc2626' }}>AED 8,610</span>
            </div>
          </div>
        </div>

        <div className="vat-summary-panel" style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm font-bold mb-4 opacity-70">Returns Status</h3>
          <div className="returns-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {returnsList.map(ret => (
              <div key={ret.id} className="return-status-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <p className="font-bold text-sm" style={{ marginBottom: '0.25rem' }}>{ret.title}</p>
                  <p className="text-xs text-muted" style={{ color: '#64748b' }}>
                    {ret.status === 'pending' 
                      ? `Due ${ret.dueDate} · Not submitted · AED ${ret.amount.toLocaleString()}`
                      : `Submitted ${ret.submittedDate} · AED ${ret.amount.toLocaleString()}`
                    }
                  </p>
                </div>
                {ret.status === 'pending' ? (
                  <button 
                    className="btn btn-primary btn-sm px-3 py-1 text-xs" 
                    style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem 1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => handleSubmit(ret.id)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Submit'}
                  </button>
                ) : (
                  <span className="badge badge-success text-xs px-2 py-1" style={{ background: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>Filed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tax Wizard Modal */}
      {showWizard && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content animate-slide-up" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '50%', color: '#2563eb' }}>
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Tax Return Preparation Wizard</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Q1 2026 Detailed Breakdown</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Output VAT (Collected on Sales)</div>
                <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#7f1d1d' }}>AED 14,820</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#991b1b' }}>Calculated from 4,281 POS receipts.</p>
              </div>
              <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Input VAT (Paid on Purchases)</div>
                <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#14532d' }}>AED 6,210</h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#166534' }}>Calculated from 82 Supplier GRNs.</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Top Claimable Input VAT Invoices</h3>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Supplier</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Invoice #</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem' }}>VAT Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Emirates MedSupply</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>INV-88392</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>Jan 12, 2026</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>AED 1,240.50</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Gulf Pharma</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>GP-2026-041</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>Feb 08, 2026</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>AED 950.00</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>Al Nahdi Wholesale</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>ANW-991</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>Mar 22, 2026</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>AED 810.00</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowWizard(false)}>Close Wizard</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowWizard(false)}>Approve Numbers</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
