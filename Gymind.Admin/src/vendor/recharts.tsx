import React from "react";

const defaultColors = ["#2563EB", "#16A34A", "#F97316", "#7C3AED", "#DC2626", "#0891B2"];

type DataRow = Record<string, unknown>;
type Formatter = (value: unknown, name: unknown, row?: DataRow) => React.ReactNode;
type LabelFormatter = (label: unknown) => React.ReactNode;

interface ChartChildProps {
  dataKey?: string;
  nameKey?: string;
  name?: string;
  fill?: string;
  stroke?: string;
  innerRadius?: number;
  tickFormatter?: (value: unknown) => React.ReactNode;
  formatter?: Formatter;
  labelFormatter?: LabelFormatter;
  children?: React.ReactNode;
}

interface Series {
  dataKey: string;
  name: string;
  color: string;
}

export function ResponsiveContainer({ children }: { children: React.ReactNode }) {
  return <div className="h-full w-full">{children}</div>;
}

function childrenByType(children: React.ReactNode, type: React.ComponentType<Record<string, unknown>>) {
  return React.Children.toArray(children).filter((child) => React.isValidElement(child) && child.type === type) as React.ReactElement<ChartChildProps>[];
}

function childByType(children: React.ReactNode, type: React.ComponentType<Record<string, unknown>>) {
  return childrenByType(children, type)[0];
}

function formatTooltipValue(formatter: Formatter | undefined, value: unknown, name: string, row: DataRow) {
  const formatted = formatter?.(value, name, row);
  if (Array.isArray(formatted)) return { value: formatted[0], name: formatted[1] ?? name };
  return { value: formatted ?? String(value ?? 0), name };
}

