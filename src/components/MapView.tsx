import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { GraffitiItem } from '../types/graffiti'
import { parseCoordinate } from '../utils/geo'
import { getMarkerClass, getTags } from '../utils/tags'

type MapViewProps = {
  items: GraffitiItem[]
}

function escapeHtml(value: string | undefined): string {
  if (!value) return ''

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createMarkerElement(tags: string[]): HTMLDivElement {
  const element = document.createElement('div')
  element.className = `graffiti-marker ${getMarkerClass(tags)}`
  return element
}

function createPopupContent(item: GraffitiItem): string {
  const originalText = escapeHtml(item.original_text)
  const possibleMeaning = escapeHtml(item.possible_meaning)
  const date = escapeHtml(item.date)
  const tags = getTags(item)

  const tagsHtml = tags
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join('')

  return `
    <div class="popup-content">
      <div class="popup-title">${originalText || 'Untitled graffiti'}</div>

      ${
        possibleMeaning
          ? `
            <div class="popup-row">
              <strong>Possible meaning:</strong><br>
              ${possibleMeaning}
            </div>
          `
          : ''
      }

      ${
        date
          ? `
            <div class="popup-row">
              <strong>Date:</strong><br>
              ${date}
            </div>
          `
          : ''
      }

      ${
        tags.length
          ? `
            <div class="popup-row">
              <strong>Tags:</strong><br>
              ${tagsHtml}
            </div>
          `
          : ''
      }
    </div>
  `
}

function MapView({ items }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const didFitBoundsRef = useRef(false)

  const [mapReady, setMapReady] = useState(false)

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
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
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

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const bounds = new maplibregl.LngLatBounds()
    let validPointsCount = 0

    items.forEach((item) => {
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
      }).setHTML(createPopupContent(item))

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
      bounds.extend([lng, lat])
      validPointsCount += 1
    })

    if (!didFitBoundsRef.current && validPointsCount > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 17,
        duration: 600,
      })

      didFitBoundsRef.current = true
    }
  }, [items, mapReady])

  return <div ref={mapContainerRef} className="map-container" />
}

export default MapView
