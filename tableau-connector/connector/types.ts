// Formen på backendens svar, som i api/openapi.yaml. Connectoren regner intet selv (research R-11).

export type Season = 'low' | 'mid' | 'high'

export interface BookingFact {
  bookingId: number
  year: number
  month: number
  season: Season
  checkIn: string
  checkOut: string
  roomType: string
  roomNumber: number
  country: string
  guests: number
  nights: number
  price: number
  satisfaction: number | null
}

export interface SatisfactionValue {
  average: number
  responses: number
}

export interface Summary {
  year: number
  revenue: number
  bookings: number
  nightsSold: number
  availableNights: number
  occupancyRate: number
  adr: number
  revpar: number
  alos: number
  satisfaction: SatisfactionValue
}

export interface OccupancyRow {
  period: string
  nightsSold: number
  availableNights: number
  occupancyRate: number
}

export interface Occupancy {
  year: number
  total: OccupancyRow
  bySeason: OccupancyRow[]
  byMonth: OccupancyRow[]
}

export interface RevenueCell {
  revenue: number
  bookings: number
  nights: number
}

export interface RoomTypeRevenue {
  rank: number
  roomType: string
  total: RevenueCell
  bySeason: Record<Season, RevenueCell>
}

export interface CountryRevenue extends RevenueCell {
  rank: number
  country: string
  guests: number
}

export interface SatisfactionReport {
  year: number
  overall: SatisfactionValue
  byRoomType: (SatisfactionValue & { roomType: string })[]
}

export interface BarAnalytics {
  year: number
  bartender: string
  totals: { revenue: number; units: number }
  drinks: {
    drinkId: number
    name: string
    category: string
    unitPrice: number
    units: number
    revenue: number
  }[]
  categorySplit: {
    category: string
    revenue: number
    units: number
    revenueShare: number
    unitShare: number
  }[]
}

/** Det, HotelFetcher giver videre til HotelParser. */
export interface HotelData {
  year: number
  bookings: BookingFact[]
  summary: Summary
  occupancy: Occupancy
  roomTypes: RoomTypeRevenue[]
  countries: CountryRevenue[]
  satisfaction: SatisfactionReport
  bar: BarAnalytics
}

/** Det, UI'et sender med til fetcheren. */
export interface HotelInput {
  baseUrl: string
  year: number
}
