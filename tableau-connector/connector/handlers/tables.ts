import { DataType } from '@tableau/taco-toolkit/handlers'
import type { HotelData, OccupancyRow, Season } from './api-types'

type Value = string | number | null

interface Column {
  id: string
  alias: string
  dataType: DataType
}

export interface TableDefinition {
  id: string
  name: string
  columns: Column[]
  rows: Record<string, Value>[]
}

const SEASONS: Season[] = ['low', 'mid', 'high']

const col = (id: string, alias: string, dataType: DataType): Column => ({ id, alias, dataType })
const int = (id: string, alias: string) => col(id, alias, DataType.Int)
const float = (id: string, alias: string) => col(id, alias, DataType.Float)
const text = (id: string, alias: string) => col(id, alias, DataType.String)

const occupancyRow = (periodType: string, row: OccupancyRow) => ({
  periodType,
  period: row.period,
  nightsSold: row.nightsSold,
  availableNights: row.availableNights,
  occupancyRate: row.occupancyRate,
})

/**
 * De 8 Tableau-tabeller fra plan.md. Rækkerne er backendens tal uændret, kun omformet til flade
 * tabeller. Tableau skal summere bookings_fact, men aldrig selv regne nøgletal (research R-11).
 */
export function buildTables(data: HotelData): TableDefinition[] {
  const { summary, occupancy, bar } = data

  return [
    {
      id: 'bookings_fact',
      name: 'Bookinger',
      columns: [
        int('bookingId', 'Booking-id'),
        int('year', 'År'),
        int('month', 'Måned'),
        text('season', 'Sæson'),
        col('checkIn', 'Indtjekning', DataType.Date),
        col('checkOut', 'Udtjekning', DataType.Date),
        text('roomType', 'Værelsestype'),
        int('roomNumber', 'Værelse'),
        text('country', 'Land'),
        int('guests', 'Personer'),
        int('nights', 'Nætter'),
        float('price', 'Pris (DKK)'),
        int('satisfaction', 'Tilfredshed'),
      ],
      rows: data.bookings.map((b) => ({ ...b })),
    },
    {
      id: 'kpi_summary',
      name: 'Nøgletal',
      columns: [
        int('year', 'År'),
        float('revenue', 'Indtjening (DKK)'),
        int('bookings', 'Bookinger'),
        int('nightsSold', 'Solgte nætter'),
        int('availableNights', 'Tilgængelige nætter'),
        float('occupancyRate', 'Belægningsgrad (%)'),
        float('adr', 'ADR (DKK)'),
        float('revpar', 'RevPAR (DKK)'),
        float('alos', 'ALOS (nætter)'),
        float('satisfactionAverage', 'Tilfredshed (gns.)'),
        int('satisfactionResponses', 'Tilfredshed (svar)'),
      ],
      rows: [
        {
          year: summary.year,
          revenue: summary.revenue,
          bookings: summary.bookings,
          nightsSold: summary.nightsSold,
          availableNights: summary.availableNights,
          occupancyRate: summary.occupancyRate,
          adr: summary.adr,
          revpar: summary.revpar,
          alos: summary.alos,
          satisfactionAverage: summary.satisfaction.average,
          satisfactionResponses: summary.satisfaction.responses,
        },
      ],
    },
    {
      id: 'revenue_room_type_season',
      name: 'Indtjening pr. værelsestype og sæson',
      columns: [
        int('rank', 'Rang'),
        text('roomType', 'Værelsestype'),
        text('season', 'Sæson'),
        float('revenue', 'Indtjening (DKK)'),
        int('bookings', 'Bookinger'),
        int('nights', 'Nætter'),
        float('roomTypeRevenue', 'Typens samlede indtjening (DKK)'),
      ],
      rows: data.roomTypes.flatMap((type) =>
        SEASONS.map((season) => ({
          rank: type.rank,
          roomType: type.roomType,
          season,
          ...type.bySeason[season],
          roomTypeRevenue: type.total.revenue,
        })),
      ),
    },
    {
      id: 'revenue_country',
      name: 'Indtjening pr. land',
      columns: [
        int('rank', 'Rang'),
        text('country', 'Land'),
        float('revenue', 'Indtjening (DKK)'),
        int('bookings', 'Bookinger'),
        int('nights', 'Nætter'),
        int('guests', 'Gæster'),
      ],
      rows: data.countries.map((c) => ({ ...c })),
    },
    {
      id: 'occupancy_period',
      name: 'Belægningsgrad pr. periode',
      columns: [
        text('periodType', 'Periodetype'),
        text('period', 'Periode'),
        int('nightsSold', 'Solgte nætter'),
        int('availableNights', 'Tilgængelige nætter'),
        float('occupancyRate', 'Belægningsgrad (%)'),
      ],
      rows: [
        occupancyRow('year', occupancy.total),
        ...occupancy.bySeason.map((row) => occupancyRow('season', row)),
        ...occupancy.byMonth.map((row) => occupancyRow('month', row)),
      ],
    },
    {
      id: 'satisfaction_room_type',
      name: 'Tilfredshed pr. værelsestype',
      columns: [
        text('roomType', 'Værelsestype'),
        float('average', 'Tilfredshed (gns.)'),
        int('responses', 'Svar'),
      ],
      rows: data.satisfaction.byRoomType.map((row) => ({ ...row })),
    },
    {
      id: 'bar_drinks',
      name: 'Bar: omsætning pr. drink',
      columns: [
        int('drinkId', 'Drink-id'),
        text('name', 'Drink'),
        text('category', 'Kategori'),
        float('unitPrice', 'Stykpris (DKK)'),
        int('units', 'Solgte enheder'),
        float('revenue', 'Omsætning (DKK)'),
      ],
      rows: bar.drinks.map((d) => ({ ...d })),
    },
    {
      id: 'bar_summary',
      name: 'Bar: total og fordeling',
      columns: [
        int('year', 'År'),
        text('bartender', 'Bartender'),
        text('category', 'Kategori'),
        float('revenue', 'Omsætning (DKK)'),
        int('units', 'Enheder'),
        float('revenueShare', 'Andel af omsætning (%)'),
        float('unitShare', 'Andel af enheder (%)'),
        float('totalRevenue', 'Barens samlede omsætning (DKK)'),
        int('totalUnits', 'Barens samlede enheder'),
      ],
      rows: bar.categorySplit.map((c) => ({
        year: bar.year,
        bartender: bar.bartender,
        ...c,
        totalRevenue: bar.totals.revenue,
        totalUnits: bar.totals.units,
      })),
    },
  ]
}
