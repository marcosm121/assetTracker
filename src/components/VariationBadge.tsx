interface Props {
  value: number | null
}

export default function VariationBadge({ value }: Props) {
  if (value === null) return <span className="text-slate-400 text-sm">—</span>

  const positive = value >= 0
  const color = positive ? 'text-green-600' : 'text-red-600'
  const arrow = positive ? '↗' : '↘'
  const display = `${positive ? '+' : ''}${value.toFixed(2)}%`

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {display}
    </span>
  )
}
