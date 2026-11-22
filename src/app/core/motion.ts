/** True when the visitor asked their system to cut down on motion. Safe to call on the server. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
