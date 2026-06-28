import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { jsPDF } from 'jspdf';
import { Package, Calendar, AlertTriangle, CheckCircle, Download, X, History, Plus, Edit3, ShoppingCart, RefreshCw } from 'lucide-react';
import type { Medicine } from '../../../data/medicinesDB';
import './Inventory.css';

export default function Inventory() {
  const { inventory, updateMedicine, receiveStock } = useDatabase();
  const [filter, setFilter] = useState('All Items');
  
  // Modal States
  const [showReceiveStock, setShowReceiveStock] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCycleCount, setShowCycleCount] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  
  // Form States
  const [receiveQty, setReceiveQty] = useState('');
  const [editValues, setEditValues] = useState<Partial<Medicine>>({});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const today = new Date();
  
  const isExpiringSoon = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const timeDiff = expDate.getTime() - today.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    return daysDiff <= 7 && daysDiff >= 0;
  };

  const isExpired = (dateStr: string) => {
    return new Date(dateStr).getTime() < today.getTime();
  };

  const lowStockItems = useMemo(() => (inventory || []).filter(m => m.stock < 10), [inventory]);
  const expiringItems = useMemo(() => (inventory || []).filter(m => isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate)), [inventory]);
  const totalValue = useMemo(() => (inventory || []).reduce((sum, m) => sum + (m.stock * m.price), 0), [inventory]);

  const filteredInventory = useMemo(() => {
    const data = Array.isArray(inventory) ? inventory : [];
    if (filter === 'All Items') return data;
    if (filter === 'Low Stock') return data.filter(m => m.stock < 10);
    if (filter === 'Expiring Soon') return data.filter(m => isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate));
    if (filter === 'Cold Chain') return data.filter(m => m.category === 'Cold Chain');
    if (filter === 'Controlled') return data.filter(m => m.category === 'Controlled');
    if (filter === 'Perishable') return data.filter(m => m.isPerishable);
    return data;
  }, [filter, inventory]);

  const getStatusBadge = (med: any) => {
    if (!med) return null;
    if (isExpired(med.expiryDate)) return <span className="badge badge-danger">Expired</span>;
    if (isExpiringSoon(med.expiryDate)) return <span className="badge badge-danger" style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}>Expiring Soon</span>;
    if (med.stock === 0) return <span className="badge badge-danger">Out of Stock</span>;
    if (med.stock < 3) return <span className="badge badge-danger" style={{ fontWeight: 'bold' }}>Critical Stock</span>;
    if (med.stock < 10) return <span className="badge badge-warning" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>Low Stock</span>;
    if (med.isPerishable) return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>Perishable</span>;
    if (med.category === 'Controlled') return <span className="badge badge-info" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>Controlled</span>;
    return <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>OK</span>;
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleReceiveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMed && receiveQty) {
        receiveStock(selectedMed.id, parseInt(receiveQty));
        showToast(`Stock updated for ${selectedMed.name}`);
        setShowReceiveStock(false);
        setReceiveQty('');
    }
  };

  const handleUpdateMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMed && editValues) {
        updateMedicine(selectedMed.id, editValues);
        showToast(`${selectedMed.name} updated successfully`);
        setShowManageModal(false);
    }
  };

  const generateExpiryPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("PharmaCore Expiry Inventory Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    doc.line(20, 35, 190, 35);
    
    let y = 45;
    doc.setFont("helvetica", "bold");
    doc.text("Medicine Name", 20, y);
    doc.text("SKU", 80, y);
    doc.text("Expiry", 120, y);
    doc.text("Qty", 150, y);
    doc.text("Status", 170, y);
    doc.line(20, y + 2, 190, y + 2);
    
    doc.setFont("helvetica", "normal");
    y += 10;
    
    expiringItems.forEach(m => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(m.name, 20, y);
        doc.text(m.sku, 80, y);
        doc.text(m.expiryDate, 120, y);
        doc.text(m.stock.toString(), 150, y);
        doc.text(isExpired(m.expiryDate) ? "EXPIRED" : "Expiring", 170, y);
        y += 8;
    });
    
    doc.save(`PharmaCore_Expiry_Report_${Date.now()}.pdf`);
    showToast("PDF Report Downloaded");
  };

  const handleReorder = (med: Medicine) => {
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
  };

  return (
    <div className="inventory-container">
      <div className="flex-between inventory-header">
        <h1>Inventory</h1>
        <div className="inventory-actions">
          <button className="btn btn-outline flex-center gap-2" onClick={() => setShowCycleCount(true)}>
            <RefreshCw size={16} /> Cycle Count
          </button>
          <button className="btn btn-outline flex-center gap-2" onClick={() => { setFilter('Expiring Soon'); generateExpiryPDF(); }}>
            <Download size={16} /> Expiry Report
          </button>
          <button className="btn btn-primary flex-center gap-2" onClick={() => { setSelectedMed(null); setShowReceiveStock(true); }}>
            <Plus size={16} /> Receive Stock
          </button>
        </div>
      </div>

      <div className="inventory-metrics">
        <div className="metric-card panel">
          <p className="metric-title">Total Inventory Value</p>
          <h2 className="metric-value">AED {formatCurrency(totalValue)}</h2>
          <p className="metric-subtitle text-success">Retail Value</p>
        </div>
        <div className="metric-card panel">
          <p className="metric-title">Total SKUs</p>
          <h2 className="metric-value">{inventory.length}</h2>
          <p className="metric-subtitle text-muted">Items tracked</p>
        </div>
        <div className="metric-card panel">
          <p className="metric-title">Low Stock Items</p>
          <h2 className={`metric-value ${lowStockItems.some(i => i.stock < 3) ? 'text-danger' : 'text-warning'}`}>{lowStockItems.length}</h2>
          <p className="metric-subtitle text-muted">Threshold: &lt; 10</p>
        </div>
        <div className="metric-card panel">
          <p className="metric-title">Expiring (7d)</p>
          <h2 className={`metric-value ${expiringItems.length > 0 ? 'text-danger' : 'text-success'}`}>{expiringItems.length}</h2>
          <p className="metric-subtitle text-muted">High urgency</p>
        </div>
      </div>

      <div className="inventory-filters">
        {['All Items', 'Low Stock', 'Expiring Soon', 'Cold Chain', 'Controlled', 'Perishable'].map(f => (
          <button 
            key={f} 
            className={`cat-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="panel p-0 overflow-hidden" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="inventory-table">
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fafafa', zIndex: 10 }}>
            <tr>
              <th>MEDICINE</th>
              <th>BATCH</th>
              <th>QTY ON HAND</th>
              <th>EXPIRY</th>
              <th>STORAGE</th>
              <th>REORDER PT</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map(med => (
              <tr key={med.id}>
                <td>
                  <div className="med-info">
                    <strong>{med.name}</strong>
                    <span className="text-muted">{med.sku} · {med.category}</span>
                  </div>
                </td>
                <td>{med.batch}</td>
                <td className={med.stock < 10 ? 'text-danger font-bold' : med.stock < 20 ? 'text-warning font-medium' : ''}>
                  {med.stock}
                </td>
                <td className={(isExpired(med.expiryDate) || isExpiringSoon(med.expiryDate)) ? 'text-danger font-bold' : ''}>
                  {formatDate(med.expiryDate)}
                </td>
                <td>{med.storage}</td>
                <td>{med.reorderPoint}</td>
                <td>{getStatusBadge(med)}</td>
                <td>
                  <button 
                    className={`btn btn-sm ${med.stock <= med.reorderPoint ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      if (med.stock <= med.reorderPoint) {
                        handleReorder(med);
                      } else {
                        setSelectedMed(med);
                        setEditValues({
                          name: med.name,
                          price: med.price,
                          reorderPoint: med.reorderPoint
                        });
                        setShowManageModal(true);
                      }
                    }}
                  >
                    {med.stock <= med.reorderPoint ? 'Reorder' : 'Manage'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredInventory.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No medicines found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className={`toast animate-fade-in ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <ShoppingCart size={18} />}
            {toast.message}
        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveStock && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up">
            <div className="flex-between mb-4">
              <h2><Plus size={20} /> Receive New Stock</h2>
              <button className="btn-icon" onClick={() => setShowReceiveStock(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleReceiveStock}>
              <div className="form-group">
                <label>Select Medicine</label>
                <select 
                  className="form-control" 
                  value={selectedMed?.id || ''} 
                  onChange={(e) => setSelectedMed(inventory.find(m => m.id === e.target.value) || null)}
                  required
                >
                  <option value="">Choose a medicine...</option>
                  {inventory.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity to Add</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={receiveQty} 
                  onChange={(e) => setReceiveQty(e.target.value)} 
                  placeholder="e.g. 50"
                  required 
                />
              </div>
              <div className="flex-end gap-2 mt-4">
                <button type="button" className="btn btn-outline" onClick={() => setShowReceiveStock(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        value={editValues.name} 
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
                        value={editValues.price} 
                        onChange={(e) => setEditValues({...editValues, price: parseFloat(e.target.value)})}
                    />
                </div>
                <div className="form-group">
                    <label>Reorder Point</label>
                    <input 
                        type="number" 
                        className="form-control" 
                        value={editValues.reorderPoint} 
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

      {/* Cycle Count Modal */}
      {showCycleCount && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{maxWidth: '800px'}}>
            <div className="flex-between mb-4">
              <h2><RefreshCw size={20} /> Inventory Cycle Count</h2>
              <button className="btn-icon" onClick={() => setShowCycleCount(false)}><X size={20} /></button>
            </div>
            <div className="scroll-y-400">
                <table className="inventory-table text-sm">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Current Stock</th>
                            <th>Audit Adjust</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map(m => (
                            <tr key={m.id}>
                                <td>{m.name}</td>
                                <td>{m.stock}</td>
                                <td>
                                    <input 
                                        type="number" 
                                        className="form-control form-control-sm" 
                                        placeholder="New qty"
                                        onBlur={(e) => e.target.value && updateMedicine(m.id, { stock: parseInt(e.target.value) })}
                                    />
                                </td>
                                <td>
                                    <button className="btn btn-sm btn-success" onClick={() => showToast(`Verified ${m.name}`)}>Confirm</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
