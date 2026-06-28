import { useState, useMemo } from 'react';
import { Plus, Wallet, Landmark, Receipt, CreditCard, ArrowRightLeft, CheckSquare, FileText, CheckCircle, AlertCircle, Loader2, Coins } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import './Treasury.css';

export default function Treasury() {
  const { transactions: posTransactions } = useDatabase();
  const [bankBalance, setBankBalance] = useState(214800);
  const [codBalance, setCodBalance] = useState(4200);
  const [payables, setPayables] = useState(31500);

  const [manualTransactions, setManualTransactions] = useState<{id: number|string, desc: string, date: string, amount: number, type: string}[]>([
    { id: 2, desc: 'Supplier — Gulf Pharma', date: 'Apr 8', amount: -18000, type: 'out' },
    { id: 3, desc: 'Online Order Settlement', date: 'Apr 8', amount: 3180, type: 'in' }
  ]);

  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  
  const todayPosTx = useMemo(() => {
    return posTransactions.filter(tx => new Date(tx.date) >= todayStart);
  }, [posTransactions]);

  const todayCashSales = useMemo(() => {
    return todayPosTx.filter(tx => tx.paymentMethod === 'Cash' || tx.paymentMethod === 'COD' as any).reduce((sum, tx) => sum + tx.total, 0);
  }, [todayPosTx]);

  const todayCardSales = useMemo(() => {
    return todayPosTx.filter(tx => tx.paymentMethod === 'Card').reduce((sum, tx) => sum + tx.total, 0);
  }, [todayPosTx]);

  // Derived unified transactions list
  const unifiedTransactions = useMemo(() => {
    const formattedPos = posTransactions.map(tx => ({
      id: tx.id,
      desc: `POS Sale (${tx.paymentMethod})`,
      date: new Date(tx.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
      amount: tx.total,
      type: 'in'
    }));
    return [...formattedPos, ...manualTransactions].sort((a, b) => {
      // Very basic sort assuming newer are added to top or we parse dates. Since it's a mix of mock and real, we just put POS first for today, then mock
      return 0; // Keeping it simple for the MVP, manual tx will be prepended by state setter
    });
  }, [posTransactions, manualTransactions]);

  const [cashOnHand, setCashOnHand] = useState(28400 + todayCashSales);

  const [upcomingInvoices, setUpcomingInvoices] = useState([
    { id: '4401', supplier: 'Emirates MedSupply', dueDate: 'Apr 12', amount: 8200 },
    { id: 'VAT', supplier: 'VAT Return Q1 2026', dueDate: 'Apr 16', amount: 14820, urgent: true },
    { id: '8820', supplier: 'Al Nahdi Pharma', dueDate: 'Apr 20', amount: 9300 }
  ]);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [count100, setCount100] = useState('');
  const [count50, setCount50] = useState('');
  const [count10, setCount10] = useState('');
  const [reconcileResult, setReconcileResult] = useState<{variance: number, total: number} | null>(null);

  const formatCurrency = (val: number) => `AED ${val.toLocaleString()}`;
  const formatAbsCurrency = (val: number) => `AED ${Math.abs(val).toLocaleString()}`;

  const handleTransfer = () => {
    const amt = parseFloat(transferAmount);
    if (amt > 0 && amt <= cashOnHand) {
      setCashOnHand(prev => prev - amt);
      setBankBalance(prev => prev + amt);
      setManualTransactions(prev => [{ id: Date.now(), desc: 'Cash Deposit to Bank', date: 'Just now', amount: -amt, type: 'out' }, ...prev]);
      setShowTransferModal(false);
      setTransferAmount('');
    }
  };

  const handleExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (amt > 0 && expenseDesc) {
      setCashOnHand(prev => prev - amt);
      setManualTransactions(prev => [{ id: Date.now(), desc: `Petty Cash: ${expenseDesc}`, date: 'Just now', amount: -amt, type: 'out' }, ...prev]);
      setShowExpenseModal(false);
      setExpenseDesc('');
      setExpenseAmount('');
    }
  };

  const calculateReconciliation = () => {
    const total = (parseInt(count100 || '0') * 100) + (parseInt(count50 || '0') * 50) + (parseInt(count10 || '0') * 10);
    setReconcileResult({ total, variance: total - cashOnHand });
  };

  const handleReconcileSubmit = () => {
    if (reconcileResult) {
      setCashOnHand(reconcileResult.total); // adjust to physical count
      setManualTransactions(prev => [{ id: Date.now(), desc: 'Register Reconciliation', date: 'Just now', amount: reconcileResult.variance, type: reconcileResult.variance >= 0 ? 'in' : 'out' }, ...prev]);
      setShowReconcileModal(false);
      setReconcileResult(null);
      setCount100(''); setCount50(''); setCount10('');
    }
  };

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const handlePayInvoice = async (invId: string, amount: number, supplier: string) => {
    if (bankBalance < amount) {
      alert("Insufficient Bank Balance to pay this invoice.");
      return;
    }

    setPayingInvoiceId(invId);
    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-payment-clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invId,
          supplier: supplier,
          amount: amount,
          paymentDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        })
      });
      alert(`Bank Clearance Successful! Invoice #${invId} paid and remittance advice sent.`);
    } catch (e) {
      console.error("Clearance webhook failed, settling locally:", e);
      alert(`Payment settled locally. (n8n clearance notification offline)`);
    }

    setBankBalance(prev => prev - amount);
    setPayables(prev => prev - amount);
    setUpcomingInvoices(prev => prev.filter(inv => inv.id !== invId));
    setManualTransactions(prev => [
      { id: Date.now(), desc: `AP Payment: Inv #${invId} (${supplier})`, date: 'Just now', amount: -amount, type: 'out' },
      ...prev
    ]);
    setPayingInvoiceId(null);
  };

  return (
    <div className="treasury-container">
      <div className="treasury-header" style={{ marginBottom: '1.5rem' }}>
        <h1>Treasury & Cash</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary flex-center gap-2" onClick={() => setShowReconcileModal(true)} style={{ background: '#f1f5f9', color: '#334155', border: 'none' }}>
            <CheckSquare size={18} /> Reconcile Register
          </button>
          <button className="btn btn-secondary flex-center gap-2" onClick={() => setShowTransferModal(true)} style={{ background: '#f1f5f9', color: '#334155', border: 'none' }}>
            <ArrowRightLeft size={18} /> Bank Deposit
          </button>
          <button className="btn btn-primary flex-center gap-2" onClick={() => setShowExpenseModal(true)}>
            <Plus size={18} /> Log Expense
          </button>
        </div>
      </div>

      <div className="treasury-grid">
        <div className="treasury-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Wallet className="text-primary" size={20} />
            <span className="text-muted text-sm font-bold">Cash on Hand</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ margin: 0, color: '#0f172a' }}>{formatCurrency(cashOnHand)}</h2>
        </div>
        <div className="treasury-panel" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Coins className="text-success" size={20} />
            <span className="text-muted text-sm font-bold">Today's Cash Sales</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ margin: 0, color: '#166534' }}>{formatCurrency(todayCashSales)}</h2>
        </div>
        <div className="treasury-panel" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CreditCard className="text-primary" size={20} />
            <span className="text-muted text-sm font-bold">Today's Card Sales</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ margin: 0, color: '#1e40af' }}>{formatCurrency(todayCardSales)}</h2>
        </div>
        <div className="treasury-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Landmark className="text-success" size={20} />
            <span className="text-muted text-sm font-bold">Bank Balance</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ margin: 0, color: '#0f172a' }}>{formatCurrency(bankBalance)}</h2>
        </div>
        <div className="treasury-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Receipt className="text-warning" size={20} />
            <span className="text-muted text-sm font-bold">COD to Reconcile</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ margin: 0, color: '#d97706' }}>{formatCurrency(codBalance)}</h2>
        </div>
        <div className="treasury-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CreditCard className="text-danger" size={20} />
            <span className="text-muted text-sm font-bold">Payables (7d)</span>
          </div>
          <h2 className="text-2xl font-bold" style={{ margin: 0, color: '#dc2626' }}>{formatCurrency(payables)}</h2>
        </div>
      </div>

      <div className="treasury-list-grid">
        <div className="treasury-panel">
          <h3 className="text-sm font-bold mb-4 opacity-70">Recent Transactions</h3>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Description</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {unifiedTransactions.map(txn => (
                <tr key={txn.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>{txn.desc}</td>
                  <td style={{ padding: '1rem', color: '#475569' }}>{txn.date}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <span style={{ 
                      color: txn.type === 'in' ? '#166534' : '#991b1b', 
                      fontWeight: 600, 
                      background: txn.type === 'in' ? '#dcfce7' : '#fee2e2', 
                      padding: '0.25rem 0.6rem', 
                      borderRadius: '6px' 
                    }}>
                      {txn.type === 'in' ? '+' : '-'}{formatAbsCurrency(txn.amount)}
                    </span>
                  </td>
                </tr>
              ))}
              {unifiedTransactions.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No recent transactions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="treasury-panel">
          <h3 className="text-sm font-bold mb-4 opacity-70">Upcoming Payments</h3>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Invoice</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Due Date</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingInvoices.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>{inv.supplier} #{inv.id}</td>
                  <td style={{ padding: '1rem', color: inv.urgent ? '#dc2626' : '#475569', fontWeight: inv.urgent ? 600 : 400 }}>{inv.dueDate}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: inv.urgent ? '#dc2626' : '#0f172a' }}>{formatCurrency(inv.amount)}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => handlePayInvoice(inv.id, inv.amount, inv.supplier)}
                      disabled={payingInvoiceId === inv.id}
                      style={{ 
                        background: payingInvoiceId === inv.id ? '#94a3b8' : '#2563eb', 
                        color: 'white', 
                        border: 'none', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        cursor: payingInvoiceId === inv.id ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        justifyContent: 'center',
                        minWidth: '80px'
                      }}>
                      {payingInvoiceId === inv.id ? (
                        <>
                          <Loader2 size={12} className="spinner" />
                          Paying...
                        </>
                      ) : "Pay Now"}
                    </button>
                  </td>
                </tr>
              ))}
              {upcomingInvoices.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>All invoices paid up!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      
      {/* 1. Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Bank Deposit</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Transfer funds from the physical till to the bank.</p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Amount to Deposit (AED)</label>
              <input type="number" className="form-input" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0.00" />
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>Max available: {formatCurrency(cashOnHand)}</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowTransferModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleTransfer} disabled={!transferAmount || parseFloat(transferAmount) > cashOnHand}>Confirm Deposit</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Log Petty Cash Expense</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Deduct operational expenses from the till.</p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Description</label>
              <input type="text" className="form-input" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="e.g. Printer Paper" />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Amount (AED)</label>
              <input type="number" className="form-input" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowExpenseModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExpense} disabled={!expenseDesc || !expenseAmount}>Log Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reconcile Modal */}
      {showReconcileModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>End of Day Reconciliation</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Count the physical cash in the drawer.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>x 100 AED Notes</label>
                <input type="number" className="form-input" value={count100} onChange={e => setCount100(e.target.value)} placeholder="Count" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>x 50 AED Notes</label>
                <input type="number" className="form-input" value={count50} onChange={e => setCount50(e.target.value)} placeholder="Count" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>x 10 AED Notes</label>
                <input type="number" className="form-input" value={count10} onChange={e => setCount10(e.target.value)} placeholder="Count" />
              </div>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} onClick={calculateReconciliation}>
              Calculate Total
            </button>

            {reconcileResult && (
              <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Expected System Total:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(cashOnHand)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#64748b' }}>Physical Count Total:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(reconcileResult.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1', marginTop: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Variance:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: reconcileResult.variance === 0 ? '#16a34a' : '#dc2626' 
                  }}>
                    {reconcileResult.variance > 0 ? '+' : ''}{formatCurrency(reconcileResult.variance)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                setShowReconcileModal(false); setReconcileResult(null); setCount100(''); setCount50(''); setCount10('');
              }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleReconcileSubmit} disabled={!reconcileResult}>Finalize Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
