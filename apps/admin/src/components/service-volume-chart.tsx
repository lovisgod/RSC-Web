import type { OrderPulsePoint, OrderPulseRange } from "@rsc/contracts";
import { BarChart } from "@mui/x-charts/BarChart";

interface ServiceVolumeChartProps {
  points: OrderPulsePoint[];
  range: OrderPulseRange;
  isLoading: boolean;
  isError: boolean;
  onRangeChange: (range: OrderPulseRange) => void;
  onRetry: () => void;
}

export function ServiceVolumeChart({
  points,
  range,
  isLoading,
  isError,
  onRangeChange,
  onRetry,
}: ServiceVolumeChartProps) {
  const tickInterval = range === "LAST_30_DAYS" ? 5 : range === "TODAY" ? 3 : 1;

  return (
    <article className="panel panel--wide">
      <div className="panel__heading">
        <div>
          <p className="kicker">Order pulse</p>
          <h2>Service volume</h2>
        </div>
        <select
          aria-label="Order pulse period"
          value={range}
          onChange={(event) => onRangeChange(event.target.value as OrderPulseRange)}
        >
          <option value="TODAY">Today</option>
          <option value="LAST_7_DAYS">Last 7 days</option>
          <option value="LAST_30_DAYS">Last 30 days</option>
        </select>
      </div>

      {isLoading ? (
        <div className="chart-loading" aria-label="Loading order pulse">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : isError ? (
        <div className="panel-state panel-state--error">
          <strong>Order pulse is unavailable</strong>
          <span>We could not load service volume.</span>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : points.length === 0 ? (
        <div className="panel-state">
          <strong>No order volume yet</strong>
          <span>Order activity will appear here when service begins.</span>
        </div>
      ) : (
        <div className="mui-service-chart">
          <BarChart
            aria-label="Order volume by time period"
            xAxis={[
              {
                scaleType: "band",
                data: points.map((point) => point.label),
                categoryGapRatio: 0.35,
                tickLabelInterval: (_value, index) =>
                  index % tickInterval === 0 || index === points.length - 1,
              },
            ]}
            yAxis={[{ min: 0, width: 42 }]}
            series={[
              {
                data: points.map((point) => point.orderCount),
                label: "Orders",
                color: "#d4832a",
                valueFormatter: (value) => `${value ?? 0} orders`,
              },
            ]}
            height={280}
            borderRadius={7}
            grid={{ horizontal: true }}
            hideLegend
            margin={{ top: 12, right: 12, bottom: 8, left: 4 }}
            sx={{
              "& .MuiChartsAxis-tickLabel": {
                fill: "var(--rsc-muted)",
                fontSize: 11,
              },
              "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": {
                stroke: "#dfe2da",
              },
              "& .MuiChartsGrid-line": {
                stroke: "#eceee8",
                strokeDasharray: "4 4",
              },
            }}
          />
        </div>
      )}
    </article>
  );
}
