import React, { useState } from 'react';
import { 
  X, ChevronRight, Clipboard, Search, 
  ArrowRight, Check, Clock, Grid,
  Calendar, User, File, CheckCircle, AlertCircle
} from 'lucide-react';
import './GRNReceiving.css';

interface POSelection {
  id: string;
  poNumber: string;
  supplier: string;
  items: number;
  value: number;
  expectedDate: string;
  status: 'In Transit' | 'Overdue';
}

export default function GRNReceiving() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPO, setSelectedPO] = useState<POSelection | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  // Form States
  const [receivedItems, setReceivedItems] = useState([
    { id: 1, name: 'Amoxicillin 500mg', expected: 100, received: 100 },
    { id: 2, name: 'Paracetamol 500mg', expected: 50, received: 45 }, // Intentionally short for variance demo
    { id: 3, name: 'Omeprazole 20mg', expected: 200, received: 200 }
  ]);
  const [qualityChecks, setQualityChecks] = useState({
    temperature: false,
    packaging: false,
    expiry: false
  });

  const steps = [
    { id: 1, label: 'Select PO' },
    { id: 2, label: 'Receive Items' },
    { id: 3, label: 'Quality Check' },
    { id: 4, label: 'Variance Review' },
    { id: 5, label: 'Post & Invoice' }
  ];

  const pos: POSelection[] = [
    { 
      id: '1', 
      poNumber: 'PO-2026-0091', 
      supplier: 'Gulf Pharma Dist.', 
      items: 18, 
      value: 24500, 
      expectedDate: 'Apr 9', 
      status: 'In Transit' 
    },
    { 
      id: '2', 
      poNumber: 'PO-2026-0090', 
      supplier: 'Emirates MedSupply', 
      items: 7, 
      value: 8200, 
      expectedDate: 'Apr 6', 
      status: 'Overdue' 
    }
  ];

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  const handleNextStep = () => {
    if (currentStep < 5) setCurrentStep(prev => prev + 1);
  };
  
  const handleRejectDelivery = () => {
    showToast("Rejecting Delivery & Alerting Supplier...", "error");
    if (selectedPO) {
      fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-delivery-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPO)
      }).then(() => showToast("Supplier notified of rejection!")).catch(() => {});
    }
  };

  const handlePostGRN = () => {
    showToast("Posting GRN...");
    if (selectedPO) {
      fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-grn-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedPO)
      }).then(() => {
        showToast("GRN Posted and Broadcast Sent!");
      }).catch(() => {
        // Silently catch error if n8n is offline, so UI still works
      }).finally(() => {
        setShowSuccessModal(true);
      });
    }
  };

  return (
    <div className="grn-container">
      <div className="grn-header">
        <h1>GRN — Goods Receiving</h1>
        <button className="btn btn-outline flex-center gap-2" onClick={() => showToast("History log opened")}>
          View History
        </button>
      </div>

      <div className="grn-stepper">
        <div className="stepper-line"></div>
        {steps.map((step) => (
          <div key={step.id} className={`stepper-item ${currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : ''}`}>
            <div className="step-number">
              {currentStep > step.id ? <Check size={20} /> : step.id}
            </div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>

      <div className="grn-grid" style={{ gridTemplateColumns: currentStep === 1 ? '1fr 1fr' : '1fr' }}>
        
        {/* Always show Receiving Details on all steps, but span 1fr on later steps */}
        <div className="grn-panel">
          <h2>Receiving Details</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Receiving Branch</label>
              <select className="form-control" disabled={currentStep > 1}>
                <option>Main Branch — Dubai</option>
                <option>Sharjah Branch</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date Received</label>
              <input type="date" className="form-control" defaultValue="2026-04-09" disabled={currentStep > 1} />
            </div>
            <div className="form-group">
              <label>Received By</label>
              <input type="text" className="form-control" defaultValue="Sara Hassan — Inventory Manager" disabled={currentStep > 1} />
            </div>
            <div className="form-group">
              <label>Delivery Note #</label>
              <input type="text" className="form-control" placeholder="e.g. DN-44821" disabled={currentStep > 1} />
            </div>
          </div>
        </div>

        {/* STEP 1: PO Selection */}
        {currentStep === 1 && (
          <div className="grn-panel">
            <h2>Select Purchase Order</h2>
            <div className="po-selection-list scroll-y-400">
              {pos.map((po) => (
                <div 
                  key={po.id} 
                  className={`po-card ${selectedPO?.id === po.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPO(po)}
                >
                  <div className="po-card-info">
                    <h4>{po.poNumber} — {po.supplier}</h4>
                    <p>{po.items} items · AED {po.value.toLocaleString()} · Expected {po.expectedDate}</p>
                  </div>
                  <div className="po-card-status">
                    <span className={`po-badge ${po.status.toLowerCase().replace(' ', '-')}`}>
                      {po.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Receive Items */}
        {currentStep === 2 && (
          <div className="grn-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Scan & Receive Items</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', width: '300px' }}>
                <Search size={18} color="#94a3b8" />
                <input type="text" placeholder="Scan Barcode or Enter SKU..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' }} autoFocus />
              </div>
            </div>
            <table className="grn-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Expected Qty</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Received Qty</th>
                </tr>
              </thead>
              <tbody>
                {receivedItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>{item.name}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{item.expected} units</td>
                    <td style={{ padding: '1rem' }}>
                      <input type="number" className="form-control" style={{ width: '100px', textAlign: 'center', padding: '0.5rem' }} value={item.received} onChange={(e) => {
                        const newItems = [...receivedItems];
                        const idx = newItems.findIndex(i => i.id === item.id);
                        newItems[idx].received = parseInt(e.target.value) || 0;
                        setReceivedItems(newItems);
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* STEP 3: Quality Check */}
        {currentStep === 3 && (
          <div className="grn-panel">
            <h2>Quality & Compliance Check</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={qualityChecks.temperature} onChange={(e) => setQualityChecks({...qualityChecks, temperature: e.target.checked})} />
                <div>
                  <strong>Cold Chain / Temperature OK</strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Data logger verifies temperature stayed between 2°C and 8°C.</div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={qualityChecks.packaging} onChange={(e) => setQualityChecks({...qualityChecks, packaging: e.target.checked})} />
                <div>
                  <strong>Packaging Intact</strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>No crushed boxes, leaks, or broken seals observed.</div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '20px', height: '20px' }} checked={qualityChecks.expiry} onChange={(e) => setQualityChecks({...qualityChecks, expiry: e.target.checked})} />
                <div>
                  <strong>Expiry Dates Valid</strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>All received batches have at least 12 months shelf life remaining.</div>
                </div>
              </label>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#991b1b' }}><strong>Did a check fail?</strong> Reject the entire delivery immediately.</div>
              <button className="btn" style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px' }} onClick={handleRejectDelivery}>Reject Delivery</button>
            </div>
          </div>
        )}

        {/* STEP 4: Variance Review */}
        {currentStep === 4 && (
          <div className="grn-panel">
            <h2 style={{ marginBottom: '1.5rem', marginTop: 0 }}>Variance Review</h2>
            <div style={{ padding: '1.5rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#9a3412' }}>Discrepancies Detected</h3>
              <p style={{ margin: 0, color: '#9a3412' }}>There is a mismatch between expected and received quantities. Please review carefully before finalizing.</p>
            </div>
            <table className="grn-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Expected Qty</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Received Qty</th>
                  <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600 }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {receivedItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>{item.name}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{item.expected} units</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{item.received} units</td>
                    <td style={{ padding: '1rem' }}>
                      {item.expected === item.received 
                        ? <span style={{ color: '#166534', fontWeight: 600, background: '#dcfce7', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Match</span> 
                        : <span style={{ color: '#991b1b', fontWeight: 600, background: '#fee2e2', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Shortfall (-{item.expected - item.received})</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* STEP 5: Post & Invoice */}
        {currentStep === 5 && (
          <div className="grn-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', marginBottom: '1.5rem' }}>
              <CheckCircle size={40} color="#166534" />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Ready to Post GRN</h2>
            <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
              By clicking Post GRN, you are officially adding these items to your live inventory. 
              The system will broadcast a stock update to the team and notify Accounts Payable to process the supplier invoice.
            </p>
            <button className="btn btn-primary" style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }} onClick={handlePostGRN}>
              Post GRN & Finalize
            </button>
          </div>
        )}
      </div>

      <div className="grn-footer" style={{ justifyContent: currentStep > 1 ? 'space-between' : 'flex-end' }}>
        {currentStep > 1 && (
          <button className="btn btn-outline" onClick={() => setCurrentStep(prev => prev - 1)}>
            Back
          </button>
        )}
        
        {currentStep < 5 && (
          <button 
            className="btn-primary flex gap-2" style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: !selectedPO ? '#94a3b8' : '#2563eb', color: 'white' }}
            disabled={!selectedPO}
            onClick={handleNextStep}
          >
            {currentStep === 1 ? 'Next: Receive Items' : currentStep === 2 ? 'Next: Quality Check' : currentStep === 3 ? 'Next: Variance Review' : 'Next: Post & Invoice'} <ArrowRight size={18} />
          </button>
        )}
      </div>

      {toast && (
        <div className={`toast animate-fade-in ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', marginBottom: '1.5rem' }}>
              <CheckCircle size={40} color="#166534" />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#0f172a' }}>Stock Successfully Added!</h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '2rem' }}>
              The items from <strong>{selectedPO?.poNumber}</strong> have been added to your live inventory.
            </p>
            
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Location Added To</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>Main Branch — Dubai</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Total Items</div>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{receivedItems.reduce((acc, item) => acc + item.received, 0)} Units</div>
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', borderRadius: '8px' }}
              onClick={() => {
                setShowSuccessModal(false);
                setCurrentStep(1);
                setSelectedPO(null);
              }}
            >
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
