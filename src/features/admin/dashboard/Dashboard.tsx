import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../../context/DatabaseContext';
import { jsPDF } from 'jspdf';
import { Sparkles, Loader2, Download, X, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { inventory, transactions, orders, currentUser, rxQueue, users, updateRxStatus, updateOrderStatus } = useDatabase();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

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

  // Metrics Logic
  const todayTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.toDateString() === today.toDateString();
    });
  }, [transactions]);

  const revenueToday = todayTransactions.reduce((sum, t) => sum + t.total, 0);
  const ordersToday = todayTransactions.length;

  const lowStockItems = inventory.filter(m => m.stock < 10);
  const expiringItems = inventory.filter(m => isExpiringSoon(m.expiryDate) || isExpired(m.expiryDate));
  const perishableItems = inventory.filter(m => m.isPerishable);

  // Unified Financial Variables
  const financialStats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalCOGS = transactions.reduce((sum, t) => {
      const txnCOGS = t.items.reduce((itemSum, item) => itemSum + ((item.purchasePrice || 0) * item.quantity), 0);
      return sum + txnCOGS;
    }, 0);
    const totalProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const currentInventoryValue = inventory.reduce((sum, m) => sum + (m.purchasePrice * m.stock), 0);
    
    // Assume transaction data represents ~1 month. Annualize COGS for "turns/year" metric.
    const inventoryTurnover = currentInventoryValue > 0 ? (totalCOGS * 12) / currentInventoryValue : 0;

    return { totalRevenue, totalCOGS, totalProfit, profitMargin, currentInventoryValue, inventoryTurnover };
  }, [transactions, inventory]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    // 1. Average Fill Time
    const processedRx = rxQueue.filter(rx => rx.processedAt && (rx.createdAt || rx.date));
    const totalFillTime = processedRx.reduce((acc, rx) => {
      const start = new Date(rx.createdAt || rx.date).getTime();
      const end = new Date(rx.processedAt!).getTime();
      return acc + (end - start);
    }, 0);
    const avgFillTimeMinutes = processedRx.length > 0 ? Math.round((totalFillTime / processedRx.length) / 60000) : 0;

    // 2. Refill Completion Rate
    const refillRx = rxQueue.filter(rx => rx.isRefill);
    const completedRefills = refillRx.filter(rx => rx.status === 'Picked Up');
    const refillCompletionRate = refillRx.length > 0 ? Math.round((completedRefills.length / refillRx.length) * 100) : 0;

    // 3. Return-to-Stock %
    const filledRx = rxQueue.filter(rx => ['Processed', 'Picked Up', 'Returned to Stock'].includes(rx.status));
    const returnedRx = filledRx.filter(rx => rx.status === 'Returned to Stock');
    const rtsPercent = filledRx.length > 0 ? Math.round((returnedRx.length / filledRx.length) * 100) : 0;

    // 4. Prescriptions per Employee/Hour
    // Assuming a standard 8-hour shift and 2 staff members = 16 hours
    const STAFF_HOURS = 16;
    const todayProcessed = processedRx.filter(rx => new Date(rx.processedAt!).toDateString() === new Date().toDateString());
    const rxPerStaffHour = Number((todayProcessed.length / STAFF_HOURS).toFixed(1));

    // 5. Refill Request Backlog
    const pendingRefills = rxQueue.filter(rx => rx.isRefill && !['Processed', 'Picked Up', 'Returned to Stock', 'Rejected'].includes(rx.status));
    const refillBacklog = pendingRefills.length;

    // 6. Medication Adherence Rate (Simulated based on Refill Completion for MVP)
    // In a real app, this would be calculated from patient survey data and precise refill gaps.
    const adherenceRate = refillCompletionRate > 0 ? Math.min(100, Math.round(refillCompletionRate + 8)) : 92;

    // 7. Patient Satisfaction Score (Simulated: out of 5)
    const patientSatisfactionScore = 4.6;

    // 7b. Net Promoter Score (NPS)
    const npsScore = 42;

    // 8. Reduction in ER Visits (Simulated: YoY %)
    const erVisitReduction = 14;

    // 9. Refill Reminder Pickup Rate (Simulated based on Refill Completion)
    const refillReminderPickupRate = refillCompletionRate > 0 ? Math.min(100, Math.round(refillCompletionRate + 5)) : 82;

    // 10. Prescription Abandonment Rate (Simulated based on RTS)
    const rxAbandonmentRate = rtsPercent > 0 ? rtsPercent : 3;

    // 11. Drug Interaction Alert Response (Safety - strict 100%)
    const drugInteractionResponse = 100;

    // 12. App Health: DAU (Mocked)
    const dau = 1240;

    // 13. App Health: Stickiness DAU/MAU (Mocked)
    const stickinessRatio = 24;

    // 14. App Health: Session Duration in minutes (Mocked)
    const sessionDuration = 3.5;

    // 15. App Health: Day-7 / Day-30 Retention (Mocked)
    const retentionD7 = 45;
    const retentionD30 = 28;

    // 16. App Health: Churn Rate (Mocked)
    const churnRate = 3.2;

    // 17. App Health: In-App Purchases / Conversions (Mocked)
    const inAppConversions = 6.5;

    // 18. App Health: Feature Adoption Rate (Mocked)
    const featureAdoption = 34;

    // 19. Business & Financial: Repeat Customer Rate (Mocked)
    const repeatCustomerRate = 74;

    // 20. Business & Financial: Customer Lifetime Value (Mocked)
    const clv = 4250;

    return { 
      avgFillTimeMinutes, refillCompletionRate, rtsPercent, rxPerStaffHour, refillBacklog, adherenceRate,
      patientSatisfactionScore, npsScore, erVisitReduction, refillReminderPickupRate, rxAbandonmentRate, drugInteractionResponse,
      dau, stickinessRatio, sessionDuration, retentionD7, retentionD30, churnRate, inAppConversions, featureAdoption,
      repeatCustomerRate, clv
    };
  }, [rxQueue]);

  // Dynamic Alerts
  const alerts = useMemo(() => {
    const list: any[] = [];
    
    // Add real low stock and critical stock alerts
    lowStockItems.slice(0, 5).forEach(item => {
      const isCritical = item.stock < 3;
      list.push({
        type: isCritical ? 'Critical Stock' : 'Low Stock',
        badgeClass: isCritical ? 'badge-danger' : 'badge-warning',
        style: isCritical ? { backgroundColor: '#fee2e2', color: '#dc2626' } : { backgroundColor: '#ffedd5', color: '#ea580c' },
        title: `${item.name} — ${item.stock} units remaining`,
        desc: isCritical ? 'Immediate reorder required!' : `Stock is low (Threshold: 10)`
      });
    });

    // Add perishable storage alerts
    perishableItems.slice(0, 3).forEach(item => {
      list.push({
        type: 'Storage Alert',
        badgeClass: 'badge-info',
        style: { backgroundColor: '#eff6ff', color: '#1d4ed8' },
        title: `${item.name} — Perishable Item`,
        desc: `Ensure proper ${item.storage} storage conditions.`
      });
    });

    // Add real expiring alerts
    expiringItems.slice(0, 4).forEach(item => {
      list.push({
        type: isExpired(item.expiryDate) ? 'Expired' : 'Expiring Soon',
        badgeClass: 'badge-danger',
        style: {},
        title: `${item.name} — Batch ${item.batch?.split('-')[1] || 'Unknown'}`,
        desc: isExpired(item.expiryDate) ? 'Remove from inventory!' : `Expires in less than 7 days`
      });
    });
    
    // Add compliance alert for aesthetic filler if list is small
    if (list.length < 3) {
      list.push({
          type: 'Compliance',
          badgeClass: 'badge-info',
          style: {},
          title: `VAT Return Q2 2026 due soon`,
          desc: `Net payable tracking based on recent sales`
      });
    }
    
    return list;
  }, [lowStockItems, expiringItems]);

  // Sales By Category logic
  const salesByCategory = useMemo(() => {
    const totals: Record<string, number> = {
      'Prescription (Rx)': 0,
      'OTC': 0,
      'Cold Chain': 0,
      'Controlled': 0
    };
    
    let totalSales = 0;
    
    todayTransactions.forEach(t => {
      t.items.forEach(item => {
        const val = item.price * item.quantity;
        if (totals[item.category] !== undefined) {
          totals[item.category] += val;
        } else {
          totals['OTC'] += val; // Fallback
        }
        totalSales += val;
      });
    });
    
    return { totals, totalSales };
  }, [todayTransactions]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const getCatPercent = (catTotal: number) => {
    if (salesByCategory.totalSales === 0) return 0;
    return (catTotal / salesByCategory.totalSales) * 100;
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    setError(null);
    setReport(null);

    const dataContext = {
      revenue: financialStats.totalRevenue,
      profit: financialStats.totalProfit,
      margin: financialStats.profitMargin.toFixed(2) + '%',
      inventoryValue: financialStats.currentInventoryValue,
      totalSKUs: inventory.length,
      criticalStock: inventory.filter(m => m.stock < 3).map(m => `${m.name} (${m.stock})`),
      expiringSoon: inventory.filter(m => isExpiringSoon(m.expiryDate)).map(m => `${m.name} (${m.expiryDate})`),
      expired: inventory.filter(m => isExpired(m.expiryDate)).map(m => m.name),
      perishables: perishableItems.length
    };

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: "system",
              content: "You are a senior pharmaceutical business analyst. Provide a structured report. Use Markdown formatting. Sections: Financial Health, Inventory Risks, Expiry Management, and Recommendations."
            },
            {
              role: "user",
              content: `Analyze this data: ${JSON.stringify(dataContext)}`
            }
          ],
          max_tokens: 1000
        })
      });

      if (!response.ok) throw new Error('AI analysis failed.');
      const data = await response.json();
      setReport(data.choices[0].message.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("PharmaCore Business Insights Report", 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    doc.line(20, 35, 190, 35);
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(report.replace(/#/g, '').replace(/\*/g, ''), 170);
    doc.text(splitText, 20, 45);
    doc.save(`PharmaCore_Insights_${Date.now()}.pdf`);
  };

  return (
    <div className="dashboard">
      <div className="flex-between dashboard-header">
        <h1>Hello Admin</h1>
        <div className="dashboard-actions">
           <button 
             className="btn btn-primary flex-center gap-2" 
             onClick={generateInsights}
             disabled={isGenerating}
           >
             {isGenerating ? <Loader2 size={16} className="spinner" /> : <Sparkles size={16} />}
             Generate Insights
           </button>
          <button className="btn btn-outline" style={{ display: 'none' }}>Export Report</button>
        </div>
      </div>

      <div className="metric-cards">
        <div className="metric-card panel clickable" onClick={() => navigate('/admin/pos')}>
          <p className="metric-title">Today's Revenue</p>
          <h2 className="metric-value">AED {formatCurrency(revenueToday)}</h2>
          <div className="flex-between text-xs mt-1">
             <span className="text-muted">Profit: AED {formatCurrency(financialStats.totalProfit)}</span>
             <span className="text-success">{financialStats.profitMargin.toFixed(1)}%</span>
          </div>
        </div>
        <div className="metric-card panel clickable" onClick={() => navigate('/admin/inventory')}>
          <p className="metric-title">Inventory Value</p>
          <h2 className="metric-value">AED {formatCurrency(financialStats.currentInventoryValue)}</h2>
          <p className="metric-subtitle text-muted">Cost Basis (COGS)</p>
        </div>
        <div className="metric-card panel clickable" onClick={() => navigate('/admin/inventory')}>
          <p className="metric-title">Low Stock Items</p>
          <h2 className={`metric-value ${lowStockItems.some(i => i.stock < 3) ? 'text-danger' : lowStockItems.length > 0 ? 'text-warning' : 'text-success'}`}>{lowStockItems.length}</h2>
          <p className="metric-subtitle text-muted">Threshold: &lt; 10</p>
        </div>
        <div className="metric-card panel clickable" onClick={() => navigate('/admin/alerts')}>
          <p className="metric-title">Expiring (7d)</p>
          <h2 className={`metric-value ${expiringItems.length > 0 ? 'text-danger' : 'text-success'}`}>{expiringItems.length}</h2>
          <p className="metric-subtitle text-muted">High urgency</p>
        </div>
      </div>

      <div className="panel kpi-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <h3>Pharmacy Operations KPIs</h3>
        </div>
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          
          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Average Fill Time</span>
                <span className={`badge ${kpiStats.avgFillTimeMinutes <= 30 ? 'badge-success' : 'badge-danger'}`}>Target: &lt; 30 min</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.avgFillTimeMinutes} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>min</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.avgFillTimeMinutes <= 30 ? 'bg-success' : 'bg-danger'}`} style={{ width: `${Math.min(100, (kpiStats.avgFillTimeMinutes / 60) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Refill Completion</span>
                <span className={`badge ${kpiStats.refillCompletionRate >= 80 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 80%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.refillCompletionRate}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.refillCompletionRate >= 80 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${kpiStats.refillCompletionRate}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Return-to-Stock (RTS)</span>
                <span className={`badge ${kpiStats.rtsPercent < 5 ? 'badge-success' : 'badge-danger'}`}>Target: &lt; 5%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.rtsPercent}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.rtsPercent < 5 ? 'bg-success' : 'bg-danger'}`} style={{ width: `${Math.min(100, (kpiStats.rtsPercent / 10) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Rx per Staff Hour</span>
                <span className="badge badge-info">Target: Improve MoM</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.rxPerStaffHour} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>Rx/hr</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className="progress-fill bg-primary" style={{ width: `${Math.min(100, (kpiStats.rxPerStaffHour / 10) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Refill Request Backlog</span>
                <span className={`badge ${kpiStats.refillBacklog < 10 ? 'badge-success' : 'badge-danger'}`}>Target: &lt; 10</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.refillBacklog}</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.refillBacklog < 10 ? 'bg-success' : 'bg-danger'}`} style={{ width: `${Math.min(100, (kpiStats.refillBacklog / 20) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Inventory Turnover Ratio</span>
                <span className={`badge ${(financialStats.inventoryTurnover >= 8 && financialStats.inventoryTurnover <= 12) ? 'badge-success' : 'badge-warning'}`}>Target: 8-12 /yr</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{financialStats.inventoryTurnover.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>turns/yr</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${(financialStats.inventoryTurnover >= 8 && financialStats.inventoryTurnover <= 12) ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(100, (financialStats.inventoryTurnover / 12) * 100)}%` }}></div>
             </div>
          </div>

        </div>
      </div>

      <div className="panel kpis-panel mt-4">
        <div className="panel-header">
          <h3>Patient & Clinical KPIs</h3>
        </div>
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          
          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Medication Adherence Rate</span>
                <span className={`badge ${kpiStats.adherenceRate >= 90 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 90%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.adherenceRate}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.adherenceRate >= 90 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${kpiStats.adherenceRate}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Patient Satisfaction</span>
                <span className={`badge ${kpiStats.patientSatisfactionScore >= 4.2 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 4.2</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.patientSatisfactionScore} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>/ 5.0</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.patientSatisfactionScore >= 4.2 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${(kpiStats.patientSatisfactionScore / 5) * 100}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">ER Visit Reduction</span>
                <span className="badge badge-info">Target: YoY Decrease</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.erVisitReduction}% <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>YoY</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className="progress-fill bg-primary" style={{ width: `${Math.min(100, kpiStats.erVisitReduction * 4)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Refill Reminder Pickup</span>
                <span className={`badge ${kpiStats.refillReminderPickupRate >= 75 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 75%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.refillReminderPickupRate}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.refillReminderPickupRate >= 75 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${kpiStats.refillReminderPickupRate}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Rx Abandonment Rate</span>
                <span className={`badge ${kpiStats.rxAbandonmentRate < 10 ? 'badge-success' : 'badge-danger'}`}>Target: &lt; 10%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.rxAbandonmentRate}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.rxAbandonmentRate < 10 ? 'bg-success' : 'bg-danger'}`} style={{ width: `${Math.min(100, (kpiStats.rxAbandonmentRate / 20) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Drug Interaction Alert Resp</span>
                <span className={`badge ${kpiStats.drugInteractionResponse === 100 ? 'badge-success' : 'badge-danger'}`}>Target: 100%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.drugInteractionResponse}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.drugInteractionResponse === 100 ? 'bg-success' : 'bg-danger'}`} style={{ width: `${kpiStats.drugInteractionResponse}%` }}></div>
             </div>
          </div>

        </div>
      </div>

      <div className="panel kpis-panel mt-4">
        <div className="panel-header">
          <h3>App Health & Engagement KPIs</h3>
        </div>
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          
          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Daily Active Users (DAU)</span>
                <span className="badge badge-info">Target: Grow MoM</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.dau}</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className="progress-fill bg-primary" style={{ width: `75%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">DAU/MAU Ratio</span>
                <span className={`badge ${kpiStats.stickinessRatio >= 20 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 20%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.stickinessRatio}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.stickinessRatio >= 20 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${kpiStats.stickinessRatio}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Session Duration</span>
                <span className={`badge ${kpiStats.sessionDuration >= 2 && kpiStats.sessionDuration <= 5 ? 'badge-success' : 'badge-warning'}`}>Target: 2-5 min</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.sessionDuration} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>min</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.sessionDuration >= 2 && kpiStats.sessionDuration <= 5 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${(kpiStats.sessionDuration / 5) * 100}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">D7 / D30 Retention</span>
                <span className={`badge ${(kpiStats.retentionD7 >= 40 && kpiStats.retentionD30 >= 25) ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 40% / 25%</span>
             </div>
             <h2 style={{ fontSize: '1.8rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.retentionD7}% <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>/ {kpiStats.retentionD30}%</span></h2>
             <div className="progress-bar mt-2" style={{ height: '6px', display: 'flex' }}>
                <div className="progress-fill bg-success" style={{ width: `${kpiStats.retentionD7}%`, opacity: 0.8 }}></div>
                <div className="progress-fill" style={{ width: `${kpiStats.retentionD30}%`, backgroundColor: 'var(--color-primary)' }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Churn Rate</span>
                <span className={`badge ${kpiStats.churnRate < 5 ? 'badge-success' : 'badge-danger'}`}>Target: &lt; 5%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.churnRate}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.churnRate < 5 ? 'bg-success' : 'bg-danger'}`} style={{ width: `${(kpiStats.churnRate / 10) * 100}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Net Promoter Score</span>
                <span className={`badge ${kpiStats.npsScore >= 30 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; +30</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>+{kpiStats.npsScore}</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.npsScore >= 30 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(100, (kpiStats.npsScore / 100) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">In-App Conversions</span>
                <span className={`badge ${kpiStats.inAppConversions >= 5 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 5%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.inAppConversions}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.inAppConversions >= 5 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(100, (kpiStats.inAppConversions / 10) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Feature Adoption Rate</span>
                <span className={`badge ${kpiStats.featureAdoption >= 30 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 30%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.featureAdoption}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.featureAdoption >= 30 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(100, (kpiStats.featureAdoption / 100) * 100)}%` }}></div>
             </div>
          </div>

        </div>
      </div>

      <div className="panel kpis-panel mt-4">
        <div className="panel-header">
          <h3>Business & Financial KPIs</h3>
        </div>
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          
          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Repeat Customer Rate</span>
                <span className={`badge ${kpiStats.repeatCustomerRate >= 70 ? 'badge-success' : 'badge-warning'}`}>Target: &ge; 70%</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>{kpiStats.repeatCustomerRate}%</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className={`progress-fill ${kpiStats.repeatCustomerRate >= 70 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${Math.min(100, (kpiStats.repeatCustomerRate / 100) * 100)}%` }}></div>
             </div>
          </div>

          <div className="kpi-card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
             <div className="flex-between">
                <span className="text-muted text-sm font-medium">Customer Lifetime Value (CLV)</span>
                <span className="badge badge-info">Target: Maximize</span>
             </div>
             <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--color-text-main)' }}>AED {kpiStats.clv.toLocaleString()}</h2>
             <div className="progress-bar mt-2" style={{ height: '6px' }}>
                <div className="progress-fill bg-primary" style={{ width: `85%` }}></div>
             </div>
          </div>

        </div>
      </div>

      <div className="dashboard-grid mt-4">
        <div className="panel alerts-panel">
          <div className="flex-between panel-header">
            <h3>Active Alerts</h3>
            <button 
              onClick={() => navigate('/admin/alerts')} 
              className="text-primary text-sm font-medium link-style-btn"
            >
              View all →
            </button>
          </div>
          <div className="alerts-list">
            {alerts.map((a, i) => (
              <div key={i} className="alert-item">
                <span className={`badge ${a.badgeClass}`} style={a.style}>{a.type}</span>
                <div className="alert-content">
                  <h4>{a.title}</h4>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-muted">No active alerts.</p>}
          </div>
        </div>

        <div className="panel sales-panel">
          <div className="panel-header">
            <h3>Sales by Category (Today)</h3>
          </div>
          <div className="sales-list">
            <div className="sales-item">
              <div className="flex-between text-sm font-medium">
                <span>Prescription Medicines</span>
                <span>AED {formatCurrency(salesByCategory.totals['Prescription (Rx)'])}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-primary" style={{ width: `${getCatPercent(salesByCategory.totals['Prescription (Rx)'])}%` }}></div>
              </div>
            </div>
            <div className="sales-item">
              <div className="flex-between text-sm font-medium">
                <span>OTC Medicines</span>
                <span>AED {formatCurrency(salesByCategory.totals['OTC'])}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill bg-success" style={{ width: `${getCatPercent(salesByCategory.totals['OTC'])}%` }}></div>
              </div>
            </div>
            <div className="sales-item">
              <div className="flex-between text-sm font-medium">
                <span>Cold Chain</span>
                <span>AED {formatCurrency(salesByCategory.totals['Cold Chain'])}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ backgroundColor: '#0ea5e9', width: `${getCatPercent(salesByCategory.totals['Cold Chain'])}%` }}></div>
              </div>
            </div>
            <div className="sales-item">
              <div className="flex-between text-sm font-medium">
                <span>Controlled</span>
                <span>AED {formatCurrency(salesByCategory.totals['Controlled'])}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ backgroundColor: '#dc2626', width: `${getCatPercent(salesByCategory.totals['Controlled'])}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-bottom">
        <div className="panel clickable" style={{ gridColumn: 'span 2' }} onClick={() => navigate('/admin/pos')}>
          <div className="panel-header flex-between">
            <h3>Recent Sales Statistics</h3>
            <span className="text-muted text-sm">Last 7 Days Trend</span>
          </div>
          <div className="chart-container" style={{ height: '180px', marginTop: '1rem', position: 'relative' }}>
             <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none">
               <defs>
                 <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.2" />
                   <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                 </linearGradient>
               </defs>
                <path d="M0,170 C100,160 200,150 300,145 C400,140 500,90 600,110 C700,130 750,45 800,45 C850,45 920,80 1000,90 L1000,200 L0,200 Z" fill="url(#gradient)" />
                <path d="M0,170 C100,160 200,150 300,145 C400,140 500,90 600,110 C700,130 750,45 800,45 C850,45 920,80 1000,90" fill="none" stroke="var(--color-primary)" strokeWidth="3" />
                <circle cx="800" cy="45" r="5" fill="var(--color-primary)" />
                <text x="800" y="28" fill="var(--color-primary)" fontSize="12" fontWeight="bold" textAnchor="middle">Peak: AED 12.4K</text>
             </svg>
             <div className="flex-between text-muted" style={{ marginTop: '0.5rem', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
             </div>
          </div>
        </div>
        <div className="panel" style={{ gridColumn: 'span 1', maxHeight: '350px', overflowY: 'auto' }}>
          <div className="panel-header flex-between sticky top-0 bg-white z-10 pb-2">
            <h3>Online Orders Queue</h3>
            <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#d97706' }}>
              {orders?.filter(o => !['Delivered', 'Completed'].includes(o.status)).length || 0} Active
            </span>
          </div>
          <div className="orders-mini-list mt-3">
             {orders?.filter(o => !['Delivered', 'Completed'].includes(o.status)).map(o => (
               <div key={o.id} className="mb-3 text-xs" style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                  <div className="flex-between mb-2">
                    <div>
                      <span className="font-bold">{o.id}</span>
                      <p className="text-muted">{o.items.length} items · {o.deliveryType}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-primary font-bold block">AED {o.total.toFixed(2)}</span>
                      <span className="badge" style={{ fontSize: '0.65rem', marginTop: '4px', background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Workflow Buttons */}
                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px dashed var(--color-border)' }}>
                    {o.status === 'Order Placed' && (
                      <button className="btn btn-sm btn-primary w-full" onClick={() => updateOrderStatus(o.id, 'Processing')}>Accept Order</button>
                    )}
                    {o.status === 'Processing' && (
                      <button className="btn btn-sm" style={{ background: '#0ea5e9', color: '#fff', width: '100%' }} onClick={() => updateOrderStatus(o.id, 'Packed')}>Mark as Packed</button>
                    )}
                    {o.status === 'Packed' && o.deliveryType === 'Pickup' && (
                      <button className="btn btn-sm btn-success w-full" onClick={() => updateOrderStatus(o.id, 'Delivered')}>Handed to Customer</button>
                    )}
                    {o.status === 'Packed' && o.deliveryType !== 'Pickup' && (
                      <button className="btn btn-sm btn-warning w-full" onClick={() => updateOrderStatus(o.id, 'Out for Delivery')}>Dispatch for Delivery</button>
                    )}
                    {o.status === 'Out for Delivery' && (
                      <button className="btn btn-sm btn-success w-full" onClick={() => updateOrderStatus(o.id, 'Delivered')}>Confirm Delivered</button>
                    )}
                  </div>
               </div>
             ))}
             {(!orders || orders.length === 0 || orders.filter(o => !['Delivered', 'Completed'].includes(o.status)).length === 0) && (
               <p className="text-muted text-xs text-center py-4">No active online orders.</p>
             )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel-header flex-between">
          <h3>Prescription Fulfillment Queue</h3>
          <span className="badge badge-info">{rxQueue.filter(rx => rx.status === 'Processed').length} Ready for Pickup</span>
        </div>
        <div className="orders-mini-list mt-3">
           {rxQueue.filter(rx => ['Processed'].includes(rx.status)).map(rx => {
             const user = users.find(u => u.id === rx.userId);
             return (
               <div key={rx.id} className="flex-between mb-3 align-center" style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <div>
                    <span className="font-bold" style={{ display: 'block', fontSize: '1rem' }}>{user?.name || 'Walk-in Patient'}</span>
                    <p className="text-muted text-xs mt-1">Processed: {rx.processedAt ? new Date(rx.processedAt).toLocaleString() : 'N/A'}</p>
                    {rx.isRefill && <span className="badge badge-warning text-xs mt-2" style={{ display: 'inline-block' }}>Refill Request</span>}
                  </div>
                  <div className="flex gap-2">
                     <button className="btn btn-sm btn-success" onClick={() => updateRxStatus(rx.id, 'Picked Up')}>Patient Picked Up</button>
                     <button className="btn btn-sm btn-outline text-danger border-danger" onClick={() => updateRxStatus(rx.id, 'Returned to Stock')}>Return to Stock</button>
                  </div>
               </div>
             )
           })}
           {rxQueue.filter(rx => rx.status === 'Processed').length === 0 && <p className="text-muted text-sm py-4 text-center">No prescriptions currently waiting for pickup.</p>}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', overflowX: 'auto' }}>
        <div className="panel-header flex-between">
          <h3>Daily Transactions</h3>
          <span className="badge badge-primary">{todayTransactions.length} Transactions Today</span>
        </div>
        <table className="table" style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '0.75rem' }}>Transaction ID</th>
              <th style={{ padding: '0.75rem' }}>Time</th>
              <th style={{ padding: '0.75rem' }}>Tracking (Cashier/Customer)</th>
              <th style={{ padding: '0.75rem' }}>Items</th>
              <th style={{ padding: '0.75rem' }}>Payment Method</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total (AED)</th>
            </tr>
          </thead>
          <tbody>
            {todayTransactions.slice(0, 10).map((t, index) => (
              <tr key={index} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{t.id}</td>
                <td style={{ padding: '0.75rem' }}>{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span className="text-muted block">Cashier: </span> {t.cashierId || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    <span className="text-muted block">Customer: </span> {t.customerId || 'Walk-in'}
                  </div>
                </td>
                <td style={{ padding: '0.75rem' }}>{t.items?.length || 0} items</td>
                <td style={{ padding: '0.75rem' }}>
                  <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-main)' }}>
                    {/* @ts-ignore */}
                    {t.paymentMethod || 'Unknown'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>AED {formatCurrency(t.total)}</td>
              </tr>
            ))}
            {todayTransactions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No transactions recorded today.</td>
              </tr>
            )}
          </tbody>
        </table>
        {todayTransactions.length > 10 && (
           <div className="text-center mt-3">
             <button className="text-primary text-sm font-medium link-style-btn" onClick={() => navigate('/admin/pos')}>View all {todayTransactions.length} transactions in POS →</button>
           </div>
        )}
      </div>

      {report && (
         <div className="insights-overlay">
           <div className="insights-panel panel animate-slide-up">
             <div className="flex-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
               <div className="flex-center gap-2">
                 <Sparkles className="text-primary" size={24} />
                 <h2 style={{ fontSize: '1.25rem' }}>Business Insights AI</h2>
               </div>
               <div className="flex-center gap-2">
                 <button className="btn btn-outline btn-sm flex-center gap-2" onClick={downloadPDF}>
                   <Download size={16} /> PDF Report
                 </button>
                 <button className="btn btn-outline btn-sm" onClick={() => setReport(null)}>
                   <X size={16} />
                 </button>
               </div>
             </div>
             <div className="report-content" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
               <div className="report-markdown">
                 {report.split('\n').map((line, i) => {
                   if (line.trim().startsWith('###')) return <h3 key={i} style={{marginTop: '1.5rem', marginBottom: '0.5rem'}}>{line.replace('###', '')}</h3>;
                   if (line.trim().startsWith('##')) return <h2 key={i} style={{marginTop: '2rem', marginBottom: '1rem', color: 'var(--color-primary)'}}>{line.replace('##', '')}</h2>;
                   if (line.trim().startsWith('-') || line.trim().startsWith('*')) return <li key={i} style={{marginLeft: '1.5rem', marginBottom: '0.25rem', fontSize: '0.9rem'}}>{line.replace(/^[-*]\s*/, '')}</li>;
                   if (!line.trim()) return <div key={i} style={{height: '1rem'}} />
                   return <p key={i} style={{marginBottom: '0.75rem', fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--color-text-main)'}}>{line}</p>;
                 })}
               </div>
             </div>
             <div className="mt-4 pt-3 text-center text-xs text-muted" style={{ borderTop: '1px solid var(--color-border)' }}>
               Report generated by GPT-4o accurately analyzing {inventory.length} SKUs and current financial velocity.
             </div>
           </div>
         </div>
       )}

       {error && (
         <div className="panel bg-danger-light text-danger mt-4 flex-between">
           <span>{error}</span>
           <button className="btn btn-sm btn-outline text-danger" onClick={() => setError(null)}>X</button>
         </div>
       )}
    </div>
  );
}
