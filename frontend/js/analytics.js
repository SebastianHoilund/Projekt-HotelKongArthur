// Nøgletalssiden. Alle tal kommer færdigberegnede fra /api/analytics/* (FR-019, SC-008).
// Her formateres kun: DKK, procent og decimaler. Ingen summer, gennemsnit eller sortering.
import { api } from './api.js';

const SEASON_LABELS = { low: 'Lav', mid: 'Mellem', high: 'Høj' };

const integer = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthName = new Intl.DateTimeFormat('da-DK', { month: 'long', timeZone: 'UTC' });

const fmt = {
  // Hele kroner uden decimaler, ellers altid to (2.088,50 kr.).
  dkk: (value) => `${(Number.isInteger(value) ? integer : decimal).format(value)} kr.`,
  int: (value) => integer.format(value),
  dec: (value) => decimal.format(value),
  pct: (value) => `${decimal.format(value)} %`,
  // '2026-03' → 'marts'
  month: (period) => monthName.format(new Date(`${period}-01T00:00:00Z`)),
};

const SECTIONS = [
  'kpi-cards',
  'occupancy-season',
  'occupancy-month',
  'room-types',
  'countries',
  'satisfaction',
  'bar-cards',
  'bar-split',
  'bar-drinks',
];

const form = document.getElementById('year-form');
const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);

// Hvis brugeren skifter år hurtigt, må et gammelt svar ikke overskrive et nyere.
let latestRequest = 0;

function showStatus(text, kind = '') {
  status.textContent = text;
  status.className = `message ${kind}`.trim();
}

function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function card(label, value, detail) {
  const el = element('div', undefined, 'kpi-card');
  el.append(element('span', label, 'kpi-label'), element('strong', value, 'kpi-value'));
  if (detail) el.append(element('span', detail, 'kpi-detail'));
  return el;
}

/** columns: [{ label, value: (row) => string, num?: boolean }] */
function table(columns, rows, footer) {
  const tableEl = element('table');
  const headRow = element('tr');
  for (const column of columns) headRow.append(element('th', column.label, column.num ? 'num' : ''));
  const head = element('thead');
  head.append(headRow);
  tableEl.append(head);

  const body = element('tbody');
  for (const row of rows) {
    const tr = element('tr');
    for (const column of columns) tr.append(element('td', column.value(row), column.num ? 'num' : ''));
    body.append(tr);
  }
  tableEl.append(body);

  if (footer) {
    const tr = element('tr');
    for (const column of columns) tr.append(element('td', column.value(footer), column.num ? 'num' : ''));
    const foot = element('tfoot');
    foot.append(tr);
    tableEl.append(foot);
  }
  return tableEl;
}

function renderSummary(summary) {
  $('kpi-cards').replaceChildren(
    card('Årets indtjening', fmt.dkk(summary.revenue), `${fmt.int(summary.bookings)} bookinger`),
    card(
      'Belægningsgrad',
      fmt.pct(summary.occupancyRate),
      `${fmt.int(summary.nightsSold)} af ${fmt.int(summary.availableNights)} nætter`,
    ),
    card('ADR', fmt.dkk(summary.adr), 'Indtjening pr. solgt nat'),
    card('RevPAR', fmt.dkk(summary.revpar), 'Indtjening pr. tilgængelig nat'),
    card('ALOS', `${fmt.dec(summary.alos)} nætter`, 'Gennemsnitlig opholdslængde'),
    card(
      'Kundetilfredshed',
      `${fmt.dec(summary.satisfaction.average)} / 5`,
      `${fmt.int(summary.satisfaction.responses)} svar`,
    ),
  );
}

function renderOccupancy(occupancy) {
  const columns = (periodLabel, period) => [
    { label: periodLabel, value: period },
    { label: 'Solgte nætter', value: (r) => fmt.int(r.nightsSold), num: true },
    { label: 'Tilgængelige', value: (r) => fmt.int(r.availableNights), num: true },
    { label: 'Belægning', value: (r) => fmt.pct(r.occupancyRate), num: true },
  ];
  const total = { ...occupancy.total, period: 'Hele året' };
  $('occupancy-season').replaceChildren(
    table(
      columns('Sæson', (r) => SEASON_LABELS[r.period] ?? r.period),
      occupancy.bySeason,
      total,
    ),
  );
  $('occupancy-month').replaceChildren(
    table(
      columns('Måned', (r) => (r === total ? r.period : fmt.month(r.period))),
      occupancy.byMonth,
      total,
    ),
  );
}

