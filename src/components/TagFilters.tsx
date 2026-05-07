import { getTagColor } from '../utils/tags'

type TagFiltersProps = {
  allTags: string[]
  selectedTags: Set<string>
  onToggleTag: (tag: string) => void
  onClear: () => void
}

function TagFilters({
  allTags,
  selectedTags,
  onToggleTag,
  onClear,
}: TagFiltersProps) {
  if (allTags.length === 0) {
    return (
      <div className="filter-panel">
        <div className="filter-header">
          <div className="filter-title">Tags</div>
          <div className="filter-count">No tags</div>
        </div>
      </div>
    )
  }

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <div className="filter-title">Tags</div>
        <div className="filter-count">{allTags.length} tags</div>
      </div>

      <div className="filter-list">
        {allTags.map((tag) => (
          <label className="filter-option" key={tag}>
            <input
              type="checkbox"
              value={tag}
              checked={selectedTags.has(tag)}
              onChange={() => onToggleTag(tag)}
            />

            <span
              className="filter-color-dot"
              style={{ background: getTagColor(tag) }}
            />

            <span className="filter-label-text">{tag}</span>
          </label>
        ))}
      </div>

      <div className="filter-actions">
        <button
          className="clear-filters-button"
          type="button"
          onClick={onClear}
        >
          Clear filters
        </button>
      </div>
    </div>
  )
}

export default TagFilters
