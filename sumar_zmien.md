# Súhrn zmien zo dňa 21. 07. 2026

## 1. Modálne okná pre formuláre užívateľov
- **Úprava & Pridávanie užívateľov:** Inline formuláre na vrchu stránky v `UsersTab.jsx` a `AuthorizedUsersTab.jsx` boli prerobené na stredové modálne okná s rozostreným pozadím (`modal-overlay` a `modal-content card`).
- **Tlačidlo zavretia:** Do hlavičiek modálnych okien bolo pridané tlačidlo `✕` (`btn-close`).

## 2. Odstránenie posúvania kariet pri prejdení myšou
- Zo štýlu `.card:hover` v `src/index.css` sa odstránilo `transform: translateY(-2px);`, čím sa zamedzilo skákaniu a posúvaniu tabuliek a kariet pri hoveri.

## 3. Pridávanie a mazanie rolí v IAM
- **Backend Endpoints:** Implementované `POST /api/roles` and `DELETE /api/roles/:id` s bezpečnostnou kontrolou oprávnenia `role_management === 'Zápis'` a auditným logovaním.
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

# Súhrn zmien zo dňa 22. 07. 2026

## 1. Vyčistenie a zjednodušenie prístupov
- **Vyčistenie zdroja "Priame priradenie":** Odstránili sme zobrazenie zdroja prístupu s popisom *"Priame priradenie"* zo všetkých prehľadov a detailov užívateľov. Oprávnenia k systémom sa odteraz zdedzujú výhradne prostredníctvom prístupových skupín (napr. *Trimel*, *VPN*).
- **Individuálne prepisy úrovní prístupu (Overrides):** Ponechali sme a vylepšili možnosť pre správcu zmeniť predvolenú úroveň prístupu k dedenému systému u konkrétneho užívateľa (napr. z *Read/Write* na *Read only*).
- **Znova povolená interakcia:** V modálnom okne správy prístupov boli statické štítky nahradené interaktívnymi klikateľnými `<select>` štítkami na zmenu úrovní. Možnosti v dropdownoch sú vymedzené podľa povolených úrovní pre každý prístup.
- **Vyčistenie DB:** Z databázy `db.json` boli zmazané staré nepoužívané dáta o priamych prístupoch.

# Súhrn zmien zo dňa 23. 07. 2026

## 1. Zjednotenie statusov v Prehľade oprávnení
- Zmenili sme priame zobrazovanie surového stavu z databázy (*Aktivovaný* / *Zablokovaný*) v sekcii **Prehľad oprávnení**. Užívatelia majú teraz zobrazený korektný slovenský status **Aktívny** a **Neaktívny** rovnako ako v tabuľke užívateľov.

## 2. Inline editácia prístupových skupín (Správa prístupových skupín)
- **Rozšírenie karty na editáciu:** Odstránili sme statický formulár z vrchu stránky. Po kliknutí na skupinu (alebo na tlačidlo *Upraviť*) sa vybratá karta priamo v zozname (grid) zväčší a premení na detailný formulár s editovateľnými poliami a dropdownom pre priradenie systémov.
- **Lepšia plynulosť:** Kliknutím na *Uložiť* alebo *Zrušiť* sa karta bez potreby skrolovania vráti do pôvodného stavu.
- **Zatvorenie kliknutím na pozadie:** Kliknutím na prázdne miesto/pozadie otvorenej editovacej karty sa úprava zruší a karta sa zbalí. Kliknutia na aktívne prvky (tlačidlá, vstupné polia, badges) sú chránené.

## 3. Zjednotenie a fixná výška kariet prístupových skupín
- **Úprava šírok:** Zúžili sme stĺpec s názvom skupiny na **20 %** a zväčšili stredovú časť priradených prístupov na **65 % šírky** karty.
- **Unifikovaná výška:** V stave náhľadu majú teraz všetky karty rovnakú výšku **96px**.
- **Vertikálny posuvník:** Priradené prístupy sú obmedzené na maximálne 2 riadky (52px). Pri väčšom počte sa zobrazí vertikálny posuvník, čo zabraňuje skákaniu a zmene výšok kariet v zozname.

