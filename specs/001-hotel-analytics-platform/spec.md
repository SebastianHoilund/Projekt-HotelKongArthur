# Feature Specification: Hotel Kong Arthur – Drift, Booking & Dataanalyse-Platform

**Feature Branch**: `001-hotel-analytics-platform`

**Created**: 2026-10-28

**Updated**: 2026-11-02 (Tillaegsopgavebeskrivelse.pdf: PostgreSQL i stedet for MySQL, nøgletal i frontenden)

**Status**: Ready for Plan

**Input**: User description: "Komplet specifikation for Hotel Kong Arthur booking-, cocktailbar- og dataanalyse-platform med live nøgletal baseret på Opgavebeskrivelse.pdf, Tillægsspørgsmål.pdf og projektplan.md" + ændrede krav i Tillaegsopgavebeskrivelse.pdf (uge 2)

**Referencedata**: Takster, værelsesfordeling, sæsoner og berigede datafiler er samlet i [reference-data.md](reference-data.md). Det er den eneste kilde til disse værdier.

**Forkortelser**: `US` = User Story, `FR` = Functional Requirement, `NFR` = Non-Functional Requirement, `SC` = Success Criterion. Sporbarhed mellem dem findes i afsnittet [Sporbarhedsmatrix](#sporbarhedsmatrix).

## Clarifications

### Session 2026-10-29

- Q: Skal systemet beholde det oprindeligt tildelte værelsesnummer ved opdatering af en eksisterende booking, hvis værelsestypen er uændret og værelset stadig er ledigt i den nye periode? → A: Behold samme værelse hvis værelsestypen er uændret og værelset er ledigt i den nye periode; tildel kun et nyt ledigt værelse ved overlap eller ændret værelsestype (ellers `409`).
- Q: Hvordan skal systemet håndtere en manuelt angivet totalpris ved oprettelse og opdatering af en booking? → A: Manuel pris gælder kun for den enkelte booking (`Price` > 0); ved ændring af datoer eller værelsestype genberegnes prisen efter sæsontaksterne, medmindre en ny manuel pris angives.
- Q: Hvordan skal en bookings omsætning og solgte værelsesnætter henføres til år, sæson og måned i nøgletalsberegningerne, hvis opholdet strækker sig hen over et årsskifte, sæsonskifte eller månedsskifte? → A: Hele bookingens omsætning (`Price`) og alle dens værelsesnætter (`Days Rented`) tilskrives indtjekningsdatoens år, sæson og måned samlet (ingen opsplitning nat-for-nat).
- Q: Hvilken takstmodel skal anvendes til at fastsætte døgnprisen for `low`, `mid` og `high` sæson ud fra opgavebeskrivelsens prisintervaller? → A: `low` = nedre grænse (min), `mid` = midtpunktet af intervallet, `high` = øvre grænse (max), som fastlagt i `reference-data.md`.
- Q: Hvordan afgrænses begrebet "live data" i Tableau-dashboardet, når bookinger eller barsalg ændres i systemet? → A: On-demand via REST API: Backendens endpoints leverer altid aktuelle tal fra databasen ved hvert kald, og Tableau viser ændringerne straks når datakilden opdateres (refresh).

### Session 2026-11-02 (Tillægsopgave uge 2)

- Q: Hvilken database skal erstatte MySQL, når kunden ikke ønsker MySQL? → A: PostgreSQL 17. Den relationelle datamodel, transaktioner med rækkelåse (`SELECT … FOR UPDATE`) og opsætningen i Docker kan genbruges, så kun dataadgangslaget, migrationerne og `db`-containeren ændres.
- Q: Hvilke nøgletal skal frontenden vise, og hvordan? → A: De samme nøgletal som Tableau-dashboardet (US4 og US5) for et valgt år: nøgletalskort, belægningsgrad pr. sæson og måned, indtjening pr. værelsestype og sæson, indtjening pr. land, kundetilfredshed pr. værelsestype og barens nøgletal. Frontenden læser dem fra `/api/analytics/*` og beregner intet selv. Visningen er tabeller og nøgletalskort uden grafbibliotek.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administration af Bookinger (Booking-CRUD) (Priority: P1)

> **User Story:** *"Som **receptionist** ønsker jeg at kunne oprette, se, redigere og slette bookinger med gæsteoplysninger, værelsestype, indtjekning/udtjekning og antal personer, så systemet altid afspejler hotellets aktuelle belægning og omsætning."*

**Why this priority**: Evnen til løbende at tilføje, ændre og fjerne bookinger er selve fundamentet for at bevæge systemet fra statiske historiske filer til et levende driftssystem. Uden booking-CRUD kan hverken ny omsætning eller opdateret belægning demonstreres.

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Kan udvikles og testes isoleret mod booking-datamodellen.
- **N**egotiable: Felter og formularlayout i brugergrænsefladen kan tilpasses uden at ændre kernebehovet.
- **V**aluable: Giver receptionen og eksterne systemer direkte kontrol over aktuelle reservationer.
- **E**stimable: Veldefinerede CRUD-operationer med kendte datakolonner (`First Name`, `Family Name`, `Country`, `Room Type`, `Check In Date`, `Check Out Date`, `Guests`, `Room Number`, `Price`).
- **S**mall: Afgrænset til livscyklussen for en enkelt booking-entitet.
- **T**estable: Kan verificeres ved at oprette, fremsøge, opdatere og slette en booking gennem brugergrænsefladen og kontrakten og konstatere, at ændringen gemmes permanent.

**Acceptance Scenarios (Confirmation)**:

1. **Given** receptionisten har åbnet booking-oversigten i browseren, **When** receptionisten indtaster gyldige oplysninger (fornavn, efternavn, land, værelsestype, indtjekning, udtjekning og antal personer inden for værelsestypens kapacitet) og gemmer, **Then** tildeler systemet et ledigt værelse af den valgte type, udleder sæsonen ud fra indtjekningsdatoen, beregner totalprisen i DKK efter [reference-data.md](reference-data.md), og bookingen vises straks i bookinglisten.
2. **Given** en eksisterende booking findes i systemet, **When** receptionisten ændrer datoer, værelsestype eller antal personer og gemmer, **Then** opdateres bookingens oplysninger, sæson og totalpris permanent, det eksisterende værelse beholdes hvis værelsestypen er uændret og værelset stadig er ledigt i perioden (ellers tildeles et nyt ledigt værelse af typen), og de opdaterede værdier vises ved genindlæsning.
3. **Given** en eksisterende booking er annulleret eller fejloprettet, **When** receptionisten vælger at slette bookingen og bekræfter, **Then** fjernes bookingen fra listen over aktive bookinger og indgår ikke længere i omsætnings- og belægningsberegninger. Værelset er igen ledigt i perioden.
4. **Given** hotellets eksterne bookingsystem sender en ny eller opdateret booking via systemets dokumenterede grænsefladekontrakt, **When** data overholder valideringsreglerne, **Then** kvitterer systemet med bekræftelse og det tildelte booking-ID, og bookingen er umiddelbart synlig for receptionisten.
5. **Given** der findes en booking på værelse 606 fra 10. til 13. marts, **When** en ny eller ændret booking ville få samme værelse i en periode, der overlapper (f.eks. 12.–14. marts), **Then** afvises overlappet. Systemet vælger i stedet et andet ledigt værelse af samme type, og hvis ingen findes, afvises forespørgslen med konflikt (`409`). Udtjekning 13. marts og ny indtjekning 13. marts på samme værelse er tilladt.

---

### User Story 2 - Værelsestyper, Kapacitet og Sæsonpriser (Priority: P1)

> **User Story:** *"Som **hoteladministrator** ønsker jeg, at systemet administrerer Hotel Kong Arthurs 214 værelser fordelt på de 8 værelsestyper med tilhørende kapacitet (1–4 personer) og sæsonafhængige takster (lav-, mellem- og højsæson), så priser og maksimal kapacitet (428 gæster) beregnes korrekt."*

**Why this priority**: Værelsestyper og sæsonpriser udgør forretningsreglerne for bookingoprettelse, prisberegning, belægningsgrad og overlapkontrol.

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Kan opsættes og verificeres uafhængigt af analyse-dashboards.
- **N**egotiable: Takster og værelsesfordeling kan justeres i referencedata uden at ændre kravene.
- **V**aluable: Sikrer korrekte priser ved nye bookinger og realistisk kapacitetsstyring.
- **E**stimable: Alle 8 værelsestyper, takster og værelsesantal er fastlagt i [reference-data.md](reference-data.md).
- **S**mall: Omfatter stamdata og prisopslag for 8 kategorier og 3 sæsoner.
- **T**estable: Kan testes ved at slå de 8 værelsestyper op og kontrollere prisberegning for `low`, `mid` og `high` sæson.

**Acceptance Scenarios (Confirmation)**:

1. **Given** systemet er initialiseret, **When** en bruger eller klient forespørger listen over værelsestyper, **Then** returneres præcis de 8 værelsestyper (`Standard Single`, `Grand Lit`, `Standard Double`, `Superior Double`, `Junior Suite`, `Spa Executive`, `Suite`, `LOFT Suite`) med takst pr. nat for `low`, `mid` og `high`, antal værelser og maks. personer pr. værelse. Summen er 214 værelser og 428 gæster.
2. **Given** en receptionist opretter en booking på `Standard Double` med indtjekning 15. juli og 5 nætter og ingen manuel særpris, **When** prisen beregnes, **Then** er sæsonen `high`, prisen pr. nat 1.600 DKK, og totalprisen 8.000 DKK (1.600 × 5).
3. **Given** en booking med indtjekning 20. december, **When** sæsonen udledes, **Then** er den `high`. En booking med indtjekning 10. december er `low`.
4. **Given** en bruger forsøger at oprette en booking med en ukendt værelsestype, **When** forespørgslen behandles, **Then** afvises den med en tydelig valideringsfejl.
5. **Given** en bruger angiver flere personer end værelsestypens maksimum (f.eks. 2 personer på `Standard Single`), **When** forespørgslen behandles, **Then** afvises den med en valideringsfejl.

---

### User Story 3 - Gæster, Landefordeling og Historisk Datagrundlag (Priority: P1)

> **User Story:** *"Som **hoteladministrator** ønsker jeg, at de eksisterende 1.000 historiske gæstebookinger og 30 drikkevare-salgsposter for 2026 er indlæst fra opstart, samt at nye gæster registreres med oprindelsesland, så vi kan analysere vores internationale gæsteprofil fra dag ét."*

**Why this priority**: Uden det historiske datagrundlag er analyseplatformen tom ved opstart, og ledelsen kan ikke se mønstre på tværs af lande og sæsoner.

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Indlæsning og forespørgsel af grunddata kan testes straks ved systemopstart.
- **N**egotiable: Normalisering af gæste- og landeentiteter kan tilpasses datamodellen.
- **V**aluable: Giver øjeblikkeligt 1.000 bookinger og 30 drikkevarer til analyse.
- **E**stimable: Kildedata (`hotel_bookings_2026.csv` og `drinks_menu_with_sales.csv`) har kendt skema og størrelse (se [reference-data.md](reference-data.md)).
- **S**mall: Afgrænset til initialisering og udstilling af gæste-/landedata.
- **T**estable: Kan verificeres ved at tjekke, at alle 1.000 historiske bookinger og 30 drikkevarer er tilgængelige umiddelbart efter første opstart uden manuel filimport.

**Acceptance Scenarios (Confirmation)**:

1. **Given** systemet startes op for første gang på en tom database, **When** opstartsprocessen er færdig, **Then** indeholder systemet samtlige 1.000 historiske bookinger (med fornavn, efternavn, land, værelsestype, værelsesnummer, indtjekning, udtjekning, antal personer, sæson og pris) samt alle 30 drikkevarer (20 cocktails og 10 kaffetyper) med deres historiske salgstal for 2026. Ingen af de seedede bookinger overlapper.
2. **Given** systemet genstartes efter at nye bookinger er oprettet, **When** opstartsprocessen kører igen, **Then** bevares både de oprindelige data og de nyoprettede bookinger uden dubletter eller datatab.
3. **Given** ledelsen ønsker overblik over hvor gæsterne kommer fra, **When** landefordelingen forespørges, **Then** leverer systemet antal bookinger, antal solgte overnatninger og samlet omsætning grupperet pr. oprindelsesland.

---

### User Story 4 - Hotel-Nøgletal & Indtjeningsanalyse til Beslutningstagere (Priority: P1)

> **User Story:** *"Som **hoteladministrator / beslutningstager** ønsker jeg at se nøgletal for belægningsgrad, årets samlede indtjening, indtjening pr. værelsestype (opdelt pr. sæson), indtjening pr. land, top-indtjenende værelser og lande, kundetilfredshed samt udvalgte performance-nøgletal (ADR, RevPAR og gennemsnitlig opholdslængde), så jeg kan optimere hotellets prissætning og markedsføring."*

**Why this priority**: Hovedformålet med platformen er at omsætte driftsdata til beslutningsstøtte for Hotel Kong Arthurs ledelse.

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Kan beregnes direkte over booking- og værelsesdata.
- **N**egotiable: Visuel præsentation i dashboardet kan justeres uafhængigt af nøgletalsberegningerne.
- **V**aluable: Besvarer direkte samtlige forretningsspørgsmål i opgavebeskrivelsen.
- **E**stimable: Formler for omsætning, belægningsgrad, ADR, RevPAR og opholdslængde er veldefinerede.
- **S**mall: Fokuseret på aggregerede nøgletal (read-only analyse).
- **T**estable: Hvert nøgletal kan efterregnes matematisk ud fra de kendte rækker i datasættet.

**Acceptance Scenarios (Confirmation)**:

1. **Given** bookingdata er tilgængelige i systemet, **When** indtjening pr. værelsestype og sæson forespørges for et år, **Then** returneres den samlede omsætning (DKK), antal bookinger og solgte værelsesnætter for hver af de 8 værelsestyper fordelt på `low`, `mid` og `high` sæson, samt en rangering der viser, hvilke værelsestyper Hotel Kong Arthur tjener flest penge på.
2. **Given** bookingdata er tilgængelige, **When** indtjening pr. land forespørges, **Then** returneres omsætning og antal gæster/bookinger pr. land rangeret efter indtjening, så det fremgår, hvilke lande hotellet tjener flest penge på.
3. **Given** bookingdata for et år er tilgængelige, **When** årets nøgletal forespørges, **Then** beregnes og leveres:
   - **Årets samlede hotelindtjening** (sum af `Price` i DKK for alle aktive bookinger med indtjekning i året).
   - **Belægningsgrad (%)** = solgte værelsesnætter ÷ (214 × antal dage i perioden). For 2026 er de tilgængelige nætter 78.110. Opdelt pr. sæson og pr. måned.
   - **Kundetilfredshed** (gennemsnitlig tilfredshedsscore på skala 1–5 pr. værelsestype og samlet). Bookinger uden besvarelse (NULL) tælles ikke med i gennemsnittet, og antal besvarelser vises sammen med gennemsnittet.
   - **Selvvalgte nøgletal**:
      1. **ADR (Average Daily Rate)**: `Total Hotelomsætning ÷ Solgte Værelsesnætter`.
      2. **RevPAR (Revenue Per Available Room)**: `Total Hotelomsætning ÷ Tilgængelige Værelsesnætter`.
      3. **ALOS (Average Length of Stay)**: `AVG(Days Rented)` pr. booking.
4. **Given** de seedede data for 2026, **When** årets belægningsgrad forespørges, **Then** er den ca. 6,9 % (5.379 ÷ 78.110). Kapaciteten skaleres ikke.

---

### User Story 5 - Cocktailbar & Helene Christines Salgsanalyse (Priority: P2)

> **User Story:** *"Som **bartender (Helene Christine)** og **hoteladministrator** ønsker jeg at kunne registrere nye salg i lobbybaren og se det samlede årssalg for Helene Christine, omsætning pr. drink samt procentfordelingen mellem de 20 cocktails og 10 kaffetyper, så vi kan vurdere barens bidrag til hotellets samlede økonomi."*

**Why this priority**: Cocktailbaren er et specifikt forretningsområde i opgaven med egne nøgletal, som skal indgå i ledelsens dashboard.

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Cocktailbarens menu og salg er uafhængig af værelsesbookingerne.
- **N**egotiable: Registreringens brugerflade kan tilpasses uden at ændre salgsmodellen.
- **V**aluable: Giver fuldt overblik over Helene Christines salg på tværs af cocktails og kaffe.
- **E**stimable: Bygger direkte på de 30 produkter i `drinks_menu_with_sales.csv`.
- **S**mall: Kun to produktkategorier (`Cocktail` og `Coffee`) og tre specifikke nøgletal.
- **T**estable: Kan efterprøves eksakt mod summen af `Price (DKK) × Units Sold` for de 20 cocktails og 10 kaffetyper.

**Acceptance Scenarios (Confirmation)**:

1. **Given** barens 20 cocktails og 10 kaffetyper er indlæst med stykpris (`Price (DKK)`) og solgte enheder (`Units Sold`), **When** barens nøgletal forespørges for et år, **Then** beregnes og vises:
   - **Helene Christines totale salg for året**: Både samlet omsætning i DKK (`SUM(Price × Units Sold)`) og samlet antal solgte drikkevarer (`SUM(Units Sold)`).
   - **Omsætning pr. drink**: Hver af de 30 drinks med kategori, stykpris, antal solgte enheder og total omsætning i DKK.
   - **Procentfordeling mellem cocktails og kaffe**: Andel i procent for henholdsvis `Cocktail` og `Coffee` (både målt på omsætning i DKK og på antal solgte enheder).
2. **Given** Helene Christine sælger yderligere drinks i lobbybaren, **When** hun registrerer et nyt salg (drink, antal enheder, tidspunkt), **Then** gemmes det som en ny salgstransaktion, og omsætningen pr. drink, Helenes totale årssalg og procentfordelingen opdateres øjeblikkeligt.

---

### User Story 6 - Live-Data Pipeline til Interaktivt Tableau Dashboard (Priority: P2)

> **User Story:** *"Som **beslutningstager** ønsker jeg, at det interaktive Tableau-dashboard henter aktuelle data gennem backendens grænseflade, så nyoprettede, ændrede eller slettede bookinger samt nye barsalg afspejles i grafer og nøgletal ved opdatering, frem for kun at vise statiske historiske CSV-filer."*

**Why this priority**: Opgaven stiller som eksplicit arkitekturkrav, at systemet bevæger sig fra statiske historiske CSV-filer til en løbende opdaterbar løsning, hvor Tableau fungerer som aftager af backendens data.

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Bygger bro mellem de eksisterende data/nøgletal og Tableau-visualiseringen.
- **N**egotiable: Den tekniske overførselsmekanisme (f.eks. Web Data Connector eller struktureret rapport-datafeed) fastlægges i teknisk planlægning.
- **V**aluable: Sikrer at ledelsen træffer beslutninger på baggrund af aktuelle tal.
- **E**stimable: Dashboardets konkrete grafer og filtre er fuldt opregnet i kravene.
- **S**mall: Fokuseret på dataudstilling til analyse og dashboard-opbygning.
- **T**estable: Kan demonstreres live ved at oprette en booking i frontenden, opdatere datakilden i Tableau og se årets indtjening, landefordeling og værelsestype-graf stige med præcis bookingens beløb.

**Acceptance Scenarios (Confirmation)**:

1. **Given** Tableau-dashboardet viser årets indtjening for 2026 og indtjening pr. værelsestype, **When** en receptionist opretter en ny booking i frontenden (10 nætter i `LOFT Suite` fra 20. december, sæson `high`, 4.000 DKK pr. nat, i alt 40.000 DKK), og brugeren opdaterer datakilden i Tableau, **Then** stiger årets indtjening, LOFT Suite-omsætningen i `high` og det valgte lands omsætning med præcis 40.000 DKK.
2. **Given** beslutningstageren åbner Tableau-dashboardet, **When** vedkommende interagerer med dashboardet, **Then** kan vedkommende filtrere og udforske:
   - Geografisk fordeling af gæster (lande)
   - Indtjening pr. værelsestype opdelt på sæson (`low`, `mid`, `high`)
   - Indtjening pr. land
   - Top-værelsestyper og top-lande målt på indtjening
   - Årets samlede indtjening, belægningsgrad, kundetilfredshed og det selvvalgte nøgletal (ADR / RevPAR / ALOS)
   - Cocktailbarens totalomsætning for Helene Christine, omsætning pr. drink og procentfordeling mellem cocktails og kaffe.

---

### User Story 7 - Nøgletal i Frontenden direkte fra API'et (Priority: P1)

> **User Story:** *"Som **hoteladministrator / beslutningstager** ønsker jeg at kunne se hotellets og cocktailbarens nøgletal direkte i frontend-prototypen og i REST API'et, så jeg ikke er afhængig af Tableau for at aflæse dem."*

**Why this priority**: Kunden har udtrykkeligt bedt om at kunne læse dataanalyserne direkte i API'et og se dem i frontenden (tillægsopgave uge 2).

**INVEST-vurdering & Independent Test**:
- **I**ndependent: Bygger kun på de eksisterende analytics-endpoints (US4, US5) og kan udvikles uafhængigt af Tableau.
- **N**egotiable: Layout og opdeling i sektioner kan tilpasses, så længe tallene kommer fra API'et.
- **V**aluable: Ledelsen kan aflæse nøgletal uden Tableau-licens.
- **E**stimable: Nøgletallene og endpoints er allerede fastlagt i kontrakten.
- **S**mall: Én visning med et årsfilter, der kun læser data.
- **T**estable: Tallene i frontenden kan sammenlignes én til én med svarene fra `/api/analytics/*`.

**Acceptance Scenarios (Confirmation)**:

1. **Given** systemet er startet med seeddata, **When** brugeren åbner nøgletalsvisningen i frontenden og vælger 2026, **Then** vises årets indtjening, belægningsgrad (ca. 6,89 %), ADR, RevPAR, ALOS og kundetilfredshed med samme værdier som `GET /api/analytics/summary?year=2026`.
2. **Given** nøgletalsvisningen er åben, **When** brugeren ser på hotelsektionerne, **Then** vises belægningsgrad pr. sæson og måned, indtjening pr. værelsestype opdelt på sæson med rangering, indtjening pr. land med rangering og kundetilfredshed pr. værelsestype.
3. **Given** nøgletalsvisningen er åben, **When** brugeren ser på barsektionen, **Then** vises Helene Christines totale salg, omsætning pr. drink og procentfordelingen mellem cocktails og kaffe.
4. **Given** en receptionist har oprettet en booking på 40.000 DKK i 2026, **When** nøgletalsvisningen genindlæses, **Then** er årets indtjening steget med præcis 40.000 DKK.
5. **Given** brugeren vælger et år uden data (f.eks. 2030), **When** visningen indlæses, **Then** vises 0-værdier og ingen fejl.

---

### Edge Cases

- **Ugyldige eller negative værdier ved booking**: Hvad sker der, hvis en bruger forsøger at oprette en booking med udtjekning før eller samme dag som indtjekning, negativ pris, 0 personer eller tomme gæsteoplysninger? Systemet SKAL afvise forespørgslen med en beskrivende fejlbesked og statuskode for ugyldigt input (`400`) uden at gemme data.
- **Ikke-eksisterende booking-ID**: Hvad sker der, når en klient forsøger at hente, opdatere (`PUT`) eller slette (`DELETE`) en booking med et ID, der ikke findes? Systemet SKAL returnere `404`.
- **Overlappende bookinger**: Hvad sker der, hvis en booking oprettes eller ændres, så den overlapper en anden på samme værelse? Overlap SKAL være umuligt (se FR-017). Systemet SKAL afvise med `409`, hvis intet værelse af typen er ledigt.
- **Overkapacitet / Overbooking**: Hvad sker der, hvis alle værelser af en type er optaget i hele perioden? Systemet SKAL afvise med `409`. Antal værelser pr. type fremgår af [reference-data.md](reference-data.md).
- **Ophold over sæson-, måneds- eller årsskifte**: Hvad sker der ved en booking, der starter i én periode (år, sæson eller måned) og slutter i en anden? År, sæson og måned bestemmes af indtjekningsdatoen; hele opholdet afregnes efter indtjekningssæsonen, og både fuld omsætning (`Price`) og samtlige værelsesnætter (`Days Rented`) tilskrives indtjekningsdatoens år, sæson og måned uden opsplitning nat-for-nat.
- **Genstart af system og containere**: Hvad sker der med nyoprettede bookinger, når systemet lukkes ned og startes igen? Data SKAL være persisteret, og opstarts-seeding må IKKE overskrive eller duplikere eksisterende data.
- **Division med nul i nøgletal**: Hvad sker der, hvis der filtreres på en kombination (f.eks. et land eller en sæson) uden bookinger? Systemet SKAL returnere `0` (ikke `NaN`, `null`-nedbrud eller `500`-fejl) for gennemsnitspriser og procenter.

## Requirements *(mandatory)*

### Functional Requirements

#### Booking & Hoteldrift
- **FR-001** *(US1)*: Systemet SKAL udstille funktionalitet til at oprette (`CREATE`), læse (`READ`), opdatere (`UPDATE`) og slette (`DELETE`) værelsesbookinger.
- **FR-002** *(US1, US7)*: Systemet SKAL levere en browserbaseret brugergrænseflade (frontend-prototype), hvori en bruger kan se bookinglisten samt oprette, redigere og slette bookinger og se nøgletallene (FR-019).
- **FR-003** *(US1, US2)*: Systemet SKAL ved oprettelse og opdatering af en booking validere, at fornavn, efternavn og land er udfyldt, at værelsestypen er en af hotellets 8 gyldige typer, at udtjekning ligger efter indtjekning, og at antal personer er mindst 1 og højst værelsestypens kapacitet.
- **FR-004** *(US2)*: Systemet SKAL udlede en bookings sæson (`low`, `mid`, `high`) ud fra indtjekningsdatoen og beregne totalprisen som takst (type, sæson) × antal nætter, hvis en specifik totalpris ikke er angivet manuelt. En manuelt angivet pris (`Price` > 0) gælder kun for den enkelte booking; ved senere ændring af datoer eller værelsestype genberegnes prisen efter sæsontaksterne i [reference-data.md](reference-data.md), medmindre en ny manuel pris angives i opdateringen.
- **FR-005** *(US2)*: Systemet SKAL repræsentere hotellets 214 værelser fordelt på de 8 værelsestyper (kapacitet 1–4 personer pr. værelse, i alt 428 gæster) med sæsontakster fastsat som `low` = nedre grænse (min), `mid` = midtpunktet af prisintervallet og `high` = øvre grænse (max), jf. [reference-data.md](reference-data.md).
- **FR-016** *(US1, US4)*: Hver booking SKAL have et år (indtjekningsåret). Alle nøgletal og rapporter SKAL kunne afgrænses til et valgt år, og hele bookingens omsætning (`Price`) samt alle dens værelsesnætter (`Days Rented`) tilskrives indtjekningsdatoens år, sæson og måned.
- **FR-017** *(US1, US3)*: Systemet SKAL sikre, at to aktive bookinger aldrig overlapper på samme værelse. Overlap er `indtjekning₁ < udtjekning₂` og `udtjekning₁ > indtjekning₂`. Udtjekningsdagen må være næste gæsts indtjekningsdag. Reglen gælder ved oprettelse, ændring og seed. Ved oprettelse tildeler systemet et ledigt værelse af den valgte type; ved ændring beholdes det eksisterende værelse, hvis værelsestypen er uændret og værelset er ledigt i den nye periode, og ellers tildeles et andet ledigt værelse af typen. Hvis intet værelse af typen er ledigt, afvises med `409`.
- **FR-018** *(US1)*: Hver booking SKAL have et antal personer (`Guests`), som ikke må overstige værelsestypens kapacitet.

#### Cocktailbar
- **FR-006** *(US5)*: Systemet SKAL administrere lobbybarens sortiment på 20 cocktails (`Category = Cocktail`) og 10 kaffetyper (`Category = Coffee`) med stykpris i DKK, tilknyttet bartenderen Helene Christine.
- **FR-007** *(US5)*: Systemet SKAL gøre det muligt at registrere nye drikkevaresalg som enkelttransaktioner (`DrinkSale`: drink, antal, tidspunkt). De historiske salgstal seedes som én startpost pr. drink. Alle bartotaler beregnes som summen af transaktionerne.

#### Dataanalyse & Nøgletal (Hotel & Bar)
- **FR-008** *(US3, US4)*: Systemet SKAL beregne og udstille gæsternes geografiske fordeling (antal bookinger, solgte overnatninger og indtjening pr. land).
- **FR-009** *(US4)*: Systemet SKAL beregne og udstille indtjening pr. værelsestype opdelt pr. sæson (`low`, `mid`, `high`) samt totalt pr. værelsestype.
- **FR-010** *(US4)*: Systemet SKAL identificere og rangere, hvilke værelsestyper og hvilke lande Hotel Kong Arthur tjener flest penge på.
- **FR-011** *(US4)*: Systemet SKAL beregne årets samlede hotelindtjening (DKK), belægningsgrad (%), gennemsnitlig kundetilfredshed samt de selvvalgte nøgletal **ADR**, **RevPAR** og **ALOS**.
- **FR-012** *(US5)*: Systemet SKAL for cocktailbaren beregne og udstille:
  1. Helene Christines totale salg for året (samlet omsætning i DKK og totalt antal solgte enheder).
  2. Omsætning i DKK pr. enkelt drink.
  3. Procentfordeling mellem `Cocktail` og `Coffee` (både målt på omsætning i DKK og på antal solgte enheder).

#### Data-Seeding, Kontrakt & Live-Integration
- **FR-013** *(US3)*: Systemet SKAL ved første opstart automatisk indlæse de 1.000 historiske bookinger fra `hotel_bookings_2026.csv` og de 30 drikkevarer med salgstal fra `drinks_menu_with_sales.csv` (begge med `Year` = 2026).
- **FR-014** *(US1, US6, US7)*: Alle funktioner og nøgletal SKAL udstilles gennem en dokumenteret grænsefladekontrakt (OpenAPI), som både frontend-prototypen, eksterne bookingsystemer (`POST`/`PUT`/`DELETE`) og Tableau kan anvende. Alle nøgletal SKAL kunne læses direkte som JSON fra API'et uden Tableau.
- **FR-015** *(US6)*: Et interaktivt Tableau-dashboard SKAL fremvise samtlige hotel- og cocktailbar-nøgletal baseret på data leveret on-demand fra backendens REST API (hvert API-kald returnerer friske realtidsberegninger fra databasen, som vises i Tableau straks ved datakilde-opdatering/refresh).
- **FR-019** *(US7)*: Frontend-prototypen SKAL vise samtlige hotel- og cocktailbar-nøgletal fra FR-008 til FR-012 for et valgt år. Tallene SKAL læses fra REST API'ets analytics-endpoints, og frontenden må ikke selv beregne nøgletal.

### Non-Functional Requirements

Opgavens tekniske rammer gælder som krav. Se constitution for den bindende begrundelse.

- **NFR-001 Arkitektur**: Backend SKAL være opdelt i tre lag (præsentation, forretningslogik, dataadgang), så database og klient kan udskiftes uafhængigt.
- **NFR-002 Grænseflade**: Al kommunikation SKAL foregå via et REST API med JSON. Ingen klient må tilgå databasen direkte.
- **NFR-003 Kontrakt**: API'et SKAL dokumenteres i en OpenAPI-specifikation, der kan udforskes via Swagger UI kørende i en Docker-container. Implementering og kontrakt SKAL stemme overens.
- **NFR-004 Database**: Data SKAL gemmes i PostgreSQL. MySQL må ikke bruges (kundekrav, tillægsopgave uge 2).
- **NFR-005 Drift**: Hele systemet SKAL kunne startes med én `docker-compose up`, uden manuelle trin, med kontrolleret opstartsrækkefølge (databasen klar før backend).
- **NFR-006 Persistens**: Data SKAL overleve genstart af containere.
- **NFR-007 Ydeevne**: Nøgletal og rapporter SKAL returneres inden for 1 sekund ved det seedede datasæt (1.000 bookinger).
- **NFR-008 Konsistens og dataintegritet**: Bookingskrivninger SKAL være transaktionelle, så to samtidige forespørgsler ikke kan skabe overlap (FR-017). Nøgletal beregnes ét sted (service-laget).
- **NFR-009 Fejlhåndtering**: API'et SKAL returnere retvisende statuskoder (`200`, `201`, `204`, `400`, `404`, `409`) og beskrivende fejlbeskeder i JSON. Nøgletal må aldrig give `500` pga. tomme data.
- **NFR-010 Testbarhed**: Forretningslogik (prisberegning, sæsonudledning, overlapkontrol, validering, nøgletal) SKAL dækkes af automatiserede unit-tests.
- **NFR-011 Sikkerhed**: Login er uden for scope for prototypen (se Assumptions). Input SKAL valideres, og SQL SKAL bruge parametriserede forespørgsler.
- **NFR-012 Anvendelighed**: Frontenden SKAL kunne køres i en almindelig browser og gøre det muligt at oprette, rette og slette en booking og aflæse nøgletallene uden vejledning.
- **NFR-013 Dokumentation**: Repositoryet SKAL indeholde README.md (arkitekturdiagram, kørselsvejledning, domænedefinitioner), CONTRIBUTE.md, samt spec-artefakter (constitution, spec, plan, tasks og seneste converge).
- **NFR-014 Samarbejde**: Alle gruppemedlemmer SKAL bidrage med egne commits. Arbejdet foregår på branches og merges via pull requests.
- **NFR-015 Genskabelighed**: Et friskt `git clone` efterfulgt af `docker-compose up` SKAL starte alle containere og data uden fejl.

### Key Entities

- **RoomType (`Værelsestype`)**: En af hotellets 8 værelseskategorier med navn, personkapacitet (1–4), antal værelser og takster for `low`, `mid` og `high` (se [reference-data.md](reference-data.md)).
- **Room (`Værelse`)**: Et fysisk værelse (214 i alt) med værelsesnummer, tilknyttet en `RoomType`.
- **Guest (`Gæst`)**: En hotelgæst med fornavn (`First Name`), efternavn (`Family Name`) og oprindelsesland (`Country`).
- **Booking (`Booking`)**: Et gæsteophold knyttet til en gæst og et værelse, med indtjekning, udtjekning, antal nætter (`Days Rented`), antal personer (`Guests`), sæson (udledt), år, samlet pris i DKK (`Price`) og valgfri kundetilfredshedsrating (1–5, kan være tom/NULL).
- **Drink (`Drikkevare`)**: En vare på lobbybarens menu (20 cocktails og 10 kaffetyper) med navn (`Drink Name`), kategori (`Cocktail` eller `Coffee`) og stykpris (`Price (DKK)`).
- **DrinkSale (`Barsalg`)**: En registreret salgstransaktion for en `Drink` udført af Helene Christine med antal solgte enheder (`Units Sold`), tidspunkt og år.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Tidsgrænserne i SC-003 og SC-006 er projektets egne måltal. Opgaven angiver dem ikke.

- **SC-001** *(US1, NFR-006)*: En receptionist kan i browser-frontenden oprette, redigere og slette en booking på under 30 sekunder, og ændringen bevares permanent på tværs af genstarter.
- **SC-002** *(US3, FR-013)*: Ved første opstart indlæses 100 % af kildedata (1.000 bookinger fordelt på 8 værelsestyper og 3 sæsoner samt 30 drikkevarer) automatisk uden manuel indgriben.
- **SC-003** *(US6, NFR-007)*: Når en booking oprettes, ændres eller slettes, afspejles de nye tal i nøgletalsberegningerne med en svartid under 1 sekund, og i Tableau-dashboardet straks efter datakilde-opdatering (refresh).
- **SC-004** *(US4, US6)*: Beslutningstagere kan i Tableau-dashboardet aflæse svar på alle påkrævede spørgsmål: gæsternes oprindelseslande, indtjening pr. værelsestype pr. sæson, indtjening pr. land, top-værelsestyper, top-lande, årets samlede hotelindtjening, belægningsgrad, kundetilfredshed samt ADR, RevPAR og ALOS.
- **SC-005** *(US5, US6)*: Beslutningstagere kan i Tableau-dashboardet aflæse Helene Christines totale årssalg i baren, omsætning pr. drink for alle 30 drinks samt den nøjagtige procentfordeling mellem cocktails og kaffe.
- **SC-006** *(NFR-005, NFR-015)*: Hele systemet kan startes fra en frisk kloning med én enkelt opstartskommando og være fuldt funktionelt inden for 2 minutter.
- **SC-007** *(US1, FR-017)*: Efter seed og efter enhver bookingændring findes der 0 overlappende bookinger på samme værelse.
- **SC-008** *(US7, FR-019)*: Alle nøgletal i SC-004 og SC-005 kan aflæses i frontend-prototypen, og hver værdi er identisk med API'ets svar for samme år.

## Sporbarhedsmatrix

| Opgavekrav | User Story | Funktionelle krav | Ikke-funktionelle krav | Succeskriterier |
|---|---|---|---|---|
| Booking-CRUD i browser og fra eksternt system | US1 | FR-001, FR-002, FR-003, FR-014, FR-018 | NFR-002, NFR-009, NFR-012 | SC-001 |
| Ingen overlappende bookinger | US1, US3 | FR-017 | NFR-008 | SC-007 |
| 214 værelser, 8 typer, 1–4 personer, sæsonpriser | US2 | FR-004, FR-005 | NFR-004 | SC-002 |
| Gæsternes lande | US3, US4 | FR-008 | NFR-007 | SC-004 |
| Historiske data indlæses, så live data kan tilføjes | US3 | FR-013, FR-016 | NFR-005, NFR-006 | SC-002 |
| Indtjening pr. type, sæson og land, top-værelser og lande | US4 | FR-009, FR-010 | NFR-001, NFR-007 | SC-004 |
| Årets indtjening, belægningsgrad, kundetilfredshed, selvvalgt nøgletal | US4 | FR-011, FR-016 | NFR-008, NFR-010 | SC-004 |
| Cocktailbar: totalsalg, omsætning pr. drink, procentfordeling | US5 | FR-006, FR-007, FR-012 | NFR-007 | SC-005 |
| Live data i Tableau via REST API | US6 | FR-014, FR-015 | NFR-002, NFR-003 | SC-003, SC-004, SC-005 |
| Nøgletal direkte i API'et og i frontenden (tillægsopgave uge 2) | US7 | FR-002, FR-014, FR-019 | NFR-002, NFR-012 | SC-008 |
| 3-lags backend, OpenAPI, Swagger UI, PostgreSQL (ikke MySQL), Docker | (alle) | FR-014 | NFR-001, NFR-002, NFR-003, NFR-004, NFR-005 | SC-006 |
| README, CONTRIBUTE, spec-artefakter, git-bidrag | (alle) | | NFR-013, NFR-014, NFR-015 | SC-006 |

## Assumptions

- **Sæsondefinitioner (2026)**: Se [reference-data.md](reference-data.md).
  - `low`: 1. jan–28. feb og 1. nov–15. dec.
  - `mid`: 1. mar–31. maj og 1. sep–31. okt.
  - `high`: 1. jun–31. aug og 16.–31. dec.
  - Sæsonen bestemmes af indtjekningsdatoen.
- **Datagrundlag og år**: Seeddata er beriget med datoer, år (2026), antal personer og værelsesnumre, jf. [reference-data.md](reference-data.md). År, sæson og måned for en booking bestemmes af indtjekningsdatoen (også hvis udtjekning ligger i næste måned, sæson eller år), og alle 5.379 solgte værelsesnætter samt fuld omsætning tilskrives indtjekningsperioden uden opsplitning.
- **Priser**: Takster pr. type og sæson fastlægges i [reference-data.md](reference-data.md) (`low` = nedre grænse, `mid` = midtpunkt, `high` = øvre grænse af opgavens interval). De historiske `Price`-værdier bevares uændret, og taksterne bruges til nye bookinger. En manuelt justeret pris gælder kun den enkelte booking og påvirker aldrig grundtaksterne; ved ændring af datoer eller værelsestype genberegnes prisen efter taksterne, medmindre en ny manuel pris angives.
- **Værelsesfordeling**: 214 værelser fordelt på typerne som i [reference-data.md](reference-data.md), svarende til 428 gæster.
- **Kapacitet skaleres ALDRIG (beslutning)**: Hotellets kapacitet er fast 214 værelser (78.110 værelsesnætter i 2026) og må ikke skaleres, justeres eller omregnes for at få belægningsgraden til at se højere ud. De 1.000 historiske bookinger (5.379 solgte nætter) giver derfor ca. 6,9 %. Det er det korrekte resultat af de udleverede data.
- **Belægningsgrad**: `SUM(solgte værelsesnætter i perioden) ÷ (214 × dage i perioden) × 100 %`. Gælder for år, sæson og måned.
- **Kundetilfredshed**: Opgaven nævner kundetilfredshed blandt de nøgletal, systemet skal kunne beregne. Den udleverede data har ingen rating, så `hotel_bookings_2026.csv` er beriget med en opfundet kolonne `Satisfaction` (1–5). Gæster må lade være med at svare, så værdien er tom (NULL) i ca. 30 % af bookingerne. Ratings seedes direkte fra filen, kan angives ved nye eller afsluttede bookinger og er valgfri. Gennemsnit beregnes kun over besvarede bookinger (0 besvarelser giver `0` og ikke fejl).
- **Barsalg**: Historiske salgstal er ét samlet salg pr. drink for 2026. Nye salg er enkelttransaktioner.
- **Autentificering (Out of Scope for Prototype)**: Da systemet leveres som en intern arkitektur- og analyseprototype i et lukket container-miljø, kræves der ikke login/brugerstyring til prototype-frontenden eller grænsefladen.
