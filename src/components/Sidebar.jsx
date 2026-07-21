import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, user }) {
  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        <div className="sidebar-menu-top">
          <div className="sidebar-settings-group">
            <button
              className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-label">Užívatelia</span>
            </button>
            <div className="sidebar-submenu">
              <button
                className={`sidebar-sublink ${activeTab === 'permissions-overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('permissions-overview')}
              >
                <span className="sidebar-icon">📊</span>
                <span className="sidebar-label">Prehľad oprávnení</span>
              </button>
            </div>
          </div>
          <button
            className={`sidebar-link ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <span className="sidebar-icon">🔑</span>
            <span className="sidebar-label">Oprávnenia</span>
          </button>
        </div>

        <div className="sidebar-menu-bottom">
          <div className="sidebar-settings-group">
            <button
              className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="sidebar-icon">⚙️</span>
              <span className="sidebar-label">Nastavenia</span>
            </button>
            <div className="sidebar-submenu">
              <button
                className={`sidebar-sublink ${activeTab === 'authorized-users' ? 'active' : ''}`}
                onClick={() => setActiveTab('authorized-users')}
              >
                <span className="sidebar-icon">👤</span>
                <span className="sidebar-label">Oprávnení užívatelia</span>
              </button>
              <button
                className={`sidebar-sublink ${activeTab === 'iam-roles' ? 'active' : ''}`}
                onClick={() => setActiveTab('iam-roles')}
              >
                <span className="sidebar-icon">🛡️</span>
                <span className="sidebar-label">Role v IAM</span>
              </button>
              {user.permissions?.audit_log && user.permissions.audit_log !== 'Žiadne' && (
                <button
                  className={`sidebar-sublink ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  <span className="sidebar-icon">📋</span>
                  <span className="sidebar-label">Auditný log</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot"></span>
          <span className="status-text">Systém online</span>
        </div>
      </div>
    </aside>
  );
}
