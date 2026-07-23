import React, { useState, useEffect } from 'react';

export default function DepartmentsTab({ currentUser }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Collapse/Expand state
  const [collapsedNodeIds, setCollapsedNodeIds] = useState([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptParentId, setNewDeptParentId] = useState('');
  
  const hasWritePermission = currentUser.role === 'admin' || 
    (currentUser.permissions && currentUser.permissions.global_settings === 'Zápis');

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/departments');
      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať zoznam oddelení.');
      }
      const data = await response.json();
      setDepartments(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [currentUser]);

  const toggleCollapse = (id) => {
    if (collapsedNodeIds.includes(id)) {
      setCollapsedNodeIds(collapsedNodeIds.filter(nodeId => nodeId !== id));
    } else {
      setCollapsedNodeIds([...collapsedNodeIds, id]);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeptName.trim(),
          parentId: newDeptParentId || null
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri vytváraní oddelenia.');
      }
      setDepartments(data);
      setShowAddModal(false);
      setNewDeptName('');
      setNewDeptParentId('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (dept) => {
    // Count child nodes recursively for warning message
    const countChildren = (nodes, parentId) => {
      let count = 0;
      const children = nodes.filter(n => n.parentId === parentId);
      children.forEach(c => {
        count += 1 + countChildren(nodes, c.id);
      });
      return count;
    };

    const childrenCount = countChildren(departments, dept.id);
    let msg = `Naozaj chcete vymazať oddelenie "${dept.name}"?`;
    if (childrenCount > 0) {
      msg += `\n\n⚠️ POZOR: Toto oddelenie obsahuje ${childrenCount} podriadených oddelení, ktoré budú tiež trvalo vymazané! Všetkým priradeným používateľom bude toto oddelenie zrušené.`;
    } else {
      msg += `\n\nPoužívateľom s týmto oddelením bude nastavené "Bez oddelenia".`;
    }

    if (!window.confirm(msg)) return;

    try {
      const response = await fetch(`/api/departments/${dept.id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Chyba pri mazaní oddelenia.');
      }
      setDepartments(data);
    } catch (err) {
      alert(err.message);
    }
  };

  // Helper to build a flat list of visible tree nodes
  const buildTreeList = (nodes, parentId = null, depth = 0) => {
    let result = [];
    const levelNodes = nodes.filter(n => n.parentId === parentId);
    
    // Sort alphabetically by name
    levelNodes.sort((a, b) => a.name.localeCompare(b.name, 'sk'));
    
    levelNodes.forEach(node => {
      const isCollapsed = collapsedNodeIds.includes(node.id);
      const hasChildren = nodes.some(n => n.parentId === node.id);
      result.push({ ...node, depth, hasChildren, isCollapsed });
      
      if (!isCollapsed) {
        result = result.concat(buildTreeList(nodes, node.id, depth + 1));
      }
    });
    return result;
  };

  const treeList = buildTreeList(departments);

  if (loading) {
    return (
      <div className="view-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div className="loader">Načítavam oddelenia...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="page-title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Správa oddelení</h2>
          <p className="page-subtitle">Hierarchická stromová štruktúra oddelení miestneho úradu</p>
        </div>
        {hasWritePermission && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              setNewDeptParentId('');
              setShowAddModal(true);
            }}
          >
            ➕ Nové hlavné oddelenie
          </button>
        )}
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="card" style={{ padding: '1.5rem', background: 'rgba(30,30,40,0.4)', backdropFilter: 'blur(10px)' }}>
        {treeList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            🏢 Zatiaľ neboli vytvorené žiadne oddelenia. Kliknite na tlačidlo vyššie pre vytvorenie prvého.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {treeList.map((node) => (
              <div 
                key={node.id} 
                className="department-node-row"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem', 
                  paddingLeft: `calc(1rem + ${node.depth * 2}rem)`, 
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--border-radius-sm)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Visual line indicating hierarchy level */}
                {node.depth > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: `calc(1.1rem + ${(node.depth - 1) * 2}rem)`,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    borderLeft: '1px dashed rgba(255,255,255,0.1)'
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 2 }}>
                  {node.hasChildren ? (
                    <button 
                      onClick={() => toggleCollapse(node.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--accent-primary)', 
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        transform: node.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    >
                      ▼
                    </button>
                  ) : (
                    <div style={{ width: '16px' }} />
                  )}
                  <span style={{ fontSize: '1.2rem' }}>🏢</span>
                  <span style={{ fontWeight: node.depth === 0 ? '600' : 'normal', color: 'white' }}>
                    {node.name}
                  </span>
                </div>

                {hasWritePermission && (
                  <div style={{ display: 'flex', gap: '0.4rem', zIndex: 2 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                      title="Pridať podriadené pododdelenie"
                      onClick={() => {
                        setNewDeptParentId(node.id);
                        setShowAddModal(true);
                      }}
                    >
                      ➕ Pododdelenie
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: 'var(--accent-secondary)' }}
                      title="Vymazať oddelenie"
                      onClick={() => handleDelete(node)}
                    >
                      ❌ Vymazať
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ width: '500px', maxWidth: '95vw', minHeight: 'auto', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.25s ease-out' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                🏢 {newDeptParentId ? 'Pridať pododdelenie' : 'Nové hlavné oddelenie'}
              </h3>
              <button 
                className="btn-close" 
                onClick={() => {
                  setShowAddModal(false);
                  setNewDeptName('');
                  setNewDeptParentId('');
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Názov oddelenia</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="napr. Referát IT infraštruktúry"
                  value={newDeptName} 
                  onChange={e => setNewDeptName(e.target.value)} 
                  required 
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nadriadené oddelenie</label>
                <select 
                  className="form-select" 
                  value={newDeptParentId} 
                  onChange={e => setNewDeptParentId(e.target.value)}
                >
                  <option value="">-- Bez nadriadeného (Hlavné oddelenie) --</option>
                  {departments
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Uložiť</button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowAddModal(false);
                    setNewDeptName('');
                    setNewDeptParentId('');
                  }}
                >
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
