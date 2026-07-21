import React, { useState, useEffect } from 'react';

export default function IamRolesTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('admin');
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleIcon, setNewRoleIcon] = useState('🛡️');
  const [showDeleteRoleConfirm, setShowDeleteRoleConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const fetchRolesAndUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const usersRes = await fetch('/api/users/authorized');
      const rolesRes = await fetch('/api/roles');
      if (!usersRes.ok || !rolesRes.ok) {
        throw new Error('Nepodarilo sa načítať roly a používateľov pre prehľad.');
      }
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndUsers();
  }, [currentUser]);

  const hasRoleWrite = currentUser.permissions?.role_management === 'Zápis';

  const permissionKeys = [
    { key: 'user_management', name: 'Správa používateľov' },
    { key: 'auth_user_management', name: 'Správa oprávnených používateľov' },
    { key: 'group_management', name: 'Správa prístupových skupín' },
    { key: 'access_config', name: 'Konfigurácia prístupov (zmena/tvorba)' },
    { key: 'role_management', name: 'Správa rolí v IAM' },
    { key: 'audit_log', name: 'Prezeranie auditných záznamov (Audit Log)' },
    { key: 'global_settings', name: 'Globálne nastavenia systému' }
  ];

  const roleDefinitions = roles.map(role => {
    const roleMembers = users.filter(u => u.role === role.id);
    const mappedPermissions = permissionKeys.map(({ key, name }) => ({
      key,
      name,
      value: role.permissions?.[key] || 'Žiadne'
    }));

    return {
      id: role.id,
      name: role.name,
      icon: role.icon,
      badgeClass: role.badgeClass,
      description: role.description,
      permissions: mappedPermissions,
      rawPermissions: role.permissions || {},
      members: roleMembers
    };
  });

  const handleAddRoleSubmit = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      setError('Názov roly je povinný.');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          icon: newRoleIcon.trim() || '🛡️'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Nepodarilo sa vytvoriť rolu.');
      }
      setRoles(data);
      setShowAddRoleModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleIcon('🛡️');
      
      const createdRole = data[data.length - 1];
      if (createdRole) setSelectedRoleId(createdRole.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRoleClick = (role) => {
    setRoleToDelete(role);
    setShowDeleteRoleConfirm(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    setError('');
    try {
      const res = await fetch(`/api/roles/${roleToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Nepodarilo sa vymazať rolu.');
      }
      setRoles(data);
      setShowDeleteRoleConfirm(false);
      setRoleToDelete(null);
      setSelectedRoleId('admin');
    } catch (err) {
      setError(err.message);
      setShowDeleteRoleConfirm(false);
      setRoleToDelete(null);
    }
  };

  const handlePermissionChange = async (roleId, permKey, newValue) => {
    if (!hasRoleWrite) {
      setError('Nedostatočné oprávnenia. Nemáte právo upravovať roly.');
      return;
    }

    if (roleId === 'admin' && permKey === 'role_management' && newValue !== 'Zápis') {
      setError('Administrátorovi nemôžete odobrať práva na správu rolí.');
      return;
    }

    setError('');
    try {
      const updatedPermissions = {
        ...selectedRole.rawPermissions,
        [permKey]: newValue
      };

      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updatedPermissions })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Nepodarilo sa aktualizovať oprávnenia.');
      }

      const updatedRoles = await res.json();
      setRoles(updatedRoles);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedRole = roleDefinitions.find(r => r.id === selectedRoleId);

  const RadioIndicator = ({ checked, type }) => {
    let color = 'rgba(255,255,255,0.15)';
    if (checked) {
      if (type === 'Zápis') color = '#22c55e';
      else if (type === 'Čítanie') color = '#eab308';
      else if (type === 'Žiadne') color = '#ef4444';
    }
    return (
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: checked ? 'none' : '2px solid rgba(255,255,255,0.15)',
        background: checked ? color : 'rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '0.5rem',
        transition: 'all 0.15s ease'
      }}>
        {checked && (
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'white'
          }} />
        )}
      </div>
    );
  };

  return (
    <div className="view-container">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Role v IAM</h2>
          <p className="page-subtitle">Prehľad a definícia prístupových rolí v systéme IAM Petržalka</p>
        </div>
        {hasRoleWrite && (
          <button className="btn btn-primary" onClick={() => {
            setNewRoleName('');
            setNewRoleDesc('');
            setNewRoleIcon('🛡️');
            setShowAddRoleModal(true);
          }}>
            ➕ Pridať rolu
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Roles Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {roleDefinitions.map(role => {
            const isSelected = selectedRoleId === role.id;
            const isSystemRole = role.id === 'admin' || role.id === 'user';
            return (
              <div 
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className="card"
                style={{ 
                  padding: '1.25rem', 
                  cursor: 'pointer', 
                  borderColor: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                  background: isSelected ? 'rgba(139, 92, 246, 0.05)' : 'rgba(255,255,255,0.01)',
                  transition: 'all 0.2s ease-in-out',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderRadius: 'var(--border-radius-sm)'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{role.icon}</span>
                <div>
                  <h4 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>{role.name}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isSystemRole ? 'Systémová rola' : 'Vlastná rola'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Role Details */}
        <div>
          {selectedRole ? (
            <div className="card" style={{ padding: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '55px', 
                    height: '55px', 
                    borderRadius: 'var(--border-radius-sm)', 
                    background: selectedRole.id === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                    border: selectedRole.id === 'admin' ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(6, 182, 212, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem'
                  }}>
                    {selectedRole.icon}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem' }}>{selectedRole.name}</h3>
                    <span className={`badge ${selectedRole.badgeClass}`} style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                      {selectedRole.id === 'admin' || selectedRole.id === 'user' ? 'Systémová rola' : 'Vlastná rola'}
                    </span>
                  </div>
                </div>

                {hasRoleWrite && selectedRole.id !== 'admin' && selectedRole.id !== 'user' && (
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    onClick={() => handleDeleteRoleClick(selectedRole)}
                  >
                    🗑️ Vymazať rolu
                  </button>
                )}
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                {selectedRole.description}
              </p>

              {/* 1. Permissions Table Grid */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h4 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🛡️ Právomoci a funkcie v IAM
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--border-radius-sm)', padding: '1.25rem 1.5rem', border: '1px solid var(--border-color)' }}>
                  {selectedRole.permissions.map(perm => (
                    <div 
                      key={perm.name} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '0.5rem 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                      }}
                    >
                      <span style={{ color: 'white', fontWeight: '500', fontSize: '0.95rem' }}>{perm.name}</span>
                      
                      <div style={{ display: 'flex', gap: '2rem' }}>
                        {/* Zápis */}
                        {perm.key !== 'audit_log' ? (
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              opacity: perm.value === 'Zápis' ? 1 : 0.35,
                              cursor: hasRoleWrite ? 'pointer' : 'default' 
                            }}
                            onClick={() => handlePermissionChange(selectedRole.id, perm.key, 'Zápis')}
                          >
                            <RadioIndicator checked={perm.value === 'Zápis'} type="Zápis" />
                            <span style={{ fontSize: '0.9rem', color: perm.value === 'Zápis' ? 'white' : 'var(--text-muted)', fontWeight: perm.value === 'Zápis' ? '600' : 'normal' }}>Zápis</span>
                          </div>
                        ) : (
                          <div style={{ width: '70px' }} />
                        )}
                        
                        {/* Čítanie */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            opacity: perm.value === 'Čítanie' ? 1 : 0.35,
                            cursor: hasRoleWrite ? 'pointer' : 'default' 
                          }}
                          onClick={() => handlePermissionChange(selectedRole.id, perm.key, 'Čítanie')}
                        >
                          <RadioIndicator checked={perm.value === 'Čítanie'} type="Čítanie" />
                          <span style={{ fontSize: '0.9rem', color: perm.value === 'Čítanie' ? 'white' : 'var(--text-muted)', fontWeight: perm.value === 'Čítanie' ? '600' : 'normal' }}>Čítanie</span>
                        </div>
                        
                        {/* Žiadne */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            opacity: perm.value === 'Žiadne' ? 1 : 0.35,
                            cursor: hasRoleWrite ? 'pointer' : 'default' 
                          }}
                          onClick={() => handlePermissionChange(selectedRole.id, perm.key, 'Žiadne')}
                        >
                          <RadioIndicator checked={perm.value === 'Žiadne'} type="Žiadne" />
                          <span style={{ fontSize: '0.9rem', color: perm.value === 'Žiadne' ? 'white' : 'var(--text-muted)', fontWeight: perm.value === 'Žiadne' ? '600' : 'normal' }}>Žiadne</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Members List */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ color: 'white', marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Priradení užívatelia</span>
                  <span className="badge badge-user" style={{ fontSize: '0.8rem' }}>{loading ? '...' : selectedRole.members.length}</span>
                </h4>

                {loading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Načítavam zoznam užívateľov...</div>
                ) : selectedRole.members.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Žiadni používatelia s touto rolou.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    {selectedRole.members.map(member => (
                      <div key={member.id} style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.4rem 0.8rem', 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '50px',
                        fontSize: '0.85rem',
                        color: 'white'
                      }}>
                        <div className="user-avatar" style={{ width: '22px', height: '22px', fontSize: '0.65rem', boxShadow: 'none' }}>
                          {member.name.charAt(0)}
                        </div>
                        <span>{member.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontStyle: 'italic', padding: '3rem' }}>
              Vyberte rolu zo zoznamu na ľavej strane.
            </div>
          )}
        </div>
      </div>

      {showAddRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '550px', animation: 'fadeIn 0.25s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ➕ Pridať novú rolu v IAM
              </h3>
              <button className="btn-close" onClick={() => setShowAddRoleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddRoleSubmit}>
              <div className="form-group">
                <label className="form-label">Názov roly</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="napr. Správca podujatí" 
                  value={newRoleName} 
                  onChange={e => setNewRoleName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ikona roly</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {['🛡️', '👤', '👥', '🔑', '⚙️', '📅', '📊', '⚡', '💼', '📁', '🏢', '🌟', '🏷️', '🔒', '🎯', '📑'].map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewRoleIcon(icon)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: newRoleIcon === icon ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: newRoleIcon === icon ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        fontSize: '1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Popis roly</label>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  placeholder="Popíšte rozsah zodpovednosti tejto roly..." 
                  value={newRoleDesc} 
                  onChange={e => setNewRoleDesc(e.target.value)} 
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary">Vytvoriť rolu</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddRoleModal(false)}>Zrušiť</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteRoleConfirm && roleToDelete && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '420px', animation: 'fadeIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ Vymazanie roly
              </h3>
              <button className="btn-close" onClick={() => { setShowDeleteRoleConfirm(false); setRoleToDelete(null); }}>✕</button>
            </div>
            <div style={{ margin: '1rem 0 2rem 0', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Naozaj chcete vymazať rolu <strong>"{roleToDelete.name}"</strong> zo systému IAM?
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                Táto akcia je nevratná. Rolu je možné vymazať len vtedy, ak nie je priradená žiadnym užívateľom.
              </span>
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteRole}>
                Vymazať rolu
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteRoleConfirm(false); setRoleToDelete(null); }}>
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
