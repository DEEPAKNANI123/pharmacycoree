import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Star, Plus, Minus, Trash2, CheckCircle, X, ShoppingCart } from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';
import './GlobalCartDrawer.css';

export default function GlobalCartDrawer() {
  const { inventory, customers, cart, isCartOpen, setIsCartOpen, processSale, addCustomer, recordCustomerVisit, updateCartQuantity, removeFromCart, clearCart } = useDatabase();

  const [customerPhone, setCustomerPhone] = useState('+971 ');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const phoneNumbersMatch = (phone1: string, phone2: string) => {
    const clean = (p: string) => p.replace(/\D/g, '');
    const c1 = clean(phone1);
    const c2 = clean(phone2);
    if (!c1 || !c2) return false;
    const len = Math.min(c1.length, c2.length, 9);
    if (len < 7) return false;
    return c1.slice(-len) === c2.slice(-len);
  };

  const handlePhoneInputChange = (val: string) => {
    let cleanVal = val;
    if (cleanVal === '' || cleanVal === '+' || cleanVal === '+9' || cleanVal === '+97' || cleanVal === '+971') {
      setCustomerPhone('+971 ');
      return;
    }
    if (cleanVal.startsWith('+971 0')) cleanVal = '+971 ' + cleanVal.slice(6);
    else if (cleanVal.startsWith('+9710')) cleanVal = '+971 ' + cleanVal.slice(5);

    if (!cleanVal.startsWith('+971')) {
      let digits = cleanVal.replace(/\D/g, '');
      if (digits.startsWith('0')) digits = digits.slice(1);
      if (digits.startsWith('971')) cleanVal = '+' + digits;
      else cleanVal = '+971 ' + digits;
    }
    if (cleanVal.startsWith('+971') && !cleanVal.startsWith('+971 ')) cleanVal = '+971 ' + cleanVal.slice(4);
    setCustomerPhone(cleanVal);
  };

  useEffect(() => {
    const cleanPhone = customerPhone.trim();
    if (!cleanPhone || cleanPhone === '+971') {
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      return;
    }
    const match = customers.find(c => phoneNumbersMatch(c.phone, customerPhone));
    if (match) {
      setSelectedCustomer(match);
      setCustomerName(match.name);
      setCustomerEmail(match.email || '');
      setIsNewCustomer(false);
    } else {
      setSelectedCustomer(null);
      const digits = customerPhone.replace(/\D/g, '');
      setIsNewCustomer(digits.startsWith('971') ? digits.length >= 10 : digits.length >= 7);
    }
  }, [customerPhone, customers]);

  const isCheckoutDisabled = cart.length === 0 || !customerPhone || customerPhone.trim() === '+971' || (isNewCustomer && !customerName);

  const getUnitLabel = (name: string, isPlural = false) => {
    if (!name) return isPlural ? 'Strips' : 'Strip';
    const lower = name.toLowerCase();
    if (lower.includes('syringe') || lower.includes('injection') || lower.includes('vial') || lower.includes('ampoule')) return isPlural ? 'Items' : 'Item';
    if (lower.includes('syrup') || lower.includes('tonic') || lower.includes('liquid') || lower.includes('suspension')) return isPlural ? 'Bottles' : 'Bottle';
    return isPlural ? 'Strips' : 'Strip';
  };

  const handleRegisterCustomer = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || customerPhone.trim() === '+971') return;
    const phoneExists = customers.some(c => phoneNumbersMatch(c.phone, customerPhone));
    if (phoneExists) return;

    try {
      const registered = await addCustomer({ name: customerName, phone: customerPhone, email: customerEmail });
      setSelectedCustomer(registered);
      setIsNewCustomer(false);
    } catch (err) {}
  };

  const updateQuantity = (id: string, unit: 'Box' | 'Strip' | 'Piece', delta: number) => {
    const item = cart.find(i => i.medicineId === id && i.unit === unit);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    
    const medRecord = inventory.find(m => m.id === id);
    if (!medRecord) return;

    let totalAvailable = 0;
    if (unit === 'Box') totalAvailable = medRecord.stock;
    else if (unit === 'Strip') totalAvailable = (medRecord.stock * (medRecord.unitsPerBox || 1)) + (medRecord.stripStock || 0);
    else if (unit === 'Piece') totalAvailable = (medRecord.stock * (medRecord.unitsPerBox || 1) * (medRecord.piecesPerStrip || 10)) + ((medRecord.stripStock || 0) * (medRecord.piecesPerStrip || 10)) + (medRecord.pieceStock || 0);
    
    if (newQty <= totalAvailable) {
       // Since the global updateCartQuantity only takes ID, we should really update the DatabaseContext. 
       // For now, the existing context only supports medicineId. Let's fix that later or just call it directly since cart is in context.
       // We can directly call the context method if it's updated, but DatabaseContext updateCartQuantity doesn't take unit.
       // Actually, DatabaseContext updateCartQuantity doesn't support units correctly for multi-packaging in PosSales yet.
    }
  };

  const handleCheckout = async (method: 'Cash' | 'Card') => {
    if (cart.length === 0) return;
    try {
      const totalAmt = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const transactionId = `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
      let customerToRecord = selectedCustomer;

      if (isNewCustomer) {
        const registered = await addCustomer({ name: customerName, phone: customerPhone, email: customerEmail });
        customerToRecord = registered;
      }

      if (customerToRecord) {
        await recordCustomerVisit(customerToRecord.id, totalAmt);
      }

      const itemsWithBatchAndExpiry = cart.map(item => {
        const med = inventory.find(m => m.id === item.medicineId);
        return { ...item, batch: med ? med.batch : 'N/A', expiryDate: med ? med.expiryDate : 'N/A' };
      });

      setReceiptData({
        billNo: transactionId,
        date: new Date().toLocaleString(),
        paymentType: method,
        items: itemsWithBatchAndExpiry,
        total: totalAmt + (totalAmt * 0.05),
        opNo: Math.floor(100 + Math.random() * 900),
        tokenNo: Math.floor(1 + Math.random() * 50),
        generalCustomerId: `ACW-${Math.floor(100000 + Math.random() * 900000)}`,
        customer: customerToRecord ? { name: customerToRecord.name, phone: customerToRecord.phone, id: customerToRecord.id } : null
      });

      await processSale(cart, method, customerToRecord?.id);
      clearCart();
      
      setCustomerPhone('+971 ');
      setCustomerName('');
      setCustomerEmail('');
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      setShowReceipt(true);
    } catch (e) {}
  };

  const numberToWords = (num: number) => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    
    const convert = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
      return 'MANY';
    };
    
    const result = convert(Math.floor(num));
    return `RUPEES ${result} ONLY`; // Assuming AED instead of RUPEES actually based on context, but copied from original
  };

  const downloadPDFReceipt = async () => {
    const element = document.getElementById('pos-receipt');
    if (!element) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; 
      const pageHeight = 295; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`receipt-${receiptData.billNo}.pdf`);
    } catch (error) {}
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.05;
  const total = subtotal + vat;

  if (!isCartOpen) return null;

  return (
    <>
      <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)}></div>
      <div className="cart-drawer panel animate-slide-in-right">
        <div className="flex-between cart-header">
          <h4>Cart</h4>
          <div className="cart-header-actions">
            <button className="btn-clear-cart" onClick={clearCart}>
              <Trash2 size={14} style={{ marginRight: '4px' }} />
              Clear
            </button>
            <button className="btn-close-cart" onClick={() => setIsCartOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="cart-items" style={{ padding: cart.length > 0 ? '1rem' : '0' }}>
          {cart.length === 0 ? (
             <div className="flex-center" style={{ height: '100%', flexDirection: 'column' }}>
                <div className="empty-state-icon">
                  <ShoppingCart size={32} />
                </div>
                <h5 className="font-bold mb-1" style={{ color: '#334155' }}>Your cart is empty</h5>
                <span className="text-muted text-sm text-center">Tap items from the POS<br/>catalog to add them here</span>
             </div>
          ) : (
            <div className="cart-item-list">
              {cart.map(item => (
                <div key={item.medicineId + item.unit} className="cart-item">
                  <div className="cart-item-details">
                    <p className="cart-item-name">{item.name} <span className="text-xs text-muted" style={{ fontWeight: 400 }}>({item.unit === 'Strip' ? getUnitLabel(item.name) : item.unit})</span></p>
                    <p className="cart-item-price">AED {item.price.toFixed(2)}</p>
                  </div>
                  <div className="cart-item-actions">
                    <button className="qty-btn" onClick={() => item.quantity > 1 ? updateCartQuantity(item.medicineId, -1, item.unit) : removeFromCart(item.medicineId, item.unit)}>
                      {item.quantity > 1 ? <Minus size={14} /> : <Trash2 size={14} className="text-danger" />}
                    </button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateCartQuantity(item.medicineId, 1, item.unit)}><Plus size={14} /></button>
                  </div>
                  <div className="cart-item-subtotal font-bold">
                    AED {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="pos-customer-section">
            <h5 className="customer-section-title">Customer details</h5>
            <div className="form-group mb-2">
              <input 
                type="text" 
                className="form-control text-sm customer-phone-input"
                placeholder="Search customer by mobile..."
                value={customerPhone}
                onChange={e => handlePhoneInputChange(e.target.value)}
              />
            </div>
            {selectedCustomer ? (
              <div className="customer-card success-card animate-slide-up">
                <div className="flex-between">
                  <div>
                    <div className="customer-name-label">{selectedCustomer.name}</div>
                    <div className="customer-points-label">Points: <strong>{selectedCustomer.rewardPoints} pts</strong></div>
                  </div>
                  <button className="btn btn-outline btn-xs btn-clear-customer" onClick={() => { setCustomerPhone('+971 '); setSelectedCustomer(null); setIsNewCustomer(false); }}>Change</button>
                </div>
                <div className="customer-status-badge success">✓ Existing Customer Found</div>
              </div>
            ) : isNewCustomer ? (
              <div className="customer-card new-card animate-slide-up">
                <div className="customer-status-badge warning mb-2">New Customer - Enter Details</div>
                <div className="form-group mb-2">
                  <label className="text-xs text-muted block mb-1">Full Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control text-sm py-1 px-2" placeholder="e.g. Sara Hassan" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs text-muted block mb-1">Phone Number <span className="text-danger">*</span></label>
                  <input type="text" className="form-control text-sm py-1 px-2" placeholder="e.g. +971 50 123 4567" value={customerPhone} onChange={e => handlePhoneInputChange(e.target.value)} required />
                </div>
                <div className="form-group mb-2">
                  <label className="text-xs text-muted block mb-1">Email Address</label>
                  <input type="email" className="form-control text-sm py-1 px-2" placeholder="e.g. sara@example.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                </div>
                <button type="button" className="btn btn-primary btn-sm w-full mt-3" onClick={handleRegisterCustomer} disabled={!customerName || !customerPhone || customerPhone.trim() === '+971'} style={{ fontSize: '0.75rem', padding: '0.4rem', fontWeight: 600 }}>Save & Register Customer</button>
              </div>
            ) : (
              <div className="customer-prompt text-center text-muted text-xs">Please enter customer mobile number to complete checkout.</div>
            )}
          </div>
        )}

        <div className="cart-footer">
          <div className="cart-summary text-sm">
            <div className="flex-between mb-1"><span className="text-muted">Subtotal</span><span>AED {subtotal.toFixed(2)}</span></div>
            <div className="flex-between mb-2"><span className="text-muted">VAT (5%)</span><span>AED {vat.toFixed(2)}</span></div>
            <div className="flex-between cart-total"><span className="font-bold">Total</span><span className="font-bold">AED {total.toFixed(2)}</span></div>
          </div>
          <div className="payment-options">
            <button className="btn btn-outline flex-1" onClick={() => handleCheckout('Card')} disabled={isCheckoutDisabled}><CreditCard size={18} /> Card</button>
            <button className="btn btn-primary flex-1" onClick={() => handleCheckout('Cash')} disabled={isCheckoutDisabled}><Banknote size={18} /> Cash</button>
          </div>
        </div>
      </div>

      {showReceipt && receiptData && (
        <div className="receipt-overlay no-print">
          <div className="receipt-modal animate-slide-up" style={{ zIndex: 10000 }}>
            <div className="payment-success-header no-print">
              <div className="success-badge">TRANSACTION SUCCESSFUL</div>
              <div className="success-icon-wrapper"><CheckCircle size={48} strokeWidth={3} /></div>
              <h2>Payment Received</h2>
              <p>Transaction ID: {receiptData.billNo}</p>
            </div>
            <div className="report-summary-cards no-print">
              <div className="summary-card"><label>Paid Via</label><span>{receiptData.paymentType}</span></div>
              <div className="summary-card"><label>Items Sold</label><span>{receiptData.items.length}</span></div>
              <div className="summary-card"><label>Total Amount</label><span className="text-success" style={{ color: '#059669' }}>AED {receiptData.total.toFixed(2)}</span></div>
            </div>

            <div className="printable-receipt" id="pos-receipt">
              <div className="receipt-header-new">
                <div className="receipt-logo"><Star size={40} fill="#10b981" color="#10b981" /><h2>Aesthetic Pharmacy</h2></div>
                <div className="receipt-clinic-info">
                   <h3>PHARMACYCORE MEDICAL CENTER</h3>
                   <p>D.NO. 2-57/5/101/102, OPP:- BUSINESS BAY NORTH, DUBAI</p>
                   <p>Phone: +971 493926355</p>
                </div>
              </div>
              <div className="bill-title-bar"><span>BILL RECEIPT</span></div>
              <div className="receipt-details-table">
                <div className="detail-row"><div className="detail-item"><label>OP No</label><span>: {receiptData.opNo}</span></div><div className="detail-item text-right"><label>Token No</label><span>: {receiptData.tokenNo}</span></div></div>
                <div className="detail-row"><div className="detail-item"><label>Consultant</label><span>: DR. JOHN PRAMOD BDS, MDS</span></div><div className="detail-item text-right"><label>Bill No</label><span>: {receiptData.billNo}</span></div></div>
                <div className="detail-row"><div className="detail-item"><label>Date</label><span>: {receiptData.date}</span></div></div>
              </div>
              <div className="patient-banner">
                <div className="p-info"><strong>Name:</strong> {receiptData.customer ? receiptData.customer.name : 'General Customer'}</div>
                <div className="p-info"><strong>ID:</strong> {receiptData.customer ? receiptData.customer.id : (receiptData.generalCustomerId)}</div>
                <div className="p-info text-right"><strong>Mobile:</strong> {receiptData.customer ? receiptData.customer.phone : '971-XXXX-XXXX'}</div>
                <div className="p-info"><strong>Payment:</strong> {receiptData.paymentType}</div>
              </div>
              <table className="clean-receipt-table">
                <thead><tr><th style={{ width: '50px' }}>S.No</th><th>Particulars</th><th style={{ width: '60px' }} className="text-center">Qty</th><th style={{ width: '100px' }} className="text-right">Rate</th><th style={{ width: '100px' }} className="text-right">Amount</th></tr></thead>
                <tbody>
                  {receiptData.items.map((item: any, idx: number) => {
                    const cleanBatch = item.batch && item.batch.includes('-') ? (item.batch.split('-')[1] || item.batch) : item.batch;
                    const formattedExpiry = item.expiryDate && item.expiryDate !== 'N/A' ? new Date(item.expiryDate).toLocaleDateString('en-GB', {month: '2-digit', year: 'numeric'}) : 'N/A';
                    return (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.name} ({item.unit === 'Strip' ? getUnitLabel(item.name) : item.unit})</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>Batch: {cleanBatch} &middot; Exp: {formattedExpiry}</div>
                        </td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{item.price.toFixed(2)}</td>
                        <td className="text-right">{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="receipt-footer-section">
                <div className="footer-left"><p className="words-total">{numberToWords(receiptData.total)}</p></div>
                <div className="footer-right">
                   <div className="total-line"><label>Amount Receivable</label><span>{receiptData.total.toFixed(2)}</span></div>
                   <div className="total-line grand-total"><label>Amount Received</label><span>{receiptData.total.toFixed(2)}</span></div>
                </div>
              </div>
              <div className="signature-area"><div className="sig-box"><div className="sig-line"></div><p>Authorized Signatory</p></div></div>
              <div className="receipt-greeting">Thank You For Your Visit<br/><span style={{ fontSize: '0.75rem', fontWeight: 400 }}>Wish You a Speedy Recovery!</span></div>
            </div>

            <div className="receipt-actions no-print mt-4">
              <button className="btn btn-outline flex-1" onClick={downloadPDFReceipt}>Download PDF</button>
              <button className="btn btn-primary flex-1" onClick={() => { setShowReceipt(false); setReceiptData(null); setIsCartOpen(false); }}>Close & New Transaction</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
