export function subDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

export function subMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() - n)
  return d
}

export function subYears(date: Date, n: number): Date {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() - n)
  return d
}
