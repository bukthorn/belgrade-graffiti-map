import type { GraffitiItem } from '../types/graffiti'

export function normalizeTag(tag: string): string {
  return String(tag || '')
    .trim()
    .toLowerCase()
}

export function getTags(item: Pick<GraffitiItem, 'tags'>): string[] {
  if (!item.tags) return []

  return String(item.tags)
    .split(',')
    .map(normalizeTag)
    .filter(Boolean)
}

export function getAllTags(items: GraffitiItem[]): string[] {
  const tags = new Set<string>()

  items.forEach((item) => {
    getTags(item).forEach((tag) => tags.add(tag))
  })

  return Array.from(tags).sort()
}

export function getMarkerClass(tags: string[]): string {
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

export function getTagColor(tag: string): string {
  if (tag === 'football') return '#2e7d32'
  if (tag === 'politics') return '#8b5a2b'
  if (tag === 'religion') return '#f2c94c'

  return '#777777'
}

export function itemMatchesSelectedTags(
  item: GraffitiItem,
  selectedTags: Set<string>,
): boolean {
  if (selectedTags.size === 0) {
    return true
  }

  const itemTags = getTags(item)

  return itemTags.some((tag) => selectedTags.has(tag))
}
