import React, { useState } from 'react';
import pkg from '../../package.json';

export default function Header({ user, onLogout, onEditProfile }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-logo">🛡️</span>
        <div className="brand-text-container">
          <h1 className="brand-name">IAM Petržalka</h1>
          <span className="brand-version">verzia: {pkg.version}</span>
        </div>
      </div>
      
      {user && (
        <div 
          className="header-user-actions"
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <div 
            className={`user-profile-button ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Užívateľské menu"
          >
            <div className="user-avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
            <div className="user-text">
              <span className="user-name">{user.name}</span>
              <span className="user-role-label">
                {user.role === 'admin' ? 'Administrátor IAM' : 'Oprávnený užívateľ'}
              </span>
            </div>
            <span className="dropdown-caret">{dropdownOpen ? '▲' : '▼'}</span>
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-header">
                <strong>{user.name}</strong>
                <span>@{user.username}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-item" 
                onClick={() => {
                  setDropdownOpen(false);
                  onEditProfile();
                }}
              >
                <span className="item-icon">👤</span>
                <span>Upraviť profil</span>
              </button>
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-item logout-item" 
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
              >
                <span className="item-icon">🚪</span>
                <span>Odhlásiť sa</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
