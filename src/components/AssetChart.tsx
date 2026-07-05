import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type WhitespaceData,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useAdapter } from '../AdapterContext'
import type { ChartRange, PricePoint } from '../adapters/types'

interface Props {
  symbol: string
  currency: 'ars' | 'usd'
}

const RANGES: { value: ChartRange; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
]

type Status = 'loading' | 'error' | 'loaded'

/** Green when the series ends higher than it started, red otherwise. */
const UP = { line: '#16a34a', top: 'rgba(22, 163, 74, 0.25)', bottom: 'rgba(22, 163, 74, 0.0)' }
const DOWN = { line: '#dc2626', top: 'rgba(220, 38, 38, 0.25)', bottom: 'rgba(220, 38, 38, 0.0)' }

/** UTC midnight timestamp for a `YYYY-MM-DD` string, as lightweight-charts wants. */
function toTime(date: string): UTCTimestamp {
  return (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp
}

/**
 * Maps the API series to chart points for the chosen currency. Days with no
 * snapshot become whitespace points, which render as a gap in the line rather
 * than a drop to zero.
 */
function toSeriesData(points: PricePoint[], currency: 'ars' | 'usd'): (AreaData | WhitespaceData)[] {
  return points.map((p) => {
    const value = currency === 'ars' ? p.ars : p.usd
    const time = toTime(p.date)
    return value === null ? { time } : { time, value }
  })
}

function trend(points: PricePoint[], currency: 'ars' | 'usd'): boolean {
  const values = points
    .map((p) => (currency === 'ars' ? p.ars : p.usd))
    .filter((v): v is number => v !== null)
  if (values.length < 2) return true
  return values[values.length - 1] >= values[0]
}

export default function AssetChart({ symbol, currency }: Props) {
  const adapter = useAdapter()
  const [range, setRange] = useState<ChartRange>(30)
  const [points, setPoints] = useState<PricePoint[]>([])
  const [status, setStatus] = useState<Status>('loading')

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  // Fetch the series whenever the ticker or the selected window changes.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    adapter
      .fetchHistorySeries(symbol, range)
      .then((data) => {
        if (cancelled) return
        setPoints(data)
        setStatus('loaded')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [adapter, symbol, range])

  // Create the chart once and keep it sized to its container.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      height: 220,
      layout: {
        background: { color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: 'inherit',
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#f1f5f9' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      handleScale: false,
      handleScroll: false,
      crosshair: { horzLine: { visible: false }, vertLine: { labelVisible: false } },
    })
    const series = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = series

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) chart.applyOptions({ width })
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Push data into the chart whenever the series or currency changes.
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart || status !== 'loaded') return

    const up = trend(points, currency)
    const colors = up ? UP : DOWN
    series.applyOptions({
      lineColor: colors.line,
      topColor: colors.top,
      bottomColor: colors.bottom,
      priceFormat:
        currency === 'usd'
          ? { type: 'price', precision: 4, minMove: 0.0001 }
          : { type: 'price', precision: 2, minMove: 0.01 },
    })
    series.setData(toSeriesData(points, currency))
    chart.timeScale().fitContent()
  }, [points, currency, status])

  const hasData =
    status === 'loaded' &&
    points.some((p) => (currency === 'ars' ? p.ars : p.usd) !== null)

  return (
    <div className="mx-3 mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-bold text-slate-900">Evolución</h2>
        <div className="flex bg-slate-100 rounded-full p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                range === r.value ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-2 pt-3 pb-2">
        {/* The chart always renders into this node; overlays sit on top. */}
        <div ref={containerRef} className={hasData ? '' : 'opacity-0'} />
        {status !== 'loaded' && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            {status === 'loading' ? 'Cargando gráfico…' : 'No se pudo cargar el gráfico'}
          </div>
        )}
        {status === 'loaded' && !hasData && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Sin datos históricos para este período
          </div>
        )}
      </div>
    </div>
  )
}
