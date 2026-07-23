import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Initial seed values for RBAC
const initialGroups = [
  {
    id: 'group-admin',
    name: 'Administrátori',
    description: 'Úplný správcovský prístup ku všetkým systémom.',
    systems: ['Active Directory', 'SAP ERP', 'Corporate Email', 'Jira Cloud', 'VPN Access']
  },
  {
    id: 'group-dev',
    name: 'Vývojári',
    description: 'Prístup k vývojovým nástrojom a testovacím prostrediam.',
    systems: ['Corporate Email', 'Jira Cloud', 'VPN Access']
  },
  {
    id: 'group-standard',
    name: 'Základná skupina',
    description: 'Základné komunikačné kanály a intranet.',
    systems: ['Corporate Email']
  }
];

const initialUserGroups = [
  { userId: 'admin-id', groupIds: ['group-admin'] },
  { userId: 'user-id', groupIds: ['group-standard', 'group-dev'] }
];

const initialRoles = [
  {
    id: 'admin',
    name: 'Administrátor IAM',
    icon: '🛡️',
    badgeClass: 'badge-admin',
    description: 'Úplný správcovský prístup k správe identít a oprávnení v systéme IAM Petržalka.',
    permissions: {
      user_management: 'Zápis',
      auth_user_management: 'Zápis',
      group_management: 'Zápis',
      access_config: 'Zápis',
      role_management: 'Zápis',
      audit_log: 'Čítanie',
      global_settings: 'Zápis'
    }
  },
  {
    id: 'user',
    name: 'Oprávnený užívateľ',
    icon: '👤',
    badgeClass: 'badge-user',
    description: 'Štandardný používateľský prístup pre bežných zamestnancov a spolupracovníkov.',
    permissions: {
      user_management: 'Žiadne',
      auth_user_management: 'Žiadne',
      group_management: 'Čítanie',
      access_config: 'Žiadne',
      role_management: 'Čítanie',
      audit_log: 'Žiadne',
      global_settings: 'Čítanie'
    }
  }
];

// Helper to ensure database file exists with initial structure
function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [
        {
          id: 'admin-id',
          username: 'admin',
          password: 'admin12',
          name: 'Administrátor',
          role: 'admin',
          status: 'Aktivovaný',
          created_at: new Date().toISOString()
        },
        {
          id: 'user-id',
          username: 'uzivatel',
          password: 'uzivatel12',
          name: 'Užívateľ Petržalka',
          role: 'user',
          status: 'Aktivovaný',
          created_at: new Date().toISOString()
        }
      ],
      groups: initialGroups,
      userGroups: initialUserGroups,
      roles: initialRoles,
      accessItems: [
        { id: 'active-directory', name: 'Active Directory', levels: ['Read/Write', 'USER', 'Admin'] },
        { id: 'sap-erp', name: 'SAP ERP', levels: ['Read/Write', 'USER'] },
        { id: 'corporate-email', name: 'Corporate Email', levels: ['Read/Write', 'USER'] },
        { id: 'jira-cloud', name: 'Jira Cloud', levels: ['Read/Write', 'USER'] },
        { id: 'vpn-access', name: 'VPN Access', levels: ['Read/Write', 'USER'] },
        { id: 'ad', name: 'AD', levels: ['Read/Write', 'USER', 'Read only', 'Admin'] },
        { id: 'trimel', name: 'Trimel', levels: ['USER', 'Read only'] }
      ],
      logs: [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          username: 'Systém',
          action: 'Inicializácia databázy (RBAC)',
          details: 'Vytvorenie počiatočných skupín prístupov a priradení.'
        }
      ],
      departments: [],
      sessions: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  } else {
    // Migrate existing DB file to the new RBAC structure if needed
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      let changed = false;

      if (data.permissions) {
        delete data.permissions;
        changed = true;
      }
      if (!data.groups) {
        data.groups = initialGroups;
        changed = true;
      }
      if (!data.userGroups) {
        data.userGroups = initialUserGroups;
        changed = true;
      }
      if (!data.roles) {
        data.roles = initialRoles;
        changed = true;
      } else {
        // Migrate audit_log permission value from Zápis to Čítanie
        const adminRole = data.roles.find(r => r.id === 'admin');
        if (adminRole && adminRole.permissions && adminRole.permissions.audit_log === 'Zápis') {
          adminRole.permissions.audit_log = 'Čítanie';
          changed = true;
        }
      }
      if (!data.sessions) {
        data.sessions = {};
        changed = true;
      }
      if (!data.accessItems) {
        data.accessItems = [
          { id: 'active-directory', name: 'Active Directory', levels: ['Read/Write', 'USER', 'Admin'] },
          { id: 'sap-erp', name: 'SAP ERP', levels: ['Read/Write', 'USER'] },
          { id: 'corporate-email', name: 'Corporate Email', levels: ['Read/Write', 'USER'] },
          { id: 'jira-cloud', name: 'Jira Cloud', levels: ['Read/Write', 'USER'] },
          { id: 'vpn-access', name: 'VPN Access', levels: ['Read/Write', 'USER'] },
          { id: 'ad', name: 'AD', levels: ['Read/Write', 'USER', 'Read only', 'Admin'] },
          { id: 'trimel', name: 'Trimel', levels: ['USER', 'Read only'] }
        ];
        changed = true;
      }
      if (!data.departments) {
        data.departments = [];
        changed = true;
      }

      // Migrate existing users' free text departments to číselník departments
      if (data.users && data.users.length > 0) {
        data.users.forEach(user => {
          if (user.department && typeof user.department === 'string' && user.department.trim() !== '') {
            const deptName = user.department.trim();
            // Check if this department is already in departments (either as ID or by name case-insensitive)
            let existingDept = data.departments.find(d => d.id === deptName || d.name.toLowerCase() === deptName.toLowerCase());
            if (!existingDept) {
              const newId = `dept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              existingDept = {
                id: newId,
                name: deptName,
                parentId: null
              };
              data.departments.push(existingDept);
              changed = true;
            }
            // Update the user's department property to the ID
            if (user.department !== existingDept.id) {
              user.department = existingDept.id;
              changed = true;
            }
          }
        });
      }

      if (changed) {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Db migration error:', err);
    }
  }
}

// Read whole DB
export function readDb() {
  initDb();
  const content = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(content);
}

// Write whole DB
export function writeDb(data) {
  initDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Log audit action helper
export function logAction(username, action, details) {
  const db = readDb();
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    timestamp: new Date().toISOString(),
    username: username || 'Neprihlásený',
    action,
    details
  };
  db.logs.unshift(newLog); // Put new logs first
  writeDb(db);
  return newLog;
}
