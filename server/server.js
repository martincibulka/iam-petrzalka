import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb, writeDb, logAction } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Custom Session Store to persist sessions in the JSON database
class JsonDbStore extends session.Store {
  constructor() {
    super();
  }

  get(sid, callback) {
    try {
      const db = readDb();
      if (!db.sessions) db.sessions = {};
      const sess = db.sessions[sid];
      if (sess) {
        const expires = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires) : null;
        if (expires && expires < new Date()) {
          delete db.sessions[sid];
          writeDb(db);
          return callback(null, null);
        }
        return callback(null, sess);
      }
      callback(null, null);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const db = readDb();
      if (!db.sessions) db.sessions = {};
      db.sessions[sid] = sessionData;
      writeDb(db);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      const db = resolve => {}; // fallback
      const dbData = readDb();
      if (dbData.sessions && dbData.sessions[sid]) {
        delete dbData.sessions[sid];
        writeDb(dbData);
      }
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
}

// Session configuration
app.use(session({
  store: new JsonDbStore(),
  secret: 'iam-petrzalka-super-secret-key-987654321',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middlewares
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Neautorizovaný prístup. Prihláste sa prosím.' });
  }
  // Check if user is still active in DB
  const db = readDb();
  const dbUser = db.users.find(u => u.id === req.session.user.id);
  if (!dbUser) {
    req.session.destroy();
    return res.status(401).json({ message: 'Užívateľ neexistuje.' });
  }
  if (dbUser.status === 'Zablokovaný') {
    req.session.destroy();
    return res.status(403).json({ message: 'Váš účet bol zablokovaný.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Nedostatočné oprávnenia. Táto operácia vyžaduje rolu Administrátor.' });
  }
  next();
};

const requirePermission = (permission, level) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Neautorizovaný prístup. Prihláste sa prosím.' });
    }
    
    const db = readDb();
    const user = db.users.find(u => u.id === req.session.user.id);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ message: 'Užívateľ neexistuje.' });
    }
    if (user.status === 'Zablokovaný') {
      req.session.destroy();
      return res.status(403).json({ message: 'Váš účet bol zablokovaný.' });
    }
    
    const role = (db.roles || []).find(r => r.id === user.role);
    const permissions = role ? role.permissions : {};
    const userVal = permissions[permission] || 'Žiadne';
    
    if (level === 'Zápis') {
      if (userVal === 'Zápis') {
        return next();
      }
    } else if (level === 'Čítanie') {
      if (userVal === 'Zápis' || userVal === 'Čítanie') {
        return next();
      }
    }
    
    return res.status(403).json({ message: `Nedostatočné oprávnenia. Vyžaduje sa oprávnenie: ${permission} (${level}).` });
  };
};

// Helper to determine if a user has IAM login privileges (is an authorized user)
const isIamUser = (user) => {
  if (!user) return false;
  const username = user.username.toLowerCase();
  return user.is_iam_user === true || username === 'admin' || username === 'uzivatel';
};

// 1. Auth Endpoints
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Meno aj heslo sú povinné.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || user.password !== password) {
    logAction(username, 'Prihlásenie (Neúspešné)', `Pokus o prihlásenie s nesprávnym heslom.`);
    return res.status(401).json({ message: 'Nesprávne užívateľské meno alebo heslo.' });
  }

  if (user.status === 'Zablokovaný') {
    logAction(username, 'Prihlásenie (Blokované)', `Pokus o prihlásenie na zablokovaný účet.`);
    return res.status(403).json({ message: 'Tento účet je zablokovaný. Kontaktujte administrátora.' });
  }

  // Na prihlasovanie do IAM sú povolené iba oprávnené účty
  if (!isIamUser(user)) {
    logAction(username, 'Prihlásenie (Nepovolené)', `Nepovolený pokus o prihlásenie účtu ${user.username} do IAM.`);
    return res.status(403).json({ message: 'Tento účet nemá oprávnenie na prihlásenie do rozhrania IAM.' });
  }

  const dbRole = (db.roles || []).find(r => r.id === user.role);
  const permissions = dbRole ? dbRole.permissions : {};

  // Create session
  req.session.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: permissions
  };

  logAction(user.username, 'Prihlásenie (Úspešné)', `Užívateľ ${user.name} sa prihlásil do systému.`);

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions: permissions
  });
});

