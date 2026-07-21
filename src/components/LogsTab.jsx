import React, { useState, useEffect } from 'react';

export default function LogsTab({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterAction, setFilterAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    const auditPerm = currentUser.permissions?.audit_log || 'Žiadne';
    const hasAccess = auditPerm !== 'Žiadne';
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať auditné záznamy.');
      }
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentUser]);

  const auditPerm = currentUser.permissions?.audit_log || 'Žiadne';
  const hasAccess = auditPerm !== 'Žiadne';

  if (!hasAccess) {
    return (
      <div className="view-container">
        <div className="page-title-section">
          <h2 className="page-title">Auditný log</h2>
          <p className="page-subtitle">Záznamy o systémových zmenách</p>
        </div>
        <div className="card" style={{ padding: '2rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--border-radius-sm)' }}>
          ⚠️ Nemáte oprávnenie na zobrazenie auditných logov. V prípade potreby kontaktujte administrátora.
        </div>
      </div>
    );
  }
  const filteredLogs = (logs || []).filter(log => {
    if (!log) return false;
    const username = log.username || '';
    const action = log.action || '';
    const details = log.details || '';
    const query = searchQuery || '';

    const matchesSearch = 
      username.toLowerCase().includes(query.toLowerCase()) ||
      action.toLowerCase().includes(query.toLowerCase()) ||
      details.toLowerCase().includes(query.toLowerCase());
    
    if (filterAction === 'all') return matchesSearch;
    if (filterAction === 'login') return matchesSearch && action.includes('Prihlásenie');
    if (filterAction === 'users') return matchesSearch && action.includes('užívateľa');
    if (filterAction === 'permissions') return matchesSearch && (action.includes('oprávnení') || action.includes('roly') || action.includes('rola'));
    return matchesSearch;
  });

  return (
    <div className="view-container">
      <div className="page-title-section">
        <h2 className="page-title">Auditný log</h2>
        <p className="page-subtitle">Sledovanie prihlásení a vykonaných zmien v systéme IAM Petržalka</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0, flexGrow: 1, minWidth: '250px' }}>
              <label className="form-label">Vyhľadať v logoch</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Hľadať užívateľa, akciu alebo detaily..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
              <label className="form-label">Filtrovať podľa typu</label>
              <select className="form-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                <option value="all">Všetky záznamy</option>
                <option value="login">Iba prihlásenia</option>
                <option value="users">Iba správa užívateľov</option>
                <option value="permissions">Iba zmeny oprávnení</option>
              </select>
            </div>

            <button className="btn btn-secondary" onClick={fetchLogs}>
              🔄 Obnoviť logy
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Systémový Audit Log</h3>
          
          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Načítavam logy...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenašli sa žiadne vyhovujúce záznamy.</div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Časová značka</th>
                    <th style={{ width: '120px' }}>Užívateľ</th>
                    <th style={{ width: '180px' }}>Akcia</th>
                    <th>Detaily vykonanej zmeny</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => {
                    if (!log) return null;
                    const action = log.action || '';
                    const username = log.username || '';
                    const details = log.details || '';
                    
                    let formattedDate = '—';
                    if (log.timestamp) {
                      const d = new Date(log.timestamp);
                      formattedDate = isNaN(d.getTime()) ? '—' : d.toLocaleString('sk-SK');
                    }

                    let actionBadgeClass = 'badge-user';
                    if (action.includes('Prihlásenie (Úspešné)')) actionBadgeClass = 'badge-active';
                    else if (action.includes('Prihlásenie (Neúspešné)') || action.includes('Blokované')) actionBadgeClass = 'badge-blocked';
                    else if (action.includes('Vytvorenie') || action.includes('Inicializácia')) actionBadgeClass = 'badge-admin';
                    else if (action.includes('oprávnení') || action.includes('roly') || action.includes('rola')) actionBadgeClass = 'badge-admin';
                    else if (action.includes('Úprava')) actionBadgeClass = 'badge-user';

                    return (
                      <tr key={log.id || Math.random().toString(36).substring(2, 9)}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {formattedDate}
                        </td>
                        <td>
                          <strong>{username}</strong>
                        </td>
                        <td>
                          <span className={`badge ${actionBadgeClass}`} style={{ fontSize: '0.75rem' }}>
                            {action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                          {details}
                        </td>
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
  );
}
