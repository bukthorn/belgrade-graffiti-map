import Papa from 'papaparse'
import type { GraffitiItem } from '../types/graffiti'

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
  return Papa.parse<GraffitiItem>(csvText, {
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

export async function fetchGraffitiItems(): Promise<GraffitiItem[]> {
  const response = await fetch(CSV_URL)

  if (!response.ok) {
    throw new Error(`CSV request failed: ${response.status}`)
  }

  const csvText = await response.text()

  let parsed = parseCsv(csvText)
  let firstRow = parsed.data[0] || {}

  if (!hasCoordinateColumns(firstRow)) {
    parsed = parseCsv(csvText, '|')
    firstRow = parsed.data[0] || {}
  }

  if (!hasCoordinateColumns(firstRow)) {
    throw new Error('CSV does not contain latitude and longitude columns')
  }

  if (parsed.errors.length > 0) {
    console.warn('CSV parsing errors:', parsed.errors)
  }

  return removeEmptyRows(parsed.data)
}
