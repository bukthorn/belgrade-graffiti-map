import React, { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import Papa from 'papaparse'

type GraffitiItem = {
  latitude?: string
  longitude?: string
  original_text?: string
  possible_meaning?: string
  tags?: string
  date?: string
  [key: string]: string | undefined
}

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRhpOdfbetAkVGXD_6hKYAEDtuS2yzQfCX3yR-4YubijnBSIaGnByVcmK1LZQ0Nyotn0MiwiJ-8xyjv/pub?gid=0&single=true&output=csv'

function cleanHeader(header: string): string {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
}

function cleanValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '')
}

function parseCsv(csvText: string, delimiter = '') {
  return Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    delimiter,
    transformHeader: cleanHeader,
    transform: cleanValue,
  })
}

function hasCoordinateColumns(row: GraffitiItem): boolean {
  return (
    Object.prototype.hasOwnProperty.call(row, 'latitude') &&
    Object.prototype.hasOwnProperty.call(row, 'longitude')
  )
}

function removeEmptyRows(items: GraffitiItem[]): GraffitiItem[] {
  return items.filter((item) =>
    Object.values(item).some((value) => String(value ?? '').trim() !== ''),
  )
}

async function fetchGraffitiItems(): Promise<GraffitiItem[]> {
  const response = await fetch(CSV_URL)

  if (!response.ok) {
    throw new Error(`CSV request failed: ${response.status}`)
  }

  const csvText = await response.text()

  let parsed = parseCsv(csvText)
  let rows = parsed.data as GraffitiItem[]
  let firstRow = rows[0] || {}

  if (!hasCoordinateColumns(firstRow)) {
    parsed = parseCsv(csvText, '|')
    rows = parsed.data as GraffitiItem[]
    firstRow = rows[0] || {}
  }

  if (!hasCoordinateColumns(firstRow)) {
    throw new Error('CSV does not contain latitude and longitude columns')
  }

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing errors:', parsed.errors)
  }

  return removeEmptyRows(rows)
}

function parseCoordinate(value: string | undefined): number {
  if (value === null || value === undefined) return Number.NaN

  return Number.parseFloat(
    String(value)
      .trim()
      .replace(',', '.'),
  )
}

function normalizeTag(tag: string): string {
  return String(tag || '')
    .trim()
    .toLowerCase()
}

function getTags(item: GraffitiItem): string[] {
  if (!item.tags) return []

  return String(item.tags)
    .split(',')
    .map(normalizeTag)
    .filter(Boolean)
}

function getAllTags(items: GraffitiItem[]): string[] {
  const tags: string[] = []

  items.forEach((item) => {
    getTags(item).forEach((tag) => {
      if (!tags.includes(tag)) {
        tags.push(tag)
      }
    })
  })

  return tags.sort()
}

function getMarkerClass(tags: string[]): string {
  if (tags.includes('football')) {
    return 'marker-football'
  }

  if (tags.includes('politics')) {
    return 'marker-politics'
  }

  if (tags.includes('religion')) {
    return 'marker-religion'
  }

  return 'marker-default'
}

function getTagColor(tag: string): string {
  if (tag === 'football') return '#2e7d32'
  if (tag === 'politics') return '#8b5a2b'
  if (tag === 'religion') return '#f2c94c'

  return '#777777'
}

function itemMatchesSelectedTags(
  item: GraffitiItem,
  selectedTags: string[],
): boolean {
  if (selectedTags.length === 0) {
    return true
  }

  const itemTags = getTags(item)

  return itemTags.some((tag) => selectedTags.includes(tag))
}

function createMarkerElement(tags: string[]): HTMLDivElement {
  const element = document.createElement('div')
  element.className = `graffiti-marker ${getMarkerClass(tags)}`
  return element
}

function addPopupRow(parent: HTMLElement, label: string, value?: string) {
  if (!value) return

  const row = document.createElement('div')
  row.className = 'popup-row'

  const strong = document.createElement('strong')
  strong.textContent = label

  row.appendChild(strong)
  row.appendChild(document.createElement('br'))
  row.appendChild(document.createTextNode(value))

  parent.appendChild(row)
}

function createPopupContent(item: GraffitiItem): HTMLElement {
  const container = document.createElement('div')
  container.className = 'popup-content'

  const title = document.createElement('div')
  title.className = 'popup-title'
  title.textContent = item.original_text || 'Untitled graffiti'
  container.appendChild(title)

  addPopupRow(container, 'Possible meaning:', item.possible_meaning)
  addPopupRow(container, 'Date:', item.date)

  const tags = getTags(item)

  if (tags.length > 0) {
    const row = document.createElement('div')
    row.className = 'popup-row'

    const strong = document.createElement('strong')
    strong.textContent = 'Tags:'

    row.appendChild(strong)
    row.appendChild(document.createElement('br'))

    tags.forEach((tag) => {
      const tagElement = document.createElement('span')
      tagElement.className = 'tag'
      tagElement.textContent = tag
      row.appendChild(tagElement)
    })

    container.appendChild(row)
  }

  return container
}

