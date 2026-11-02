import type {
  Booking,
  BookingData,
  Drink,
  DrinkCategory,
  DrinkSale,
  DrinkSaleData,
  Guest,
  GuestInput,
  Room,
  RoomType,
  RoomTypeName,
  Season,
} from '../domain/types.js';

/** En åben transaktion. Service-laget sender den blot videre og kender ikke dens indhold. */
export type Tx = object;

export interface UnitOfWork {
  withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

export interface BookingFilters {
  year?: number;
  roomType?: RoomTypeName;
  country?: string;
  season?: Season;
}

export interface BookingRepository {
  findAll(filters?: BookingFilters): Promise<Booking[]>;
  findById(id: number, tx?: Tx): Promise<Booking | null>;
  /**
   * Bookinger på værelserne, der kan ramme perioden. SQL'en filtrerer kun for at hente færre rækker.
   * Selve overlapreglen og valget af værelse ligger i `BookingService`.
   */
  findByRoomsInPeriod(
    roomIds: number[],
    checkIn: string,
    checkOut: string,
    tx?: Tx,
  ): Promise<Booking[]>;
  create(data: BookingData, tx?: Tx): Promise<number>;
  update(id: number, data: BookingData, tx?: Tx): Promise<void>;
  delete(id: number, tx?: Tx): Promise<void>;
  count(): Promise<number>;
}

export interface GuestRepository {
  create(guest: GuestInput, tx?: Tx): Promise<Guest>;
  update(id: number, guest: GuestInput, tx?: Tx): Promise<void>;
  /** Sletter kun gæsten, hvis den ikke længere har bookinger. */
  deleteOrphaned(id: number, tx?: Tx): Promise<void>;
}

export interface RoomFilters {
  roomType?: RoomTypeName;
  availableFrom?: string;
  availableTo?: string;
}

export interface RoomRepository {
  /** Sorteret efter værelsesnummer. `forUpdate` låser værelserne indtil transaktionen slutter. */
  findByType(roomTypeId: number, options?: { forUpdate?: boolean; tx?: Tx }): Promise<Room[]>;
  findByNumber(number: number, tx?: Tx): Promise<Room | null>;
  findAll(filters?: RoomFilters): Promise<Room[]>;
}

export interface RoomTypeRepository {
  findAll(): Promise<RoomType[]>;
  findById(id: number): Promise<RoomType | null>;
  findByName(name: string): Promise<RoomType | null>;
}

export interface DrinkRepository {
  findAll(category?: DrinkCategory): Promise<Drink[]>;
  findById(id: number): Promise<Drink | null>;
}

export interface DrinkSaleFilters {
  year?: number;
  drinkId?: number;
}

export interface DrinkSaleRepository {
  findAll(filters?: DrinkSaleFilters): Promise<DrinkSale[]>;
  create(data: DrinkSaleData): Promise<DrinkSale>;
}
