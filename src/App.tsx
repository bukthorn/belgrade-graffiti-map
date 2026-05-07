import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView'
import StatsPanel from './components/StatsPanel'
import TagFilters from './components/TagFilters'
import { fetchGraffitiItems } from './data/googleSheets'
import type { GraffitiItem } from './types/graffiti'
import { getAllTags, itemMatchesSelectedTags } from './utils/tags'

function App() {
  const [items, setItems] = useState<GraffitiItem[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
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

  const allTags = useMemo(() => getAllTags(items), [items])

  const visibleItems = useMemo(
    () => items.filter((item) => itemMatchesSelectedTags(item, selectedTags)),
    [items, selectedTags],
  )

  const activeTags = useMemo(() => Array.from(selectedTags), [selectedTags])

  function handleToggleTag(tag: string) {
    setSelectedTags((currentTags) => {
      const nextTags = new Set(currentTags)

      if (nextTags.has(tag)) {
        nextTags.delete(tag)
      } else {
        nextTags.add(tag)
      }

      return nextTags
    })
  }

  function handleClearFilters() {
    setSelectedTags(new Set())
  }

  return (
    <div className="app-map-page">
      <MapView items={visibleItems} />

      <StatsPanel
        totalCount={items.length}
        visibleCount={visibleItems.length}
        activeTags={activeTags}
        isLoading={isLoading}
        error={error}
      />

      <TagFilters
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClear={handleClearFilters}
      />
    </div>
  )
}

export default App