function App() {
  const mapContainerInitial: HTMLDivElement | null = null
  const mapInitial: maplibregl.Map | null = null
  const markersInitial: maplibregl.Marker[] = []

  const mapContainerRef = useRef(mapContainerInitial)
  const mapRef = useRef(mapInitial)
  const markersRef = useRef(markersInitial)
  const didFitBoundsRef = useRef(false)

  const initialItems: GraffitiItem[] = []

  const [items, setItems] = useState(initialItems)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const data = await fetchGraffitiItems()
        setItems(data)
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Unknown loading error'

        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [20.4773, 44.8084],
      zoom: 15.5,
      style: {
        version: 8,
        sources: {
          cartoLight: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [
          {
            id: 'carto-light-layer',
            type: 'raster',
            source: 'cartoLight',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('load', () => {
      setMapReady(true)
    })

    mapRef.current = map

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  const allTags = useMemo(() => getAllTags(items), [items])

  const visibleItems = useMemo(
    () => items.filter((item) => itemMatchesSelectedTags(item, selectedTags)),
    [items, selectedTags],
  )

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const bounds = new maplibregl.LngLatBounds()
    let validPointsCount = 0

    visibleItems.forEach((item) => {
      const lat = parseCoordinate(item.latitude)
      const lng = parseCoordinate(item.longitude)

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        console.warn('Invalid coordinates:', item)
        return
      }

      const tags = getTags(item)
      const markerElement = createMarkerElement(tags)

      const popup = new maplibregl.Popup({
        offset: 18,
        closeButton: true,
        closeOnClick: true,
      }).setDOMContent(createPopupContent(item))

      const currentMap = mapRef.current

      if (!currentMap) return

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(currentMap)

      markersRef.current.push(marker)
      bounds.extend([lng, lat])
      validPointsCount += 1
    })

    if (!didFitBoundsRef.current && validPointsCount > 0 && mapRef.current) {
      mapRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 17,
        duration: 600,
      })

      didFitBoundsRef.current = true
    }
  }, [visibleItems, mapReady])

  function handleToggleTag(tag: string) {
    setSelectedTags((currentTags) => {
      if (currentTags.includes(tag)) {
        return currentTags.filter((currentTag) => currentTag !== tag)
      }

      return [...currentTags, tag]
    })
  }

  function handleClearFilters() {
    setSelectedTags([])
  }

  function renderStatsPanel() {
    if (isLoading) {
      return React.createElement(
        'div',
        { className: 'stats-panel' },
        React.createElement(
          'div',
          { className: 'stats-title' },
          'Belgrade Graffiti Map',
        ),
        React.createElement('div', null, 'Loading data...'),
      )
    }

    if (error) {
      return React.createElement(
        'div',
        { className: 'stats-panel' },
        React.createElement('div', { className: 'stats-title' }, 'Loading error'),
        React.createElement('div', null, error),
      )
    }

    return React.createElement(
      'div',
      { className: 'stats-panel' },
      React.createElement(
        'div',
        { className: 'stats-title' },
        'Belgrade Graffiti Map',
      ),
      React.createElement(
        'div',
        { className: 'stats-grid' },
        React.createElement(
          'div',
          { className: 'stats-card' },
          React.createElement('div', { className: 'stats-value' }, items.length),
          React.createElement('div', { className: 'stats-label' }, 'Total'),
        ),
        React.createElement(
          'div',
          { className: 'stats-card' },
          React.createElement(
            'div',
            { className: 'stats-value' },
            visibleItems.length,
          ),
          React.createElement('div', { className: 'stats-label' }, 'Visible'),
        ),
      ),
      React.createElement(
        'div',
        { className: 'stats-filters' },
        React.createElement('strong', null, 'Active filters:'),
        React.createElement('br'),
        selectedTags.length > 0
          ? selectedTags.map((tag) =>
              React.createElement(
                'span',
                { className: 'stats-tag', key: tag },
                tag,
              ),
            )
          : React.createElement('span', null, 'No active filters'),
      ),
    )
  }

  function renderTagFilters() {
    return React.createElement(
      'div',
      { className: 'filter-panel' },
      React.createElement(
        'div',
        { className: 'filter-header' },
        React.createElement('div', { className: 'filter-title' }, 'Tags'),
        React.createElement(
          'div',
          { className: 'filter-count' },
          allTags.length > 0 ? `${allTags.length} tags` : 'No tags',
        ),
      ),
      React.createElement(
        'div',
        { className: 'filter-list' },
        allTags.map((tag) =>
          React.createElement(
            'label',
            { className: 'filter-option', key: tag },
            React.createElement('input', {
              type: 'checkbox',
              value: tag,
              checked: selectedTags.includes(tag),
              onChange: () => handleToggleTag(tag),
            }),
            React.createElement('span', {
              className: 'filter-color-dot',
              style: { background: getTagColor(tag) },
            }),
            React.createElement(
              'span',
              { className: 'filter-label-text' },
              tag,
            ),
          ),
        ),
      ),
      React.createElement(
        'div',
        { className: 'filter-actions' },
        React.createElement(
          'button',
          {
            className: 'clear-filters-button',
            type: 'button',
            onClick: handleClearFilters,
          },
          'Clear filters',
        ),
      ),
    )
  }

  return React.createElement(
    'div',
    { className: 'app-map-page' },
    React.createElement('div', {
      ref: mapContainerRef,
      className: 'map-container',
    }),
    renderStatsPanel(),
    renderTagFilters(),
  )
}

export default App
