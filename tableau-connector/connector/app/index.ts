import Connector from '@tableau/taco-toolkit'

let connectorInitialized = false
let pageLoaded = false

const connector = new Connector(() => {
  connectorInitialized = true
  enableWhenReady()
})

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id)
  if (!found) throw new Error(`Elementet #${id} mangler på siden.`)
  return found as T
}

function showError(message: string) {
  const error = element<HTMLParagraphElement>('error')
  error.textContent = message
  error.hidden = false
}

function handleSubmit(event: Event) {
  event.preventDefault()
  const year = Number(element<HTMLInputElement>('year').value)
  const baseUrl = element<HTMLInputElement>('baseUrl').value.trim().replace(/\/+$/, '')

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    showError('Året skal være et helt tal mellem 2000 og 2100.')
    return
  }

  const button = element<HTMLButtonElement>('submitButton')
  button.disabled = true
  button.textContent = 'Henter data …'

  connector.handlerInputs = [
    {
      fetcher: 'HotelFetcher',
      parser: 'HotelParser',
      data: { baseUrl, year },
    },
  ]
  connector.submit()
}

function enableWhenReady() {
  if (!connectorInitialized || !pageLoaded) return
  const button = element<HTMLButtonElement>('submitButton')
  button.textContent = 'Hent data'
  button.disabled = false
  element<HTMLFormElement>('settings').addEventListener('submit', handleSubmit)
}

window.addEventListener('load', () => {
  pageLoaded = true
  enableWhenReady()
})
