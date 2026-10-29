# Referencedata – Hotel Kong Arthur

Dette dokument er den **eneste kilde** til takster, værelsesfordeling, sæsoner og berigede data. Henvis hertil (`spec.md` → `FR-005`, `FR-016`, `FR-017`), hvis der opstår spørgsmål.

## 1. Sæsoner (år 2026)

| Sæson | Perioder | Dage |
|---|---|---|
| `low` | 1. jan – 28. feb · 1. nov – 15. dec | 104 |
| `mid` | 1. mar – 31. maj · 1. sep – 31. okt | 153 |
| `high` | 1. jun – 31. aug · **16. dec – 31. dec** | 108 |

- Kun anden halvdel af december (16.–31.) er `high`. Resten af december er `low`.
- En bookings sæson bestemmes af **indtjekningsdatoen**, og hele opholdet afregnes efter denne sæson.
- Hotellet har 214 værelser × 365 dage = **78.110** tilgængelige værelsesnætter i 2026. Kapaciteten skaleres aldrig.

## 2. Pris pr. nat (DKK) pr. værelsestype og sæson

Principper (opgavebeskrivelsens intervaller):
- `low` = nedre grænse for intervallet
- `mid` = midtpunktet (gennemsnit af nedre og øvre grænse)
- `high` = øvre grænse

| Værelsestype | Interval i opgaven | `low` | `mid` | `high` |
|---|---|---:|---:|---:|
| Standard Single | 900–1.200 | 900 | 1.050 | 1.200 |
| Grand Lit | 1.100–1.400 | 1.100 | 1.250 | 1.400 |
| Standard Double | 1.200–1.600 | 1.200 | 1.400 | 1.600 |
| Superior Double | 1.400–2.000 | 1.400 | 1.700 | 2.000 |
| Junior Suite | 1.800–2.500 | 1.800 | 2.150 | 2.500 |
| Spa Executive | 2.000–2.800 | 2.000 | 2.400 | 2.800 |
| Suite | 2.500–3.500 | 2.500 | 3.000 | 3.500 |
| LOFT Suite | 3.000–4.000 | 3.000 | 3.500 | 4.000 |

Totalpris for en ny booking = pris pr. nat (type, sæson) × antal nætter.

> [!NOTE]
> De historiske `Price`-værdier i CSV-filen er udleveret data og bevares uændret. De følger ikke altid tabellen ovenfor. Tabellen gælder for **nye** bookinger.

## 3. Værelser pr. type (i alt 214 værelser, maks. 428 gæster)

| Værelsestype | Antal værelser | Maks. personer pr. værelse | Maks. kapacitet | Værelsesnumre |
|---|---:|---:|---:|---|
| Standard Single | 44 | 1 | 44 | 101–144 |
| Grand Lit | 30 | 2 | 60 | 201–230 |
| Standard Double | 58 | 2 | 116 | 301–358 |
| Superior Double | 40 | 2 | 80 | 401–440 |
| Junior Suite | 16 | 3 | 48 | 501–516 |
| Spa Executive | 12 | 2 | 24 | 601–612 |
| Suite | 8 | 4 | 32 | 701–708 |
| LOFT Suite | 6 | 4 | 24 | 801–806 |
| **I alt** | **214** | | **428** | |

## 4. Berigede datafiler

Filerne i roden er beriget med opfundne, men konsistente data. Originalerne er uændrede i alle eksisterende kolonner.

`hotel_bookings_2026.csv` – nye kolonner:

| Kolonne | Betydning | Regel |
|---|---|---|
| `Check In Date` | Indtjekning | Valgt tilfældigt (fast seed 2026), så alle nætter ligger inden for bookingens `Season` (jf. punkt 1) |
| `Check Out Date` | Udtjekning | `Check In Date + Days Rented`. Må være 2027-01-01 |
| `Year` | Indtjekningsår | Altid 2026 |
| `Guests` | Antal personer | 1 til værelsestypens maks. Vægtet efter kapacitet (se nedenfor) |
| `Room Number` | Tildelt værelse | Et værelse af den rette type (punkt 3). **Ingen overlappende bookinger** på samme værelse |
| `Satisfaction` | Kundetilfredshed 1–5 | Opfundet. **Tom (NULL) i ca. 30 % af bookingerne** (gæsten svarede ikke). Vægtet mod 4–5, lidt højere for dyrere værelsestyper. Gennemsnit ca. 3,9 (fast seed 42) |

Fordeling af `Guests` (sandsynlighed for 1, 2, 3, 4 personer):

| Maks. personer | 1 | 2 | 3 | 4 |
|---|---:|---:|---:|---:|
| 1 | 100 % | | | |
| 2 | 30 % | 70 % | | |
| 3 | 15 % | 50 % | 35 % | |
| 4 | 10 % | 40 % | 20 % | 30 % |

`drinks_menu_with_sales.csv` – ny kolonne `Year` (= 2026). `Units Sold` er årets samlede antal.

Et overlap er to bookinger på samme værelse, hvor `ci₁ < co₂` og `co₁ > ci₂`. Udtjekningsdagen må gerne være næste gæsts indtjekningsdag.

Resultat for 2026: 1.000 bookinger, 5.379 solgte værelsesnætter og belægningsgrad ca. **6,9 %** (5.379 ÷ 78.110).
