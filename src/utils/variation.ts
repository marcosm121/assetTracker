export function calcVariation(current: number, reference: number | undefined): number | null {
  if (!reference) return null
  return ((current - reference) / reference) * 100
}
