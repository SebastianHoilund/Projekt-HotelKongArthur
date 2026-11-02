import { DataContainer, log, ParseOptions, Parser } from '@tableau/taco-toolkit/handlers'
import type { HotelData } from './api-types'
import { buildTables } from './tables'

export default class HotelParser extends Parser<HotelData> {
  parse(data: HotelData, { dataContainer }: ParseOptions): DataContainer {
    const containerBuilder = Parser.createContainerBuilder(dataContainer)

    for (const table of buildTables(data)) {
      const { isNew, tableBuilder } = containerBuilder.getTable(table.name)
      if (isNew) {
        tableBuilder.setId(table.id)
        tableBuilder.addColumnHeaders(table.columns)
      }
      tableBuilder.addRows(table.rows)
      log(`${table.id}: ${table.rows.length} rækker for ${data.year}`)
    }

    return containerBuilder.getDataContainer()
  }
}
