import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parseInt(parts[2], 10)}. ${parseInt(parts[1], 10)}. ${parts[0]}`;
  }
  return dateStr;
};

const convertExcelDate = (excelDate) => {
  if (!excelDate) return '';
  if (!isNaN(excelDate) && String(excelDate).trim() !== '') {
    const num = Number(excelDate);
    const date = new Date((num - 25569) * 86400 * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(excelDate).trim();
};

export default function UsersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedUsers, setExpandedUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [manageAccessUser, setManageAccessUser] = useState(null);
  const [tempUserGroupIds, setTempUserGroupIds] = useState([]);
  const [tempUserSystems, setTempUserSystems] = useState([]);
  const [accessItems, setAccessItems] = useState([]);

  // Import State
  const [importMode, setImportMode] = useState(false);
  const [importedUsers, setImportedUsers] = useState([]);
  const [importGroupIds, setImportGroupIds] = useState([]);

  const toggleUserExpand = (userId) => {
    if (expandedUsers.includes(userId)) {
      setExpandedUsers(expandedUsers.filter(id => id !== userId));
    } else {
      setExpandedUsers([...expandedUsers, userId]);
    }
  };

  const handleManageUserAccessClick = (user) => {
    setManageAccessUser(user);
    const mapping = userGroups.find(ug => ug.userId === user.id) || { groupIds: [] };
    setTempUserGroupIds(mapping.groupIds);
    setTempUserSystems(user.systems || []);
    setShowManageAccessModal(true);
  };

  const handleManageUserAccessSave = async (e) => {
    e.preventDefault();
    try {
      // 1. Save groups
      const grpRes = await fetch('/api/user-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: manageAccessUser.id, groupIds: tempUserGroupIds })
      });
      const grpData = await grpRes.json();
      if (!grpRes.ok) throw new Error(grpData.message || 'Chyba pri priraďovaní skupín.');
      setUserGroups(grpData);

      // Filter and save overrides only for active inherited systems
      const effectiveAccesses = getEffectiveAccessesFromGroups(tempUserGroupIds, tempUserSystems);
      const activeSystemNames = effectiveAccesses.map(a => a.name);
      const overridesToSave = tempUserSystems.filter(sys => activeSystemNames.includes(sys.name));

      // 2. Save user with overrides
      const usrRes = await fetch(`/api/users/${manageAccessUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: manageAccessUser.name, systems: overridesToSave })
      });
      const usrData = await usrRes.json();
      if (!usrRes.ok) throw new Error(usrData.message || 'Chyba pri ukladaní zmien.');
      setUsers(usrData);

      setShowManageAccessModal(false);
      setManageAccessUser(null);
    } catch (err) {
      setError(err.message);
    }
  };
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        let parsedRows = [];

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = new TextDecoder('utf-8').decode(data);
          const lines = text.split(/\r?\n/);
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const values = lines[i].split(',').map(v => v.replace(/^["']|["']$/g, '').trim());
              const row = {};
              headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
              });
              parsedRows.push(row);
            }
          }
        } else {
          // Parse Excel using ArrayBuffer
          const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        }

        if (parsedRows.length === 0) {
          alert('Súbor je prázdny alebo neobsahuje žiadne riadky s dátami.');
          return;
        }

        // Flexible header mapping
        const mappedUsers = parsedRows.map(row => {
          const mapped = {};
          let firstName = '';
          let lastName = '';

          Object.entries(row).forEach(([key, val]) => {
            const k = key.toLowerCase().trim();
            // First Name
            if (k === '*givenname (meno)' || k === 'givenname' || k === 'krstné meno' || k === 'krstne meno') {
              firstName = String(val).trim();
            } 
            // Last Name
            else if (k === '*sn (priezvisko)' || k === 'sn' || k === 'priezvisko') {
              lastName = String(val).trim();
            } 
            // Full name fallback
            else if (
              k === 'meno' || 
              k === 'name' || 
              k === 'full name' || 
              k === 'celé meno' || 
              k === 'meno a priezvisko' || 
              k === 'používateľ' || 
              k === 'uzivatel' || 
              k === 'zamestnanec'
            ) {
              mapped.name = String(val).trim();
            } 
            // Email
            else if (k === '*mail' || k === 'email' || k === 'e-mail' || k === 'mail' || k === 'adresa') {
              mapped.email = String(val).trim();
            } 
            // Department
            else if (k === '*department (oddelenie)' || k === 'department' || k === 'oddelenie' || k === 'sekcia' || k === 'odbor') {
              mapped.department = String(val).trim();
            } 
            // Entry date
            else if (k === 'dátum nástupu' || k === 'nástup' || k === 'entry date' || k === 'datum nastupu' || k === 'entry_date') {
              mapped.entry_date = convertExcelDate(val);
            } 
            // Exit date
            else if (k === 'dátum výstupu' || k === 'výstup' || k === 'exit date' || k === 'datum vystupu' || k === 'exit_date') {
              mapped.exit_date = convertExcelDate(val);
            }
          });

          // Combine firstName and lastName if present
          if (firstName || lastName) {
            mapped.name = `${firstName} ${lastName}`.trim();
          }

          return mapped;
        }).filter(u => u.name && u.name.trim() !== "");

        if (mappedUsers.length === 0) {
          alert("V súbore sa nenašli žiadni platní používatelia. Uistite sa, že prvý riadok obsahuje hlavičky stĺpcov, najmä stĺpec 'Meno' alebo 'Name'.");
          return;
        }

        setImportedUsers(mappedUsers);
      } catch (err) {
        alert('Chyba pri čítaní súboru: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (importedUsers.length === 0) {
      alert('Žiadni používatelia na import.');
      return;
    }

    try {
      const response = await fetch('/api/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: importedUsers,
          groupIds: importGroupIds
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri hromadnom importe.');
      }

      setUsers(data.users);
      setUserGroups(data.userGroups);
      setShowAddForm(false);
      setImportMode(false);
      setImportedUsers([]);
      setImportGroupIds([]);
      
      alert(`Úspešne naimportovaných ${importedUsers.length} používateľov.`);
    } catch (err) {
      alert(err.message);
    }
  };

  const getEffectiveAccessesFromGroups = (groupIdsList, directSystemsList = []) => {
    const userGroupItems = groups.filter(g => groupIdsList.includes(g.id));
    const accessMap = {};
    
    // Inherited from groups
    userGroupItems.forEach(group => {
      group.systems.forEach(sys => {
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
    directSystemsList.forEach(sys => {
      const name = sys.name;
      let level = sys.level;
      
      if (accessMap[name]) {
        const allowed = accessItems.find(it => it.name === name)?.levels || ['Read/Write'];
        if (!allowed.includes(level)) {
          level = allowed[0] || 'Read/Write';
        }
        accessMap[name].level = level;
      }
    });
    
    return Object.values(accessMap).sort((a, b) => a.name.localeCompare(b.name, 'sk'));
  };
  
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Aktivovaný');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');

  const fetchData = async () => {
    const userPerm = currentUser.permissions?.user_management || 'Žiadne';
    if (userPerm === 'Žiadne') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const usersRes = await fetch('/api/users');
      const groupsRes = await fetch('/api/groups');
      const userGroupsRes = await fetch('/api/user-groups');
      const accessItemsRes = await fetch('/api/access-items');

      if (!usersRes.ok || !groupsRes.ok || !userGroupsRes.ok || !accessItemsRes.ok) {
        throw new Error('Nepodarilo sa načítať všetky potrebné dáta.');
      }

      const usersData = await usersRes.json();
      const groupsData = await groupsRes.json();
      const userGroupsData = await userGroupsRes.json();
      const accessItemsData = await accessItemsRes.json();

      setUsers(usersData);
      setGroups(groupsData);
      setUserGroups(userGroupsData);
      setAccessItems(accessItemsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const getUserEffectiveAccesses = (userId) => {
    const user = users.find(u => u.id === userId);
    const mapping = userGroups.find(ug => ug.userId === userId) || { groupIds: [] };
    const userGroupItems = groups.filter(g => mapping.groupIds.includes(g.id));
    
    const accessMap = {};
    
    userGroupItems.forEach(group => {
      group.systems.forEach(sys => {
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
    if (user && user.systems && Array.isArray(user.systems)) {
      user.systems.forEach(sys => {
        const name = sys.name;
        let level = sys.level;
        
        if (accessMap[name]) {
          const allowed = accessItems.find(it => it.name === name)?.levels || ['Read/Write'];
          if (!allowed.includes(level)) {
            level = allowed[0] || 'Read/Write';
          }
          accessMap[name].level = level;
        }
      });
    }
    
    return Object.values(accessMap).sort((a, b) => a.name.localeCompare(b.name, 'sk'));
  };

  const getCategorizedAccesses = (userId) => {
    const userAccesses = getUserEffectiveAccesses(userId);
    
    const categories = {
      'Trimel': [],
      'Active Directory / AD': [],
      'VPN': [],
      'Ostatné prístupy': []
    };
    
    userAccesses.forEach(access => {
      const nameLower = access.name.toLowerCase();
      if (nameLower.includes('trimel')) {
        categories['Trimel'].push(access);
      } else if (nameLower.includes('active directory') || nameLower === 'ad') {
        categories['Active Directory / AD'].push(access);
      } else if (nameLower.includes('vpn')) {
        categories['VPN'].push(access);
      } else {
        categories['Ostatné prístupy'].push(access);
      }
    });
    
    return categories;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Meno je povinné.');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status, email, department, entry_date: entryDate, exit_date: exitDate })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri vytváraní užívateľa');
      }
      setUsers(data);
      setShowAddForm(false);
      // Reset form
      setName('');
      setStatus('Aktivovaný');
      setEmail('');
      setDepartment('');
      setEntryDate('');
      setExitDate('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setName(user.name);
    setStatus(user.status);
    setEmail(user.email || '');
    setDepartment(user.department || '');
    setEntryDate(user.entry_date || '');
    setExitDate(user.exit_date || '');
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status, email, department, entry_date: entryDate, exit_date: exitDate })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri úprave užívateľa');
      }
      setUsers(data);
      setShowEditForm(false);
      setSelectedUser(null);
      // Reset states
      setName('');
      setStatus('Aktivovaný');
      setEmail('');
      setDepartment('');
      setEntryDate('');
      setExitDate('');
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
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri mazaní užívateľa.');
      }
      setUsers(data);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const userPerm = currentUser.permissions?.user_management || 'Žiadne';

  if (userPerm === 'Žiadne') {
    return (
      <div className="view-container">
        <div className="page-title-section">
          <h2 className="page-title">Užívatelia</h2>
          <p className="page-subtitle">Prehľad vášho profilu</p>
        </div>
        
        <div className="card" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.8rem' }}>
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h3>{currentUser.name}</h3>
              <p style={{ color: 'var(--text-muted)' }}>@{currentUser.username}</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Rola prístupu</span>
              <span className="badge badge-user" style={{ marginTop: '0.25rem' }}>
                {currentUser.role === 'admin' ? 'Administrátor IAM' : 'Oprávnený užívateľ'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Stav účtu</span>
              <span className="badge badge-active" style={{ marginTop: '0.25rem' }}>Aktivovaný</span>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 'var(--border-radius-sm)', color: '#fca5a5', fontSize: '0.9rem' }}>
            ⚠️ Z bezpečnostných dôvodov nemá vaša rola oprávnenie spravovať a prezerať ostatných užívateľov v systéme. V prípade potreby zmien kontaktujte administrátora.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Užívatelia</h2>
          <p className="page-subtitle">Správa užívateľských účtov a ich prístupových rolí</p>
        </div>
        {userPerm === 'Zápis' && (
          <button className="btn btn-primary" onClick={() => { 
            setShowEditForm(false); 
            setShowAddForm(!showAddForm); 
            setImportMode(false);
            setName('');
            setStatus('Aktivovaný');
            setEmail('');
            setDepartment('');
            setEntryDate('');
            setExitDate('');
            setImportedUsers([]);
            setImportGroupIds([]);
          }}>
            {showAddForm ? 'Zrušiť' : '➕ Nový užívateľ'}
          </button>
        )}
      </div>



      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ width: '750px', maxWidth: '95vw', minHeight: '390px', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease-out' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '236px', display: 'flex' }}>
                  <span 
                    onClick={() => {
                      setImportMode(false);
                      setImportedUsers([]);
                      setImportGroupIds([]);
                    }}
                    style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem', 
                      cursor: 'pointer',
                      color: !importMode ? 'var(--accent-primary)' : 'rgba(139, 92, 246, 0.4)',
                      borderBottom: !importMode ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      paddingBottom: '0.25rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ color: 'var(--accent-primary)', marginRight: '0.1rem' }}>+</span> Nový užívateľ
                  </span>
                </div>
                <span 
                  onClick={() => {
                    setImportMode(true);
                    setImportedUsers([]);
                    setImportGroupIds([]);
                  }}
                  style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    cursor: 'pointer',
                    color: importMode ? 'var(--accent-primary)' : 'rgba(139, 92, 246, 0.4)',
                    borderBottom: importMode ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    paddingBottom: '0.25rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ color: importMode ? 'var(--accent-primary)' : 'rgba(139, 92, 246, 0.4)', marginRight: '0.1rem' }}>📥</span> Import z Excelu/CSV
                </span>
              </div>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowAddForm(false);
                  setName('');
                  setStatus('Aktivovaný');
                  setEmail('');
                  setDepartment('');
                  setEntryDate('');
                  setExitDate('');
                  setImportMode(false);
                  setImportedUsers([]);
                  setImportGroupIds([]);
                }}
              >
                ✕
              </button>
            </div>

            {!importMode ? (
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem', marginTop: '1rem', height: '168px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Meno užívateľa</label>
                    <input type="text" className="form-input" placeholder="napr. Ján Mrkvička" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Emailová adresa</label>
                    <input type="email" className="form-input" placeholder="napr. jan.mrkvicka@petrzalka.sk" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Oddelenie</label>
                    <input type="text" className="form-input" placeholder="napr. IT" value={department} onChange={e => setDepartment(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Dátum nástupu</label>
                    <input type="date" className="form-input" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Dátum výstupu</label>
                    <input type="date" className="form-input" value={exitDate} onChange={e => setExitDate(e.target.value)} />
                  </div>
                </div>
                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: 'auto' }}>
                  <button type="submit" className="btn btn-primary">Uložiť</button>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowAddForm(false);
                    setName('');
                    setStatus('Aktivovaný');
                    setEmail('');
                    setDepartment('');
                    setEntryDate('');
                    setExitDate('');
                    setImportMode(false);
                  }}>Zrušiť</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {importedUsers.length === 0 ? (
                  <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      border: '2px dashed rgba(255,255,255,0.15)',
                      borderRadius: 'var(--border-radius-sm)',
                      height: '168px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      background: 'rgba(0,0,0,0.1)',
                      position: 'relative',
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}>
                      <input 
                        type="file" 
                        accept=".xlsx,.xls,.csv" 
                        onChange={handleImportFileChange}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, width: '100%', height: '100%',
                          opacity: 0, cursor: 'pointer'
                        }}
                      />
                      <div style={{ fontSize: '2.2rem', marginBottom: '0.4rem' }}>📥</div>
                      <div style={{ fontWeight: '600', color: 'white', fontSize: '1rem' }}>Pretiahnite Excel (.xlsx, .xls) alebo CSV súbor</div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', marginBottom: 0 }}>
                        alebo kliknite pre prehliadanie súborov z vášho počítača
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', fontWeight: '600' }}>
                        📋 Náhľad importovaných dát ({importedUsers.length} používateľov)
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => {
                          setImportedUsers([]);
                          setImportGroupIds([]);
                        }}
                      >
                        🔄 Vybrať iný súbor
                      </button>
                    </div>

                    <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', background: 'rgba(0,0,0,0.1)' }}>
                      <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Meno</th>
                            <th>Email</th>
                            <th>Oddelenie</th>
                            <th>Nástup</th>
                            <th>Výstup</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importedUsers.map((u, idx) => (
                            <tr key={idx}>
                              <td><strong>{u.name}</strong></td>
                              <td>{u.email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                              <td>{u.department || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                              <td>{formatDate(u.entry_date)}</td>
                              <td>{formatDate(u.exit_date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <label className="form-label" style={{ marginBottom: '0.6rem', display: 'block', fontWeight: '600' }}>
                        👥 Priradiť všetkých do prístupových skupín:
                      </label>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                        gap: '0.75rem', 
                        padding: '1rem', 
                        background: 'rgba(255,255,255,0.02)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--border-radius-sm)' 
                      }}>
                        {groups.map(group => (
                          <label 
                            key={group.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              cursor: 'pointer', 
                              fontSize: '0.85rem', 
                              color: importGroupIds.includes(group.id) ? 'white' : 'var(--text-muted)',
                              fontWeight: importGroupIds.includes(group.id) ? '600' : 'normal'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={importGroupIds.includes(group.id)}
                              style={{ cursor: 'pointer' }}
                              onChange={e => {
                                if (e.target.checked) {
                                  setImportGroupIds([...importGroupIds, group.id]);
                                } else {
                                  setImportGroupIds(importGroupIds.filter(id => id !== group.id));
                                }
                              }}
                            />
                            <span>👥 {group.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                  {importedUsers.length > 0 && (
                    <button type="submit" className="btn btn-primary">
                      🚀 Potvrdiť import ({importedUsers.length} užívateľov)
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowAddForm(false);
                      setImportedUsers([]);
                      setImportGroupIds([]);
                      setImportMode(false);
                    }}
                  >
                    Zrušiť
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}



      {showEditForm && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '750px', animation: 'fadeIn 0.25s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ✏️ Upraviť užívateľa: <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>{selectedUser.name}</span>
              </h3>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedUser(null);
                  setName('');
                  setStatus('Aktivovaný');
                  setEmail('');
                  setDepartment('');
                  setEntryDate('');
                  setExitDate('');
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meno užívateľa</label>
                  <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Emailová adresa</label>
                  <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Oddelenie</label>
                  <input type="text" className="form-input" value={department} onChange={e => setDepartment(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dátum nástupu</label>
                  <input type="date" className="form-input" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dátum výstupu</label>
                  <input type="date" className="form-input" value={exitDate} onChange={e => setExitDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Stav</label>
                  <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} disabled={selectedUser.id === currentUser.id}>
                    <option value="Aktivovaný">Aktívny</option>
                    <option value="Zablokovaný">Neaktívny</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn btn-primary">Uložiť zmeny</button>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowEditForm(false);
                    setSelectedUser(null);
                    setName('');
                    setStatus('Aktivovaný');
                    setEmail('');
                    setDepartment('');
                    setEntryDate('');
                    setExitDate('');
                  }}>Zrušiť</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ 
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      color: '#c084fc'
                    }}
                    onClick={() => {
                      setShowEditForm(false);
                      handleManageUserAccessClick(selectedUser);
                    }}
                  >
                    🔑 Spravovať prístupy
                  </button>
                </div>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => {
                    setShowEditForm(false);
                    handleDeleteClick(selectedUser);
                  }}
                  disabled={selectedUser.id === currentUser.id}
                >
                  🗑️ Vymazať užívateľa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Načítavam užívateľov...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Žiadni užívatelia v systéme.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Meno</th>
                  <th>Email</th>
                  <th>Oddelenie</th>
                  <th>Dátum nástupu</th>
                  <th>Dátum výstupu</th>
                  <th>Stav</th>
                  <th>Oprávnenia</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const mapping = userGroups.find(ug => ug.userId === user.id) || { groupIds: [] };
                  const userGroupItems = groups.filter(g => mapping.groupIds.includes(g.id));
                  const isExpanded = expandedUsers.includes(user.id);
                  
                  return (
                    <React.Fragment key={user.id}>
                      <tr 
                        onClick={() => toggleUserExpand(user.id)}
                        style={{ 
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                          cursor: 'pointer'
                        }}
                      >
                        <td>
                          {(() => {
                            const nameParts = (user.name || '').trim().split(/\s+/);
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ') || '';
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                <strong>{lastName || '—'}</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{firstName}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td>{user.email || '—'}</td>
                        <td>{user.department || '—'}</td>
                        <td>{formatDate(user.entry_date)}</td>
                        <td>{formatDate(user.exit_date)}</td>
                        <td>
                          <span className={`badge ${user.status === 'Aktivovaný' ? 'badge-active' : 'badge-blocked'}`}>
                            {user.status === 'Aktivovaný' ? 'Aktívny' : 'Neaktívny'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {userGroupItems.length === 0 ? (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Bez skupín</span>
                            ) : (
                              userGroupItems.map(g => (
                                <span key={g.id} className="badge badge-user" style={{ fontSize: '0.75rem' }}>
                                  👥 {g.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {userPerm === 'Zápis' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '100%', maxWidth: '170px', textAlign: 'center' }} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(user);
                                }}
                              >
                                ⚙️ Upraviť
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'rgba(0, 0, 0, 0.15)', borderBottom: '1px solid var(--border-color)' }}>
                          <td colSpan={8} style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
                                Zoznam výsledných prístupov a stupňov oprávnení:
                              </span>
                              {(() => {
                                const categorized = getCategorizedAccesses(user.id);
                                const hasAny = Object.values(categorized).some(list => list.length > 0);
                                
                                if (!hasAny) {
                                  return (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                      Tento užívateľ nemá žiadne pridelené prístupy.
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {Object.entries(categorized).sort((a, b) => a[0].localeCompare(b[0], 'sk')).map(([catName, list]) => {
                                      if (list.length === 0) return null;
                                      return (
                                        <details key={catName} open style={{ 
                                          background: 'rgba(0, 0, 0, 0.15)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: 'var(--border-radius-sm)',
                                          overflow: 'hidden'
                                        }}>
                                          <summary style={{ 
                                            padding: '0.6rem 1rem', 
                                            fontWeight: '600', 
                                            color: 'white', 
                                            cursor: 'pointer',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            userSelect: 'none',
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)'
                                          }}>
                                            📁 {catName} ({list.length})
                                          </summary>
                                          <div style={{ padding: '0.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {list.map(access => (
                                              <div key={access.name} style={{
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                padding: '0.4rem 0.5rem', 
                                                borderBottom: '1px solid rgba(255,255,255,0.02)'
                                              }}>
                                                <div>
                                                  <div style={{ fontWeight: '500', color: 'white', fontSize: '0.85rem' }}>🔑 {access.name}</div>
                                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                                    Skupiny: {access.groups.join(', ')}
                                                  </div>
                                                </div>
                                                <span style={{ 
                                                  background: access.level === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : access.level === 'Read only' ? 'rgba(245, 158, 11, 0.1)' : access.level === 'USER' ? 'rgba(16, 185, 129, 0.1)' : access.level === 'Nemá' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(6, 182, 212, 0.1)',
                                                  color: access.level === 'Admin' ? '#fca5a5' : access.level === 'Read only' ? '#fde047' : access.level === 'USER' ? '#a7f3d0' : access.level === 'Nemá' ? 'var(--text-muted)' : '#67e8f9',
                                                  border: access.level === 'Admin' ? '1px solid rgba(239, 68, 68, 0.2)' : access.level === 'Read only' ? '1px solid rgba(245, 158, 11, 0.2)' : access.level === 'USER' ? '1px solid rgba(16, 185, 129, 0.2)' : access.level === 'Nemá' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(6, 182, 212, 0.2)',
                                                  fontSize: '0.7rem',
                                                  padding: '0.1rem 0.4rem',
                                                  borderRadius: '4px',
                                                  fontWeight: '600'
                                                }}>{access.level}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </details>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Manage User Access Modal */}
      {showManageAccessModal && manageAccessUser && (
        <div className="modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '650px', margin: '1rem',
            animation: 'slideUp 0.3s ease-out', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border-color)', background: 'var(--card-bg)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔑 Spravovať prístupy užívateľa: <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>{manageAccessUser.name}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowManageAccessModal(false); setManageAccessUser(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManageUserAccessSave}>
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
                  Priradené skupiny prístupov:
                </span>
                
                {groups.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Nie sú definované žiadne skupiny.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                    {groups.map(group => {
                      const isChecked = tempUserGroupIds.includes(group.id);
                      return (
                        <label key={group.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'white' }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              if (isChecked) {
                                setTempUserGroupIds(tempUserGroupIds.filter(id => id !== group.id));
                              } else {
                                setTempUserGroupIds([...tempUserGroupIds, group.id]);
                              }
                            }}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                          />
                          👥 {group.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', fontWeight: '600' }}>
                  Náhľad výsledných prístupov a úrovní:
                </span>
                
                {(() => {
                  const resultingAccesses = getEffectiveAccessesFromGroups(tempUserGroupIds, tempUserSystems);
                  
                  // Categorize
                  const categories = {
                    'Trimel': [],
                    'Active Directory / AD': [],
                    'VPN': [],
                    'Ostatné prístupy': []
                  };
                  
                  resultingAccesses.forEach(access => {
                    const nameLower = access.name.toLowerCase();
                    if (nameLower.includes('trimel')) {
                      categories['Trimel'].push(access);
                    } else if (nameLower.includes('active directory') || nameLower === 'ad') {
                      categories['Active Directory / AD'].push(access);
                    } else if (nameLower.includes('vpn')) {
                      categories['VPN'].push(access);
                    } else {
                      categories['Ostatné prístupy'].push(access);
                    }
                  });

                  const hasAccesses = resultingAccesses.length > 0;
                  return !hasAccesses ? (
                    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>
                      Priraďte aspoň jednu skupinu.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                      {Object.entries(categories).sort((a, b) => a[0].localeCompare(b[0], 'sk')).map(([catName, list]) => {
                        if (list.length === 0) return null;
                        return (
                          <div key={catName}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              📁 {catName} ({list.length})
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem', marginBottom: '0.5rem' }}>
                              {list.map(access => (
                                <div 
                                  key={access.name} 
                                  style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--border-radius-sm)',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                                >
                                  <div>
                                    <div style={{ fontWeight: '500', color: 'white', fontSize: '0.85rem' }}>🔑 {access.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                      Z: {access.groups.join(', ')}
                                    </div>
                                  </div>
                                  <select 
                                    value={access.level}
                                    onChange={e => {
                                      const newLevel = e.target.value;
                                      const exists = tempUserSystems.some(s => s.name === access.name);
                                      if (exists) {
                                        setTempUserSystems(tempUserSystems.map(s => s.name === access.name ? { ...s, level: newLevel } : s));
                                      } else {
                                        setTempUserSystems([...tempUserSystems, { name: access.name, level: newLevel }]);
                                      }
                                    }}
                                    className="badge-select"
                                    style={{ 
                                      background: access.level === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : access.level === 'Read only' ? 'rgba(245, 158, 11, 0.1)' : access.level === 'USER' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                                      color: access.level === 'Admin' ? '#fca5a5' : access.level === 'Read only' ? '#fde047' : access.level === 'USER' ? '#a7f3d0' : '#67e8f9',
                                      border: access.level === 'Admin' ? '1px solid rgba(239, 68, 68, 0.2)' : access.level === 'Read only' ? '1px solid rgba(245, 158, 11, 0.2)' : access.level === 'USER' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(6, 182, 212, 0.2)',
                                      fontSize: '0.75rem',
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '4px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      outline: 'none',
                                      borderStyle: 'solid',
                                      borderWidth: '1px',
                                      textAlign: 'center'
                                    }}
                                  >
                                    {(accessItems.find(it => it.name === access.name)?.levels || ['Read/Write']).map(lvl => (
                                      <option key={lvl} value={lvl} style={{ background: 'var(--card-bg)', color: 'white' }}>{lvl}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Uložiť prístupy</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowManageAccessModal(false); setManageAccessUser(null); }}>
                  Zrušiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Naozaj chcete vymazať bežného užívateľa <strong>"{userToDelete.name}"</strong>? 
              <br />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                Táto akcia je nevratná a odstráni aj všetky priradenia do prístupových skupín.
              </span>
            </div>
            <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
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

      {error && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '420px', border: '1px solid rgba(239, 68, 68, 0.25)', boxShadow: '0 10px 30px rgba(239, 68, 68, 0.15)' }}>
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
    </div>
  );
}