app.post('/api/logout', (req, res) => {
  if (req.session.user) {
    const user = req.session.user;
    logAction(user.username, 'Odhlásenie', `Užívateľ ${user.name} sa odhlásil.`);
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Chyba pri odhlasovaní.' });
      }
      res.clearCookie('connect.sid');
      return res.json({ message: 'Odhlásenie úspešné.' });
    });
  } else {
    res.json({ message: 'Neboli ste prihlásený.' });
  }
});

app.get('/api/session', (req, res) => {
  if (req.session.user) {
    // Re-verify from db in case status/role changed
    const db = readDb();
    const dbUser = db.users.find(u => u.id === req.session.user.id);
    if (dbUser && dbUser.status !== 'Zablokovaný') {
      const dbRole = (db.roles || []).find(r => r.id === dbUser.role);
      const permissions = dbRole ? dbRole.permissions : {};

      req.session.user.name = dbUser.name;
      req.session.user.role = dbUser.role;
      req.session.user.permissions = permissions;

      return res.json({
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role,
        permissions: permissions
      });
    } else {
      req.session.destroy();
      return res.status(401).json({ message: 'Relácia expirovala alebo je neplatná.' });
    }
  }
  res.status(401).json({ message: 'Neprihlásený užívateľ.' });
});

app.get('/api/users', requireAuth, requirePermission('user_management', 'Čítanie'), (req, res) => {
  const db = readDb();
  // Vrátime iba bežných užívateľov (ktorí sa neprihlasujú do IAM)
  const regularUsers = db.users.filter(u => !isIamUser(u));
  const safeUsers = regularUsers.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.get('/api/users/authorized', requireAuth, (req, res) => {
  const db = readDb();
  // Vrátime iba aktívnych Oprávnených užívateľov
  const activeUsers = db.users.filter(u => u.status === 'Aktivovaný' && isIamUser(u));
  
  // Priradíme zoznam skupín ku každému užívateľovi
  const safeUsers = activeUsers.map(user => {
    const mapping = (db.userGroups || []).find(ug => ug.userId === user.id) || { groupIds: [] };
    const userGroups = (db.groups || []).filter(g => mapping.groupIds.includes(g.id)).map(g => g.name);
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      groups: userGroups,
      created_at: user.created_at
    };
  });
  res.json(safeUsers);
});

// Vytvorenie nového oprávneného užívateľa (Admin len)
app.post('/api/users/authorized', requireAuth, requireAdmin, (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ message: 'Všetky polia (meno, prihlasovacie meno, heslo, rola) sú povinné.' });
  }

  const db = readDb();

  // Skontrolujeme, či prihlasovacie meno už neexistuje
  const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (exists) {
    return res.status(400).json({ message: 'Používateľ s týmto prihlasovacím menom už existuje.' });
  }

  const timestamp = Date.now();
  const newUser = {
    id: `iam-${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
    username: username.trim(),
    password: password,
    name: name.trim(),
    role: role,
    status: 'Aktivovaný',
    is_iam_user: true,
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDb(db);

  logAction(
    req.session.user.username,
    'Vytvorenie oprávneného užívateľa',
    `Vytvorený oprávnený užívateľ ${newUser.name} (${newUser.username}) s rolou ${newUser.role}.`
  );

  const activeUsers = db.users.filter(u => u.status === 'Aktivovaný' && isIamUser(u));
  const safeUsers = activeUsers.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    created_at: u.created_at
  }));
  res.json(safeUsers);
});

// Odstránenie oprávneného užívateľa (Admin len)
app.delete('/api/users/authorized/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  if (id === req.session.user.id) {
    return res.status(400).json({ message: 'Nemôžete vymazať svoj vlastný účet.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ message: 'Užívateľ nebol nájdený.' });
  }

  // Vymažeme používateľa
  db.users = db.users.filter(u => u.id !== id);

  writeDb(db);

  logAction(
    req.session.user.username,
    'Vymazanie oprávneného užívateľa',
    `Vymazaný oprávnený užívateľ ${user.name} (${user.username}).`
  );

  const activeUsers = db.users.filter(u => u.status === 'Aktivovaný' && isIamUser(u));
  const safeUsers = activeUsers.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
  }));
  res.json(safeUsers);
});

// Úprava oprávneného užívateľa (Admin len)
app.put('/api/users/authorized/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, username, password, role } = req.body;

  if (!name || !username || !role) {
    return res.status(400).json({ message: 'Meno, prihlasovacie meno a rola sú povinné.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ message: 'Užívateľ nebol nájdený.' });
  }

  // Zabránime adminovi odobrať admin rolu sebe samému
  if (id === req.session.user.id && role !== 'admin') {
    return res.status(400).json({ message: 'Nemôžete zmeniť svoju vlastnú rolu z Administrátor.' });
  }

  // Skontrolujeme duplicitu prihlasovacieho mena, ak sa mení
  if (username.toLowerCase().trim() !== user.username.toLowerCase()) {
    const exists = db.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
    if (exists) {
      return res.status(400).json({ message: 'Používateľ s týmto prihlasovacím menom už existuje.' });
    }
  }

  user.name = name.trim();
  user.username = username.trim();
  user.role = role;
  if (password) {
    user.password = password;
  }

  writeDb(db);

  logAction(
    req.session.user.username,
    'Úprava oprávneného užívateľa',
    `Upravený oprávnený užívateľ ${user.name} (${user.username}).`
  );

  const activeUsers = db.users.filter(u => u.status === 'Aktivovaný' && isIamUser(u));
  const safeUsers = activeUsers.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    created_at: u.created_at
  }));
  res.json(safeUsers);
});

app.post('/api/users', requireAuth, requirePermission('user_management', 'Zápis'), (req, res) => {
  const { name, status, email, department, entry_date, exit_date } = req.body;

  if (!name || !status) {
    return res.status(400).json({ message: 'Meno aj stav sú povinné.' });
  }

  const db = readDb();
  const timestamp = Date.now();
  const generatedUsername = `user_${timestamp}`;

  const newUser = {
    id: `user-${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
    username: generatedUsername,
    password: '',
    name: name.trim(),
    role: 'user',
    status,
    email: email ? email.trim() : '',
    department: department ? department.trim() : '',
    entry_date: entry_date ? entry_date.trim() : '',
    exit_date: exit_date ? exit_date.trim() : '',
    systems: [],
    created_at: new Date().toISOString()
  };

  db.users.push(newUser);

  writeDb(db);

  logAction(
    req.session.user.username,
    'Vytvorenie užívateľa',
    `Vytvorený užívateľ ${newUser.name} (${newUser.username}) s rolou ${newUser.role}.`
  );

  const regularUsers = db.users.filter(u => !isIamUser(u));
  const safeUsers = regularUsers.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

app.put('/api/users/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, role, status, password, systems, email, department, entry_date, exit_date } = req.body;

  const isSelfUpdate = req.session.user.id === id;
  const hasUserWrite = req.session.user.permissions?.user_management === 'Zápis';

  if (!hasUserWrite && !isSelfUpdate) {
    return res.status(403).json({ message: 'Nedostatočné oprávnenia. Nemôžete upravovať iných užívateľov.' });
  }

  const db = readDb();
  const userIndex = db.users.findIndex(u => u.id === id);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Užívateľ nebol nájdený.' });
  }

  const user = db.users[userIndex];
  const oldRole = user.role;
  const oldStatus = user.status;
  const oldName = user.name;

  // Prevent admin from blocking or demoting themselves
  if (user.id === req.session.user.id) {
    if (status && status !== 'Aktivovaný') {
      return res.status(400).json({ message: 'Nemôžete zablokovať vlastný administrátorský účet.' });
    }
    if (role && role !== 'admin') {
      return res.status(400).json({ message: 'Nemôžete odobrať administrátorské práva sami sebe.' });
    }
  }

  let changeDetails = [];

  if (isSelfUpdate) {
    // Self update logic
    if (name && name.trim() !== '') {
      if (name.trim() !== oldName) {
        changeDetails.push(`Zmena mena: "${oldName}" -> "${name.trim()}"`);
        user.name = name.trim();
      }
    }
    if (password && password.trim() !== '') {
      changeDetails.push(`Zmena hesla`);
      user.password = password.trim();
    }
  } else {
    // Admin or user with user_management write updates another user
    if (name && name.trim() !== '') {
      if (name.trim() !== oldName) {
        changeDetails.push(`Zmena mena: "${oldName}" -> "${name.trim()}"`);
        user.name = name.trim();
      }
    }
    if (role && role !== oldRole) {
      changeDetails.push(`Zmena roly: "${oldRole}" -> "${role}"`);
      user.role = role;
    }
    if (status && status !== oldStatus) {
      changeDetails.push(`Zmena stavu: "${oldStatus}" -> "${status}"`);
      user.status = status;
    }
    if (password && password.trim() !== '') {
      changeDetails.push(`Zmena hesla`);
      user.password = password.trim();
    }
    if (systems && Array.isArray(systems)) {
      changeDetails.push(`Zmena priamych prístupov`);
      user.systems = systems;
    }
    if (email !== undefined) {
      const trimmedEmail = email.trim();
      if (trimmedEmail !== (user.email || '')) {
        changeDetails.push(`Zmena emailu: "${user.email || ''}" -> "${trimmedEmail}"`);
        user.email = trimmedEmail;
      }
    }
    if (department !== undefined) {
      const trimmedDept = department.trim();
      if (trimmedDept !== (user.department || '')) {
        changeDetails.push(`Zmena oddelenia: "${user.department || ''}" -> "${trimmedDept}"`);
        user.department = trimmedDept;
      }
    }
    if (entry_date !== undefined) {
      if (entry_date !== (user.entry_date || '')) {
        changeDetails.push(`Zmena dátumu nástupu: "${user.entry_date || ''}" -> "${entry_date}"`);
        user.entry_date = entry_date;
      }
    }
    if (exit_date !== undefined) {
      if (exit_date !== (user.exit_date || '')) {
        changeDetails.push(`Zmena dátumu výstupu: "${user.exit_date || ''}" -> "${exit_date}"`);
        user.exit_date = exit_date;
      }
    }
  }

  db.users[userIndex] = user;
  writeDb(db);

  // Update current session details if self-update
  if (isSelfUpdate) {
    req.session.user.name = user.name;
    req.session.user.role = user.role;
  }

  if (changeDetails.length > 0) {
    logAction(
      req.session.user.username,
      'Úprava užívateľa',
      `Upravený užívateľ ${user.name} (${user.username}). Detaily: ${changeDetails.join(', ')}`
    );
  }

  if (isSelfUpdate) {
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } else {
    const regularUsers = db.users.filter(u => !isIamUser(u));
    const safeUsers = regularUsers.map(({ password, ...u }) => u);
    res.json(safeUsers);
  }
});

