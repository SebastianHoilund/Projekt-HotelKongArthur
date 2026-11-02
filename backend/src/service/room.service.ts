import { NotFoundError, ValidationError } from '../domain/errors.js';
import type { Room, RoomType } from '../domain/types.js';
import type { RoomFilters, RoomRepository, RoomTypeRepository } from '../repository/interfaces.js';

export class RoomService {
  constructor(
    private readonly roomTypes: RoomTypeRepository,
    private readonly rooms: RoomRepository,
  ) {}

  listRoomTypes(): Promise<RoomType[]> {
    return this.roomTypes.findAll();
  }

  async getRoomType(id: number): Promise<RoomType> {
    const roomType = await this.roomTypes.findById(id);
    if (!roomType) throw new NotFoundError(`Værelsestype ${id} findes ikke`);
    return roomType;
  }

  async listRooms(filters: RoomFilters = {}): Promise<Room[]> {
    const { availableFrom, availableTo } = filters;
    if (Boolean(availableFrom) !== Boolean(availableTo)) {
      throw new ValidationError('availableFrom og availableTo skal angives sammen');
    }
    // Datoerne er 'YYYY-MM-DD', så tekstsammenligning svarer til datosammenligning.
    if (availableFrom && availableTo && availableTo <= availableFrom) {
      throw new ValidationError('availableTo skal ligge efter availableFrom', [
        { field: 'availableTo', message: 'Skal ligge efter availableFrom' },
      ]);
    }
    return this.rooms.findAll(filters);
  }
}
