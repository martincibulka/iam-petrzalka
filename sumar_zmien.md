# Súhrn zmien zo dňa 21. 07. 2026

## 1. Modálne okná pre formuláre užívateľov
- **Úprava & Pridávanie užívateľov:** Inline formuláre na vrchu stránky v `UsersTab.jsx` a `AuthorizedUsersTab.jsx` boli prerobené na stredové modálne okná s rozostreným pozadím (`modal-overlay` a `modal-content card`).
- **Tlačidlo zavretia:** Do hlavičiek modálnych okien bolo pridané tlačidlo `✕` (`btn-close`).

## 2. Odstránenie posúvania kariet pri prejdení myšou
- Zo štýlu `.card:hover` v `src/index.css` sa odstránilo `transform: translateY(-2px);`, čím sa zamedzilo skákaniu a posúvaniu tabuliek a kariet pri hoveri.

## 3. Pridávanie a mazanie rolí v IAM
- **Backend Endpoints:** Implementované `POST /api/roles` a `DELETE /api/roles/:id` s bezpečnostnou kontrolou oprávnenia `role_management === 'Zápis'` a auditným logovaním.
- **Systémové vs. Vlastné roly:** Systémové roly (*Administrátor IAM* a *Oprávnený užívateľ*) sú chránené proti vymazaniu a roly priradené užívateľom nemožno zmazať bez predchádzajúceho prenastavenia užívateľov.
- **UI Vylepšenia:** V `IamRolesTab.jsx` pridané tlačidlá **➕ Pridať rolu** a **🗑️ Vymazať rolu**, potvrdzovacie modálne okná a **vizuálna mriežka tlačidiel pre výber ikonky**.

## 4. Záložka "Prehľad oprávnení" (Permissions Overview)
- **Nový komponent:** Vytvorený `PermissionsOverviewTab.jsx` umožňujúci prepínanie medzi dvoma pohľadmi:
  - **👤 Užívateľ:** Zobrazuje zoznam prístupov vybraného užívateľa s ich prístupovou úrovňou a zdrojom.
  - **🔑 Prístupy:** Zobrazuje zoznam všetkých užívateľov, ktorí majú prístup k vybranému systému.
- **Stabilita výšky:** Master panel s vyhľadávaním a výberom bol zafixovaný tak, aby sa pri filtrovaní nepotápala ani neskákala jeho výška.
- **Navigácia:** Záložka pridaná na hlavnú úroveň v `Sidebar.jsx` pod Užívateľmi.
- **Pomenovanie:** Záložka *Oprávnenia* v ľavom paneli bola premenovaná na **Správa prístupov**.

## 5. Inicializácia a záloha na Git / GitHub
- Projekt bol inicializovaný v Gite (`main` vetva), prepojený s GitHub repozitárom [`martincibulka/iam-petrzalka`](https://github.com/martincibulka/iam-petrzalka.git) a všetky dnešné zmeny boli priebežne zálohované (pushed).

---
**Aktuálna verzia projektu:** `21.07.2026.13.48`
