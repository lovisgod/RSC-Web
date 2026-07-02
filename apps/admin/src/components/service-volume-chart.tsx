interface ServiceVolumeChartProps {
  bars: readonly number[];
  legend: readonly string[];
}

export function ServiceVolumeChart({ bars, legend }: ServiceVolumeChartProps) {
  return (
    <article className="panel panel--wide">
      <div className="panel__heading">
        <div>
          <p className="kicker">Order pulse</p>
          <h2>Service volume</h2>
        </div>
        <select aria-label="Order pulse period" defaultValue="today">
          <option value="today">Today</option>
          <option value="week">This week</option>
        </select>
      </div>
      <div className="chart-placeholder" role="img" aria-label="Illustrative hourly order volume">
        {bars.map((height, i) => (
          <span key={i} style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="chart-legend">
        {legend.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </article>
  );
}
