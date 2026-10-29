# Specification Quality Checklist: Hotel Kong Arthur – Drift, Booking & Dataanalyse-Platform

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-28
**Updated**: 2026-10-29 (efter gennemgang mod opgavebeskrivelse og constitution v1.2.0)
**Feature**: [spec.md](../spec.md) · **Referencedata**: [reference-data.md](../reference-data.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) – *Undtagelse: opgaven og constitution kræver REST/JSON, OpenAPI, Swagger UI, MySQL og Docker. De optræder kun som NFR-001 til NFR-006. Valg af sprog og frameworks er udskudt til Plan.*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain – *Åbne emner er samlet i "Åbne punkter til Clarify" nedenfor.*
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable – *SC-003 og SC-006 er projektets egne måltal (opgaven angiver dem ikke).*
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified (inkl. overlap, sæsonskifte og overbooking)
- [x] Scope is clearly bounded (auth er out of scope)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification (se undtagelse ovenfor)

## Overensstemmelse med opgavebeskrivelsen

- [x] Booking-CRUD i browser og skrivning fra eksternt bookingsystem (US1, FR-001, FR-002, FR-014)
- [x] 214 værelser, 8 typer, 1–4 personer, 428 gæster, sæsonpriser (US2, FR-005, reference-data.md)
- [x] Gæsternes lande, indtjening pr. værelsestype pr. sæson og pr. land, top-værelser og top-lande (US3, US4, FR-008 til FR-010)
- [x] Årets indtjening, belægningsgrad, kundetilfredshed og selvvalgt nøgletal: ADR, RevPAR, ALOS (US4, FR-011)
- [x] Cocktailbar: totalt salg, omsætning pr. drink, procentfordeling (US5, FR-012)
- [x] Fra statisk til live data og Tableau via REST API (US6, FR-015, SC-003)
- [x] Ikke-funktionelle krav: 3 lag, REST/JSON, OpenAPI, Swagger UI, MySQL, Docker (NFR-001 til NFR-006, NFR-015)
- [x] Leverancer: README, CONTRIBUTE, spec-artefakter, git-bidrag (NFR-013, NFR-014)
- [x] User stories i formatet "Som <rolle> ønsker jeg <mål>, så <værdi>" med INVEST og Given/When/Then
- [x] Sporbarhed mellem opgavekrav, US, FR, NFR og SC (Sporbarhedsmatrix i spec.md)

## Beslutninger indarbejdet fra review

- [x] Kapaciteten skaleres aldrig. Belægningsgrad 2026 er ca. 6,9 % (Assumptions)
- [x] Takster pr. type og sæson fastlagt i reference-data.md (`low` = min, `mid` = midtpunkt, `high` = max)
- [x] Sæsoner: kun 16.–31. december er `high`. Sæson udledes af indtjekningsdato
- [x] Værelsesfordeling fastlagt (214 værelser, 428 gæster)
- [x] År (2026) indgår i data og krav (FR-016)
- [x] Antal personer, datoer og værelsesnumre tilføjet til data (FR-018)
- [x] Overlappende bookinger er forbudt (FR-017, SC-007)
- [x] Barsalg modelleres som enkelttransaktioner (FR-007)

## Åbne punkter til Clarify

- [x] Kundetilfredshed: opfundne ratings (1–5) ligger i datafilen, ca. 30 % er NULL (ingen besvarelse). Gennemsnit beregnes kun over besvarede
- [x] Takstmodel: `low` = min / `mid` = midtpunkt / `high` = max
- [x] Ændring af en booking: skal systemet beholde samme værelse, hvis det stadig er ledigt?
- [x] Hvem afgør manuelt justeret pris: gælder den kun for den enkelte booking?
- [x] Hvordan afgrænses "live" i Tableau (manuel refresh, planlagt refresh eller hver gang data hentes)?
- [x] Opholdets år, hvis en booking krydser nytår: indtjekningsåret bruges (antaget)

## Notes

- Spec'en indeholder 6 User Stories, 18 FR (FR-001 til FR-018), 15 NFR og 7 SC.
- Historiske datasæt er beriget (datoer, år, antal personer, værelsesnumre). Se [reference-data.md](../reference-data.md).
- Klar til `/speckit-clarify`. De åbne punkter ovenfor er gode kandidater til spørgsmålene.