app.post('/api/users/import', requireAuth, requirePermission('user_management', 'Zápis'), (req, res) => {
  const { users, groupIds } = req.body;

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ message: 'Žiadne dáta na import.' });
  }

  const db = readDb();
  const timestamp = Date.now();
  let createdCount = 0;

  users.forEach((u, index) => {
    if (!u.name || !u.name.trim()) return;

    // Generate unique username
    const cleanName = u.name.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s.]/g, '') // keep alphanum, spaces, dots
      .trim();
    const nameParts = cleanName.split(/\s+/);
    let baseUsername = nameParts.length >= 2 
      ? `${nameParts[0]}.${nameParts.slice(1).join('.')}` 
      : nameParts[0];

    // Ensure username is unique in database
    let finalUsername = baseUsername;
    let counter = 1;
    while (db.users.some(usr => usr.username === finalUsername)) {
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }

    const newUser = {
      id: `user-${timestamp}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      username: finalUsername,
      password: '',
      name: u.name.trim(),
      role: 'user',
      status: 'Aktivovaný',
      email: u.email ? u.email.trim() : '',
      department: u.department ? u.department.trim() : '',
      entry_date: u.entry_date ? u.entry_date.trim() : '',
      exit_date: u.exit_date ? u.exit_date.trim() : '',
      systems: [],
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    createdCount++;

    // Assign to groups if specified
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      if (!db.userGroups) {
        db.userGroups = [];
      }
      let mappingIndex = db.userGroups.findIndex(ug => ug.userId === newUser.id);
      if (mappingIndex === -1) {
        db.userGroups.push({
          userId: newUser.id,
          groupIds: [...groupIds]
        });
      } else {
        db.userGroups[mappingIndex].groupIds = Array.from(new Set([...db.userGroups[mappingIndex].groupIds, ...groupIds]));
      }
    }
  });

  writeDb(db);

  if (createdCount > 0) {
    logAction(
      req.session.user.username,
      'Hromadný import užívateľov',
      `Úspešne naimportovaných ${createdCount} užívateľov.`
    );
  }

  // Return the regular users and user groups list
  const regularUsers = db.users.filter(u => !isIamUser(u));
  const safeUsers = regularUsers.map(({ password: _, ...usr }) => usr);
  
  res.json({
    users: safeUsers,
    userGroups: db.userGroups || []
  });
});

app.delete('/api/users/:id', requireAuth, requirePermission('user_management', 'Zápis'), (req, res) => {
  const { id } = req.params;
  
  if (id === req.session.user.id) {
    return res.status(400).json({ message: 'Nemôžete vymazať svoj vlastný účet.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ message: 'Užívateľ nebol nájdený.' });
  }

  // Odstránenie užívateľa
  db.users = db.users.filter(u => u.id !== id);

  // Očistenie priradení do skupín
  if (db.userGroups) {
    db.userGroups = db.userGroups.filter(ug => ug.userId !== id);
  }

  writeDb(db);

  logAction(
    req.session.user.username,
    'Vymazanie užívateľa',
    `Vymazaný užívateľ ${user.name} (${user.username}).`
  );

  const regularUsers = db.users.filter(u => !isIamUser(u));
  const safeUsers = regularUsers.map(({ password, ...u }) => u);
  res.json(safeUsers);
});

// 3. RBAC Permission Groups Endpoints
app.get('/api/groups', requireAuth, (req, res) => {
  const db = readDb();
  res.json(db.groups || []);
});

app.post('/api/groups', requireAuth, requireAdmin, (req, res) => {
  const { name, description, systems } = req.body;

  if (!name || !description || !Array.isArray(systems)) {
    return res.status(400).json({ message: 'Názov, popis a zoznam prístupov sú povinné.' });
  }

  const db = readDb();
  if (!db.groups) db.groups = [];

  const newGroup = {
    id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: name.trim(),
    description: description.trim(),
    systems
  };

  db.groups.push(newGroup);
  writeDb(db);

  const getSysName = (sys) => (sys && typeof sys === 'object') ? (sys.name || '') : (sys || '');
  const systemsNames = systems.map(getSysName).filter(Boolean);

  logAction(
    req.session.user.username,
    'Vytvorenie skupiny',
    `Vytvorená nová skupina prístupov "${newGroup.name}" s prístupmi k: [${systemsNames.join(', ')}].`
  );

  res.json(db.groups);
});

app.put('/api/groups/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, systems } = req.body;

  const db = readDb();
  if (!db.groups) db.groups = [];
  
  const groupIndex = db.groups.findIndex(g => g.id === id);
  if (groupIndex === -1) {
    return res.status(404).json({ message: 'Skupina prístupov nebola nájdená.' });
  }

  const group = db.groups[groupIndex];
  const oldName = group.name;
  const oldSystems = group.systems || [];

  if (name) group.name = name.trim();
  if (description) group.description = description.trim();
  if (Array.isArray(systems)) group.systems = systems;

  db.groups[groupIndex] = group;
  writeDb(db);

  const getSysName = (sys) => (sys && typeof sys === 'object') ? (sys.name || '') : (sys || '');
  const oldNames = oldSystems.map(getSysName).filter(Boolean);
  const newNames = (Array.isArray(systems) ? systems : []).map(getSysName).filter(Boolean);

  const added = newNames.filter(name => !oldNames.includes(name));
  const removed = oldNames.filter(name => !newNames.includes(name));
  let details = `Upravená skupina "${group.name}".`;
  if (name && name.trim() !== oldName) details += ` Zmena názvu: "${oldName}" -> "${name.trim()}".`;
  if (added.length > 0) details += ` Pridané prístupy: [${added.join(', ')}].`;
  if (removed.length > 0) details += ` Odobraté prístupy: [${removed.join(', ')}].`;

  logAction(
    req.session.user.username,
    'Úprava skupiny',
    details
  );

  res.json(db.groups);
});

app.delete('/api/groups/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;

  const db = readDb();
  if (!db.groups) db.groups = [];

  const group = db.groups.find(g => g.id === id);
  if (!group) {
    return res.status(404).json({ message: 'Skupina prístupov nebola nájdená.' });
  }

  // Remove the group
  db.groups = db.groups.filter(g => g.id !== id);

  // Clean up user assignments
  if (db.userGroups) {
    db.userGroups = db.userGroups.map(ug => ({
      userId: ug.userId,
      groupIds: ug.groupIds.filter(gId => gId !== id)
    }));
  }

  writeDb(db);

  logAction(
    req.session.user.username,
    'Vymazanie skupiny',
    `Vymazaná skupina prístupov "${group.name}". Všetkým užívateľom bolo priradenie k tejto skupine zrušené.`
  );

  res.json(db.groups);
});

app.get('/api/user-groups', requireAuth, (req, res) => {
  const db = readDb();
  if (!db.userGroups) db.userGroups = [];

  const hasUserRead = req.session.user.permissions?.user_management === 'Čítanie' || req.session.user.permissions?.user_management === 'Zápis';
  if (req.session.user.role === 'admin' || hasUserRead) {
    res.json(db.userGroups);
  } else {
    const ownMapping = db.userGroups.filter(ug => ug.userId === req.session.user.id);
    res.json(ownMapping);
  }
});

app.post('/api/user-groups', requireAuth, requirePermission('user_management', 'Zápis'), (req, res) => {
  const { userId, groupIds } = req.body;

  if (!userId || !Array.isArray(groupIds)) {
    return res.status(400).json({ message: 'Identifikátor užívateľa a zoznam skupín sú povinné.' });
  }

  const db = readDb();
  if (!db.userGroups) db.userGroups = [];

  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ message: 'Užívateľ nebol nájdený.' });
  }

  const userGroupIndex = db.userGroups.findIndex(ug => ug.userId === userId);
  let oldGroupIds = [];

  if (userGroupIndex !== -1) {
    oldGroupIds = db.userGroups[userGroupIndex].groupIds;
    db.userGroups[userGroupIndex].groupIds = groupIds;
  } else {
    db.userGroups.push({ userId, groupIds });
  }

  writeDb(db);

  // Compare groups for audit logging
  const oldGroups = oldGroupIds.map(id => db.groups.find(g => g.id === id)?.name || id);
  const newGroups = groupIds.map(id => db.groups.find(g => g.id === id)?.name || id);
  const added = newGroups.filter(g => !oldGroups.includes(g));
  const removed = oldGroups.filter(g => !newGroups.includes(g));

  let details = `Zmena skupín prístupov pre ${targetUser.name} (${targetUser.username}).`;
  if (added.length > 0) details += ` Pridané do skupín: [${added.join(', ')}].`;
  if (removed.length > 0) details += ` Odobraté zo skupín: [${removed.join(', ')}].`;
  if (added.length === 0 && removed.length === 0) details += ` Žiadna zmena.`;

  logAction(
    req.session.user.username,
    'Zmena skupín užívateľa',
    details
  );

  res.json(db.userGroups);
});

// --- Access Items CRUD ---

app.get('/api/access-items', requireAuth, (req, res) => {
  const db = readDb();
  res.json(db.accessItems || []);
});

app.post('/api/access-items', requireAuth, requireAdmin, (req, res) => {
  const { name, levels } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Názov prístupu je povinný.' });
  }

  const db = readDb();
  if (!db.accessItems) db.accessItems = [];

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `${slug}-${Date.now()}`;

  const newItem = {
    id,
    name: name.trim(),
    levels: Array.isArray(levels) ? levels : ['Read/Write']
  };

  db.accessItems.push(newItem);
  writeDb(db);

  logAction(
    req.session.user.username,
    'Pridanie prístupu',
    `Pridaný nový prístup "${newItem.name}" s úrovňami: [${newItem.levels.join(', ')}].`
  );

  res.json(db.accessItems);
});

app.put('/api/access-items/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, levels } = req.body;

  const db = readDb();
  if (!db.accessItems) db.accessItems = [];

  const itemIndex = db.accessItems.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Prístup nebol nájdený.' });
  }

  const oldItem = db.accessItems[itemIndex];
  const oldName = oldItem.name;

  if (name) oldItem.name = name.trim();
  if (Array.isArray(levels)) oldItem.levels = levels;

  db.accessItems[itemIndex] = oldItem;

  // Propagate name change to groups systems
  if (name && name.trim() !== oldName) {
    if (db.groups) {
      db.groups = db.groups.map(g => ({
        ...g,
        systems: g.systems.map(sys => {
          if (typeof sys === 'object' && sys.name === oldName) {
            return { ...sys, name: name.trim() };
          } else if (typeof sys === 'string' && sys === oldName) {
            return name.trim();
          }
          return sys;
        })
      }));
    }
  }

  writeDb(db);

  let details = `Upravený prístup "${oldItem.name}".`;
  if (name && name.trim() !== oldName) details += ` Zmena názvu: "${oldName}" -> "${name.trim()}".`;
  if (Array.isArray(levels)) details += ` Zmena úrovní: [${levels.join(', ')}].`;

  logAction(
    req.session.user.username,
    'Úprava prístupu',
    details
  );

  res.json(db.accessItems);
});

app.delete('/api/access-items/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;

  const db = readDb();
  if (!db.accessItems) db.accessItems = [];

  const item = db.accessItems.find(item => item.id === id);
  if (!item) {
    return res.status(404).json({ message: 'Prístup nebol nájdený.' });
  }

  const nameToRemove = item.name;

  // Delete the item
  db.accessItems = db.accessItems.filter(item => item.id !== id);

  // Clean up references from groups
  if (db.groups) {
    db.groups = db.groups.map(g => ({
      ...g,
      systems: g.systems.filter(sys => {
        const sysName = typeof sys === 'object' ? sys.name : sys;
        return sysName !== nameToRemove;
      })
    }));
  }

  writeDb(db);

  logAction(
    req.session.user.username,
    'Vymazanie prístupu',
    `Vymazaný prístup "${nameToRemove}". Všetky prepojenia na tento prístup v skupinách boli odstránené.`
  );

  res.json(db.accessItems);
});

// --- Roles Endpoints ---

app.get('/api/roles', requireAuth, (req, res) => {
  const db = readDb();
  res.json(db.roles || []);
});

app.put('/api/roles/:id', requireAuth, requirePermission('role_management', 'Zápis'), (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!permissions) {
    return res.status(400).json({ message: 'Oprávnenia sú povinné.' });
  }

  const db = readDb();
  if (!db.roles) db.roles = [];

  const role = db.roles.find(r => r.id === id);
  if (!role) {
    return res.status(404).json({ message: 'Rola nebola nájdená.' });
  }

  // Prevent admin from locking themselves out of role management
  if (id === 'admin' && permissions.role_management !== 'Zápis') {
    return res.status(400).json({ message: 'Administrátorovi nemôžete odobrať práva na správu rolí.' });
  }

  role.permissions = permissions;
  writeDb(db);

  logAction(
    req.session.user.username,
    'Úprava oprávnení roly',
    `Upravené oprávnenia pre rolu "${role.name}".`
  );

  res.json(db.roles);
});

app.post('/api/roles', requireAuth, requirePermission('role_management', 'Zápis'), (req, res) => {
  const { name, description, icon, permissions } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Názov roly je povinný.' });
  }

  const db = readDb();
  if (!db.roles) db.roles = [];

  const roleNameClean = name.trim();

  // Check if role name already exists
  if (db.roles.some(r => r.name.toLowerCase() === roleNameClean.toLowerCase())) {
    return res.status(400).json({ message: `Rola s názvom "${roleNameClean}" už existuje.` });
  }

  const slug = roleNameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `role-${slug || 'custom'}-${Date.now()}`;

  const defaultPermissions = {
    user_management: 'Žiadne',
    auth_user_management: 'Žiadne',
    group_management: 'Čítanie',
    access_config: 'Žiadne',
    role_management: 'Žiadne',
    audit_log: 'Žiadne',
    global_settings: 'Žiadne'
  };

  const newRole = {
    id,
    name: roleNameClean,
    icon: (icon && icon.trim()) ? icon.trim() : '🛡️',
    badgeClass: 'badge-user',
    description: (description && description.trim()) ? description.trim() : 'Vlastná definícia roly prístupov v systéme IAM.',
    permissions: permissions && typeof permissions === 'object' ? { ...defaultPermissions, ...permissions } : defaultPermissions
  };

  db.roles.push(newRole);
  writeDb(db);

  logAction(
    req.session.user.username,
    'Vytvorenie roly',
    `Vytvorená nová rola v IAM "${newRole.name}".`
  );

  res.json(db.roles);
});

app.delete('/api/roles/:id', requireAuth, requirePermission('role_management', 'Zápis'), (req, res) => {
  const { id } = req.params;

  if (id === 'admin' || id === 'user') {
    return res.status(400).json({ message: 'Systémové roly (Administrátor IAM, Oprávnený užívateľ) nie je možné vymazať.' });
  }

  const db = readDb();
  if (!db.roles) db.roles = [];

  const role = db.roles.find(r => r.id === id);
  if (!role) {
    return res.status(404).json({ message: 'Rola nebola nájdená.' });
  }

  // Check if any user is currently assigned this role
  const assignedUsers = (db.users || []).filter(u => u.role === id);
  if (assignedUsers.length > 0) {
    return res.status(400).json({ 
      message: `Rolu "${role.name}" nemôžete vymazať, pretože je priradená k ${assignedUsers.length} užívateľom. Najprv zmeňte ich rolu.` 
    });
  }

  db.roles = db.roles.filter(r => r.id !== id);
  writeDb(db);

  logAction(
    req.session.user.username,
    'Vymazanie roly',
    `Vymazaná rola z IAM "${role.name}".`
  );

  res.json(db.roles);
});

// 4. Logs Endpoint (Audit Log permission)
app.get('/api/logs', requireAuth, requirePermission('audit_log', 'Čítanie'), (req, res) => {
  const db = readDb();
  res.json(db.logs);
});

// Serve static assets in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Catch-all route to serve react app in production (supporting frontend routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`Server beží na porte ${PORT}`);
});