function renderRoomTypes(roomTypes) {
  $('room-types').replaceChildren(
    table(
      [
        { label: 'Rang', value: (r) => String(r.rank), num: true },
        { label: 'Værelsestype', value: (r) => r.roomType },
        { label: 'Lav sæson', value: (r) => fmt.dkk(r.bySeason.low.revenue), num: true },
        { label: 'Mellem sæson', value: (r) => fmt.dkk(r.bySeason.mid.revenue), num: true },
        { label: 'Høj sæson', value: (r) => fmt.dkk(r.bySeason.high.revenue), num: true },
        { label: 'I alt', value: (r) => fmt.dkk(r.total.revenue), num: true },
        { label: 'Bookinger', value: (r) => fmt.int(r.total.bookings), num: true },
        { label: 'Nætter', value: (r) => fmt.int(r.total.nights), num: true },
      ],
      roomTypes,
    ),
  );
}

function renderCountries(countries) {
  $('countries').replaceChildren(
    countries.length === 0
      ? element('p', 'Ingen bookinger i året.', 'note')
      : table(
          [
            { label: 'Rang', value: (r) => String(r.rank), num: true },
            { label: 'Land', value: (r) => r.country },
            { label: 'Indtjening', value: (r) => fmt.dkk(r.revenue), num: true },
            { label: 'Bookinger', value: (r) => fmt.int(r.bookings), num: true },
            { label: 'Nætter', value: (r) => fmt.int(r.nights), num: true },
            { label: 'Gæster', value: (r) => fmt.int(r.guests), num: true },
          ],
          countries,
        ),
  );
}

function renderSatisfaction(report) {
  $('satisfaction').replaceChildren(
    table(
      [
        { label: 'Værelsestype', value: (r) => r.roomType },
        { label: 'Gennemsnit', value: (r) => fmt.dec(r.average), num: true },
        { label: 'Svar', value: (r) => fmt.int(r.responses), num: true },
      ],
      report.byRoomType,
      { roomType: 'Samlet', ...report.overall },
    ),
  );
}

function renderBar(bar) {
  $('bar-cards').replaceChildren(
    card(`${bar.bartender}s samlede salg`, fmt.dkk(bar.totals.revenue), `${fmt.int(bar.totals.units)} enheder`),
    ...bar.categorySplit.map((c) =>
      card(c.category, fmt.pct(c.revenueShare), `af omsætningen · ${fmt.pct(c.unitShare)} af enhederne`),
    ),
  );
  $('bar-split').replaceChildren(
    table(
      [
        { label: 'Kategori', value: (r) => r.category },
        { label: 'Omsætning', value: (r) => fmt.dkk(r.revenue), num: true },
        { label: 'Andel', value: (r) => fmt.pct(r.revenueShare), num: true },
        { label: 'Enheder', value: (r) => fmt.int(r.units), num: true },
        { label: 'Andel', value: (r) => fmt.pct(r.unitShare), num: true },
      ],
      bar.categorySplit,
    ),
  );
  $('bar-drinks').replaceChildren(
    table(
      [
        { label: 'Drink', value: (r) => r.name },
        { label: 'Kategori', value: (r) => r.category },
        { label: 'Stykpris', value: (r) => fmt.dkk(r.unitPrice), num: true },
        { label: 'Enheder', value: (r) => fmt.int(r.units), num: true },
        { label: 'Omsætning', value: (r) => fmt.dkk(r.revenue), num: true },
      ],
      bar.drinks,
    ),
  );
}

async function load(year) {
  const request = ++latestRequest;
  showStatus(`Henter nøgletal for ${year} …`);
  const params = { year };
  try {
    const [summary, occupancy, roomTypes, countries, satisfaction, bar] = await Promise.all([
      api.get('/analytics/summary', params),
      api.get('/analytics/occupancy', params),
      api.get('/analytics/revenue/room-types', params),
      api.get('/analytics/revenue/countries', params),
      api.get('/analytics/satisfaction', params),
      api.get('/analytics/bar', params),
    ]);
    if (request !== latestRequest) return;

    renderSummary(summary);
    renderOccupancy(occupancy);
    renderRoomTypes(roomTypes);
    renderCountries(countries);
    renderSatisfaction(satisfaction);
    renderBar(bar);
    showStatus(
      summary.bookings === 0 ? `Ingen bookinger i ${year}. Alle hoteltal er 0.` : `Nøgletal for ${year}`,
    );
  } catch (error) {
    if (request !== latestRequest) return;
    // Fjern det forrige års tal, så de ikke kan forveksles med det valgte år.
    for (const id of SECTIONS) $(id).replaceChildren();
    showStatus(`Kunne ikke hente nøgletal: ${error.message}`, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const year = form.elements.year.value;
  // Året står i adressen, så en genindlæsning viser samme år.
  history.replaceState(null, '', `?year=${encodeURIComponent(year)}`);
  load(year);
});

const initialYear = new URLSearchParams(location.search).get('year');
if (initialYear) form.elements.year.value = initialYear;
load(form.elements.year.value);