## 4. Hromadný import používateľov z Excelu a CSV
- **UI tlačidlá:** Pridali sme tlačidlo **📥 Import používateľov** hneď vedľa premenovaného tlačidla **➕ Nový užívateľ**.
- **Modálne okno a drag & drop:** Vytvorili sme dedikované okno pre pretiahnutie alebo vybratie súboru (`.xlsx`, `.xls`, `.csv`).
- **Náhľadová tabuľka pred uložením:** Načítané dáta z tabuľky sa najskôr zobrazia v prehľadnej tabuľke (Meno, Email, Oddelenie, Nástup, Výstup), čo umožňuje vizuálnu kontrolu pred zápisom.
- **Hromadné priradenie prístupov:** Pri importe je možné označiť ľubovoľné prístupové skupiny (napr. *Trimel*, *AD*), do ktorých budú všetci naimportovaní užívatelia automaticky zaradení.
- **Dávkový zápis a generovanie mien:** Backendový endpoint `POST /api/users/import` spracuje používateľov naraz, automaticky z ich mena vygeneruje unikátne prihlasovacie mená (napr. `martin.cibulka`), priradí skupiny a zapíše log o importe.
- **Oprava pre pouzivatelia.xlsx:** Zanalyzovali sme tvoj importný súbor a upravili mapovanie hlavičiek stĺpcov pre `*givenName (meno)`, `*sn (priezvisko)` (ktoré sa spoja do jedného mena), `*mail` a `*department (oddelenie)`. Zároveň sme pridali konverziu interných číselných formátov dátumov z Excelu na korektné textové dátumy.
- **Zlúčenie do záložiek (Tabs):** Odstránili sme samostatné tlačidlo importu z hlavného záhlavia. Import z Excelu sme presunuli priamo do okna **Nový užívateľ** vo forme čistých bezrámových záložiek (`Nový užívateľ` a `Import z Excelu/CSV`), ktoré umožňujú plynulé prepínanie režimov zadávania priamo v jednom okne.
- **Fialový dizajn záložiek:** Obe záložky v hlavičke okna sme zafarbili na fialovú farbu brandu (`var(--accent-primary)`). Aktívny stav má plnú fialovú a neaktívny 40% priehľadnú fialovú. Plus symbol sme premenili na textový symbol `+` vo fialovej farbe.
- **Zarovnanie záložiek:** Nastavili sme šírku prvej záložky na **236px** a odstránili medzeru kontajnera, vďaka čomu druhá záložka (*Import z Excelu/CSV*) začína presne nad stĺpcom **Emailová adresa** pre perfektné dizajnové zarovnanie.
- **Obmedzenie dĺžky podčiarknutia:** Presunuli sme pevnú šírku 236px na obalový `div` a samotnému nápisu (*Nový užívateľ*) sme ponechali auto-width, aby fialové podčiarknutie kopírovalo len samotnú dĺžku textu.
- **Konštantná veľkosť okna:** Zjednotili sme šírku modálneho okna na fixných **750px** (nahradením `maxWidth` priamo za `width: '750px'`), čím sme zamedzili skákaniu a zmene veľkosti okna pri prepínaní medzi manuálnym pridaním a importom z Excelu, pretože predtým prehliadač zmenšoval okno importu kvôli menšiemu prirodzenému obsahu.
- **Zjednotenie výšky okna:** Nastavili sme minimálnu výšku okna `minHeight: '390px'` a prerobili oba formuláre na flexboxy s ukotveným spodným panelom (`marginTop: 'auto'`). Okno importu má teraz pred nahratím súboru identickú výšku ako ručný formulár a prepínanie je vizuálne dokonale stabilné.
- **Pixelovo presná výška dropzone:** Zafixovali sme výšku samotnej importnej drag & drop zóny na **152px** so zhodným horným/dolným marginom, vďaka čomu má prázdne okno importu na pixel presnú rovnakú výšku ako manuálny formulár a nedochádza k žiadnemu trhaniu výšky pri prepínaní prázdnych stavov.

---
**Aktuálna verzia projektu:** `23.07.2026.13.34`
