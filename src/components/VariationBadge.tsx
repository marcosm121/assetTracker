interface Props {
  value: number | null
}

export default function VariationBadge({ value }: Props) {
  if (value === null) return <span className="text-gray-500 text-sm">—</span>

  const positive = value >= 0
  const color = positive ? 'text-green-400' : 'text-red-400'
  const arrow = positive ? '▲' : '▼'
  const display = `${positive ? '+' : ''}${value.toFixed(2)}%`

  return (
    <span className={`text-sm font-medium ${color}`}>
      {arrow} {display}
    </span>
  )
}
