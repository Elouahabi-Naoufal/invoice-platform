// Lightweight, dependency-free SVG charts. Server-renderable; hover shows a tooltip.
import { formatMoney } from "@/domain/invoice";

export const CHART_COLORS = ["#465FFF", "#12B76A", "#F79009", "#F04438", "#0BA5EC", "#7C3AED"];

/** Grouped vertical bars (rounded tops) — e.g. money in vs out per month. */
export function BarChart({
  data, currency, labelA = "In", labelB = "Out",
}: {
  data: { label: string; a: number; b: number }[];
  currency: string;
  labelA?: string;
  labelB?: string;
}) {
  const width = 560;
  const height = 200;
  const baseline = height - 26;
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const groupWidth = width / Math.max(1, data.length);
  const barWidth = Math.min(24, (groupWidth - 16) / 2);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full" role="img" aria-label={`${labelA} vs ${labelB}`}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={0} x2={width} y1={baseline - t * (baseline - 10)} y2={baseline - t * (baseline - 10)} stroke="#F2F4F7" className="dark:opacity-20" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const groupX = i * groupWidth;
          const xA = groupX + groupWidth / 2 - barWidth - 2;
          const xB = groupX + groupWidth / 2 + 2;
          const hA = (d.a / max) * (baseline - 10);
          const hB = (d.b / max) * (baseline - 10);
          return (
            <g key={i}>
              <rect x={xA} y={baseline - hA} width={barWidth} height={Math.max(0, hA)} rx={4} fill={CHART_COLORS[0]}>
                <title>{`${labelA} ${d.label}: ${formatMoney(d.a, currency)}`}</title>
              </rect>
              <rect x={xB} y={baseline - hB} width={barWidth} height={Math.max(0, hB)} rx={4} fill={CHART_COLORS[2]}>
                <title>{`${labelB} ${d.label}: ${formatMoney(d.b, currency)}`}</title>
              </rect>
              <text x={groupX + groupWidth / 2} y={height - 8} textAnchor="middle" fontSize={11} fill="#98A2B3">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-[12px] text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[0] }} /> {labelA}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[2] }} /> {labelB}</span>
      </div>
    </div>
  );
}

/** Rounded donut for a breakdown (values are for proportion; `display` is the label). */
export function DonutChart({ slices, size = 168 }: { slices: { label: string; value: number; display: string }[]; size?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const stroke = 18;
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label="Breakdown">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="#F2F4F7" className="dark:opacity-10" strokeWidth={stroke} />
      {slices.map((s, i) => {
        const length = (s.value / total) * circumference;
        const dash = Math.max(0, length - 6);
        const el = (
          <circle
            key={i} cx="80" cy="80" r={radius} fill="none"
            stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          >
            <title>{`${s.label}: ${s.display}`}</title>
          </circle>
        );
        offset += length;
        return el;
      })}
    </svg>
  );
}

/** Horizontal rounded bars — e.g. top clients / categories. */
export function HBars({ items, currency }: { items: { label: string; value: number }[]; currency: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="grid gap-3">
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex items-baseline justify-between gap-3 text-[12px]">
            <span className="truncate text-ink-700 dark:text-gray-200">{it.label}</span>
            <span className="shrink-0 tabular-nums text-ink-500">{formatMoney(it.value, currency)}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.max(3, (it.value / max) * 100)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
