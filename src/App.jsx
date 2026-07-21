import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import UsersTab from './components/UsersTab';
import PermissionsTab from './components/PermissionsTab';
import SettingsTab from './components/SettingsTab';
import AuthorizedUsersTab from './components/AuthorizedUsersTab';
import IamRolesTab from './components/IamRolesTab';
import LogsTab from './components/LogsTab';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [checkingSession, setCheckingSession] = useState(true);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Check if session is already active on server
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session');
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setCurrentUser(null);
      setActiveTab('users');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleOpenEditProfile = () => {
    setModalName(currentUser.name);
    setModalPassword('');
    setModalError('');
    setModalSuccess('');
    setShowProfileModal(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!modalName.trim()) {
      setModalError('Meno nemôže byť prázdne.');
      return;
    }

    setModalLoading(true);
    setModalError('');
    setModalSuccess('');

    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modalName.trim(),
          password: modalPassword.trim() !== '' ? modalPassword.trim() : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri aktualizácii profilu.');
      }

      let updatedUserObj = null;
      if (Array.isArray(data)) {
        updatedUserObj = data.find(u => u.id === currentUser.id);
      } else {
        updatedUserObj = data;
      }

      if (updatedUserObj) {
        setCurrentUser({
          ...currentUser,
          name: updatedUserObj.name
        });
      } else {
        throw new Error('Chyba pri čítaní odpovede servera.');
      }

      setModalSuccess('Profil bol úspešne upravený.');
      setTimeout(() => {
        setShowProfileModal(false);
      }, 1500);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>🛡️ IAM Petržalka</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Overujem pripojenie...</p>
        </div>
      </div>
    );
  }

  // Show Login screen if not authenticated
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} />
      <div className="main-content">
        <Header 
          user={currentUser} 
          onLogout={handleLogout} 
          onEditProfile={handleOpenEditProfile} 
        />
        
        <main>
          {activeTab === 'users' && <UsersTab currentUser={currentUser} />}
          {activeTab === 'permissions' && <PermissionsTab currentUser={currentUser} />}
          {activeTab === 'settings' && <SettingsTab currentUser={currentUser} />}
          {activeTab === 'authorized-users' && <AuthorizedUsersTab currentUser={currentUser} />}
          {activeTab === 'iam-roles' && <IamRolesTab currentUser={currentUser} />}
          {activeTab === 'logs' && <LogsTab currentUser={currentUser} />}
        </main>
      </div>

      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>Upraviť môj profil</h3>
              <button className="btn-close" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            
            {modalError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{modalError}</div>}
            {modalSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{modalSuccess}</div>}

            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Prihlasovacie meno</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={currentUser.username} 
                  disabled 
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                  Prihlasovacie meno nie je možné zmeniť.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Zobrazované meno</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={modalName} 
                  onChange={e => setModalName(e.target.value)} 
                  required 
                  disabled={modalLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nové heslo (nepovinné)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Ponechajte prázdne pre zachovanie" 
                  value={modalPassword} 
                  onChange={e => setModalPassword(e.target.value)} 
                  disabled={modalLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Farebná schéma</label>
                <select 
                  className="form-select" 
                  value={theme} 
                  onChange={e => setTheme(e.target.value)}
                  disabled={modalLoading}
                >
                  <option value="dark">Tmavý režim (Dark mode)</option>
                  <option value="light">Svetlý režim (Light mode)</option>
                </select>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }} disabled={modalLoading}>
                  {modalLoading ? 'Ukladám...' : 'Uložiť zmeny'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)} disabled={modalLoading}>
                  Zrušiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
