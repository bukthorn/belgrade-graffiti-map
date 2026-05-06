export function parseCoordinate(value: string | undefined): number {
  if (value === null || value === undefined) return Number.NaN

  return Number.parseFloat(
    String(value)
      .trim()
      .replace(',', '.'),
  )
}