function TooltipBox({
  x,
  y,
  label,
  values
}: {
  x: number;
  y: number;
  label: React.ReactNode;
  values: { color: string; name: React.ReactNode; value: React.ReactNode }[];
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-forge-border bg-white px-3 py-2 text-xs shadow-panel"
      style={{ left: Math.min(x + 12, 360), top: Math.max(8, y - 12) }}
    >
      <div className="mb-1 font-bold text-slate-950">{label}</div>
      <div className="space-y-1">
        {values.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-forge-muted"><span className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>
            <strong className="text-slate-950">{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function seriesFromChildren(children: React.ReactNode, type: React.ComponentType<Record<string, unknown>>, fallbackKey: string): Series[] {
  const rows = childrenByType(children, type);
  return rows.length
    ? rows.map((child, index) => ({
        dataKey: child.props.dataKey ?? fallbackKey,
        name: child.props.name ?? child.props.dataKey ?? fallbackKey,
        color: child.props.fill ?? child.props.stroke ?? defaultColors[index % defaultColors.length]
      }))
    : [{ dataKey: fallbackKey, name: fallbackKey, color: defaultColors[0] }];
}

export function BarChart({ children, data = [] }: { children: React.ReactNode; data?: DataRow[] }) {
  const [hover, setHover] = React.useState<{ row: DataRow; x: number; y: number } | null>(null);
  const width = 520;
  const height = 220;
  const padding = 32;
  const bars = seriesFromChildren(children, Bar, "value");
  const xAxis = childByType(children, XAxis);
  const tooltip = childByType(children, Tooltip);
  const xKey = xAxis?.props.dataKey ?? "name";
  const max = Math.max(1, ...data.flatMap((row) => bars.map((bar) => Number(row[bar.dataKey] ?? 0))));
  const slot = (width - padding * 2) / Math.max(1, data.length);
  const barWidth = Math.max(8, Math.min(28, (slot - 10) / Math.max(1, bars.length)));

  return (
    <div className="relative h-full w-full rounded-xl bg-slate-50" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#CBD5E1" />
        {data.map((row, rowIndex) => {
          const baseX = padding + rowIndex * slot + slot / 2 - (bars.length * barWidth) / 2;
          const label = String(row[xKey] ?? "");
          return (
            <g key={`${label}-${rowIndex}`}>
              {bars.map((bar, barIndex) => {
                const value = Number(row[bar.dataKey] ?? 0);
                const barHeight = (value / max) * (height - padding * 2);
                const x = baseX + barIndex * barWidth;
                const y = height - padding - barHeight;
                return (
                  <rect
                    key={bar.dataKey}
                    x={x}
                    y={y}
                    width={barWidth - 2}
                    height={Math.max(0, barHeight)}
                    rx="5"
                    fill={bar.color}
                    onMouseMove={() => setHover({ row, x: x + barWidth, y })}
                  />
                );
              })}
              <text x={padding + rowIndex * slot + slot / 2} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{label.slice(0, 12)}</text>
            </g>
          );
        })}
      </svg>
      {hover ? (
        <TooltipBox
          x={hover.x}
          y={hover.y}
          label={tooltip?.props.labelFormatter?.(hover.row[xKey]) ?? String(hover.row[xKey] ?? "")}
          values={bars.map((bar) => {
            const formatted = formatTooltipValue(tooltip?.props.formatter, hover.row[bar.dataKey], bar.name, hover.row);
            return { color: bar.color, name: formatted.name, value: formatted.value };
          })}
        />
      ) : null}
    </div>
  );
}

export function PieChart({ children }: { children: React.ReactNode; data?: DataRow[] }) {
  const [hover, setHover] = React.useState<{ row: DataRow; x: number; y: number } | null>(null);
  const pie = childByType(children, Pie);
  const tooltip = childByType(children, Tooltip);
  const data = (pie?.props as { data?: DataRow[] } | undefined)?.data ?? [];
  const dataKey = pie?.props.dataKey ?? "value";
  const nameKey = pie?.props.nameKey ?? "name";
  const innerRadius = Number(pie?.props.innerRadius ?? 0);
  const cells = pie ? childrenByType(pie.props.children, Cell) : [];
  const total = data.reduce((sum, item) => sum + Number(item[dataKey] ?? 0), 0);
  let start = 0;
  const stops = data.map((item, index) => {
    const value = total > 0 ? (Number(item[dataKey] ?? 0) / total) * 100 : 0;
    const color = cells[index]?.props.fill ?? defaultColors[index % defaultColors.length];
    const stop = `${color} ${start}% ${start + value}%`;
    start += value;
    return stop;
  });

  return (
    <div className="relative flex h-full items-center justify-center" onMouseLeave={() => setHover(null)}>
      <div
        className="relative h-52 w-52 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        onMouseMove={(event) => {
          const index = data.length <= 1 ? 0 : Math.min(data.length - 1, Math.floor((event.nativeEvent.offsetX / Math.max(1, event.currentTarget.clientWidth)) * data.length));
          setHover({ row: data[index] ?? {}, x: event.nativeEvent.offsetX + 150, y: event.nativeEvent.offsetY + 20 });
        }}
      >
        {innerRadius > 0 ? <div className="absolute inset-14 rounded-full bg-white" /> : null}
      </div>
      {hover ? (
        <TooltipBox
          x={hover.x}
          y={hover.y}
          label={tooltip?.props.labelFormatter?.(hover.row[nameKey]) ?? String(hover.row[nameKey] ?? "")}
          values={[{
            color: defaultColors[0],
            ...formatTooltipValue(tooltip?.props.formatter, hover.row[dataKey], String(hover.row[nameKey] ?? "Value"), hover.row)
          }]}
        />
      ) : null}
    </div>
  );
}

export function LineChart({ children, data = [] }: { children: React.ReactNode; data?: DataRow[] }) {
  const [hover, setHover] = React.useState<{ row: DataRow; x: number; y: number } | null>(null);
  const width = 520;
  const height = 220;
  const padding = 28;
  const lines = seriesFromChildren(children, Line, "value");
  const xAxis = childByType(children, XAxis);
  const tooltip = childByType(children, Tooltip);
  const xKey = xAxis?.props.dataKey ?? "date";
  const tickFormatter = xAxis?.props.tickFormatter;
  const max = Math.max(1, ...data.flatMap((row) => lines.map((line) => Number(row[line.dataKey] ?? 0))));
  const pointFor = (row: DataRow, index: number, dataKey: string) => {
    const x = padding + (data.length <= 1 ? 0 : (index / (data.length - 1)) * (width - padding * 2));
    const y = height - padding - (Number(row[dataKey] ?? 0) / max) * (height - padding * 2);
    return { x, y };
  };

  return (
    <div className="relative h-full w-full rounded-xl bg-slate-50" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#CBD5E1" />
        {lines.map((line) => {
          const points = data.map((row, index) => {
            const point = pointFor(row, index, line.dataKey);
            return `${point.x},${point.y}`;
          }).join(" ");
          return <polyline key={line.dataKey} points={points} fill="none" stroke={line.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
        })}
        {data.map((row, index) => {
          const point = pointFor(row, index, lines[0]?.dataKey ?? "value");
          return (
            <g key={`${String(row[xKey])}-${index}`} onMouseMove={() => setHover({ row, x: point.x, y: point.y })}>
              <circle cx={point.x} cy={point.y} r="8" fill="transparent" />
              <circle cx={point.x} cy={point.y} r="4" fill={lines[0]?.color ?? defaultColors[0]} />
              <text x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{String(tickFormatter?.(row[xKey]) ?? row[xKey] ?? "").slice(0, 12)}</text>
            </g>
          );
        })}
      </svg>
      {hover ? (
        <TooltipBox
          x={hover.x}
          y={hover.y}
          label={tooltip?.props.labelFormatter?.(hover.row[xKey]) ?? String(tickFormatter?.(hover.row[xKey]) ?? hover.row[xKey] ?? "")}
          values={lines.map((line) => {
            const formatted = formatTooltipValue(tooltip?.props.formatter, hover.row[line.dataKey], line.name, hover.row);
            return { color: line.color, name: formatted.name, value: formatted.value };
          })}
        />
      ) : null}
    </div>
  );
}

export function Bar(_: Record<string, unknown>) { return null; }
export function CartesianGrid(_: Record<string, unknown>) { return null; }
export function Cell(_: Record<string, unknown>) { return null; }
export function Line(_: Record<string, unknown>) { return null; }
export function Pie(_: Record<string, unknown>) { return null; }
export function Tooltip(_: Record<string, unknown>) { return null; }
export function XAxis(_: Record<string, unknown>) { return null; }
export function YAxis(_: Record<string, unknown>) { return null; }
