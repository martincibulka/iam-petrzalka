import React, { useState, useEffect } from 'react';

export default function PermissionsTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Group Form state
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editGroupId, setEditGroupId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null });

  const triggerConfirm = (title, message, onConfirm) => {
    setConfirmConfig({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setShowConfirm(false);
      }
    });
    setShowConfirm(true);
  };
  
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSystems, setGroupSystems] = useState([]);

  // Access items and levels table state
  const [accessItems, setAccessItems] = useState([]);
  const [showAddAccessModal, setShowAddAccessModal] = useState(false);
  const [newAccessName, setNewAccessName] = useState('');
  const [showEditAccessModal, setShowEditAccessModal] = useState(false);
  const [editAccessId, setEditAccessId] = useState(null);
  const [editAccessName, setEditAccessName] = useState('');


  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const groupsRes = await fetch('/api/groups');
      if (!groupsRes.ok) throw new Error('Nepodarilo sa načítať skupiny prístupov.');
      const groupsData = await groupsRes.json();
      setGroups(groupsData);

      const userGroupsRes = await fetch('/api/user-groups');
      if (!userGroupsRes.ok) throw new Error('Nepodarilo sa načítať priradenia skupín.');
      const userGroupsData = await userGroupsRes.json();
      setUserGroups(userGroupsData);

      const accessItemsRes = await fetch('/api/access-items');
      if (!accessItemsRes.ok) throw new Error('Nepodarilo sa načítať prístupy.');
      const accessItemsData = await accessItemsRes.json();
      setAccessItems(accessItemsData);

      if (currentUser.role === 'admin') {
        const usersRes = await fetch('/api/users');
        if (!usersRes.ok) throw new Error('Nepodarilo sa načítať zoznam užívateľov.');
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Toggle user's assignment to a group (Admin only)
  const handleToggleUserGroup = async (userId, groupId) => {
    const mapping = userGroups.find(ug => ug.userId === userId) || { userId, groupIds: [] };
    let newGroupIds = [];
    if (mapping.groupIds.includes(groupId)) {
      newGroupIds = mapping.groupIds.filter(id => id !== groupId);
    } else {
      newGroupIds = [...mapping.groupIds, groupId];
    }

    try {
      const response = await fetch('/api/user-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, groupIds: newGroupIds })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri zmene skupín užívateľa.');
      }
      setUserGroups(data);
      setSuccess('Skupiny užívateľa boli úspešne upravené.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddAccessSubmit = async (e) => {
    e.preventDefault();
    if (!newAccessName.trim()) return;

    const exists = accessItems.some(item => item.name.toLowerCase() === newAccessName.trim().toLowerCase());
    if (exists) {
      alert('Prístup s týmto názvom už existuje.');
      return;
    }

    try {
      const response = await fetch('/api/access-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAccessName.trim(), levels: ['Read/Write'] })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri vytváraní prístupu.');
      }
      setAccessItems(data);
      setShowAddAccessModal(false);
      setNewAccessName('');
      setSuccess(`Prístup "${newAccessName.trim()}" bol úspešne pridaný.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditAccessClick = (item) => {
    setEditAccessId(item.id);
    setEditAccessName(item.name);
    setShowEditAccessModal(true);
  };

  const handleEditAccessSubmit = async (e) => {
    e.preventDefault();
    if (!editAccessName.trim()) return;

    const exists = accessItems.some(item => item.id !== editAccessId && item.name.toLowerCase() === editAccessName.trim().toLowerCase());
    if (exists) {
      alert('Prístup s týmto názvom už existuje.');
      return;
    }

    try {
      const response = await fetch(`/api/access-items/${editAccessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editAccessName.trim() })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri úprave prístupu.');
      }
      setAccessItems(data);

      const groupsRes = await fetch('/api/groups');
      const groupsData = await groupsRes.json();
      setGroups(groupsData);

      setShowEditAccessModal(false);
      setEditAccessId(null);
      setEditAccessName('');
      setSuccess('Prístup bol úspešne upravený.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAccess = (id, name) => {
    triggerConfirm(
      '⚠️ Odstrániť prístup',
      `Naozaj chcete odstrániť prístup "${name}"? Bude odstránený zo všetkých skupín prístupov.`,
      async () => {
        try {
          const response = await fetch(`/api/access-items/${id}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Chyba pri mazaní prístupu.');
          }
          setAccessItems(data);

          const groupsRes = await fetch('/api/groups');
          const groupsData = await groupsRes.json();
          setGroups(groupsData);

          setSuccess(`Prístup "${name}" bol úspešne vymazaný.`);
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.message);
        }
      }
    );
  };

  const handleToggleAccessLevel = async (id, level) => {
    const item = accessItems.find(it => it.id === id);
    if (!item) return;

    const hasLevel = item.levels.includes(level);
    const updatedLevels = hasLevel 
      ? item.levels.filter(l => l !== level)
      : [...item.levels, level];

    try {
      const response = await fetch(`/api/access-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels: updatedLevels })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri zmene úrovne prístupu.');
      }
      setAccessItems(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Create new group (Admin only)
  const handleAddGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName || !groupDesc) {
      setError('Názov a popis skupiny sú povinné.');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, description: groupDesc, systems: groupSystems })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri vytváraní skupiny.');
      }
      setGroups(data);
      setShowAddGroup(false);
      setGroupName('');
      setGroupDesc('');
      setGroupSystems([]);
      setSuccess('Skupina bola úspešne vytvorená.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Edit group systems/name (Admin only)
  const handleEditGroupClick = (group) => {
    setEditGroupId(group.id);
    setGroupName(group.name);
    setGroupDesc(group.description);
    setGroupSystems(group.systems || []);
    setShowAddGroup(false);
  };

  const handleEditGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/groups/${editGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, description: groupDesc, systems: groupSystems })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri úprave skupiny.');
      }
      setGroups(data);
      setEditGroupId(null);
      setGroupName('');
      setGroupDesc('');
      setGroupSystems([]);
      setSuccess('Skupina prístupov bola úspešne upravená.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete group (Admin only)
  const handleDeleteGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    triggerConfirm(
      '⚠️ Vymazať skupinu prístupov',
      `Naozaj chcete vymazať skupinu prístupov "${group.name}"? Táto operácia ju zmaže aj všetkým priradeným užívateľom.`,
      async () => {
        try {
          const response = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Chyba pri mazaní skupiny.');
          }
          setGroups(data);
          const mappingRes = await fetch('/api/user-groups');
          const mappingData = await mappingRes.json();
          setUserGroups(mappingData);
          setSuccess('Skupina bola úspešne odstránená.');
          setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
          setError(err.message);
        }
      }
    );
  };

  // Toggle system selection in form (works with objects)
  const handleFormToggleSystem = (sysName) => {
    const isPresent = groupSystems.some(sys => (typeof sys === 'object' ? sys.name : sys) === sysName);
    if (isPresent) {
      setGroupSystems(groupSystems.filter(sys => (typeof sys === 'object' ? sys.name : sys) !== sysName));
    } else {
      setGroupSystems([...groupSystems, { name: sysName, level: 'Read/Write' }]);
    }
  };



  if (loading) {
    return (
      <div className="view-container">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Načítavam prístupy a skupiny...</div>
      </div>
    );
  }

  // --- STANDARD USER VIEW ---
  if (currentUser.role !== 'admin') {
    const myMapping = userGroups.find(ug => ug.userId === currentUser.id) || { groupIds: [] };
    const myGroups = groups.filter(g => myMapping.groupIds.includes(g.id));
    
    // Effective systems: union of all systems across my groups
    const groupNames = myGroups.reduce((acc, g) => [...acc, ...g.systems.map(s => typeof s === 'object' ? s.name : s)], []);
    
    const myEffectiveSystems = Array.from(new Set(groupNames));

    return (
      <div className="view-container">
        <div className="page-title-section">
          <h2 className="page-title">Skupiny prístupov</h2>
          <p className="page-subtitle">Prehľad mojich skupín prístupov a celkových prístupových práv</p>
        </div>



        {/* Section 1: My Groups */}
        <h3 style={{ marginBottom: '1.25rem' }}>Moje skupiny prístupov</h3>
        {myGroups.length === 0 ? (
          <div className="card" style={{ marginBottom: '2.5rem', color: 'var(--text-muted)' }}>
            Nie ste zaradený v žiadnej skupine prístupov. Kontaktujte administrátora pre priradenie.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {myGroups.map(g => (
              <div key={g.id} className="card" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                borderColor: 'rgba(139, 92, 246, 0.2)',
                padding: '1.25rem 1.5rem',
                marginBottom: '0.25rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', width: '100%' }}>
                  <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <h4 style={{ fontSize: '1.2rem', color: 'white', margin: 0 }}>👥 {g.name}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>{g.description}</p>
                  </div>
                  <div style={{ flex: '1 1 50%', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Prístupy priradené k tejto skupine:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {[...g.systems].sort((a, b) => {
                        const nameA = typeof a === 'object' ? a.name : a;
                        const nameB = typeof b === 'object' ? b.name : b;
                        return nameA.localeCompare(nameB, 'sk');
                      }).map(s => {
                        const name = typeof s === 'object' ? s.name : s;
                        return <span key={name} className="badge badge-user" style={{ fontSize: '0.75rem' }}>{name}</span>;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 2: Effective Systems Grid */}
        <h3 style={{ marginBottom: '1.25rem' }}>Celkové Výsledné Prístupy</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {accessItems.map(item => {
            const system = item.name;
            const hasAccess = myEffectiveSystems.includes(system);
            const groupList = myGroups.filter(g => g.systems.map(s => typeof s === 'object' ? s.name : s).includes(system)).map(g => g.name);
            const grantingGroups = groupList;

            return (
              <div key={system} className="card" style={{ 
                opacity: hasAccess ? 1 : 0.6,
                borderColor: hasAccess ? 'rgba(6, 182, 212, 0.2)' : '',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {hasAccess && (
                  <div style={{
                    position: 'absolute', top: 0, right: 0, height: '4px', left: 0,
                    background: 'var(--accent-gradient)'
                  }}></div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '1.1rem' }}>{system}</h4>
                  <span className={`badge ${hasAccess ? 'badge-active' : 'badge-blocked'}`}>
                    {hasAccess ? 'Aktívny' : 'Bez prístupu'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                  {system === 'Active Directory' && 'Prístup do domény a lokálnej siete.'}
                  {system === 'SAP ERP' && 'Finančný a plánovací podnikový systém.'}
                  {system === 'Corporate Email' && 'Firemná e-mailová schránka.'}
                  {system === 'Jira Cloud' && 'Projektový manažment a ticketing.'}
                  {system === 'VPN Access' && 'Zabezpečený vzdialený prístup do siete.'}
                </p>
                {hasAccess ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: '500' }}>
                    🛡️ Získané cez: {grantingGroups.join(', ')}
                  </div>
                ) : (
                  <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }} onClick={() => alert('Požiadavka na prístup k skupine s týmto systémom bola zaslaná administrátorovi.')}>
                    🔑 Požiadať o prístup
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  return (
    <div className="view-container">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Správa prístupových skupín</h2>
        </div>
      </div>


      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

      {/* 1. Add Group Form */}
      {showAddGroup && (
        <div className="card" style={{ marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
          <h3 style={{ marginBottom: '1.25rem' }}>Nová skupina prístupov</h3>
          <form onSubmit={handleAddGroupSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Názov skupiny</label>
                <input type="text" className="form-input" placeholder="napr. Vývojári" value={groupName} onChange={e => setGroupName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Popis skupiny</label>
                <input type="text" className="form-input" placeholder="napr. Prístup k vývojárskym systémom a databázam" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Priradené prístupy</label>
              
              {/* Active tag list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {groupSystems.length === 0 ? (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Žiadne priradené prístupy</span>
                ) : (
                  [...groupSystems].sort((a, b) => {
                    const nameA = typeof a === 'object' ? a.name : a;
                    const nameB = typeof b === 'object' ? b.name : b;
                    return nameA.localeCompare(nameB, 'sk');
                  }).map(sys => {
                    const sysName = typeof sys === 'object' ? sys.name : sys;
                    return (
                      <span key={sysName} className="badge badge-user" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
                        <strong>{sysName}</strong>

                        <button 
                          type="button" 
                          onClick={() => handleFormToggleSystem(sysName)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 'bold', fontSize: '0.8rem', marginLeft: '0.25rem' }}
                          title="Odobrať"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              {/* Add dropdown */}
              {(() => {
                const currentFormSystems = groupSystems.map(sys => typeof sys === 'object' ? sys.name : sys);
                const availableItems = accessItems.filter(item => !currentFormSystems.includes(item.name));
                const sortedAvailableItems = [...availableItems].sort((a, b) => a.name.localeCompare(b.name, 'sk'));
                return sortedAvailableItems.length > 0 && (
                  <div style={{ maxWidth: '300px' }}>
                    <select 
                      className="form-select" 
                      value=""
                      onChange={e => {
                        if (e.target.value) {
                          handleFormToggleSystem(e.target.value);
                        }
                      }}
                    >
                      <option value="">➕ Pridať prístup do skupiny...</option>
                      {sortedAvailableItems.map(item => (
                        <option key={item.id} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">Uložiť skupinu</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddGroup(false)}>Zrušiť</button>
            </div>
          </form>
        </div>
      )}
      {/* 3. Manage Groups (Grid) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: 0 }}>Skupiny prístupov</h3>
        <button className="btn btn-primary" onClick={() => { setEditGroupId(null); setGroupName(''); setGroupDesc(''); setGroupSystems([]); setShowAddGroup(!showAddGroup); }}>
          {showAddGroup ? 'Zrušiť' : '➕ Pridať skupinu'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
        {groups.map(g => {
          const isEditing = editGroupId === g.id;

          if (isEditing) {
            return (
              <div key={g.id} className="card" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                borderColor: 'var(--accent-primary)',
                background: 'rgba(6, 182, 212, 0.03)',
                padding: '1.5rem',
                marginBottom: '0.25rem',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                <h4 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚙️ Upraviť skupinu: {g.name}
                </h4>
                <form onSubmit={handleEditGroupSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Názov skupiny</label>
                      <input type="text" className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Popis skupiny</label>
                      <input type="text" className="form-input" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Priradené prístupy</label>
                    
                    {/* Active tag list */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                      {groupSystems.length === 0 ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Žiadne priradené prístupy</span>
                      ) : (
                        [...groupSystems].sort((a, b) => {
                          const nameA = typeof a === 'object' ? a.name : a;
                          const nameB = typeof b === 'object' ? b.name : b;
                          return nameA.localeCompare(nameB, 'sk');
                        }).map(sys => {
                          const sysName = typeof sys === 'object' ? sys.name : sys;
                          return (
                            <span key={sysName} className="badge badge-user" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                              <strong>{sysName}</strong>

                              <button 
                                type="button" 
                                onClick={() => handleFormToggleSystem(sysName)}
                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontWeight: 'bold', fontSize: '0.8rem', marginLeft: '0.2rem' }}
                                title="Odobrať"
                              >
                                ✕
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* Add dropdown */}
                    {(() => {
                      const currentFormSystems = groupSystems.map(sys => typeof sys === 'object' ? sys.name : sys);
                      const availableItems = accessItems.filter(item => !currentFormSystems.includes(item.name));
                      const sortedAvailableItems = [...availableItems].sort((a, b) => a.name.localeCompare(b.name, 'sk'));
                      return sortedAvailableItems.length > 0 && (
                        <div style={{ maxWidth: '280px' }}>
                          <select 
                            className="form-select" 
                            value=""
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                            onChange={e => {
                              if (e.target.value) {
                                handleFormToggleSystem(e.target.value);
                              }
                            }}
                          >
                            <option value="">➕ Pridať prístup do skupiny...</option>
                            {sortedAvailableItems.map(item => (
                              <option key={item.id} value={item.name}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Uložiť zmeny</button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setEditGroupId(null)}>Zrušiť</button>
                  </div>
                </form>
              </div>
            );
          }

          return (
            <div key={g.id} className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              borderColor: 'rgba(255,255,255,0.05)',
              padding: '1.25rem 1.5rem',
              marginBottom: '0.25rem'
            }}>
              {/* Main Row */}
              <div 
                onClick={() => handleEditGroupClick(g)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '2rem', width: '100%', cursor: 'pointer', userSelect: 'none' }}
              >
                {/* Left: Info */}
                <div style={{ flex: '1 1 35%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <h4 style={{ fontSize: '1.25rem', color: 'white', margin: 0 }}>
                    👥 {g.name}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>{g.description}</p>
                </div>
                
                {/* Middle: Badges */}
                <div style={{ flex: '1 1 35%', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Priradené prístupy:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {g.systems.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontStyle: 'italic' }}>Bez priradených prístupov</span>
                    ) : (
                      [...g.systems].sort((a, b) => {
                        const nameA = typeof a === 'object' ? a.name : a;
                        const nameB = typeof b === 'object' ? b.name : b;
                        return nameA.localeCompare(nameB, 'sk');
                      }).map(s => {
                        const name = typeof s === 'object' ? s.name : s;
                        return <span key={name} className="badge badge-user" style={{ fontSize: '0.75rem' }}>{name}</span>;
                      })
                    )}
                  </div>
                </div>
                
                {/* Right: Actions */}
                <div 
                  style={{ display: 'flex', gap: '0.5rem', flex: '0 0 auto', alignItems: 'center' }}
                  onClick={e => e.stopPropagation()}
                >
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleEditGroupClick(g)}>✏️ Upraviť</button>
                  <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteGroup(g.id)}>🗑️ Zmazať</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Access Levels Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: 0 }}>Prístupy</h3>
        <button className="btn btn-primary" onClick={() => { setShowAddAccessModal(true); setNewAccessName(''); }}>
          ➕ Pridať prístup
        </button>
      </div>
      <div className="card">
        <div className="table-container">
          <table className="custom-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ verticalAlign: 'middle', width: '35%' }}>Názov</th>
                <th colSpan={5} style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Úroveň oprávnení</th>
                <th rowSpan={2} style={{ textAlign: 'center', verticalAlign: 'middle', width: '15%' }}>Akcie</th>
              </tr>
              <tr>
                <th style={{ textAlign: 'center', width: '10%' }}>Read/Write</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Read only</th>
                <th style={{ textAlign: 'center', width: '10%' }}>USER</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Admin</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Nemá</th>
              </tr>
            </thead>
            <tbody>
              {[...accessItems].sort((a, b) => a.name.localeCompare(b.name, 'sk')).map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={item.levels.includes('Read/Write')} 
                      onChange={() => handleToggleAccessLevel(item.id, 'Read/Write')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        accentColor: 'var(--accent-primary)',
                        cursor: 'pointer'
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={item.levels.includes('Read only')} 
                      onChange={() => handleToggleAccessLevel(item.id, 'Read only')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        accentColor: 'var(--accent-primary)',
                        cursor: 'pointer'
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={item.levels.includes('USER')} 
                      onChange={() => handleToggleAccessLevel(item.id, 'USER')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        accentColor: 'var(--accent-primary)',
                        cursor: 'pointer'
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={item.levels.includes('Admin')} 
                      onChange={() => handleToggleAccessLevel(item.id, 'Admin')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        accentColor: 'var(--accent-primary)',
                        cursor: 'pointer'
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={item.levels.includes('Nemá')} 
                      onChange={() => handleToggleAccessLevel(item.id, 'Nemá')}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        accentColor: 'var(--accent-primary)',
                        cursor: 'pointer'
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                      <button 
                        className="btn-icon" 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#60a5fa', 
                          cursor: 'pointer', 
                          fontSize: '1.05rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }} 
                        onClick={() => handleEditAccessClick(item)}
                        title="Upraviť prístup"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(96, 165, 250, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon" 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#f87171', 
                          cursor: 'pointer', 
                          fontSize: '1.05rem',
                          padding: '0.2rem 0.4rem',
                          borderRadius: '4px',
                          transition: 'background 0.2s'
                        }} 
                        onClick={() => handleDeleteAccess(item.id, item.name)}
                        title="Vymazať prístup"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        ❌
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Access Item Modal */}
      {showAddAccessModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Pridať prístup</h3>
              <button className="btn-close" onClick={() => setShowAddAccessModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleAddAccessSubmit}>
              <div className="form-group">
                <label className="form-label">Názov prístupu</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="napr. AD, Trimel, SAP ERP" 
                  value={newAccessName} 
                  onChange={e => setNewAccessName(e.target.value)} 
                  required 
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>Uložiť</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAccessModal(false)}>Zrušiť</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Access Item Modal */}
      {showEditAccessModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Upraviť prístup</h3>
              <button className="btn-close" onClick={() => setShowEditAccessModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleEditAccessSubmit}>
              <div className="form-group">
                <label className="form-label">Názov prístupu</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editAccessName} 
                  onChange={e => setEditAccessName(e.target.value)} 
                  required 
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>Uložiť zmeny</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditAccessModal(false)}>Zrušiť</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '420px', border: '1px solid rgba(239, 68, 68, 0.25)', boxShadow: '0 10px 30px rgba(239, 68, 68, 0.15)', animation: 'fadeIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ❌ Chyba v systéme
              </h3>
              <button className="btn-close" onClick={() => setError('')}>✕</button>
            </div>
            <div style={{ margin: '1rem 0 2rem 0', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {error}
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setError('')}>
                Rozumiem
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '420px', animation: 'fadeIn 0.2s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {confirmConfig.title}
              </h3>
              <button className="btn-close" onClick={() => setShowConfirm(false)}>✕</button>
            </div>
            <div style={{ margin: '1rem 0 2rem 0', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              {confirmConfig.message}
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmConfig.onConfirm}
              >
                Potvrdiť
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowConfirm(false)}
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
