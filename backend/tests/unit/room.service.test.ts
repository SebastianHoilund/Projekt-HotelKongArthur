import { describe, expect, it } from 'vitest';
import { ROOM_TYPES } from '../../src/domain/constants.js';
import { NotFoundError, ValidationError } from '../../src/domain/errors.js';
import type { Room, RoomType } from '../../src/domain/types.js';
import type {
  RoomFilters,
  RoomRepository,
  RoomTypeRepository,
} from '../../src/repository/interfaces.js';
import { RoomService } from '../../src/service/room.service.js';

const roomTypes: RoomType[] = ROOM_TYPES.map((type, index) => ({ id: index + 1, ...type }));

const fakeRoomTypes: RoomTypeRepository = {
  findAll: async () => roomTypes,
  findById: async (id) => roomTypes.find((type) => type.id === id) ?? null,
  findByName: async (name) => roomTypes.find((type) => type.name === name) ?? null,
};

function fakeRooms(calls: RoomFilters[]): RoomRepository {
  return {
    findByType: async () => [],
    findByNumber: async () => null,
    findAll: async (filters = {}) => {
      calls.push(filters);
      return [{ id: 1, number: 801, roomType: 'LOFT Suite' } satisfies Room];
    },
  };
}

describe('RoomService', () => {
  it('returnerer alle 8 værelsestyper', async () => {
    const service = new RoomService(fakeRoomTypes, fakeRooms([]));
    expect(await service.listRoomTypes()).toHaveLength(8);
  });

  it('returnerer én værelsestype eller NotFoundError', async () => {
    const service = new RoomService(fakeRoomTypes, fakeRooms([]));
    expect((await service.getRoomType(8)).name).toBe('LOFT Suite');
    await expect(service.getRoomType(99)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sender filtrene videre til repository', async () => {
    const calls: RoomFilters[] = [];
    const service = new RoomService(fakeRoomTypes, fakeRooms(calls));
    const filters = {
      roomType: 'LOFT Suite' as const,
      availableFrom: '2026-03-10',
      availableTo: '2026-03-13',
    };
    await service.listRooms(filters);
    expect(calls).toEqual([filters]);
  });

  it.each([
    [{ availableFrom: '2026-03-10' }],
    [{ availableTo: '2026-03-13' }],
    [{ availableFrom: '2026-03-13', availableTo: '2026-03-13' }],
    [{ availableFrom: '2026-03-14', availableTo: '2026-03-13' }],
  ])('afviser ufuldstændig eller omvendt periode %o', async (filters) => {
    const service = new RoomService(fakeRoomTypes, fakeRooms([]));
    await expect(service.listRooms(filters)).rejects.toBeInstanceOf(ValidationError);
  });
});
