import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ScanLine, CreditCard, Banknote, Star, Plus, Minus, Trash2, CheckCircle, X, AlertTriangle, Package, LayoutGrid, List, FileText } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import type { CartItem } from '../../../context/DatabaseContext';
import './PosSales.css';

const QRScanner = lazy(() => import('../../../components/QRScanner'));

export default function PosSales() {
  const { inventory, updateMedicine, addMedicine, rxQueue, users, reviewedAlerts, addToCart: globalAddToCart, updateRxStatus } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'sheet'>('grid');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState<string | null>(null);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.directMedicines && location.state.directMedicines.length > 0) {
      let addedCount = 0;
      location.state.directMedicines.forEach((medId: string) => {
        const med = inventory.find(m => m.id === medId);
        if (med) {
          globalAddToCart(med, 1, 'Box');
          addedCount++;
        }
      });
      if (addedCount > 0) {
        setNotification({ message: `${addedCount} medicines loaded directly from validated prescription!`, type: 'success' });
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ message: 'No matching medicines found in inventory for this prescription.', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
      }
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.openRxModal) {
      setIsRxModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, inventory, globalAddToCart, navigate, location.pathname]);




  const [newMedData, setNewMedData] = useState<{
    name: string;
    category: 'Prescription (Rx)' | 'OTC' | 'Cold Chain' | 'Controlled';
    price: string;
    stock: string;
    stripStock: string;
    unitsPerBox: string;
    pieceStock: string;
    piecesPerStrip: string;
  }>({
    name: '',
    category: 'OTC',
    price: '',
    stock: '10',
    stripStock: '0',
    unitsPerBox: '10',
    pieceStock: '0',
    piecesPerStrip: '10'
  });

  const getUnitLabel = (name: string, isPlural = false) => {
    if (!name) return isPlural ? 'Strips' : 'Strip';
    const lower = name.toLowerCase();
    if (lower.includes('syringe') || lower.includes('injection') || lower.includes('vial') || lower.includes('ampoule')) {
      return isPlural ? 'Items' : 'Item';
    }
    if (lower.includes('syrup') || lower.includes('tonic') || lower.includes('liquid') || lower.includes('suspension')) {
      return isPlural ? 'Bottles' : 'Bottle';
    }
    return isPlural ? 'Strips' : 'Strip';
  };

  const filteredInventory = useMemo(() => {
    const filtered = inventory.filter(med => {
      // If the expired alert for this medicine is dismissed, it has been removed from shelves - exclude from POS
      if (Array.isArray(reviewedAlerts) && reviewedAlerts.includes(`alert-expired-${med.id}`)) {
        return false;
      }

      const matchSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          med.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          med.batch.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchFilter = true;
      if (filter !== 'All') {
        if (filter === 'Prescription (Rx)') matchFilter = med.category === 'Prescription (Rx)';
        else matchFilter = med.category === filter;
      }

      return matchSearch && matchFilter;
    });

    return filtered.sort((a, b) => {
      if (a.id === lastScannedId) return -1;
      if (b.id === lastScannedId) return 1;
      return 0;
    });
  }, [inventory, searchTerm, filter, lastScannedId, reviewedAlerts]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    console.log(`🔔 [NOTIFICATION] ${type.toUpperCase()}: ${message}`);
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const addToCart = (med: any, quantity: number = 1, unit: 'Box' | 'Strip' | 'Piece' = 'Box') => {
    const uPerBox = med.unitsPerBox || 1;
    const pPerStrip = med.piecesPerStrip || 10;
    const totalPiecesAvailable = (med.stock * uPerBox * pPerStrip) + ((med.stripStock || 0) * pPerStrip) + (med.pieceStock || 0);
    
    let piecesRequired = quantity;
    if (unit === 'Box') {
      piecesRequired = quantity * uPerBox * pPerStrip;
    } else if (unit === 'Strip') {
      piecesRequired = quantity * pPerStrip;
    }
    
    if (totalPiecesAvailable < piecesRequired) {
      showNotification(`Insufficient stock for ${med.name}`, 'error');
      return;
    }

    globalAddToCart(med, quantity, unit);
    showNotification(`${med.name} (${unit === 'Strip' ? getUnitLabel(med.name) : unit}) added to cart`);
  };

  const handleScan = async (decodedText: string) => {
    console.log("🔍 [SCANNER] Scanned text:", decodedText);
    const rawText = decodedText.trim();
    setIsScannerOpen(false);
    
    try {
      let data: any = null;
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed === 'object') {
          data = parsed;
        }
      } catch (e) {
        // Not JSON - normal case for plain barcodes
      }

      // 1. JSON-based Medicine Update or Identification
      if (data) {
        console.log("📦 [SCANNER] JSON object detected:", data);
        const skuValue = data.sku || data.Sku || data.SKU || data.id || data.Id || data.ID || data.barcode || data.Barcode;
        const searchKey = String(skuValue || '').trim();
        
        // Even if we don't have a SKU yet, we definitely want to pre-fill the form with what we have
        setNewMedData({
          name: data.name || data.Name || '',
          category: (data.category && ['OTC', 'Prescription (Rx)', 'Cold Chain', 'Controlled'].includes(data.category)) ? data.category : 'OTC',
          price: (data.price || data.Price) ? String(data.price || data.Price) : '',
          stock: (data.stock || data.Stock) ? String(data.stock || data.Stock) : '10',
          stripStock: data.stripStock ? String(data.stripStock) : '0',
          unitsPerBox: data.unitsPerBox ? String(data.unitsPerBox) : '10',
          pieceStock: data.pieceStock ? String(data.pieceStock) : '0',
          piecesPerStrip: data.piecesPerStrip ? String(data.piecesPerStrip) : '10'
        });

        if (searchKey) {
          const med = inventory.find(m => 
            String(m.sku).toLowerCase() === searchKey.toLowerCase() || 
            String(m.stripSku || '').toLowerCase() === searchKey.toLowerCase() ||
            String(m.id).toLowerCase() === searchKey.toLowerCase()
          );
          
          if (med) {
            const scansStrip = String(med.stripSku || '').toLowerCase() === searchKey.toLowerCase();
            const unit: 'Box' | 'Strip' = (scansStrip) ? 'Strip' : 'Box';
            
            const updates: any = {};
            let hasUpdates = false;
            
            if (data.name) { updates.name = data.name; hasUpdates = true; }
            if (data.stock !== undefined) {
              const sCount = Number(data.stock);
              if (!isNaN(sCount)) { updates.stock = sCount; hasUpdates = true; }
            }
            if (data.price !== undefined) {
              const pValue = Number(data.price);
              if (!isNaN(pValue)) { updates.price = pValue; hasUpdates = true; }
            }
            if (data.batch) { updates.batch = data.batch; hasUpdates = true; }
            if (data.expiryDate) { updates.expiryDate = data.expiryDate; hasUpdates = true; }

            if (hasUpdates) {
              console.log("🔄 [SCANNER] Applying updates to DB:", updates);
              await updateMedicine(med.id, updates);
            }

            addToCart(med, 1, unit);
            setLastScannedId(med.id);
            showNotification(`${med.name} (${unit === 'Strip' ? getUnitLabel(med.name) : unit}) added to cart`);
            return;
          } else {
            console.warn("⚠️ [SCANNER] Medicine not found for key:", searchKey);
            setUnrecognizedBarcode(searchKey);
            setIsQuickAdd(true); 
            return;
          }
        } else if (data.name) {
          const fallbackSku = `QR-${Math.floor(Math.random()*1000)}`;
          setUnrecognizedBarcode(fallbackSku);
          setIsQuickAdd(true);
          return;
        }
      }

      // 2. Plain Text or URL Handling
      console.log("📄 [SCANNER] Processing as plain text/URL");
      let sku = rawText;
      const isUrl = sku.startsWith('http');
      
      // Extract SKU from URLs if present
      if (isUrl) {
        const parts = sku.split('/');
        sku = parts[parts.length - 1] || parts[parts.length - 2];
        console.log("🔗 [SCANNER] Extracted SKU from URL:", sku);
      }

      const med = inventory.find(m => 
        String(m.sku).toLowerCase() === sku.toLowerCase() || 
        String(m.stripSku || '').toLowerCase() === sku.toLowerCase() ||
        String(m.id).toLowerCase() === sku.toLowerCase() ||
        String(m.batch).toLowerCase() === sku.toLowerCase()
      );

      if (med) {
        const isStrip = String(med.stripSku || '').toLowerCase() === sku.toLowerCase();
        const unit = isStrip ? 'Strip' : 'Box';
        addToCart(med, 1, unit);
        setLastScannedId(med.id);
        showNotification(`${med.name} (${unit === 'Strip' ? getUnitLabel(med.name) : unit}) added to cart`);
      } else {
        console.warn("⚠️ [SCANNER] Barcode not found:", sku);
        
        if (isUrl) {
           console.log("🌐 [SCANNER] Scraping details from URL via backend...");
           setIsScraping(true);
           try {
             const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
             const res = await fetch(`${API_URL}/api/parse-qr-url`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ url: rawText })
             });
             if (res.ok) {
               const scrapedData = await res.json();
               console.log("✅ [SCANNER] Scraped Data:", scrapedData);
               setNewMedData({ 
                 name: scrapedData.name || '', 
                 category: 'OTC', 
                 price: '', 
                 stock: '10', 
                 stripStock: '0', 
                 unitsPerBox: '10', 
                 pieceStock: '0', 
                 piecesPerStrip: '10' 
               });
               setUnrecognizedBarcode(scrapedData.sku || sku);
               setIsQuickAdd(true);
             } else {
               throw new Error('Scraping failed');
             }
           } catch (error) {
             console.error("❌ [SCANNER] Failed to scrape URL:", error);
             setNewMedData({ name: '', category: 'OTC', price: '', stock: '10', stripStock: '0', unitsPerBox: '10', pieceStock: '0', piecesPerStrip: '10' });
             setUnrecognizedBarcode(sku);
             setIsQuickAdd(true);
           } finally {
             setIsScraping(false);
           }
        } else {
          // RESET form for new unknown barcode
          setNewMedData({ name: '', category: 'OTC', price: '', stock: '10', stripStock: '0', unitsPerBox: '10', pieceStock: '0', piecesPerStrip: '10' });
          setUnrecognizedBarcode(sku);
          setIsQuickAdd(true);
        }
      }
    } catch (err) {
      console.error("❌ [SCANNER] Critical error in handleScan:", err);
      showNotification("Scan error. Please check your data format.", 'error');
    }
  };

  const loadPrescriptionToCart = (rx: any) => {
    if (!rx.associatedMedicines || rx.associatedMedicines.length === 0) {
      showNotification("No medicines associated with this prescription.", "error");
      return;
    }
    
    let addedCount = 0;
    rx.associatedMedicines.forEach((medId: string) => {
      const med = inventory.find(m => m.id === medId);
      if (med) {
        addToCart(med, 1, 'Box');
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      updateRxStatus(rx.id, 'Processed');
      showNotification(`${addedCount} medicines added to cart from prescription.`);
      setIsRxModalOpen(false);
    } else {
      showNotification("Could not find any associated medicines in inventory.", "error");
    }
  };

  const handleAssignBarcode = async (medId: string) => {
    if (!unrecognizedBarcode) return;
    try {
      await updateMedicine(medId, { sku: unrecognizedBarcode });
      const med = inventory.find(m => m.id === medId);
      if (med) {
        addToCart(med, 1, 'Box');
        setLastScannedId(medId);
        showNotification(`Barcode assigned to ${med.name} and added to cart`);
      }
      setUnrecognizedBarcode(null);
      setAssignSearchTerm('');
    } catch (e) {
      showNotification("Failed to assign barcode.", "error");
    }
  };

  const handleQuickAdd = async () => {
    if (!unrecognizedBarcode || !newMedData.name) return;
    try {
      const med = await addMedicine({
        name: newMedData.name,
        sku: unrecognizedBarcode,
        category: newMedData.category,
        batch: `BATCH-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: Number(newMedData.price) || 0,
        purchasePrice: (Number(newMedData.price) || 0) * 0.7,
        stock: Number(newMedData.stock) || 0,
        stripStock: Number(newMedData.stripStock) || 0,
        unitsPerBox: Number(newMedData.unitsPerBox) || 10,
        pieceStock: Number(newMedData.pieceStock) || 0,
        piecesPerStrip: Number(newMedData.piecesPerStrip) || 10,
        stripPrice: (Number(newMedData.price) || 0) / (Number(newMedData.unitsPerBox) || 10),
        piecePrice: ((Number(newMedData.price) || 0) / (Number(newMedData.unitsPerBox) || 10)) / (Number(newMedData.piecesPerStrip) || 10),
        reorderPoint: 5,
        storage: 'Room temp',
        isPerishable: false
      });
      
      addToCart(med, 1, 'Box');
      setLastScannedId(med.id);
      showNotification(`${med.name} added as new product and added to cart`);
      setUnrecognizedBarcode(null);
      setIsQuickAdd(false);
      setNewMedData({ name: '', category: 'OTC', price: '', stock: '10', stripStock: '0', unitsPerBox: '10', pieceStock: '0', piecesPerStrip: '10' });
    } catch (e) {
      showNotification("Failed to add new medicine.", "error");
    }
  };



  const getCategoryBadge = (category: string) => {
    if (category === 'Prescription (Rx)') return <span className="badge badge-warning" style={{ color: '#d97706', backgroundColor: '#fef3c7' }}>Rx</span>;
    if (category === 'OTC') return <span className="badge badge-success">OTC</span>;
    if (category === 'Cold Chain') return <span className="badge badge-info">Cold</span>;
    return <span className="badge badge-danger" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>Ctrl</span>;
  };

  return (
    <div className="pos-container">
      <div className="flex-between pos-header">
        <h1>Point of Sale</h1>
        <div className="pos-actions">
          <button className="btn btn-primary" onClick={() => setIsRxModalOpen(true)}>Prescription Sale</button>
        </div>
      </div>

      <div className="pos-main">
        {notification && (
          <div className={`notification panel ${notification.type}`}>
            {notification.type === 'success' ? (
              <CheckCircle size={20} className="text-success" />
            ) : (
              <AlertTriangle size={20} className="text-danger" />
            )}
            <span>{notification.message}</span>
            <button 
              className="close-notification" 
              onClick={() => setNotification(null)}
            >
              <X size={24} />
            </button>
          </div>
        )}
        <div className="pos-catalog">

          <div className="pos-categories">
            {['All', 'Prescription (Rx)', 'OTC', 'Cold Chain', 'Controlled'].map(cat => (
              <button 
                key={cat} 
                className={`cat-btn ${filter === cat ? 'active' : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pos-search flex-between gap-3">
            <div className="search-input-wrapper">
              <input 
                type="text" 
                placeholder="Scan barcode or search medicine name.." 
                className="large-input" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                  <X size={18} />
                </button>
              )}
            </div>
            <button className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>Search</button>
            <button className="btn btn-outline" onClick={() => setIsScannerOpen(true)}><ScanLine size={18} /> Scan</button>
            <div className="view-toggle" style={{ display: 'flex', background: 'var(--color-bg-app)', padding: '4px', borderRadius: 'var(--radius-lg)' }}>
              <button 
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}`} 
                style={{ padding: '0.4rem 0.6rem', border: 'none', background: viewMode === 'grid' ? 'white' : 'transparent', color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none' }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'sheet' ? 'btn-primary' : ''}`} 
                style={{ padding: '0.4rem 0.6rem', border: 'none', background: viewMode === 'sheet' ? 'white' : 'transparent', color: viewMode === 'sheet' ? 'var(--color-primary)' : 'var(--color-text-muted)', boxShadow: viewMode === 'sheet' ? 'var(--shadow-sm)' : 'none' }}
                onClick={() => setViewMode('sheet')}
                title="Sheet View"
              >
                <List size={18} />
              </button>
            </div>
          </div>

          <div className={viewMode === 'grid' ? 'medicine-grid' : 'medicine-sheet'}>
             {viewMode === 'sheet' && filteredInventory.length > 0 && (
                <div className="sheet-header">
                  <div className="sheet-cell">Name & Details</div>
                  <div className="sheet-cell">Batch / Exp</div>
                  <div className="sheet-cell text-center">Stock Info</div>
                  <div className="sheet-cell text-right">Price</div>
                  <div className="sheet-cell text-center">Actions</div>
                </div>
             )}
             {filteredInventory.map(med => {
               const formatExpiry = new Date(med.expiryDate).toLocaleDateString('en-GB', {month: '2-digit', year: 'numeric'});
               
               if (viewMode === 'sheet') {
                 return (
                    <div key={med.id} className="sheet-row" onClick={() => setExpandedCardId(expandedCardId === med.id ? null : med.id)}>
                      <div className="sheet-cell name-cell flex items-center" style={{ gap: '0.5rem' }}>
                        <strong className="medicine-name-sheet" style={{ marginBottom: 0 }}>{med.name}</strong>
                        <div className="sheet-category-badge">{getCategoryBadge(med.category)}</div>
                      </div>
                     <div className="sheet-cell text-xs text-muted sheet-batch-cell">
                       <div><span className="text-muted-light">B:</span> <span className="font-medium text-main">{med.batch?.includes('-') ? med.batch.split('-')[1] : med.batch || 'N/A'}</span></div>
                       <div><span className="text-muted-light">E:</span> <span className="font-medium text-main">{formatExpiry}</span></div>
                     </div>
                     <div className="sheet-cell stock-cell flex-center">
                       <div className="stock-info-group">
                         <div className="stock-item">
                           <span className="stock-label">Bx</span>
                           <span className="stock-value" style={{color: med.stock < 1 ? 'var(--color-danger)' : 'inherit'}}>{med.stock}</span>
                         </div>
                         <div className="stock-item">
                           <span className="stock-label">Str</span>
                           <span className="stock-value">{med.stripStock || 0}</span>
                         </div>
                         <div className="stock-item">
                           <span className="stock-label">Pc</span>
                           <span className="stock-value">{med.pieceStock || 0}</span>
                         </div>
                       </div>
                     </div>
                     <div className="sheet-cell text-right font-bold text-md text-main">
                       AED {med.price.toFixed(2)}
                     </div>
                     <div className="sheet-cell action-cell flex-center gap-1">
                       <button className="btn-sheet-action" onClick={(e) => { e.stopPropagation(); addToCart(med, 1, 'Box'); }}>+ Bx</button>
                       <button className="btn-sheet-action" onClick={(e) => { e.stopPropagation(); addToCart(med, 1, 'Strip'); }}>+ Str</button>
                       <button className="btn-sheet-action" onClick={(e) => { e.stopPropagation(); addToCart(med, 1, 'Piece'); }}>+ Pc</button>
                     </div>
                   </div>
                 );
               }

               return (
                <div key={med.id} className="medicine-card panel" onClick={() => setExpandedCardId(expandedCardId === med.id ? null : med.id)}>
                  <div className="flex-between">
                    <h4>{med.name}</h4>
                  </div>
                  <p className="medicine-batch text-muted">Batch {med.batch?.includes('-') ? med.batch.split('-')[1] : med.batch || 'N/A'} · Exp {formatExpiry}</p>
                  <div className="stock-badges">
                    <span className="stock-badge" style={{color: med.stock < 1 ? 'var(--color-danger)' : 'inherit'}}>Bx: <strong>{med.stock}</strong></span>
                    <span className="stock-badge">{getUnitLabel(med.name, false)}: <strong>{med.stripStock || 0}</strong></span>
                    <span className="stock-badge">Pcs: <strong>{med.pieceStock || 0}</strong></span>
                  </div>
                  <div className="flex-between medicine-footer">
                    <span className="medicine-price">AED {med.price.toFixed(2)}</span>
                    {getCategoryBadge(med.category)}
                  </div>
                  {expandedCardId === med.id && (
                    <div className="flex-between gap-2 mt-3 animate-slide-up" style={{ animationDuration: '0.15s' }}>
                      <button className="btn btn-sm flex-1" style={{padding:'0.4rem', fontSize:'0.75rem', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontWeight: 600}} onClick={(e) => { e.stopPropagation(); addToCart(med, 1, 'Box'); }}>+ Bx</button>
                      <button className="btn btn-sm flex-1" style={{padding:'0.4rem', fontSize:'0.75rem', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontWeight: 600}} onClick={(e) => { e.stopPropagation(); addToCart(med, 1, 'Strip'); }}>+ {getUnitLabel(med.name, false)}</button>
                      <button className="btn btn-sm flex-1" style={{padding:'0.4rem', fontSize:'0.75rem', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontWeight: 600}} onClick={(e) => { e.stopPropagation(); addToCart(med, 1, 'Piece'); }}>+ Pc</button>
                    </div>
                  )}
                </div>
               );
             })}
             {filteredInventory.length === 0 && <p className="text-muted p-4">No medicines match your search.</p>}
          </div>
        </div>
      </div>

      {unrecognizedBarcode && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: '550px', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div className="flex-between" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ color: '#111827', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                   {isQuickAdd ? 'Add New Product' : 'Unrecognized Barcode'}
                </h2>
                <p className="text-sm text-muted mt-1">Barcode: <strong style={{ color: '#4f46e5' }}>{unrecognizedBarcode}</strong></p>
              </div>
              <button className="btn-icon" style={{ background: '#f3f4f6', borderRadius: '50%', padding: '0.5rem' }} onClick={() => { setUnrecognizedBarcode(null); setIsQuickAdd(false); }}><X size={18} color="#4b5563" /></button>
            </div>
            
            {isQuickAdd ? (
              <div className="quick-add-form" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Medicine Name <span className="text-danger">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter full medicine name (e.g., Panadol 500mg)"
                    value={newMedData.name}
                    onChange={e => setNewMedData({...newMedData, name: e.target.value})}
                    autoFocus
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', transition: 'border-color 0.2s', fontSize: '0.95rem' }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Category</label>
                    <select 
                      className="form-control"
                      value={newMedData.category}
                      onChange={e => setNewMedData({...newMedData, category: e.target.value as any})}
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', fontSize: '0.95rem' }}
                    >
                      <option>OTC</option>
                      <option>Prescription (Rx)</option>
                      <option>Cold Chain</option>
                      <option>Controlled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>Sales Price <span className="text-danger">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>AED</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="0.00"
                        value={newMedData.price}
                        onChange={e => setNewMedData({...newMedData, price: e.target.value})}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                   <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Package size={16} className="text-primary" /> Inventory & Stock Details
                   </h4>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                     <div className="form-group">
                       <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Box Stock</label>
                       <input 
                         type="number" 
                         className="form-control" 
                         placeholder="0"
                         value={newMedData.stock}
                         onChange={e => setNewMedData({...newMedData, stock: e.target.value})}
                         style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                       />
                     </div>
                     <div className="form-group">
                       <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Units per Box ({getUnitLabel(newMedData.name, true)})</label>
                       <input 
                         type="number" 
                         className="form-control" 
                         placeholder="1"
                         value={newMedData.unitsPerBox}
                         onChange={e => setNewMedData({...newMedData, unitsPerBox: e.target.value})}
                         style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                       />
                     </div>
                   </div>

                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                     <div className="form-group">
                       <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Loose {getUnitLabel(newMedData.name, true)}</label>
                       <input 
                         type="number" 
                         className="form-control" 
                         placeholder="0"
                         value={newMedData.stripStock}
                         onChange={e => setNewMedData({...newMedData, stripStock: e.target.value})}
                         style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                       />
                     </div>
                     <div className="form-group">
                       <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Loose Pieces</label>
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <input 
                           type="number" 
                           className="form-control" 
                           placeholder="Qty"
                           value={newMedData.pieceStock}
                           onChange={e => setNewMedData({...newMedData, pieceStock: e.target.value})}
                           style={{ width: '50%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                         />
                         <input 
                           type="number" 
                           className="form-control" 
                           placeholder={`Pcs / ${getUnitLabel(newMedData.name, false)}`}
                           title={`Pieces in 1 ${getUnitLabel(newMedData.name, false)}`}
                           value={newMedData.piecesPerStrip}
                           onChange={e => setNewMedData({...newMedData, piecesPerStrip: e.target.value})}
                           style={{ width: '50%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                         />
                       </div>
                     </div>
                   </div>
                </div>

                <div className="flex-between mt-2 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <button className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', fontWeight: 600, borderRadius: '8px', color: '#4b5563', borderColor: '#d1d5db' }} onClick={() => setIsQuickAdd(false)}>Back to Assign</button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.75rem 2rem', fontWeight: 600, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (!newMedData.name || !newMedData.price) ? 0.5 : 1 }}
                    onClick={handleQuickAdd}
                    disabled={!newMedData.name || !newMedData.price}
                  >
                    <Plus size={18} /> Save & Add to Cart
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm">This barcode is not in your inventory. You can assign it to an existing medicine or add it as a new product.</p>
                
                <div className="flex gap-2 mb-4">
                  <button 
                    className="btn btn-primary flex-1" 
                    onClick={() => setIsQuickAdd(true)}
                  >
                    + Add as New Medicine
                  </button>
                </div>

                <div className="divider mb-4"><span className="text-xs text-muted">OR ASSIGN TO EXISTING</span></div>

                <input 
                  type="text" 
                  className="form-control mb-4" 
                  placeholder="Search medicine name to assign..."
                  value={assignSearchTerm}
                  onChange={e => setAssignSearchTerm(e.target.value)}
                />

                <div className="assign-list scroll-y-400">
                  {inventory
                    .filter(m => m.name.toLowerCase().includes(assignSearchTerm.toLowerCase()))
                    .slice(0, 5)
                    .map(med => (
                      <div key={med.id} className="assign-item panel mb-2" onClick={() => handleAssignBarcode(med.id)}>
                        <div className="flex-between">
                          <div>
                            <strong>{med.name}</strong>
                            <p className="text-xs text-muted">Current SKU: {med.sku}</p>
                          </div>
                          <button className="btn btn-sm btn-primary">Assign</button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isScannerOpen && (
        <Suspense fallback={<div className="qr-scanner-overlay"><div className="qr-scanner-modal">Loading scanner...</div></div>}>
          <QRScanner 
            onScan={handleScan}
            onClose={() => setIsScannerOpen(false)}
          />
        </Suspense>
      )}

      {/* Prescription Sale Modal */}
      {isRxModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide-up" style={{ maxWidth: '600px' }}>
            <div className="flex-between mb-4">
              <h2>Approved Prescriptions</h2>
              <button className="btn-icon" onClick={() => setIsRxModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="rx-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {rxQueue.filter(rx => rx.status === 'Approved').length === 0 ? (
                <p className="text-muted text-center py-4">No approved prescriptions available.</p>
              ) : (
                rxQueue.filter(rx => rx.status === 'Approved').map(rx => {
                  const user = users.find(u => u.id === rx.userId);
                  return (
                    <div key={rx.id} className="panel mb-3 flex-between align-center" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', backgroundColor: 'white' }}>
                      <div className="flex-align-center gap-3">
                        <div style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', padding: '0.75rem', borderRadius: '10px', display: 'flex' }}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--color-text)', display: 'block' }}>{user?.name || 'General Patient'}</strong>
                          <p className="text-sm text-muted mt-1" style={{ margin: '4px 0' }}>Submitted: {new Date(rx.date).toLocaleString()}</p>
                          <div className="flex-align-center mt-2" style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
                            <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                              {rx.associatedMedicines?.length || 0} medicines
                            </span>
                            {(!rx.associatedMedicines || rx.associatedMedicines.length === 0) ? (
                               <span className="text-xs text-danger" style={{ fontWeight: 500 }}>Requires manual entry</span>
                            ) : (
                               <span className="text-xs text-muted" style={{ fontWeight: 500, maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                 {rx.associatedMedicines.map(id => inventory.find(m => m.id === id)?.name).filter(Boolean).join(', ')}
                               </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: '600' }}
                        onClick={() => loadPrescriptionToCart(rx)}
                        disabled={!rx.associatedMedicines || rx.associatedMedicines.length === 0}
                      >
                        Load to Cart
                      </button>
                    </div>
                  )
                })
              )}
              {isScraping && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <h3>Fetching Medicine Details...</h3>
            <p className="text-muted mt-2">Extracting product data from the QR Code URL.</p>
          </div>
        </div>
      )}

    </div>
          </div>
        </div>
      )}

    </div>
  );
}
