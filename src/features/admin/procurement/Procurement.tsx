import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, RefreshCcw, ShoppingCart, 
  Search, Filter, CheckCircle, Clock, 
  AlertCircle, ChevronRight, X, FileText,
  Truck, ArrowRight
} from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './Procurement.css';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  items: number;
  value: number;
  created: string;
  status: 'In Transit' | 'Pending GRN' | 'Completed' | 'Invoice Mismatch';
}

export default function Procurement() {
  const navigate = useNavigate();
  const { inventory } = useDatabase();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [showReorderQueueModal, setShowReorderQueueModal] = useState(false);
  const [reviewPO, setReviewPO] = useState<PurchaseOrder | null>(null);
  const [reorderRequests, setReorderRequests] = useState<any[]>([]);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    { id: '1', poNumber: 'PO-2026-0091', supplier: 'Gulf Pharma Dist.', items: 18, value: 24500, created: 'Apr 8', status: 'In Transit' },
    { id: '2', poNumber: 'PO-2026-0090', supplier: 'Emirates MedSupply', items: 7, value: 8200, created: 'Apr 6', status: 'Pending GRN' },
    { id: '3', poNumber: 'PO-2026-0089', supplier: 'Al Nahdi Pharma', items: 23, value: 31000, created: 'Apr 5', status: 'Completed' },
    { id: '4', poNumber: 'PO-2026-0088', supplier: 'Gulf Pharma Dist.', items: 4, value: 4100, created: 'Apr 3', status: 'Invoice Mismatch' },
  ]);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenReorderQueue = () => {
    // 1. Gather automatic low-stock items from live inventory
    const autoLowStock = inventory
      .filter(m => m.stock <= m.reorderPoint)
      .map(m => ({
        id: `auto-${m.id}`,
        medId: m.id,
        name: m.name,
        sku: m.sku,
        stock: m.stock,
        reorderPoint: m.reorderPoint,
        qty: m.reorderPoint * 2 || 20,
        supplier: m.category === 'Cold Chain' ? 'Emirates MedSupply' : m.category === 'Controlled' ? 'Al Nahdi Pharma' : 'Gulf Pharma Dist.',
        type: 'Auto (Low Stock)'
      }));

    // 2. Gather manual requests from localStorage
    const saved = localStorage.getItem('pharma_reorder_requests');
    const manualRequests = saved ? JSON.parse(saved) : [];
    
    // Filter out duplicates (manual requests that are already counted in auto low stock)
    const filteredManual = manualRequests
      .filter((mr: any) => !autoLowStock.some(al => al.medId === mr.medId))
      .map((mr: any) => {
        const med = inventory.find(m => m.id === mr.medId);
        return {
          id: mr.id,
          medId: mr.medId,
          name: mr.name,
          sku: mr.sku,
          stock: med ? med.stock : 0,
          reorderPoint: med ? med.reorderPoint : 0,
          qty: mr.qty || 20,
          supplier: mr.supplier || 'Gulf Pharma Dist.',
          type: 'Manual Request'
        };
      });

    setReorderRequests([...autoLowStock, ...filteredManual]);
    setShowReorderQueueModal(true);
  };

  const handleGeneratePO = async (req: any) => {
    // 1. Create a new Purchase Order
    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      poNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: req.supplier,
      items: 1,
      value: Math.floor(req.qty * 12.5), // approximate simulated wholesale cost
      created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      status: 'In Transit'
    };

    setPurchaseOrders(prev => [newPO, ...prev]);

    // 2. Send data to n8n Webhook
    try {
      // REPLACE THIS URL with your actual n8n webhook URL once you create it
      const N8N_WEBHOOK_URL = 'https://soxibetahr.app.n8n.cloud/webhook/pharmacy-po';
      
      fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poNumber: newPO.poNumber,
          supplier: newPO.supplier,
          medicineName: req.name,
          sku: req.sku,
          quantity: req.qty,
          totalValue: newPO.value,
          date: newPO.created
        }),
      }).catch(err => console.log("Webhook not available yet, which is fine."));
    } catch (e) {
      console.error(e);
    }

    // 3. Remove manual request from localStorage if applicable
    if (req.id.startsWith('REQ-')) {
      const saved = localStorage.getItem('pharma_reorder_requests');
      if (saved) {
        const requests = JSON.parse(saved);
        const updated = requests.filter((r: any) => r.id !== req.id);
        localStorage.setItem('pharma_reorder_requests', JSON.stringify(updated));
      }
    }

    // 4. Remove from the modal state list
    setReorderRequests(prev => prev.filter(r => r.id !== req.id));
    
    showNotification(`Purchase Order ${newPO.poNumber} generated and sent to ${req.supplier}!`);
  };

  const dashboardMetrics = [
    { label: 'Open POs', value: '12', icon: <ShoppingCart size={20} />, color: 'blue' },
    { label: 'Pending GRN', value: '5', icon: <Clock size={20} />, color: 'orange' },
    { label: 'Invoice Mismatch', value: '3', icon: <AlertCircle size={20} />, color: 'red' },
    { label: 'MTD Purchases', value: 'AED 182K', icon: <FileText size={20} />, color: 'green' },
  ];

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'In Transit': return 'in-transit';
      case 'Pending GRN': return 'pending-grn';
      case 'Completed': return 'completed';
      case 'Invoice Mismatch': return 'mismatch';
      default: return '';
    }
  };

  const getActionButton = (po: PurchaseOrder) => {
    switch(po.status) {
      case 'In Transit': return <button className="btn-grn" onClick={() => navigate('/admin/grn')}>GRN Receive</button>;
      case 'Pending GRN': return <button className="btn btn-sm btn-outline" onClick={() => navigate('/admin/grn')}>Receive</button>;
      case 'Completed': return <button className="btn btn-sm btn-outline" onClick={() => {
        showNotification("Generating Invoice...");
        fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(po)
        }).then(() => showNotification("Invoice sent to Accounting!")).catch(() => {});
      }}>Invoice</button>;
      case 'Invoice Mismatch': return <button className="btn-review" onClick={() => setReviewPO(po)}>Review</button>;
      default: return null;
    }
  };

  return (
    <div className="procurement-container">
      <div className="procurement-header">
        <h1>Procurement</h1>
        <div className="procurement-actions">
          <button className="btn btn-outline flex-center gap-2" onClick={() => setShowSuppliersModal(true)}>
            <Users size={16} /> Suppliers
          </button>
          <button className="btn btn-outline flex-center gap-2" onClick={handleOpenReorderQueue}>
            <RefreshCcw size={16} /> Auto-Reorder Queue
          </button>
          <button className="btn btn-primary flex-center gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create PO
          </button>
        </div>
      </div>

      <div className="procurement-metrics">
        {dashboardMetrics.map((m, idx) => (
          <div key={idx} className="metric-card procurement">
            <h3>{m.label}</h3>
            <div className="metric-value">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="procurement-table-panel panel p-0">
        <div className="procurement-table-header">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Purchase Orders</h2>
          <div className="procurement-table-actions">
            <div className="procurement-search-bar">
              <Search size={14} className="text-muted" />
              <input type="text" placeholder="Search POs..." />
            </div>
            <button className="btn btn-outline btn-sm"><Filter size={14} /> Filter</button>
          </div>
        </div>
        <table className="procurement-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Value</th>
              <th>Created</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id}>
                <td className="po-number">{po.poNumber}</td>
                <td className="supplier-name">{po.supplier}</td>
                <td>{po.items}</td>
                <td>AED {po.value.toLocaleString()}</td>
                <td>{po.created}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(po.status)}`}>
                    {po.status}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {getActionButton(po)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <div className="flex-between mb-4">
              <h2>New Purchase Order</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              const formData = new FormData(e.currentTarget);
              const supplier = formData.get('supplier') as string;
              const medicine = formData.get('medicine') as string;
              const qty = formData.get('qty') as string;
              
              const newPO: PurchaseOrder = {
                id: `PO-${Date.now()}`,
                poNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                supplier: supplier,
                items: 1,
                value: Math.floor(parseInt(qty || '0') * 12.5),
                created: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                status: 'In Transit'
              };
              
              setPurchaseOrders(prev => [newPO, ...prev]);
              
              try {
                const N8N_WEBHOOK_URL = 'https://soxibetahr.app.n8n.cloud/webhook/pharmacy-po';
                fetch(N8N_WEBHOOK_URL, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    poNumber: newPO.poNumber,
                    supplier: newPO.supplier,
                    medicineName: medicine || 'Manual Entry',
                    sku: 'MANUAL',
                    quantity: qty,
                    totalValue: newPO.value,
                    date: newPO.created
                  }),
                }).catch(() => {});
              } catch (err) {}
              
              setShowCreateModal(false); 
              showNotification("Purchase Order Created Successfully"); 
            }}>
              <div className="form-group">
                <label>Supplier</label>
                <select name="supplier" className="form-control" required>
                  <option value="">Select Vendor...</option>
                  <option value="Gulf Pharma Dist.">Gulf Pharma Dist.</option>
                  <option value="Emirates MedSupply">Emirates MedSupply</option>
                  <option value="Al Nahdi Pharma">Al Nahdi Pharma</option>
                </select>
              </div>
              <div className="form-group">
                <label>Inventory Item</label>
                <div className="search-bar" style={{ width: '100%' }}>
                  <Search size={16} className="text-muted" />
                  <input name="medicine" type="text" placeholder="Search medicines..." />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Quantity</label>
                  <input name="qty" type="number" className="form-control" placeholder="0" required />
                </div>
                <div className="form-group">
                  <label>Expected Delivery</label>
                  <input type="date" className="form-control" />
                </div>
              </div>
              <div className="flex-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Draft</button>
                <button type="submit" className="btn btn-primary">Create PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Reorder Queue Modal */}
      {showReorderQueueModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: '800px' }}>
            <div className="flex-between mb-4">
              <h2><RefreshCcw size={20} /> Auto-Reorder Replenishment Queue</h2>
              <button className="btn-icon" onClick={() => setShowReorderQueueModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-muted mb-4">
              Review low stock and manual reorder requests. Click <strong>Generate PO</strong> to place a purchase order with the appropriate supplier.
            </p>
            <div className="scroll-y-400">
              <table className="inventory-table text-sm">
                <thead>
                  <tr>
                    <th>Item Details</th>
                    <th>Current Stock</th>
                    <th>Suggested Qty</th>
                    <th>Supplier</th>
                    <th>Source</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reorderRequests.map((req, idx) => (
                    <tr key={req.id || idx}>
                      <td>
                        <strong>{req.name}</strong>
                        <div className="text-xs text-muted">SKU: {req.sku}</div>
                      </td>
                      <td>{req.stock} <span className="text-xs text-muted">(RP: {req.reorderPoint})</span></td>
                      <td><strong>{req.qty} units</strong></td>
                      <td>{req.supplier}</td>
                      <td>
                        <span className={`badge ${req.type.includes('Manual') ? 'badge-info' : 'badge-warning'}`} style={{
                          backgroundColor: req.type.includes('Manual') ? '#eff6ff' : '#1d4ed8',
                          color: req.type.includes('Manual') ? '#1d4ed8' : '#ea580c',
                          padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px'
                        }}>
                          {req.type}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => handleGeneratePO(req)}>
                          Generate PO
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reorderRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">
                        No pending reorder requests. Stock levels are stable!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Modal */}
      {showSuppliersModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: '600px' }}>
            <div className="flex-between mb-4">
              <h2>Trusted Suppliers</h2>
              <button className="btn-icon" onClick={() => setShowSuppliersModal(false)}><X size={20} /></button>
            </div>
            <div className="scroll-y-400">
               {[
                 { name: 'Gulf Pharma Dist.', type: 'Local', orders: 124, score: '98%' },
                 { name: 'Emirates MedSupply', type: 'Specialized', orders: 45, score: '95%' },
                 { name: 'Al Nahdi Pharma', type: 'Regional', orders: 89, score: '92%' }
               ].map((s, i) => (
                 <div key={i} className="panel mb-2 p-4 flex-between">
                    <div>
                      <h4 style={{ margin: 0 }}>{s.name}</h4>
                      <p className="text-muted text-sm">{s.type} · {s.orders} Orders</p>
                    </div>
                    <div className="text-success font-bold">{s.score} Reliablity</div>
                 </div>
               ))}
            </div>
            <button className="btn btn-outline w-full mt-4" onClick={() => showNotification("Add supplier flow not implemented", "info")}>Add New Supplier</button>
          </div>
        </div>
      )}

      {/* Review Mismatch Modal */}
      {reviewPO && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '550px', padding: '0', overflow: 'hidden', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            
            {/* Header Area */}
            <div style={{ backgroundColor: '#fef2f2', padding: '1.5rem', borderBottom: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex gap-2" style={{ alignItems: 'center' }}>
                <div style={{ backgroundColor: '#fee2e2', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                  <AlertCircle size={24} color="#dc2626" />
                </div>
                <h2 style={{ color: '#991b1b', margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Invoice Discrepancy</h2>
              </div>
              <button className="btn-icon" style={{ color: '#991b1b', backgroundColor: 'transparent' }} onClick={() => setReviewPO(null)}><X size={20} /></button>
            </div>
            
            {/* Body Area */}
            <div style={{ padding: '1.5rem' }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Supplier</span>
                  <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{reviewPO.supplier}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>PO Number</span>
                  <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{reviewPO.poNumber}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Expected Items</span>
                  <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>{reviewPO.items} Units</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>Billed Amount</span>
                  <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 500 }}>AED {reviewPO.value.toLocaleString()}</span>
                </div>
              </div>

              {/* Error Message Box */}
              <div style={{ backgroundColor: '#fff1f2', borderLeft: '4px solid #e11d48', padding: '1rem', borderRadius: '4px' }}>
                <p style={{ margin: 0, color: '#be123c', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <strong>Critical Match Failure:</strong> The physical items received at the warehouse via the GRN process do not match the quantities billed on the supplier's digital invoice. Immediate resolution is required.
                </p>
              </div>
            </div>

            {/* Footer Area */}
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn" style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', color: '#475569', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 500 }} onClick={() => setReviewPO(null)}>Cancel</button>
              <button className="btn" style={{ backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 500, boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.3)' }} onClick={() => {
                showNotification("Alerting Supplier...");
                fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-mismatch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(reviewPO)
                }).then(() => {
                  showNotification("Supplier notified of discrepancy!");
                  setReviewPO(null);
                }).catch(() => showNotification("Failed to notify supplier", "info"));
              }}>Automate Supplier Alert</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast animate-fade-in ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <Clock size={18} />}
            {toast.message}
        </div>
      )}
    </div>
  );
}
