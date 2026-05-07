type StatsPanelProps = {
  totalCount: number
  visibleCount: number
  activeTags: string[]
  isLoading: boolean
  error: string | null
}

function StatsPanel({
  totalCount,
  visibleCount,
  activeTags,
  isLoading,
  error,
}: StatsPanelProps) {
  if (isLoading) {
    return (
      <div className="stats-panel">
        <div className="stats-title">Belgrade Graffiti Map</div>
        <div>Loading data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stats-panel">
        <div className="stats-title">Loading error</div>
        <div>{error}</div>
      </div>
    )
  }

  return (
    <div className="stats-panel">
      <div className="stats-title">Belgrade Graffiti Map</div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-value">{totalCount}</div>
          <div className="stats-label">Total</div>
        </div>

        <div className="stats-card">
          <div className="stats-value">{visibleCount}</div>
          <div className="stats-label">Visible</div>
        </div>
      </div>

      <div className="stats-filters">
        <strong>Active filters:</strong>
        <br />

        {activeTags.length > 0 ? (
          activeTags.map((tag) => (
            <span className="stats-tag" key={tag}>
              {tag}
            </span>
          ))
        ) : (
          <span>No active filters</span>
        )}
      </div>
    </div>
  )
}

export default StatsPanel
