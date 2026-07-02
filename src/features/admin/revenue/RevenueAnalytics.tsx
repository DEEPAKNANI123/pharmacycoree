import React, { useMemo, useState } from 'react';
import { useDatabase } from '../../../context/DatabaseContext';
import { TrendingUp, Calendar, CreditCard, DollarSign, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import './RevenueAnalytics.css';

export default function RevenueAnalytics() {
  const { transactions } = useDatabase();
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);

  const metrics = useMemo(() => {
    const now = new Date();
    
    // Date Helpers
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const isSameMonth = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    const isSameYear = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear();
    
    const getWeek = (d: Date) => {
      const date = new Date(d.getTime());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };
    const isSameWeek = (d1: Date, d2: Date) => isSameYear(d1, d2) && getWeek(d1) === getWeek(d2);

    // Baseline Dates
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    
    const lastMonth = new Date(now);
    lastMonth.setMonth(now.getMonth() - 1);
    
    const lastYear = new Date(now);
    lastYear.setFullYear(now.getFullYear() - 1);

    // Grouping
    const groups = {
      today: [] as any[],
      yesterday: [] as any[],
      thisWeek: [] as any[],
      lastWeek: [] as any[],
      thisMonth: [] as any[],
      lastMonth: [] as any[],
      thisYear: [] as any[],
      lastYear: [] as any[]
    };

    transactions.forEach(t => {
      const d = new Date(t.date);
      if (isSameDay(d, now)) groups.today.push(t);
      if (isSameDay(d, yesterday)) groups.yesterday.push(t);
      if (isSameWeek(d, now)) groups.thisWeek.push(t);
      if (isSameWeek(d, lastWeek)) groups.lastWeek.push(t);
      if (isSameMonth(d, now)) groups.thisMonth.push(t);
      if (isSameMonth(d, lastMonth)) groups.lastMonth.push(t);
      if (isSameYear(d, now)) groups.thisYear.push(t);
      if (isSameYear(d, lastYear)) groups.lastYear.push(t);
    });

    const calc = (txns: any[]) => {
      let revenue = 0;
      let cogs = 0;
      txns.forEach(t => {
        revenue += t.total;
        t.items.forEach((item: any) => {
          cogs += (item.purchasePrice || (item.price * 0.7)) * item.quantity; // Fallback COGS
        });
      });
      // Sort transactions descending by date
      const sortedTxns = [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { revenue, profit: revenue - cogs, count: txns.length, txns: sortedTxns };
    };

    const getDiff = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      today: calc(groups.today),
      yesterday: calc(groups.yesterday),
      thisWeek: calc(groups.thisWeek),
      lastWeek: calc(groups.lastWeek),
      thisMonth: calc(groups.thisMonth),
      lastMonth: calc(groups.lastMonth),
      thisYear: calc(groups.thisYear),
      lastYear: calc(groups.lastYear),
      getDiff
    };
  }, [transactions]);

  const formatCurrency = (val: number) => val.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const DiffBadge = ({ diff }: { diff: number }) => {
    const isPositive = diff >= 0;
    return (
      <span className={`diff-badge ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(diff).toFixed(1)}%
      </span>
    );
  };

  const AnalyticCard = ({ title, current, previous, icon: Icon, periodLabel, onSelect }: any) => {
    const revDiff = metrics.getDiff(current.revenue, previous.revenue);
    const profDiff = metrics.getDiff(current.profit, previous.profit);

    return (
      <div className="analytic-card" onClick={() => onSelect({ title, current })} style={{ cursor: 'pointer' }}>
        <div className="card-header">
          <div className="icon-wrapper"><Icon size={20} /></div>
          <h3>{title}</h3>
        </div>
        
        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Revenue</span>
            <div className="metric-value">AED {formatCurrency(current.revenue)}</div>
            <div className="metric-comparison">
              <DiffBadge diff={revDiff} />
              <span className="text-muted text-xs ml-2">vs {periodLabel} (AED {formatCurrency(previous.revenue)})</span>
            </div>
          </div>
          
          <div className="metric-box">
            <span className="metric-label">Profit</span>
            <div className="metric-value">AED {formatCurrency(current.profit)}</div>
            <div className="metric-comparison">
              <DiffBadge diff={profDiff} />
              <span className="text-muted text-xs ml-2">vs {periodLabel} (AED {formatCurrency(previous.profit)})</span>
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-label">Transactions</span>
            <div className="metric-value">{current.count}</div>
            <div className="metric-comparison">
               <span className="text-muted text-xs">vs {periodLabel} ({previous.count})</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="revenue-analytics">
      <div className="page-header">
        <h1>Revenue & Profit Analytics</h1>
      </div>

      <div className="analytics-container">
        <AnalyticCard 
          title="Daily Performance" 
          current={metrics.today} 
          previous={metrics.yesterday} 
          periodLabel="yesterday"
          icon={Calendar}
          onSelect={setSelectedPeriod}
        />
        <AnalyticCard 
          title="Weekly Performance" 
          current={metrics.thisWeek} 
          previous={metrics.lastWeek} 
          periodLabel="last week"
          icon={TrendingUp} 
          onSelect={setSelectedPeriod}
        />
        <AnalyticCard 
          title="Monthly Performance" 
          current={metrics.thisMonth} 
          previous={metrics.lastMonth} 
          periodLabel="last month"
          icon={CreditCard} 
          onSelect={setSelectedPeriod}
        />
        <AnalyticCard 
          title="Yearly Performance" 
          current={metrics.thisYear} 
          previous={metrics.lastYear} 
          periodLabel="last year"
          icon={DollarSign} 
          onSelect={setSelectedPeriod}
        />
      </div>

      {selectedPeriod && (
        <div className="modal-overlay" onClick={() => setSelectedPeriod(null)}>
          <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', height: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPeriod.title} Transactions</h2>
              <button className="close-btn" onClick={() => setSelectedPeriod(null)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc' }}>
              {selectedPeriod.current.txns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No transactions found for this period.
                </div>
              ) : (
                <div className="panel" style={{ overflowX: 'auto', padding: '0' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', background: 'white' }}>
                        <th style={{ padding: '1rem' }}>Transaction ID</th>
                        <th style={{ padding: '1rem' }}>Time</th>
                        <th style={{ padding: '1rem' }}>Tracking (Cashier/Customer)</th>
                        <th style={{ padding: '1rem' }}>Items</th>
                        <th style={{ padding: '1rem' }}>Payment Method</th>
                        <th style={{ padding: '1rem', textAlign: 'right' }}>Total (AED)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPeriod.current.txns.map((t: any, index: number) => {
                        const tDate = new Date(t.date);
                        const timeString = tDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid var(--color-border)', background: 'white' }}>
                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{t.id}</td>
                            <td style={{ padding: '1rem' }}>{timeString}</td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontSize: '0.8rem' }}>
                                <span className="text-muted block">Cashier: </span> {t.cashierId || 'Unknown'}
                              </div>
                              <div style={{ fontSize: '0.8rem' }}>
                                <span className="text-muted block">Customer: </span> {t.customerId || 'Walk-in'}
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>{t.items?.length || 0} items</td>
                            <td style={{ padding: '1rem' }}>
                              <span className="badge" style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-main)' }}>
                                {t.paymentMethod || 'Unknown'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>AED {formatCurrency(t.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
