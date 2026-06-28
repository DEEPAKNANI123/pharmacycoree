import { useState } from 'react';
import { 
  Download, 
  ChevronRight, 
  FilePieChart, 
  ClipboardList, 
  ShoppingBag, 
  Percent, 
  Users, 
  ThermometerSnowflake, 
  X, 
  TrendingUp, 
  Loader2, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  Mail,
  AlertTriangle
} from 'lucide-react';
import './ReportsPage.css';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<'Sales' | 'Inventory' | 'Purchase' | 'VAT' | 'HR' | 'Cold Store' | null>(null);
  
  // Custom simulation states
  const [tempBreachSimulation, setTempBreachSimulation] = useState(false);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [isSimulatingBreach, setIsSimulatingBreach] = useState(false);

  const reports = [
    {
      title: 'Sales Report',
      desc: 'Revenue, transactions, top medicines, margins',
      icon: <FilePieChart size={20} className="text-primary" />,
      type: 'Sales' as const
    },
    {
      title: 'Inventory Aging',
      desc: 'Expiry risk, dead stock, FEFO status',
      icon: <ClipboardList size={20} className="text-success" />,
      type: 'Inventory' as const
    },
    {
      title: 'Purchase Report',
      desc: 'Supplier spend, PO on-time performance',
      icon: <ShoppingBag size={20} className="text-warning" />,
      type: 'Purchase' as const
    },
    {
      title: 'VAT Report',
      desc: 'Input/output VAT, filing history, audit trail',
      icon: <Percent size={20} className="text-danger" />,
      type: 'VAT' as const
    },
    {
      title: 'HR Payroll Summary',
      desc: 'Salary, shifts, leave balances',
      icon: <Users size={20} style={{ color: '#8b5cf6' }} />,
      type: 'HR' as const
    },
    {
      title: 'Cold Store Incidents',
      desc: 'Temperature breaches, audit log, compliance',
      icon: <ThermometerSnowflake size={20} style={{ color: '#0ea5e9' }} />,
      type: 'Cold Store' as const
    }
  ];

  // 1. Trigger consolidated Weekly Report dispatch via n8n
  const handleExportAll = async () => {
    setIsGeneratingDigest(true);
    
    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-reports-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: 'Executive Director',
          emailAddress: 'hr.soxibeta@gmail.com',
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Weekly summary webhook failed", e);
    }

    setTimeout(() => {
      setIsGeneratingDigest(false);
      alert("Consolidated Weekly Executive Report PDF successfully dispatched via n8n!");
    }, 1200);
  };

  // 2. Trigger DHA Refrigerator Emergency Temperature Breach simulation via n8n
  const handleSimulateTempSpike = async () => {
    setIsSimulatingBreach(true);
    setTempBreachSimulation(true);

    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-coldstore-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorId: 'TEMP-SNSR-REFRIG-1',
          location: 'Cold Storage Room A',
          sensorName: 'Main Refrigerator 1',
          currentTemp: '9.4°C',
          thresholdMax: '8.0°C',
          alertLevel: 'CRITICAL',
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error("Cold store alert webhook failed", e);
    }

    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-telegram-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertTitle: "Cold Chain Safety Breach (Simulation)",
          level: "CRITICAL WARNING",
          details: "Main Refrigerator 1 temperature spiked to 9.4°C (Limit: 8.0°C). Biologics and insulin stocks at immediate risk.",
          timestamp: new Date().toLocaleString()
        })
      });
    } catch (e) {
      console.error("Telegram alert webhook failed", e);
    }

    setTimeout(() => {
      setIsSimulatingBreach(false);
      alert("CRITICAL ALERT: Refrigerator temperature breach (9.4°C) reported to Central Control. Emergency notification email dispatched!");
    }, 1000);
  };

  const handleResetTemperature = () => {
    setTempBreachSimulation(false);
    alert("Refrigerator temperature restored to safe parameters (3.4°C). Compliance status reset to Compliant.");
  };

  const handleOpenReport = (type: typeof activeReport) => {
    setActiveReport(type);
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>Reports</h1>
        <button 
          className="btn btn-outline flex-center gap-2" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #cbd5e1', background: 'white', color: '#334155', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={handleExportAll}
          disabled={isGeneratingDigest}
        >
          {isGeneratingDigest ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Dispatched n8n Digest...
            </>
          ) : (
            <>
              <Download size={18} /> Send Weekly n8n PDF Summary
            </>
          )}
        </button>
      </div>

      <div className="reports-grid">
        {reports.map((r, i) => (
          <div key={i} className="report-card" onClick={() => handleOpenReport(r.type)}>
            <div className="flex-center mb-4" style={{ background: 'var(--color-bg-base)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.icon}
            </div>
            <h3>{r.title}</h3>
            <p>{r.desc}</p>
            <div className="open-report-link">
              Open report <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* 1. Sales Report Modal */}
      {activeReport === 'Sales' && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FilePieChart size={20} color="#2563eb" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Sales Performance Report</h2>
              </div>
              <button onClick={() => setActiveReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#475569'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={20} /></button>
            </div>

            <div className="metric-grid">
              <div className="metric-box blue-box">
                <p className="metric-title">Gross Revenue</p>
                <p className="metric-value">AED 142.5K</p>
              </div>
              <div className="metric-box green-box">
                <p className="metric-title">Net Margin</p>
                <p className="metric-value">18%</p>
              </div>
              <div className="metric-box slate-box">
                <p className="metric-title">Transactions</p>
                <p className="metric-value">2,840</p>
              </div>
            </div>

            <div className="chart-container">
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '750' }}>Top Selling Medicines (AED)</h4>
              
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Lipitor 20mg</span><span>AED 45,200</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '100%', background: '#3b82f6' }}></div></div>
              </div>
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Nexium 40mg</span><span>AED 32,800</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '72%', background: '#3b82f6' }}></div></div>
              </div>
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Panadol Joint</span><span>AED 18,400</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '40%', background: '#3b82f6' }}></div></div>
              </div>
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Glucophage XR</span><span>AED 12,100</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '26%', background: '#3b82f6' }}></div></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <span style={{ fontWeight: '500' }}>Payment Gateway Splits:</span>
              <strong style={{ color: '#0f172a' }}>65% Card Payments • 35% Cash Register</strong>
            </div>

            <div className="modal-footer-btns">
              <button className="btn-premium-close" onClick={() => setActiveReport(null)}>Close</button>
              <button 
                className="btn-premium-action" 
                style={{ '--btn-bg': '#2563eb', '--btn-hover-bg': '#1d4ed8' } as React.CSSProperties}
                onClick={() => alert("Sales report CSV generated successfully.")}
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inventory Aging Modal */}
      {activeReport === 'Inventory' && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} color="#16a34a" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Inventory Expiry & Aging</h2>
              </div>
              <button onClick={() => setActiveReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#475569'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={20} /></button>
            </div>

            <div className="metric-grid">
              <div className="metric-box green-box">
                <p className="metric-title">FEFO Score</p>
                <p className="metric-value">98%</p>
              </div>
              <div className="metric-box red-box">
                <p className="metric-title">Near Expiry (&lt;30d)</p>
                <p className="metric-value">1 Item</p>
              </div>
              <div className="metric-box amber-box">
                <p className="metric-title">Dead Stock Ratio</p>
                <p className="metric-value">4.2%</p>
              </div>
            </div>

            <div className="chart-container" style={{ background: '#fffbeb', border: '1px solid #fef08a', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem', color: '#b45309', fontWeight: '800' }}>Urgent Expiry Advisory:</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#78350f', lineHeight: '1.4' }}>
                <strong>MOHAP Narcotics Return</strong> batch requires removal and filing verification before June 15, 2026. Action is set to "Prepare".
              </p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Medicine</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Batch</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600 }}>Expiry Target</th>
                    <th style={{ padding: '0.75rem 1rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#0f172a' }}>Nexium 40mg</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>B4928</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#dc2626', fontWeight: 600 }}>July 2026</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#2563eb', fontWeight: 700 }}>Discount</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#0f172a' }}>Amoxil 500mg</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>A1102</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>Oct 2026</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b', fontWeight: 700 }}>Monitor</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-footer-btns">
              <button className="btn-premium-close" onClick={() => setActiveReport(null)}>Close</button>
              <button 
                className="btn-premium-action" 
                style={{ '--btn-bg': '#16a34a', '--btn-hover-bg': '#15803d' } as React.CSSProperties}
                onClick={() => alert("Consolidated Inventory report dispatched.")}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Purchase Report Modal */}
      {activeReport === 'Purchase' && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={20} color="#d97706" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Supplier Purchase Report</h2>
              </div>
              <button onClick={() => setActiveReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#475569'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={20} /></button>
            </div>

            <div className="metric-grid">
              <div className="metric-box amber-box">
                <p className="metric-title">Total Spend</p>
                <p className="metric-value">AED 48.2K</p>
              </div>
              <div className="metric-box slate-box">
                <p className="metric-title">Active POs</p>
                <p className="metric-value">4 Orders</p>
              </div>
              <div className="metric-box green-box">
                <p className="metric-title">On-Time Delivery</p>
                <p className="metric-value">94%</p>
              </div>
            </div>

            <div className="chart-container">
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '750' }}>Supplier Spend Share (AED)</h4>
              
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Gulf Medical Supplies</span><span>AED 28,400 (59%)</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '59%', background: '#d97706' }}></div></div>
              </div>
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Astraea Pharmaceuticals</span><span>AED 12,500 (26%)</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '26%', background: '#d97706' }}></div></div>
              </div>
              <div className="chart-bar-row">
                <div className="chart-bar-label"><span>Others</span><span>AED 7,300 (15%)</span></div>
                <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: '15%', background: '#d97706' }}></div></div>
              </div>
            </div>

            <div className="modal-footer-btns">
              <button className="btn-premium-close" onClick={() => setActiveReport(null)}>Close</button>
              <button 
                className="btn-premium-action" 
                style={{ '--btn-bg': '#d97706', '--btn-hover-bg': '#b45309' } as React.CSSProperties}
                onClick={() => alert("Supplier requisition report exported.")}
              >
                Export PO Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. VAT Report Modal */}
      {activeReport === 'VAT' && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Percent size={20} color="#dc2626" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>VAT Tax Audit Report</h2>
              </div>
              <button onClick={() => setActiveReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#475569'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={20} /></button>
            </div>

            <div className="metric-grid">
              <div className="metric-box red-box">
                <p className="metric-title">Output VAT (Sales)</p>
                <p className="metric-value">AED 7,125</p>
              </div>
              <div className="metric-box green-box">
                <p className="metric-title">Input VAT (Recover)</p>
                <p className="metric-value">AED 3,210</p>
              </div>
              <div className="metric-box blue-box">
                <p className="metric-title">Net Tax Payable</p>
                <p className="metric-value">AED 3,915</p>
              </div>
            </div>

            <h4 style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '0.85rem', color: '#1e293b', fontWeight: '800' }}>Filing Reconciliation History:</h4>
            
            <div className="recon-history-container">
              <div className="recon-row">
                <div className="recon-row-info">
                  <span className="recon-row-title">Q1 2026 Period</span>
                  <span className="recon-row-date">Jan 01 — Mar 31</span>
                </div>
                <span className="status-pill pending">Pending Audit</span>
              </div>
              <div className="recon-row">
                <div className="recon-row-info">
                  <span className="recon-row-title">Q4 2025 Period</span>
                  <span className="recon-row-date">Oct 01 — Dec 31</span>
                </div>
                <span className="status-pill settled">Filed & Settled</span>
              </div>
            </div>

            <div className="modal-footer-btns">
              <button className="btn-premium-close" onClick={() => setActiveReport(null)}>
                Close
              </button>
              <button 
                className="btn-premium-action" 
                style={{ '--btn-bg': '#dc2626', '--btn-hover-bg': '#b91c1c' } as React.CSSProperties}
                onClick={() => alert("Tax audit workbook downloaded.")}
              >
                Download Audit Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. HR Payroll Summary Modal */}
      {activeReport === 'HR' && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#8b5cf6" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>HR & Payroll Summary</h2>
              </div>
              <button onClick={() => setActiveReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#475569'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={20} /></button>
            </div>

            <div className="metric-grid">
              <div className="metric-box purple-box">
                <p className="metric-title">Monthly Payroll</p>
                <p className="metric-value">AED 88,400</p>
              </div>
              <div className="metric-box slate-box">
                <p className="metric-title">Headcount</p>
                <p className="metric-value">24 Active</p>
              </div>
              <div className="metric-box green-box">
                <p className="metric-title">Active Shifts</p>
                <p className="metric-value">8 On Duty</p>
              </div>
            </div>

            <h4 style={{ margin: '0.5rem 0 0.75rem 0', fontSize: '0.85rem', color: '#1e293b', fontWeight: '800' }}>Shift Allocation Audit:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Morning Shift</div>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>8 Staff</strong>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Evening Shift</div>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>6 Staff</strong>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem 0.5rem', borderRadius: '10px' }}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Night Shift</div>
                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>2 Staff</strong>
              </div>
            </div>

            <div className="modal-footer-btns">
              <button className="btn-premium-close" onClick={() => setActiveReport(null)}>Close</button>
              <button 
                className="btn-premium-action" 
                style={{ '--btn-bg': '#8b5cf6', '--btn-hover-bg': '#7c3aed' } as React.CSSProperties}
                onClick={() => alert("Roster logs exported.")}
              >
                Export Roster Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Cold Store Incidents Modal (High Compliance Importance) */}
      {activeReport === 'Cold Store' && (
        <div className="modal-overlay" onClick={() => setActiveReport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ThermometerSnowflake size={20} color="#0ea5e9" />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Cold Chain & Temp Incidents</h2>
              </div>
              <button onClick={() => setActiveReport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#475569'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><X size={20} /></button>
            </div>

            <div className="metric-grid">
              <div className={`metric-box ${tempBreachSimulation ? 'red-box' : 'blue-box'}`}>
                <p className="metric-title">Refrigerator 1</p>
                <p className="metric-value">
                  {tempBreachSimulation ? '9.4°C' : '3.4°C'}
                </p>
              </div>
              <div className="metric-box blue-box">
                <p className="metric-title">Refrigerator 2</p>
                <p className="metric-value">4.1°C</p>
              </div>
              <div className={`metric-box ${tempBreachSimulation ? 'red-box' : 'green-box'}`}>
                <p className="metric-title">Active Alarms</p>
                <p className="metric-value">
                  {tempBreachSimulation ? '1 Alarm' : '0 Alarms'}
                </p>
              </div>
            </div>

            {/* Warning advisory box */}
            <div style={{ border: tempBreachSimulation ? '1px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: tempBreachSimulation ? '#fef2f2' : '#f8fafc', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className={`temp-breach-indicator ${tempBreachSimulation ? 'breach' : ''}`}></span>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: tempBreachSimulation ? '#dc2626' : '#16a34a' }}>
                  System Compliance: {tempBreachSimulation ? 'CRITICAL BREACH WARNING' : 'DHA COMPLIANT'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: tempBreachSimulation ? '#991b1b' : '#475569', lineHeight: '1.4' }}>
                Regulatory guidelines require insulin, vaccines, and biologics to be stored strictly between **2.0°C and 8.0°C**. Any deviation over 60 minutes requires reporting and discard audits.
              </p>
            </div>

            <div className="modal-footer-btns">
              {tempBreachSimulation ? (
                <button 
                  className="btn-premium-action" 
                  style={{ '--btn-bg': '#16a34a', '--btn-hover-bg': '#15803d', flex: 1.2 } as React.CSSProperties}
                  onClick={handleResetTemperature}
                >
                  <CheckCircle2 size={16} /> Reset & Clear Alarm
                </button>
              ) : (
                <button 
                  className="btn-premium-action" 
                  style={{ '--btn-bg': '#dc2626', '--btn-hover-bg': '#b91c1c', flex: 1.2 } as React.CSSProperties}
                  onClick={handleSimulateTempSpike}
                  disabled={isSimulatingBreach}
                >
                  {isSimulatingBreach ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <AlertTriangle size={16} /> Simulate Temp Spike
                    </>
                  )}
                </button>
              )}
              
              <button 
                className="btn-premium-action" 
                style={{ '--btn-bg': '#0ea5e9', '--btn-hover-bg': '#0284c7' } as React.CSSProperties}
                onClick={() => alert("Temperature log sensor file downloaded.")}
              >
                Download Logs
              </button>
              
              <button className="btn-premium-close" style={{ flex: 0.6 }} onClick={() => setActiveReport(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
