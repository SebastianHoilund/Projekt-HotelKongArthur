// UI-logik for bookingsiden. Ingen forretningsregler: sæson, pris, nætter og værelse
// kommer fra API-svaret, og al validering sker i backenden.
import { api } from './api.js';

const SEASON_LABELS = { low: 'Lav', mid: 'Mellem', high: 'Høj' };
const money = new Intl.NumberFormat('da-DK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const form = document.getElementById('booking-form');
const formTitle = document.getElementById('form-title');
const formErrors = document.getElementById('form-errors');
const submitButton = document.getElementById('submit-button');
const cancelButton = document.getElementById('cancel-edit');
const filters = document.getElementById('filters');
const rows = document.getElementById('booking-rows');
const listMessage = document.getElementById('list-message');

let editingId = null;

function showMessage(element, text, kind = '') {
  element.textContent = text;
  element.className = `message ${kind}`.trim();
  element.hidden = text === '';
}

function showError(error) {
  formErrors.replaceChildren();
  const heading = document.createElement('p');
  heading.textContent = error.message;
  formErrors.append(heading);
  if (error.details?.length) {
    const list = document.createElement('ul');
    for (const detail of error.details) {
      const item = document.createElement('li');
      item.textContent = detail.field ? `${detail.field}: ${detail.message}` : detail.message;
      list.append(item);
    }
    formErrors.append(list);
  }
  formErrors.hidden = false;
}

function cell(text, className) {
  const td = document.createElement('td');
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function button(text, className, onClick) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.className = className;
  element.addEventListener('click', onClick);
  return element;
}

function renderRows(bookings) {
  rows.replaceChildren(
    ...bookings.map((b) => {
      const tr = document.createElement('tr');
      const price = `${money.format(b.price)}${b.priceIsManual ? ' (manuel)' : ''}`;
      tr.append(
        cell(b.id),
        cell(`${b.guest.firstName} ${b.guest.familyName}`),
        cell(b.guest.country),
        cell(b.roomType),
        cell(b.roomNumber),
        cell(b.checkIn),
        cell(b.checkOut),
        cell(b.nights, 'num'),
        cell(b.guests, 'num'),
        cell(SEASON_LABELS[b.season]),
        cell(price, 'num'),
        cell(b.satisfaction ?? '–', 'num'),
      );
      const actions = document.createElement('td');
      actions.className = 'row-actions';
      actions.append(
        button('Redigér', 'secondary small', () => startEdit(b)),
        button('Slet', 'danger small', () => removeBooking(b)),
      );
      tr.append(actions);
      return tr;
    }),
  );
}

async function loadBookings() {
  const params = Object.fromEntries(new FormData(filters));
  showMessage(listMessage, 'Henter bookinger …');
  try {
    const bookings = await api.listBookings(params);
    renderRows(bookings);
    showMessage(listMessage, `${bookings.length} bookinger`);
  } catch (error) {
    rows.replaceChildren();
    showMessage(listMessage, `Kunne ikke hente bookinger: ${error.message}`, 'error');
  }
}

async function loadRoomTypes() {
  const roomTypes = await api.listRoomTypes();
  for (const select of [form.elements.roomType, filters.elements.roomType]) {
    for (const type of roomTypes) {
      const option = document.createElement('option');
      option.value = type.name;
      option.textContent = `${type.name} (højst ${type.maxGuests} pers.)`;
      select.append(option);
    }
  }
}

function readForm() {
  const data = Object.fromEntries(new FormData(form));
  const input = {
    guest: { firstName: data.firstName, familyName: data.familyName, country: data.country },
    roomType: data.roomType,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    guests: Number(data.guests),
    satisfaction: data.satisfaction === '' ? null : Number(data.satisfaction),
  };
  // Tom pris betyder, at backenden beregner den efter takst.
  if (data.price !== '') input.price = Number(data.price);
  return input;
}

function resetForm() {
  editingId = null;
  form.reset();
  form.elements.price.placeholder = 'Beregnes automatisk';
  formTitle.textContent = 'Ny booking';
  submitButton.textContent = 'Opret booking';
  cancelButton.hidden = true;
  formErrors.hidden = true;
}

function startEdit(booking) {
  editingId = booking.id;
  form.elements.firstName.value = booking.guest.firstName;
  form.elements.familyName.value = booking.guest.familyName;
  form.elements.country.value = booking.guest.country;
  form.elements.roomType.value = booking.roomType;
  form.elements.checkIn.value = booking.checkIn;
  form.elements.checkOut.value = booking.checkOut;
  form.elements.guests.value = booking.guests;
  // Prisen udfyldes ikke: tom felt beholder en manuel pris, hvis datoer og type er uændrede,
  // og ellers genberegner backenden den.
  form.elements.price.value = '';
  form.elements.price.placeholder = `Nu: ${money.format(booking.price)}`;
  form.elements.satisfaction.value = booking.satisfaction ?? '';
  formTitle.textContent = `Redigér booking ${booking.id}`;
  submitButton.textContent = 'Gem ændringer';
  cancelButton.hidden = false;
  formErrors.hidden = true;
  form.scrollIntoView({ behavior: 'smooth' });
}

async function removeBooking(booking) {
  const name = `${booking.guest.firstName} ${booking.guest.familyName}`;
  if (!confirm(`Slet booking ${booking.id} for ${name} (${booking.checkIn} – ${booking.checkOut})?`)) {
    return;
  }
  try {
    await api.deleteBooking(booking.id);
    if (editingId === booking.id) resetForm();
    await loadBookings();
    showMessage(listMessage, `Booking ${booking.id} er slettet`, 'success');
  } catch (error) {
    showMessage(listMessage, `Kunne ikke slette: ${error.message}`, 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  try {
    const input = readForm();
    const saved = editingId
      ? await api.updateBooking(editingId, input)
      : await api.createBooking(input);
    const verb = editingId ? 'opdateret' : 'oprettet';
    resetForm();
    await loadBookings();
    showMessage(
      listMessage,
      `Booking ${saved.id} ${verb}: værelse ${saved.roomNumber}, ${SEASON_LABELS[saved.season].toLowerCase()} sæson, ` +
        `${saved.nights} nætter, ${money.format(saved.price)} DKK`,
      'success',
    );
  } catch (error) {
    showError(error);
  } finally {
    submitButton.disabled = false;
  }
});

cancelButton.addEventListener('click', resetForm);
filters.addEventListener('submit', (event) => {
  event.preventDefault();
  loadBookings();
});

try {
  await loadRoomTypes();
} catch (error) {
  showError(error);
}
await loadBookings();
