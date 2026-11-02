import { nightsBetween, overlaps } from '../domain/booking-rules.js';
import { ConflictError, NotFoundError, ValidationError } from '../domain/errors.js';
import { bookingInputSchema } from '../domain/schemas.js';
import type { Booking, BookingData, BookingInput, RoomType } from '../domain/types.js';
import type {
  BookingFilters,
  BookingRepository,
  GuestRepository,
  RoomRepository,
  RoomTypeRepository,
  Tx,
  UnitOfWork,
} from '../repository/interfaces.js';
import type { PricingService } from './pricing.service.js';

interface ValidBooking {
  input: BookingInput;
  roomType: RoomType;
  nights: number;
  year: number;
}

export class BookingService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly guests: GuestRepository,
    private readonly rooms: RoomRepository,
    private readonly roomTypes: RoomTypeRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly pricing: PricingService,
  ) {}

  list(filters: BookingFilters = {}): Promise<Booking[]> {
    return this.bookings.findAll(filters);
  }

  async get(id: number, tx?: Tx): Promise<Booking> {
    const booking = await this.bookings.findById(id, tx);
    if (!booking) throw new NotFoundError(`Booking ${id} findes ikke`);
    return booking;
  }

  async create(rawInput: unknown): Promise<Booking> {
    const { input, roomType, nights, year } = await this.validate(rawInput);
    const { price, season, priceIsManual } = this.pricing.calculatePrice(
      roomType,
      input.checkIn,
      nights,
      input.price,
    );

    return this.unitOfWork.withTransaction(async (tx) => {
      const roomId = await this.assignRoom(roomType, input.checkIn, input.checkOut, tx);
      const guest = await this.guests.create(input.guest, tx);
      const id = await this.bookings.create(
        {
          guestId: guest.id,
          roomId,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nights,
          guests: input.guests,
          season,
          year,
          price,
          priceIsManual,
          satisfaction: input.satisfaction ?? null,
        },
        tx,
      );
      return this.get(id, tx);
    });
  }

  async update(id: number, rawInput: unknown): Promise<Booking> {
    const { input, roomType, nights, year } = await this.validate(rawInput);

    return this.unitOfWork.withTransaction(async (tx) => {
      const existing = await this.get(id, tx);
      const sameType = existing.roomType === input.roomType;
      const changed =
        !sameType || existing.checkIn !== input.checkIn || existing.checkOut !== input.checkOut;

      // Clarification 2: en manuel pris følger kun med, hvis hverken datoer eller type ændres.
      const calculated = this.pricing.calculatePrice(roomType, input.checkIn, nights, input.price);
      const { price, priceIsManual } =
        calculated.priceIsManual || changed || !existing.priceIsManual
          ? calculated
          : { price: existing.price, priceIsManual: true };

      const roomId = await this.assignRoom(
        roomType,
        input.checkIn,
        input.checkOut,
        tx,
        id,
        sameType ? existing.roomNumber : undefined,
      );

      await this.guests.update(existing.guest.id, input.guest, tx);
      const data: BookingData = {
        guestId: existing.guest.id,
        roomId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights,
        guests: input.guests,
        season: calculated.season,
        year,
        price,
        priceIsManual,
        satisfaction: input.satisfaction ?? null,
      };
      await this.bookings.update(id, data, tx);
      return this.get(id, tx);
    });
  }

  async delete(id: number): Promise<void> {
    await this.unitOfWork.withTransaction(async (tx) => {
      const existing = await this.get(id, tx);
      await this.bookings.delete(id, tx);
      await this.guests.deleteOrphaned(existing.guest.id, tx);
    });
  }

  private async validate(rawInput: unknown): Promise<ValidBooking> {
    const parsed = bookingInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(
        'Ugyldig booking',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    const input = parsed.data;

    const roomType = await this.roomTypes.findByName(input.roomType);
    if (!roomType) {
      throw new ValidationError(`Ukendt værelsestype: ${input.roomType}`, [
        { field: 'roomType', message: 'Ukendt værelsestype' },
      ]);
    }

    const nights = nightsBetween(input.checkIn, input.checkOut);
    if (nights < 1) {
      throw new ValidationError('Udtjekning skal ligge efter indtjekning', [
        { field: 'checkOut', message: 'Skal ligge efter checkIn' },
      ]);
    }
    if (input.guests > roomType.maxGuests) {
      throw new ValidationError(
        `${roomType.name} har plads til højst ${roomType.maxGuests} personer`,
        [{ field: 'guests', message: `Højst ${roomType.maxGuests}` }],
      );
    }

    return { input, roomType, nights, year: Number(input.checkIn.slice(0, 4)) };
  }

  /**
   * Låser værelserne af typen (FOR UPDATE), så samtidige bookinger ikke kan vælge samme værelse.
   * Foretrækker det nuværende værelse ved update, ellers laveste ledige værelsesnummer.
   */
  private async assignRoom(
    roomType: RoomType,
    checkIn: string,
    checkOut: string,
    tx: Tx,
    excludeBookingId?: number,
    preferredRoomNumber?: number,
  ): Promise<number> {
    const rooms = await this.rooms.findByType(roomType.id, { forUpdate: true, tx });
    const candidates = await this.bookings.findByRoomsInPeriod(
      rooms.map((room) => room.id),
      checkIn,
      checkOut,
      tx,
    );
    const occupied = new Set(
      candidates
        .filter((booking) => booking.id !== excludeBookingId)
        .filter((booking) => overlaps(booking, { checkIn, checkOut }))
        .map((booking) => booking.roomNumber),
    );

    const free = rooms.filter((room) => !occupied.has(room.number));
    const room = free.find((r) => r.number === preferredRoomNumber) ?? free[0];
    if (!room) {
      throw new ConflictError(
        `Intet ledigt værelse af typen ${roomType.name} fra ${checkIn} til ${checkOut}`,
      );
    }
    return room.id;
  }
}
