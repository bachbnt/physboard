/** A round step (1, 2, 5 × 10ⁿ) that splits `range` into roughly `target` intervals. */
export function niceStep(range: number, target = 6): number {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / magnitude;
  const nice = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return nice * magnitude;
}
