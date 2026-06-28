import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Server, Activity } from 'lucide-react';
import './SystemLogs.css';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  details: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function SystemLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/logs`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching system logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('LOGIN')) return 'var(--color-primary)';
    if (action.includes('RX')) return 'var(--color-warning)';
    if (action.includes('SALE') || action.includes('TRANSACTION')) return 'var(--color-success)';
    return '#64748b';
  };

  return (
    <div className="system-logs-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex-between mb-4">
        <div className="flex-center gap-3">
          <div style={{ background: 'var(--color-bg-secondary)', padding: '0.75rem', borderRadius: '12px' }}>
            <Server className="text-primary" size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>System Audit Logs</h1>
            <p className="text-muted text-sm mt-1">Track system events, logins, and transactions.</p>
          </div>
        </div>
        <button className="btn btn-outline flex-center gap-2" onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4 flex-center gap-2" style={{ background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '8px' }}>
          <ShieldAlert size={20} />
          {error}
        </div>
      )}

      <div className="panel p-0 overflow-hidden">
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'var(--color-bg-secondary)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--color-border)' }}>Time</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--color-border)' }}>Action</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--color-border)' }}>User ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--color-border)' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className="badge" style={{ background: 'transparent', border: `1px solid ${getActionColor(log.action)}`, color: getActionColor(log.action), padding: '4px 8px' }}>
                    <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  {log.userId || 'System'}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                  <pre style={{ margin: 0, background: 'var(--color-bg-secondary)', padding: '0.5rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem' }}>
                    {log.details}
                  </pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No logs available.
                </td>
              </tr>
            )}
            {isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Loading logs...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
