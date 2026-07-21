# Sumár vykonaných zmien – IAM Petržalka (6. 7. 2026)

Tento dokument sumarizuje všetky vylepšenia, opravy chýb a zmeny dizajnu, ktoré sme dnes spoločne zapracovali do systému správy identít a prístupov (IAM).

---

## 1. Upresnenie a premenovanie rolí v IAM
- **Zmena:** Upravili sme označenie rolí v celom systéme (frontend aj backend), aby bolo jednoznačné, že sa vzťahujú výhradne na správu IAM:
  - Pôvodná rola `Admin` -> **Administrátor IAM**
  - Pôvodná rola `User` -> **Oprávnený užívateľ**
- **Súbory:** `server.js`, `UsersTab.jsx`, `AuthorizedUsersTab.jsx`, `Sidebar.jsx`, `App.jsx`

## 2. Vymazanie bežných užívateľov administrátorom
- **Zmena:** Do zoznamu užívateľov v sekcii **Užívatelia** sme pridali funkciu na vymazanie bežných používateľov.
- **Súbory:** `UsersTab.jsx` (pridané tlačidlo pre vymazanie a príslušná logika), `server.js` (nový endpoint `DELETE /api/users/:id`).

## 3. Separácia prihlasovania do IAM a zjednodušenie evidencie
- **Zmena:** Nastavili sme pravidlo, že bežní užívatelia sa do systému IAM neprihlasujú (prihlasovanie je vyhradené len pre účty s rolou *Administrátor IAM* a *Oprávnený užívateľ* – t.j. `admin` a `uzivatel`).
- **Zjednodušenie detailov:** Bežným užívateľom sme zrušili prihlasovacie meno, heslo a rolu. Ponechali sme im iba **Meno**, **Stav** a **Zoznam prístupov a oprávnení**.
- **Súbory:** `server.js` (odfiltrovanie prihlasovacích kont zo zoznamu bežných užívateľov, automatické generovanie systémových hodnôt pri ukladaní), `UsersTab.jsx` (úprava formulárov a tabuľky).

## 4. Moderné grafické modálne okná namiesto natívnych dialógov
- **Zmena:** Všetky predchádzajúce prehliadačové vyskakovacie okná (`window.confirm`) a chybové inline hlásenia boli nahradené **vlastnými dizajnovými oknami (popups)**.
- **Dizajn:** Okná sa otvárajú v strede monitora, obsahujú moderné animácie, rozostrené pozadie (backdrop blur) a farby plne integrované do tmavého dizajnu aplikácie (zelená pre úspech, červená s jemnou žiarou pre chyby, oranžová/červená pre varovania pred mazaním).
- **Súbory:** `UsersTab.jsx`, `PermissionsTab.jsx`

## 5. Zabezpečenie a oprava chýb v skupinách prístupov
- **Zmena:** Opravili sme kritickú chybu backendu, ktorá spôsobovala pád servera a chybovú hlášku `Unexpected end of JSON input` pri pridávaní prístupov do prístupových skupín.
- **Detaily:** Prerobili sme metódu `getSysName` a zabezpečili endpointy `POST /api/groups` a `PUT /api/groups/:id` tak, aby bezpečne zvládali prázdne polia, reťazce aj objekty. Taktiež sa v audit logoch už nezobrazujú chybné `[object Object]` záznamy, ale reálne názvy pridaných/odobratých systémov.
- **Súbory:** `server.js`

## 6. Pridanie úrovne prístupu „Nemá“
- **Zmena:** Do tabuľky prístupov na karte **Oprávnenia** sme pridali nový stĺpec **"Nemá"** umiestnený hneď za stĺpcom "Admin".
- **Styling:** Pre úroveň "Nemá" sme vytvorili dizajnový sivý odznak s tlmeným písmom a jemným ohraničením, aby bol jasne vizuálne odlíšený od aktívnych prístupov. Podpora pre tento odznak bola pridaná do všetkých príslušných záložiek.
- **Súbory:** `PermissionsTab.jsx`, `UsersTab.jsx`, `AuthorizedUsersTab.jsx`

---

*Všetky zmeny boli úspešne skontrolované linterom, skompilované do produkčnej verzie a sú plne funkčné.*
