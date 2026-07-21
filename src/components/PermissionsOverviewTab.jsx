import React, { useState, useEffect } from 'react';

export default function PermissionsOverviewTab({ currentUser }) {
  const [mode, setMode] = useState('users'); // 'users' | 'accesses'
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [accessItems, setAccessItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedAccessId, setSelectedAccessId] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, groupsRes, userGroupsRes, accessItemsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/groups'),
        fetch('/api/user-groups'),
        fetch('/api/access-items')
      ]);

      if (!usersRes.ok || !groupsRes.ok || !userGroupsRes.ok || !accessItemsRes.ok) {
        throw new Error('Nepodarilo sa načítať dáta pre prehľad oprávnení.');
      }

      const usersData = await usersRes.json();
      const groupsData = await groupsRes.json();
      const userGroupsData = await userGroupsRes.json();
      const accessItemsData = await accessItemsRes.json();

      setUsers(usersData);
      setGroups(groupsData);
      setUserGroups(userGroupsData);
      setAccessItems(accessItemsData);

      if (usersData.length > 0 && !selectedUserId) {
        setSelectedUserId(usersData[0].id);
      }
      if (accessItemsData.length > 0 && !selectedAccessId) {
        setSelectedAccessId(accessItemsData[0].id);
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

  // Compute effective accesses for a specific user
  const getEffectiveAccessesForUser = (user) => {
    if (!user) return [];
    const mapping = userGroups.find(ug => ug.userId === user.id) || { groupIds: [] };
    const userGroupItems = groups.filter(g => mapping.groupIds.includes(g.id));
    const accessMap = {};

    // Inherited from groups
    userGroupItems.forEach(group => {
      (group.systems || []).forEach(sys => {
        const name = typeof sys === 'object' ? sys.name : sys;
        let level = typeof sys === 'object' ? sys.level : 'Read/Write';

        const allowed = accessItems.find(it => it.name === name)?.levels || ['Read/Write'];
        if (!allowed.includes(level)) {
          level = allowed[0] || 'Read/Write';
        }

        if (!accessMap[name]) {
          accessMap[name] = {
            name,
            level,
            groups: [group.name]
          };
        } else {
          if (!accessMap[name].groups.includes(group.name)) {
            accessMap[name].groups.push(group.name);
          }
          const levelRank = { 'Admin': 4, 'Read/Write': 3, 'Read only': 2, 'USER': 1 };
          const currentRank = levelRank[accessMap[name].level] || 1;
          const newRank = levelRank[level] || 1;
          if (newRank > currentRank) {
            accessMap[name].level = level;
          }
        }
      });
    });

    // Apply direct overrides only for inherited systems
    (user.systems || []).forEach(sys => {
      const name = sys.name;
      let level = sys.level;

      if (accessMap[name]) {
        const allowed = accessItems.find(it => it.name === name)?.levels || ['Read/Write'];
        if (!allowed.includes(level)) {
          level = allowed[0] || 'Read/Write';
        }
        accessMap[name].level = level;
        if (!accessMap[name].groups.includes('Priame priradenie')) {
          accessMap[name].groups.push('Priame priradenie');
        }
      }
    });

    return Object.values(accessMap).sort((a, b) => a.name.localeCompare(b.name, 'sk'));
  };

  // Compute users with access for a specific access item
  const getUsersForAccess = (accessItem) => {
    if (!accessItem) return [];
    const results = [];

    users.forEach(user => {
      const effectiveAccesses = getEffectiveAccessesForUser(user);
      const matchingAccess = effectiveAccesses.find(a => a.name === accessItem.name);
      if (matchingAccess) {
        results.push({
          user,
          level: matchingAccess.level,
          sources: matchingAccess.groups
        });
      }
    });

    return results.sort((a, b) => a.user.name.localeCompare(b.user.name, 'sk'));
  };

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];
  const selectedAccess = accessItems.find(a => a.id === selectedAccessId) || accessItems[0];

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(filterQuery.toLowerCase())) ||
    (u.department && u.department.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const filteredAccesses = accessItems.filter(a =>
    a.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const getBadgeStyle = (level) => {
    if (level === 'Admin') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
    if (level === 'Read only') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#fde047', border: 'rgba(245, 158, 11, 0.3)' };
    if (level === 'USER') return { bg: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0', border: 'rgba(16, 185, 129, 0.3)' };
    return { bg: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', border: 'rgba(6, 182, 212, 0.3)' };
  };

  return (
    <div className="view-container">
      <div className="page-title-section">
        <h2 className="page-title">Prehľad oprávnení</h2>
        <p className="page-subtitle">Prehľadné zobrazenie prístupov používateľov k jednotlivým systémom a zdrojom</p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left Master Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Zobraziť podľa
              </label>
              <select 
                className="form-select" 
                value={mode} 
                onChange={e => {
                  setMode(e.target.value);
                  setFilterQuery('');
                }}
                style={{ fontWeight: '600', fontSize: '0.95rem' }}
              >
                <option value="users">👤 Užívateľ</option>
                <option value="accesses">🔑 Prístupy</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder={mode === 'users' ? 'Vyhľadať užívateľa...' : 'Vyhľadať prístup...'}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.65rem 0.85rem' }}
              />
            </div>
          </div>

          {/* Master Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.2rem' }}>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>Načítavam...</div>
            ) : mode === 'users' ? (
              filteredUsers.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Žiadni užívatelia.</div>
              ) : (
                filteredUsers.map(user => {
                  const isSelected = selectedUser && selectedUser.id === user.id;
                  const effectiveCount = getEffectiveAccessesForUser(user).length;
                  return (
                    <div 
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className="card"
                      style={{ 
                        padding: '0.9rem 1.1rem', 
                        cursor: 'pointer', 
                        borderColor: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 'var(--border-radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.9rem', flexShrink: 0 }}>
                          {user.name.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.department || 'Bez oddelenia'}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-user" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}>
                        {effectiveCount}
                      </span>
                    </div>
                  );
                })
              )
            ) : (
              filteredAccesses.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Žiadne prístupy.</div>
              ) : (
                filteredAccesses.map(access => {
                  const isSelected = selectedAccess && selectedAccess.id === access.id;
                  const userCount = getUsersForAccess(access).length;
                  return (
                    <div 
                      key={access.id}
                      onClick={() => setSelectedAccessId(access.id)}
                      className="card"
                      style={{ 
                        padding: '0.9rem 1.1rem', 
                        cursor: 'pointer', 
                        borderColor: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.01)',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 'var(--border-radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🔑</span>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {access.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {access.levels ? access.levels.join(', ') : 'Read/Write'}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-admin" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', flexShrink: 0 }}>
                        👥 {userCount}
                      </span>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Detail Column */}
        <div>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Načítavam podrobnosti...
            </div>
          ) : mode === 'users' && selectedUser ? (
            <div className="card" style={{ padding: '2rem', animation: 'fadeIn 0.25s ease-out' }}>
              {/* User Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <div className="user-avatar" style={{ width: '55px', height: '55px', fontSize: '1.6rem' }}>
                  {selectedUser.name.charAt(0)}
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem' }}>{selectedUser.name}</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {selectedUser.email && <span>✉️ {selectedUser.email}</span>}
                    {selectedUser.department && <span>🏢 {selectedUser.department}</span>}
                  </div>
                </div>
                <span className={`badge ${selectedUser.status === 'Aktivovaný' ? 'badge-active' : 'badge-blocked'}`}>
                  {selectedUser.status}
                </span>
              </div>

              {/* Effective Accesses List */}
              <div>
                <h4 style={{ color: 'white', marginBottom: '1.25rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🔑 Zoznam priradených prístupov</span>
                  <span className="badge badge-user" style={{ fontSize: '0.8rem' }}>
                    {getEffectiveAccessesForUser(selectedUser).length} prístupov
                  </span>
                </h4>

                {(() => {
                  const userAccesses = getEffectiveAccessesForUser(selectedUser);
                  if (userAccesses.length === 0) {
                    return (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                        Užívateľ nemá priradené žiadne systémové prístupy ani skupiny.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {userAccesses.map(access => {
                        const badge = getBadgeStyle(access.level);
                        return (
                          <div 
                            key={access.name}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '0.9rem 1.25rem', 
                              background: 'rgba(255, 255, 255, 0.02)', 
                              border: '1px solid rgba(255, 255, 255, 0.05)', 
                              borderRadius: 'var(--border-radius-sm)',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                          >
                            <div>
                              <div style={{ fontWeight: '600', color: 'white', fontSize: '0.95rem' }}>
                                🔑 {access.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                Zdroj prístupu: <span style={{ color: 'var(--accent-secondary)' }}>{access.groups.join(', ')}</span>
                              </div>
                            </div>

                            <span style={{ 
                              background: badge.bg, 
                              color: badge.color, 
                              border: `1px solid ${badge.border}`,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              fontWeight: '600',
                              fontSize: '0.8rem'
                            }}>
                              {access.level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : mode === 'accesses' && selectedAccess ? (
            <div className="card" style={{ padding: '2rem', animation: 'fadeIn 0.25s ease-out' }}>
              {/* Access Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <div style={{ 
                  width: '55px', 
                  height: '55px', 
                  borderRadius: 'var(--border-radius-sm)', 
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem'
                }}>
                  🔑
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.4rem' }}>{selectedAccess.name}</h3>
                  <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Dostupné úrovne prístupu: <strong style={{ color: 'white' }}>{(selectedAccess.levels || ['Read/Write']).join(', ')}</strong>
                  </div>
                </div>
              </div>

              {/* Users List for Access */}
              <div>
                <h4 style={{ color: 'white', marginBottom: '1.25rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>👥 Užívatelia s prístupom k tomuto systému</span>
                  <span className="badge badge-admin" style={{ fontSize: '0.8rem' }}>
                    {getUsersForAccess(selectedAccess).length} užívateľov
                  </span>
                </h4>

                {(() => {
                  const accessUsers = getUsersForAccess(selectedAccess);
                  if (accessUsers.length === 0) {
                    return (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                        Žiadny používateľ v systéme nemá priradené toto oprávnenie.
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {accessUsers.map(({ user, level, sources }) => {
                        const badge = getBadgeStyle(level);
                        return (
                          <div 
                            key={user.id}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '0.9rem 1.25rem', 
                              background: 'rgba(255, 255, 255, 0.02)', 
                              border: '1px solid rgba(255, 255, 255, 0.05)', 
                              borderRadius: 'var(--border-radius-sm)',
                              transition: 'background-color 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: 'white', fontSize: '0.95rem' }}>
                                  {user.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  {user.department || 'Bez oddelenia'} • Zdroj: <span style={{ color: 'var(--accent-secondary)' }}>{sources.join(', ')}</span>
                                </div>
                              </div>
                            </div>

                            <span style={{ 
                              background: badge.bg, 
                              color: badge.color, 
                              border: `1px solid ${badge.border}`,
                              padding: '0.25rem 0.75rem',
                              borderRadius: '4px',
                              fontWeight: '600',
                              fontSize: '0.8rem'
                            }}>
                              {level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Vyberte položku zo zoznamu vľavo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
