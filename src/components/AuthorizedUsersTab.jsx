import React, { useState, useEffect } from 'react';

export default function AuthorizedUsersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');

  // Edit Form state
  const [editUserId, setEditUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('user');

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const usersRes = await fetch('/api/users/authorized');

      if (!usersRes.ok) {
        throw new Error('Nepodarilo sa načítať oprávnených užívateľov.');
      }

      const usersData = await usersRes.json();
      setUsers(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/users/authorized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          username: newUsername,
          password: newPassword,
          role: newRole
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri vytváraní oprávneného užívateľa.');
      }
      setUsers(data);
      setShowAddForm(false);
      setNewName('');
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setSuccess('Oprávnený užívateľ bol úspešne vytvorený.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (user) => {
    setEditUserId(user.id);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
    setShowAddForm(false);
    setError('');
    setSuccess('');
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/users/authorized/${editUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          username: editUsername,
          password: editPassword || undefined,
          role: editRole
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri úprave oprávneného užívateľa.');
      }
      setUsers(data);
      setEditUserId(null);
      setSuccess('Oprávnený užívateľ bol úspešne upravený.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/users/authorized/${userToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri odstraňovaní oprávneného užívateľa.');
      }
      setUsers(data);
      setSuccess('Oprávnený užívateľ bol úspešne odstránený.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const nameMatch = user.name.toLowerCase().includes(query);
    const usernameMatch = user.username.toLowerCase().includes(query);
    return nameMatch || usernameMatch;
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="view-container">
      <div className="page-title-section">
        <h2 className="page-title">Oprávnení užívatelia</h2>
        <p className="page-subtitle">Prehľad všetkých aktívnych používateľov s prístupom do IAM aplikácie</p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

      {/* 1. Add User Form */}
      {isAdmin && showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '650px', animation: 'fadeIn 0.25s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ➕ Nový oprávnený užívateľ
              </h3>
              <button className="btn-close" onClick={() => { setShowAddForm(false); setError(''); }}>✕</button>
            </div>
            <form onSubmit={handleAddUserSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meno a priezvisko</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="napr. Ján Kováč"
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Prihlasovacie meno</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newUsername} 
                    onChange={e => setNewUsername(e.target.value)} 
                    placeholder="napr. jan.kovac"
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Heslo</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rola v IAM</label>
                  <select 
                    className="form-select" 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value)}
                  >
                    <option value="user">Oprávnený užívateľ</option>
                    <option value="admin">Administrátor IAM</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary">Uložiť užívateľa</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddForm(false); setError(''); }}>Zrušiť</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit User Form */}
      {isAdmin && editUserId && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '650px', animation: 'fadeIn 0.25s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✏️ Upraviť oprávneného užívateľa: <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>{editName}</span>
              </h3>
              <button className="btn-close" onClick={() => { setEditUserId(null); setError(''); }}>✕</button>
            </div>
            <form onSubmit={handleEditUserSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meno a priezvisko</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Prihlasovacie meno</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editUsername} 
                    onChange={e => setEditUsername(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Heslo</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={editPassword} 
                    onChange={e => setEditPassword(e.target.value)} 
                    placeholder="Ponechajte prázdne pre zachovanie"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rola v IAM</label>
                  <select 
                    className="form-select" 
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value)}
                    disabled={editUserId === currentUser?.id}
                  >
                    <option value="user">Oprávnený užívateľ</option>
                    <option value="admin">Administrátor IAM</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary">Uložiť zmeny</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditUserId(null); setError(''); }}>Zrušiť</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
            <label className="form-label">Vyhľadať užívateľa</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Vyhľadajte podľa mena alebo prihlasovacieho mena..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {isAdmin && !showAddForm && (
              <button className="btn btn-primary" onClick={() => { setShowAddForm(true); setEditUserId(null); setError(''); setSuccess(''); }}>
                ➕ Pridať oprávneného užívateľa
              </button>
            )}
            <button className="btn btn-secondary" onClick={fetchData}>
              🔄 Obnoviť zoznam
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚙️</div>
            Načítavam oprávnených užívateľov...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Nenašli sa žiadni oprávnení užívatelia.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Prihlasovacie meno</th>
                  <th>Rola v IAM</th>
                  {isAdmin && <th style={{ textAlign: 'right', width: '15%' }}>Akcie</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr 
                    key={user.id} 
                    onClick={() => { if (isAdmin) handleEditClick(user); }}
                    style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}>
                          {user.name.charAt(0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'white' }}>{user.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Registrovaný: {new Date(user.created_at).toLocaleDateString('sk-SK')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>@{user.username}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {user.role === 'admin' ? 'Administrátor IAM' : 'Oprávnený užívateľ'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        {user.id !== currentUser?.id && (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(user); }}
                          >
                            🗑️ Zmazať
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '420px', animation: 'fadeIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Potvrdenie vymazania
              </h3>
              <button className="btn-close" onClick={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}>✕</button>
            </div>
            <div style={{ margin: '1rem 0 2rem 0', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Naozaj chcete vymazať oprávneného užívateľa <strong>"{userToDelete.name}"</strong>? 
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                Táto akcia natrvalo odstráni jeho účet a stratí prístup do IAM aplikácie.
              </span>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmDeleteUser}
              >
                Vymazať
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => { setShowDeleteConfirm(false); setUserToDelete(null); }}
              >
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
