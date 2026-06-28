import { useState } from 'react';
import './SettingsPage.css';

export default function SettingsPage() {
  const [branchName, setBranchName] = useState('Main Branch — Dubai');
  const [taxRegime, setTaxRegime] = useState('UAE — VAT 5%');
  const [authority, setAuthority] = useState('DHA — Dubai Health Authority');
  const [currency, setCurrency] = useState('AED — UAE Dirham');

  const [telegramToken, setTelegramToken] = useState(localStorage.getItem('pharma_telegram_token') || '');
  const [telegramChatId, setTelegramChatId] = useState(localStorage.getItem('pharma_telegram_chat_id') || '');
  const [whatsappNumber, setWhatsappNumber] = useState(localStorage.getItem('pharma_whatsapp_number') || '');
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);

  const handleSave = () => {
    localStorage.setItem('pharma_telegram_token', telegramToken);
    localStorage.setItem('pharma_telegram_chat_id', telegramChatId);
    localStorage.setItem('pharma_whatsapp_number', whatsappNumber);
    alert("System configurations saved successfully.");
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-telegram-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertTitle: "System Configuration Test",
          level: "INFO",
          details: `Telegram alerts integration successfully authenticated from Branch: ${branchName}`,
          timestamp: new Date().toLocaleString()
        })
      });
      alert("Telegram test alert dispatched successfully via n8n!");
    } catch (e) {
      console.error(e);
      alert("Failed to send Telegram test alert. Make sure n8n trigger is listening.");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTestingWhatsApp(true);
    try {
      await fetch('https://soxibetahr.app.n8n.cloud/webhook/pharmacy-whatsapp-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: "System Administrator",
          recipientPhone: whatsappNumber || "+971500000000",
          medicineName: "Test Notification API",
          advice: "WhatsApp integration test clearance passed successfully."
        })
      });
      alert("WhatsApp test notification dispatched successfully via n8n!");
    } catch (e) {
      console.error(e);
      alert("Failed to send WhatsApp test. Make sure n8n trigger is listening.");
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <button className="btn btn-primary px-8" onClick={handleSave}>
          Save Changes
        </button>
      </div>

      <div className="settings-grid">
        <div className="settings-panel">
          <h3 className="settings-section-title">Branch Configuration</h3>
          
          <div className="form-group">
            <label>Branch Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Country / Tax Regime</label>
            <select 
              className="form-control" 
              value={taxRegime}
              onChange={(e) => setTaxRegime(e.target.value)}
            >
              <option>UAE — VAT 5%</option>
              <option>KSA — VAT 15%</option>
              <option>None (Tax Exempt)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Regulatory Authority</label>
            <input 
              type="text" 
              className="form-control" 
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Default Currency</label>
            <select 
              className="form-control" 
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option>AED — UAE Dirham</option>
              <option>USD — US Dollar</option>
              <option>SAR — Saudi Riyal</option>
            </select>
          </div>
        </div>

        <div className="settings-panel">
          <h3 className="settings-section-title">Chat & Messaging Integrations</h3>
          
          <div className="form-group">
            <label>Telegram Bot Token</label>
            <input 
              type="password" 
              className="form-control" 
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
              placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx"
            />
          </div>

          <div className="form-group">
            <label>Telegram Chat ID</label>
            <input 
              type="text" 
              className="form-control" 
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. -100123456789"
            />
          </div>

          <div className="form-group">
            <label>WhatsApp Twilio Number / Phone</label>
            <input 
              type="text" 
              className="form-control" 
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. whatsapp:+14155238886"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              className="btn btn-secondary flex-center gap-2" 
              style={{ flex: 1, padding: '0.65rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={handleTestTelegram}
              disabled={isTestingTelegram}
            >
              {isTestingTelegram ? 'Pinging Bot...' : 'Test Telegram Bot'}
            </button>
            <button 
              className="btn btn-secondary flex-center gap-2" 
              style={{ flex: 1, padding: '0.65rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={handleTestWhatsApp}
              disabled={isTestingWhatsApp}
            >
              {isTestingWhatsApp ? 'Pinging WhatsApp...' : 'Test WhatsApp'}
            </button>
          </div>
        </div>

        <div className="settings-panel">
          <h3 className="settings-section-title">Notification Templates</h3>
          
          <div className="notification-list">
            <div className="notification-item">
              <span className="notification-name">Expiry Alerts (30/15/7/1 Day)</span>
              <span className="status-enabled">Enabled</span>
            </div>
            <div className="notification-item">
              <span className="notification-name">Compliance Due Date Alerts</span>
              <span className="status-enabled">Enabled</span>
            </div>
            <div className="notification-item">
              <span className="notification-name">Cold Store Temperature Alerts</span>
              <span className="status-enabled">Enabled</span>
            </div>
            <div className="notification-item">
              <span className="notification-name">WhatsApp Refill Warnings</span>
              <span className={whatsappNumber ? "status-enabled" : "status-config"}>
                {whatsappNumber ? "Enabled" : "Config needed"}
              </span>
            </div>
            <div className="notification-item">
              <span className="notification-name">Telegram Bot Duty Alerts</span>
              <span className={telegramChatId ? "status-enabled" : "status-config"}>
                {telegramChatId ? "Enabled" : "Config needed"}
              </span>
            </div>
            <div className="notification-item">
              <span className="notification-name">Low Stock Auto-Reorder Alerts</span>
              <span className="status-enabled">Enabled</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
             <p className="text-xs text-muted leading-relaxed">
               System alerts are delivered via internal notifications, registered admin emails, and configured messaging webhooks.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
