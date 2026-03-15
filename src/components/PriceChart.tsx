import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle, LineSeries } from 'lightweight-charts'
import type { HistoryPoint } from '../adapters/types'

interface Props {
  data: HistoryPoint[]
}

export default function PriceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#030712' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: containerRef.current.clientWidth,
      height: 300,
      timeScale: { borderColor: '#374151' },
      rightPriceScale: { borderColor: '#374151' },
    })

    const series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
    })

    series.setData(
      data.map(p => ({
        time: p.date.toISOString().split('T')[0] as `${number}-${number}-${number}`,
        value: p.close,
      }))
    )

    chart.timeScale().fitContent()

    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current!.clientWidth })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data])

  return <div ref={containerRef} className="w-full" />
}
