import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Zadajte užívateľské meno a heslo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri prihlasovaní');
      }

      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🛡️</div>
          <h2>IAM Petržalka</h2>
          <p>Správa identít a prístupov</p>
        </div>
        
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Prihlasovacie meno</label>
            <input
              type="text"
              id="username"
              className="form-input"
              placeholder="napr. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Heslo</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Predvolené testovacie účty:</p>
          <div className="test-creds">
            <div><strong>admin:</strong> <code>admin12</code> (Rola: Admin)</div>
            <div><strong>uzivatel:</strong> <code>uzivatel12</code> (Rola: Užívateľ)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
