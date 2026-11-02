import { Fetcher, FetchOptions, FetchUtils } from '@tableau/taco-toolkit/handlers'
import type { HotelData, HotelInput } from './api-types'

export default class HotelFetcher extends Fetcher {
  async *fetch({ handlerInput }: FetchOptions) {
    const { baseUrl, year } = handlerInput.data as HotelInput
    const get = async <T>(path: string): Promise<T> =>
      (await FetchUtils.fetchJson(`${baseUrl}${path}?year=${year}`)) as T

    // Alle tal hentes live fra backenden ved hver opdatering. Intet caches i Tableau-filen.
    const [bookings, summary, occupancy, roomTypes, countries, satisfaction, bar] =
      await Promise.all([
        get<HotelData['bookings']>('/api/reports/bookings'),
        get<HotelData['summary']>('/api/analytics/summary'),
        get<HotelData['occupancy']>('/api/analytics/occupancy'),
        get<HotelData['roomTypes']>('/api/analytics/revenue/room-types'),
        get<HotelData['countries']>('/api/analytics/revenue/countries'),
        get<HotelData['satisfaction']>('/api/analytics/satisfaction'),
        get<HotelData['bar']>('/api/analytics/bar'),
      ])

    const data: HotelData = {
      year,
      bookings,
      summary,
      occupancy,
      roomTypes,
      countries,
      satisfaction,
      bar,
    }
    yield data
  }
}
