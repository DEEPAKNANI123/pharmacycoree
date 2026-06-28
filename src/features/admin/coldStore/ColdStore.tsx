import React, { useState, useEffect } from 'react';
import { 
  ThermometerSnowflake, AlertCircle, Zap, Clock, 
  Download, Bell, ShieldAlert, CheckCircle2,
  FileDown, Share2, Activity, RefreshCcw
} from 'lucide-react';
import './ColdStore.css';

export default function ColdStore() {
  const [isAlertActive, setIsAlertActive] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Cold Store log exported successfully as PDF.");
    }, 1500);
  };

  const acknowledgeAlert = () => {
    setIsAlertActive(false);
    alert("Alert has been acknowledged by Admin.");
  };

  const handleEscalate = async () => {
    setIsEscalating(true);
    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-coldstore-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorName: "Refrigerator Unit B",
          currentTemp: "9.2°C",
          thresholdMax: "8.0°C",
          location: "Zone B - Cold Room",
          sensorId: "SEN-CS-010",
          alertLevel: "CRITICAL BREACH WARNING"
        })
      });

      try {
        await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-telegram-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alertTitle: "Refrigerator Unit B Temperature Breach",
            level: "CRITICAL BREACH WARNING",
            details: "Refrigerator Unit B temperature registered 9.2°C (Safety Limit: 8.0°C). Duty pharmacist notified.",
            timestamp: new Date().toLocaleString()
          })
        });
      } catch (tgErr) {
        console.error("Telegram alert failed", tgErr);
      }

      setIsEscalated(true);
      setIsAlertActive(false);
      alert("Emergency alert escalated successfully via n8n!");
    } catch (error) {
      console.error(error);
      setIsAlertActive(false);
      alert("Acknowledged locally. (n8n escalation webhook failed/offline)");
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="cold-store-container">
      <div className="cs-header">
        <div>
          <h1>Cold Store Monitoring</h1>
          <p className="text-muted text-sm">System Status: {isAlertActive ? "Alert Active" : "Monitoring"}</p>
        </div>
        <div className="cs-header-btns">
          <button className="btn btn-outline flex-center gap-2" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <RefreshCcw size={16} className="spinner" /> : <Download size={16} />}
            Export Log
          </button>
          <button className={`btn flex-center gap-2 ${isAlertActive ? 'btn-acknowledge' : 'btn-outline'}`} onClick={acknowledgeAlert}>
            <Bell size={16} /> {isAlertActive ? "Acknowledge Alert" : "Acknowledged"}
          </button>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Unit A Temperature</div>
          <div className="metric-value">3.4°C</div>
          <div className="metric-status status-healthy">Target 2—8°C ✓</div>
        </div>
        <div className={`metric-card ${isAlertActive ? 'animate-pulse-subtle' : ''}`}>
          <div className="metric-label">Unit B Temperature</div>
          <div className={`metric-value ${isAlertActive ? 'text-danger' : ''}`}>9.2°C</div>
          <div className={`metric-status ${isAlertActive ? 'status-alert' : 'status-healthy'}`}>
            {isAlertActive ? "ABOVE RANGE !" : "Recovering..."}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Power Status</div>
          <div className="metric-value" style={{ color: '#ea580c' }}>Generator</div>
          <p className="metric-subtitle">Mains down 8 mins</p>
        </div>
        <div className="metric-card">
          <div className="metric-label">Est. Time to Breach</div>
          <div className="metric-value" style={{ color: '#b91c1c' }}>~14 min</div>
          <p className="metric-subtitle">Unit B at current rate</p>
        </div>
      </div>

      <div className="cs-content-grid">
        <div className="cs-panel">
          <div className="flex-between">
            <h3 className="panel-title">Temperature Trend — Unit B (30 min)</h3>
            <div className="h-stack gap-4 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
              <span className="flex-center gap-1"><span className="dot-red" style={{width:8, height:8}}></span> Current</span>
              <span className="flex-center gap-1"><span style={{width:16, height:2, borderBottom:'2px dashed #0284c7'}}></span> Limit</span>
            </div>
          </div>
          <div className="chart-wrapper">
             <svg width="100%" height="100%" viewBox="0 0 800 240" preserveAspectRatio="none">
               {/* Grid lines */}
               <line x1="0" y1="40" x2="800" y2="40" stroke="#eee" strokeWidth="1" />
               <line x1="0" y1="120" x2="800" y2="120" stroke="#eee" strokeWidth="1" />
               <line x1="0" y1="200" x2="800" y2="200" stroke="#eee" strokeWidth="1" />
               
               {/* 8'C Limit Line */}
               <line x1="0" y1="140" x2="800" y2="140" stroke="#0284c7" strokeWidth="2" strokeDasharray="6,4" />
               <text x="100" y="132" fill="#0284c7" fontSize="10" fontWeight="700">8°C Limit</text>

               {/* Trend Data Path */}
               <path 
                 d="M0,220 Q150,210 300,205 T500,160 T750,70" 
                 fill="none" 
                 stroke="#dc2626" 
                 strokeWidth="3" 
               />
               
               {/* Gradient Fill under the line */}
               <path 
                 d="M0,220 Q150,210 300,205 T500,160 T750,70 L750,240 L0,240 Z" 
                 fill="url(#tempGradient)" 
                 opacity="0.1" 
               />
               
               <defs>
                 <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="#dc2626" />
                   <stop offset="100%" stopColor="#ffffff" />
                 </linearGradient>
               </defs>

               {/* Dynamic Point */}
               <circle cx="750" cy="70" r="6" fill="#dc2626">
                  <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
               </circle>
               <text x="730" y="55" fill="#dc2626" fontSize="12" fontWeight="bold">9.2°C</text>
             </svg>
             <div className="flex-between text-muted mt-2" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                <span>-30 min</span>
                <span>-15 min</span>
                <span>Now</span>
             </div>
             <p className="mt-4 text-xs font-semibold" style={{ color: '#4b5563' }}>
                Rising since power event at 09:14 — rate: +0.12°C/min
             </p>
          </div>
        </div>

        <div className="cs-panel">
          <h3 className="panel-title">Incident Log</h3>
          <div className="incident-list">
            <div className="incident-item">
              <div className="incident-dot dot-red"></div>
              <div className="incident-content">
                <h4>Temp breach — Unit B</h4>
                <p>09:22 today · Unacknowledged · Risk: HIGH</p>
              </div>
            </div>
            <div className="incident-item">
              <div className="incident-dot dot-orange"></div>
              <div className="incident-content">
                <h4>Generator switchover</h4>
                <p>09:14 today · Auto-acknowledged</p>
              </div>
            </div>
            <div className="incident-item">
              <div className="incident-dot dot-green"></div>
              <div className="incident-content">
                <h4>Door open event — Unit A</h4>
                <p>08:40 today · 4 min · Closed OK</p>
              </div>
            </div>
            <div className="incident-item">
              <div className="incident-dot dot-green"></div>
              <div className="incident-content">
                <h4>Routine check — All clear</h4>
                <p>Apr 8 18:00 · No issues</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cs-panel ai-risk-panel ai-risk-high">
        <div className="ai-risk-header">
          <ShieldAlert size={20} />
          <span>AI Risk Assessment</span>
        </div>
        <p className="ai-risk-message">
          <strong>HIGH RISK — Unit B:</strong> Predicted breach in ~14 minutes. Temp rising at +0.12°C/min since power event. 
          Medicines at risk: Insulin Glargine, Vaccines (Zone 2). Immediate action required.
        </p>
        <div className="ai-actions">
          <button 
            className="btn btn-acknowledge flex-center gap-2 px-6" 
            onClick={handleEscalate} 
            disabled={isEscalating || isEscalated}
          >
            {isEscalating ? <RefreshCcw size={16} className="spinner" /> : <AlertCircle size={16} />}
            {isEscalated ? "Escalated via n8n" : "Acknowledge & Escalate"}
          </button>
          <button className="btn btn-outline flex-center gap-2" style={{ border: '1px solid #fca5a5', color: '#991b1b' }}>
             Mark Resolved
          </button>
          <button className="btn btn-outline flex-center gap-2" style={{ border: '1px solid #fca5a5', color: '#991b1b' }}>
            <FileDown size={16} /> Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
