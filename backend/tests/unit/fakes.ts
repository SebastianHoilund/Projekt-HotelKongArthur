import { ROOM_TYPES } from '../../src/domain/constants.js';
import type {
  Booking,
  BookingData,
  Guest,
  GuestInput,
  Room,
  RoomType,
} from '../../src/domain/types.js';
import type {
  BookingRepository,
  GuestRepository,
  RoomRepository,
  RoomTypeRepository,
  UnitOfWork,
} from '../../src/repository/interfaces.js';

/** Repositories i hukommelsen med samme 8 typer og 214 værelser som migration 002. */
export function createFakes() {
  const roomTypes: RoomType[] = ROOM_TYPES.map((type, index) => ({ id: index + 1, ...type }));
  const rooms: (Room & { roomTypeId: number })[] = roomTypes.flatMap((type) =>
    Array.from({ length: type.roomCount }, (_, i) => ({
      id: type.id * 100 + i + 1,
      number: type.id * 100 + i + 1,
      roomType: type.name,
      roomTypeId: type.id,
    })),
  );
  const guests = new Map<number, Guest>();
  const bookings = new Map<number, BookingData>();
  let nextId = 1;

  const toBooking = (id: number, data: BookingData): Booking => {
    const room = rooms.find((r) => r.id === data.roomId)!;
    return {
      id,
      guest: guests.get(data.guestId)!,
      roomType: room.roomType,
      roomNumber: room.number,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights: data.nights,
      guests: data.guests,
      season: data.season,
      year: data.year,
      price: data.price,
      priceIsManual: data.priceIsManual,
      satisfaction: data.satisfaction,
    };
  };

  const roomTypeRepo: RoomTypeRepository = {
    findAll: async () => roomTypes,
    findById: async (id) => roomTypes.find((t) => t.id === id) ?? null,
    findByName: async (name) => roomTypes.find((t) => t.name === name) ?? null,
  };

  const roomRepo: RoomRepository = {
    findByType: async (roomTypeId) => rooms.filter((r) => r.roomTypeId === roomTypeId),
    findByNumber: async (number) => rooms.find((r) => r.number === number) ?? null,
    findAll: async () => rooms,
  };

  const guestRepo: GuestRepository = {
    create: async (input: GuestInput) => {
      const guest = { id: nextId++, ...input };
      guests.set(guest.id, guest);
      return guest;
    },
    update: async (id, input) => {
      guests.set(id, { id, ...input });
    },
    deleteOrphaned: async (id) => {
      if (![...bookings.values()].some((b) => b.guestId === id)) guests.delete(id);
    },
  };

  // Returnerer alle bookinger på værelserne uden periodefilter, så overlapreglen testes i servicen.
  const bookingRepo: BookingRepository = {
    findAll: async () => [...bookings].map(([id, data]) => toBooking(id, data)),
    findById: async (id) => (bookings.has(id) ? toBooking(id, bookings.get(id)!) : null),
    findByRoomsInPeriod: async (roomIds) =>
      [...bookings]
        .filter(([, data]) => roomIds.includes(data.roomId))
        .map(([id, data]) => toBooking(id, data)),
    create: async (data) => {
      const id = nextId++;
      bookings.set(id, data);
      return id;
    },
    update: async (id, data) => {
      bookings.set(id, data);
    },
    delete: async (id) => {
      bookings.delete(id);
    },
    count: async () => bookings.size,
  };

  const unitOfWork: UnitOfWork = { withTransaction: (fn) => fn({}) };

  return { roomTypeRepo, roomRepo, guestRepo, bookingRepo, unitOfWork, guests, bookings };
}
