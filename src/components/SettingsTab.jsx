import React, { useState } from 'react';

export default function SettingsTab({ currentUser }) {
  // Local settings options (mock)
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState('sk');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    alert('Nastavenia boli úspešne uložené.');
  };

  return (
    <div className="view-container">
      <div className="page-title-section">
        <h2 className="page-title">Nastavenia</h2>
        <p className="page-subtitle">Prispôsobenie vášho prostredia</p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Osobné Nastavenia</h3>
          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Jazyk rozhrania</label>
              <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="sk">Slovenčina</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
              <input 
                type="checkbox" 
                id="notifications" 
                checked={notifications} 
                onChange={e => setNotifications(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
              />
              <label htmlFor="notifications" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>Povoľovať e-mailové notifikácie o zmenách prístupu</label>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                type="checkbox" 
                id="darkMode" 
                checked={darkMode} 
                onChange={e => setDarkMode(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
              />
              <label htmlFor="darkMode" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>Tmavý režim (Dark mode)</label>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Uložiť nastavenia</button>
          </form>
        </div>

        <div className="card">
          <h3>Bezpečnosť</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Váš účet je chránený heslom. Pre zmenu hesla kontaktujte správcu IT Petržalka.
          </p>
          <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Naposledy prihlásený</span>
            <span style={{ fontSize: '0.95rem', fontWeight: '500', display: 'block', marginTop: '0.25rem' }}>
              Dnes (systémová relácia)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
