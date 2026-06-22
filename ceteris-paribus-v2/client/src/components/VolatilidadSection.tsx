import { useState, useMemo } from "react";
import { Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";

const RANGES = [
  { id: "1mo", label: "1M" },
  { id: "6mo", label: "6M" },
  { id: "1y",  label: "1A" },
  { id: "5y",  label: "5A" },
] as const;

type Range = typeof RANGES[number]["id"];

function VixLineChart({ points }: { points: { date: number; close: number }[] }) {
  const W = 800;
  const H = 240;
  const PAD = { top: 16, right: 20, bottom: 28, left: 44 };

  const xs = points.map((p) => p.date);
  const ys = points.map((p) => p.close);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys) * 0.97;
  const maxY = Math.max(...ys) * 1.03;

  const toSvgX = (x: number) =>
    PAD.left + ((x - minX) / (maxX - minX)) * (W - PAD.left - PAD.right);
  const toSvgY = (y: number) =>
    PAD.top + (1 - (y - minY) / (maxY - minY)) * (H - PAD.top - PAD.bottom);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toSvgX(p.date).toFixed(1)},${toSvgY(p.close).toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L${toSvgX(xs[xs.length - 1]).toFixed(1)},${(H - PAD.bottom).toFixed(1)}` +
    ` L${toSvgX(xs[0]).toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;

  // Y axis ticks
  const yTicks = 4;
  const yStep = (maxY - minY) / yTicks;
  const tickYs = Array.from({ length: yTicks + 1 }, (_, i) => minY + i * yStep);

  // X axis labels (first + last + midpoint)
  const xLabelIdxs = [0, Math.floor(points.length / 2), points.length - 1];

  const first = points[0]?.close ?? 0;
  const last = points[points.length - 1]?.close ?? 0;
  const rising = last >= first;

  const color = rising ? "oklch(0.55 0.18 25)" : "oklch(0.50 0.18 165)";
  const colorLight = rising ? "oklch(0.55 0.18 25 / 0.15)" : "oklch(0.50 0.18 165 / 0.12)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "240px" }}
      role="img"
      aria-label="Gráfico VIX"
    >
      <defs>
        <linearGradient id="vix-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {tickYs.map((y) => (
        <line
          key={y}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={toSvgY(y)}
          y2={toSvgY(y)}
          stroke="oklch(0.85 0.01 210)"
          strokeWidth="0.5"
        />
      ))}

      {/* Y axis labels */}
      {tickYs.map((y) => (
        <text
          key={y}
          x={PAD.left - 6}
          y={toSvgY(y) + 4}
          textAnchor="end"
          fontSize="10"
          fill="oklch(0.50 0.03 250)"
        >
          {y.toFixed(1)}
        </text>
      ))}

      {/* X axis labels */}
      {xLabelIdxs.map((idx) => {
        const p = points[idx];
        if (!p) return null;
        const label = new Date(p.date).toLocaleDateString("es-UY", { month: "short", year: "2-digit" });
        return (
          <text
            key={idx}
            x={toSvgX(p.date)}
            y={H - 4}
            textAnchor="middle"
            fontSize="10"
            fill="oklch(0.50 0.03 250)"
          >
            {label}
          </text>
        );
      })}

      {/* Area */}
      <path d={areaPath} fill="url(#vix-area)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

      {/* Last point dot */}
      <circle
        cx={toSvgX(xs[xs.length - 1])}
        cy={toSvgY(last)}
        r="4"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function VolatilidadSection() {
  const [range, setRange] = useState<Range>("1y");

  const { data, isLoading, isError } = trpc.market.history.useQuery(
    { symbol: "^VIX", range },
    { staleTime: 5 * 60 * 1000 }
  );

  const change = useMemo(() => {
    if (!data) return null;
    const prev = data.previousClose;
    const curr = data.regularMarketPrice;
    if (!prev || !curr) return null;
    return ((curr - prev) / prev) * 100;
  }, [data]);

  const rising = change !== null && change >= 0;

  return (
    <div className="w-full py-8 px-4 lg:px-8">
      <div className="container">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[oklch(0.55_0.15_30/0.12)] flex items-center justify-center border border-[oklch(0.55_0.15_30/0.25)]">
            <Activity className="w-6 h-6 text-[oklch(0.50_0.15_30)]" />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-[oklch(0.12_0.03_250)]">
              Volatilidad
            </h2>
            <p className="text-base text-[oklch(0.38_0.03_250)]">VIX — Índice de volatilidad del mercado</p>
          </div>
        </div>

        {/* Current value + change */}
        {data && (
          <div className="flex items-baseline gap-4 mb-5">
            <span className="text-4xl font-black text-[oklch(0.12_0.03_250)]">
              {data.regularMarketPrice?.toFixed(2)}
            </span>
            {change !== null && (
              <span
                className="text-lg font-bold"
                style={{ color: rising ? "oklch(0.55 0.18 25)" : "oklch(0.45 0.18 165)" }}
              >
                {rising ? "+" : ""}{change.toFixed(2)}%
              </span>
            )}
            <span className="text-sm text-[oklch(0.50_0.03_250)]">vs cierre anterior</span>
          </div>
        )}

        {/* Range selector */}
        <div className="flex gap-2 mb-5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                range === r.id
                  ? "bg-[oklch(0.15_0.03_250)] text-white shadow-md"
                  : "bg-[oklch(0.95_0.005_210)] text-[oklch(0.30_0.03_250)] border border-[oklch(0.85_0.01_210)] hover:border-[oklch(0.55_0.15_30/0.5)] hover:text-[oklch(0.50_0.15_30)] hover:bg-[oklch(0.55_0.15_30/0.05)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-[oklch(0.85_0.01_210)] bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[oklch(0.92_0.01_210)] bg-[oklch(0.97_0.005_210)] flex items-center justify-between">
            <span className="font-bold text-sm text-[oklch(0.15_0.03_250)]">
              CBOE Volatility Index (VIX)
            </span>
            <span className="text-xs text-[oklch(0.55_0.03_250)]">Fuente: Yahoo Finance</span>
          </div>
          <div className="p-4">
            {isLoading && (
              <div className="h-[240px] flex items-center justify-center text-[oklch(0.50_0.03_250)] text-sm">
                Cargando datos…
              </div>
            )}
            {isError && (
              <div className="h-[240px] flex items-center justify-center text-[oklch(0.50_0.15_25)] text-sm">
                No se pudo cargar el gráfico. Intentá de nuevo más tarde.
              </div>
            )}
            {data && data.points.length > 0 && (
              <VixLineChart points={data.points} />
            )}
          </div>
        </div>

        {/* Interpretación rápida */}
        <div className="mt-4 p-4 rounded-xl bg-[oklch(0.95_0.005_210)] border border-[oklch(0.88_0.01_210)]">
          <p className="text-xs text-[oklch(0.40_0.03_250)] leading-relaxed">
            <strong className="text-[oklch(0.25_0.03_250)]">¿Qué es el VIX?</strong>{" "}
            El índice VIX (CBOE) mide la volatilidad implícita esperada del S&P 500 a 30 días.
            Valores por debajo de 20 indican calma; entre 20–30 hay incertidumbre moderada; por encima de 30 reflejan estrés en los mercados.
          </p>
        </div>

        <p className="text-xs text-[oklch(0.50_0.03_250)] mt-3 text-center">
          Datos provistos por Yahoo Finance. Solo referencia, no constituyen asesoramiento financiero.
        </p>
      </div>
    </div>
  );
}
